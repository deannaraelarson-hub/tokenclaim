// main.js — AppKit primary, WalletConnect v1 + injected fallback
// - Try AppKit (WalletConnect v2) modal first.
// - If provider isn't available within timeout or relay WS fails, fall back to WalletConnect v1 (@walletconnect/web3-provider).
// - If v1 fails, fallback to injected provider (window.ethereum).
// - Wrap provider into ethers.js Web3Provider and scan chains (native + common ERC20).
//
// Requirements:
//   npm install @reown/appkit @reown/appkit-adapter-ethers ethers @walletconnect/web3-provider
//
// Build with Vite (ESM). Ensure your index.html provides required DOM elements.
//
// Note: WalletConnect v1 is deprecated but still supported by many wallets; it's used here only as a pragmatic fallback.

import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";
import WalletConnectProvider from "@walletconnect/web3-provider"; // v1 bridge fallback

const PROJECT_ID = "962425907914a3e80a7d8e7288b23f62";

const CONFIG = {
  APPKIT_PROVIDER_TIMEOUT_MS: 12_000,
  WC1_ENABLE_TIMEOUT_MS: 12_000,
  CHAINS: [
    { id: 1, name: "Ethereum", rpc: "https://cloudflare-eth.com", symbol: "ETH", cg: "ethereum" },
    { id: 56, name: "BNB Chain", rpc: "https://bsc-dataseed.binance.org", symbol: "BNB", cg: "binance-smart-chain" },
    { id: 137, name: "Polygon", rpc: "https://polygon-rpc.com", symbol: "MATIC", cg: "polygon-pos" }
  ],
  TOKENLIST_URL: "https://tokens.coingecko.com/uniswap/all.json",
  PRICE_API_BASE: "https://api.coingecko.com/api/v3",
  PRICE_PROXY: "https://api.allorigins.win/raw?url=",
  TOKEN_SCAN_LIMIT: 200,
  RPC_PARALLEL: 6
};

// AppKit init (still used as primary modal)
const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  projectId: PROJECT_ID,
  networks: CONFIG.CHAINS.map(c => ({ id: c.id, name: c.name, rpcUrl: c.rpc })),
  metadata: { name: "Local WalletConnect Test", description: "AppKit modal", url: window.location.origin, icons: [] },
  themeMode: "dark",
  features: { analytics: false }
});

// DOM elements (must exist in HTML)
const $ = id => document.getElementById(id);
const connectBtn = $("connectBtn");
const scanAllBtn = $("scanAllBtn");
const signBtn = $("signBtn");
const backendBtn = $("backendBtn");
const statusEl = $("status");
const walletsListEl = $("walletsList");
const tokensBodyEl = $("tokensBody");
const totalValueEl = $("totalValue");
const toastContainer = $("toastContainer");
const loadingOverlay = $("loadingOverlay");
const loadingText = $("loadingText");

// state
const state = { wallets: [], tokenlist: null, wc1Provider: null };

function toast(msg, t = "info") {
  if (!toastContainer) return console.log(`[${t}]`, msg);
  const d = document.createElement("div");
  d.className = "toast " + t;
  d.innerText = msg;
  toastContainer.appendChild(d);
  setTimeout(() => d.remove(), 5000);
}
function showLoading(msg = "Loading...") { if (loadingText) loadingText.textContent = msg; if (loadingOverlay) loadingOverlay.style.display = "flex"; }
function hideLoading() { if (loadingOverlay) loadingOverlay.style.display = "none"; }
const short = a => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "";

// utility: fetch with proxy fallback for CoinGecko
async function fetchWithFallback(url) {
  try { const r = await fetch(url, { mode: "cors" }); if (r.ok) return r; } catch {}
  try { const r2 = await fetch(CONFIG.PRICE_PROXY + encodeURIComponent(url)); if (r2.ok) return r2; } catch {}
  return null;
}
async function priceById(id) {
  if (!id) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
  const r = await fetchWithFallback(url);
  if (!r) return null;
  try { const j = await r.json(); return j?.[id]?.usd ?? null; } catch { return null; }
}
async function priceByContract(contract, platform) {
  if (!contract || !platform) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/token_price/${platform}?contract_addresses=${encodeURIComponent(contract)}&vs_currencies=usd`;
  const r = await fetchWithFallback(url);
  if (!r) return null;
  try { const j = await r.json(); const k = Object.keys(j||{})[0]; return k ? j[k]?.usd ?? null : null; } catch { return null; }
}

// tokenlist (best-effort)
async function loadTokenlist() {
  if (state.tokenlist) return state.tokenlist;
  try {
    const r = await fetch(CONFIG.TOKENLIST_URL);
    if (!r.ok) { state.tokenlist = []; return []; }
    const j = await r.json();
    state.tokenlist = (j.tokens || []).map(t => ({ chainId: t.chainId, address: (t.address||"").toLowerCase(), symbol: t.symbol, name: t.name, decimals: t.decimals||18 }));
    return state.tokenlist;
  } catch { state.tokenlist = []; return []; }
}

// scanning (native + ERC20 via JSON-RPC)
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];

async function scanAddressWithEthers(ethersProvider, address) {
  await loadTokenlist().catch(()=>{});
  const result = { wallet: address, allTokens: [], chainBalances: [], totalValue: 0, ts: Date.now() };

  for (const chain of CONFIG.CHAINS) {
    try {
      const rpcProv = new ethers.providers.JsonRpcProvider(chain.rpc);
      const raw = await rpcProv.getBalance(address).catch(()=> ethers.BigNumber.from(0));
      const native = Number(ethers.utils.formatEther(raw));
      const nativePrice = (await priceById(chain.cg).catch(()=>null)) ?? (chain.symbol === "ETH" ? 2500 : 0);
      const nativeValue = native * nativePrice;

      const chainRes = { chain, nativeBalance: { symbol: chain.symbol, balance: Number(native.toFixed(6)), price: nativePrice, value: nativeValue }, tokens: [], totalValue: nativeValue };

      // collect candidates: small known list + slice from tokenlist
      const common = [
        // expand or inject your common tokens here per chain
      ];
      // combine tokenlist if loaded
      const listFor = (state.tokenlist || []).filter(t => t.chainId === chain.id).slice(0, CONFIG.TOKEN_SCAN_LIMIT);
      const candidates = [...common, ...listFor];

      // concurrency scan
      let idx = 0;
      const found = [];
      const worker = async () => {
        while (idx < candidates.length) {
          const i = idx++;
          const tk = candidates[i];
          if (!tk || !tk.address) continue;
          try {
            const ctr = new ethers.Contract(tk.address, ERC20_ABI, rpcProv);
            const balRaw = await ctr.balanceOf(address).catch(()=> null);
            if (!balRaw || balRaw.isZero()) continue;
            const decimals = tk.decimals || await ctr.decimals().catch(()=>18);
            const balance = Number(ethers.utils.formatUnits(balRaw, decimals));
            if (balance <= 0) continue;
            let price = await priceByContract(tk.address, chain.cg).catch(()=> null);
            if (price == null) {
              const coinId = (tk.symbol || "").toLowerCase();
              price = coinId ? (await priceById(coinId).catch(()=>null)) : null;
            }
            if (price == null) price = 0;
            const val = balance * price;
            found.push({ address: tk.address, symbol: tk.symbol, name: tk.name||tk.symbol, balance: Number(balance.toFixed(6)), decimals, price, value: val, chain: chain.name, type: "erc20" });
          } catch (e) {
            // ignore
          }
        }
      };

      const workers = [];
      const concurrency = Math.max(1, Math.min(CONFIG.RPC_PARALLEL, 8));
      for (let w=0; w<concurrency; w++) workers.push(worker());
      await Promise.all(workers);

      found.sort((a,b)=> (b.value||0)-(a.value||0));
      chainRes.tokens = found;
      chainRes.totalValue += found.reduce((s,t)=> s + (t.value||0), 0);

      result.chainBalances.push(chainRes);
      result.allTokens.push({ address: "native", symbol: chain.symbol, name: `${chain.name} Native`, balance: chainRes.nativeBalance.balance, price: chainRes.nativeBalance.price, value: chainRes.nativeBalance.value, chain: chain.name, type: "native" });
      if (found.length) result.allTokens.push(...found);

    } catch (err) {
      console.warn("scan chain error", chain.name, err);
    }
    await new Promise(r=>setTimeout(r, 300));
  }

  result.totalValue = result.allTokens.reduce((s,t)=> s + (t.value||0), 0);
  return result;
}

// Open AppKit, wait for provider with timeout, detect failure and fallback
async function connectViaAppKitOrFallback() {
  showLoading("Opening wallet modal (AppKit)...");
  let provider = null;
  try {
    await appKit.open();
  } catch (err) {
    console.warn("appKit.open() failed", err);
  }

  // wait loop for appKit.getProvider()
  const start = Date.now();
  while (Date.now() - start < CONFIG.APPKIT_PROVIDER_TIMEOUT_MS) {
    try {
      if (appKit.getProvider) {
        const p = await appKit.getProvider().catch(()=> null);
        if (p) { provider = p; break; }
      }
    } catch (e) {}
    await new Promise(r=>setTimeout(r, 500));
  }

  if (provider) {
    toast("AppKit provider acquired (v2)", "success");
    hideLoading();
    return provider;
  }

  // If we reach here, AppKit provider didn't come back -> attempt WalletConnect v1 fallback
  toast("AppKit timed out — attempting WalletConnect v1 (bridge) fallback...", "warning");
  showLoading("Trying WalletConnect v1 (bridge)...");
  try {
    // construct RPC map for wc1 provider
    const rpc = {};
    CONFIG.CHAINS.forEach(c => rpc[c.id] = c.rpc);

    const wc1 = new WalletConnectProvider({
      bridge: "https://bridge.walletconnect.org",
      rpc,
      qrcode: true
    });

    // enable() will show QR or deep-link; wait for enable
    const enablePromise = wc1.enable();
    const enabled = await Promise.race([enablePromise, new Promise((_, rej) => setTimeout(()=> rej(new Error("WC1 enable timeout")), CONFIG.WC1_ENABLE_TIMEOUT_MS))]);

    if (!enabled) throw new Error("WalletConnect v1 enable failed/timeout");
    state.wc1Provider = wc1;
    toast("WalletConnect v1 connected", "success");
    hideLoading();
    return wc1;
  } catch (wcErr) {
    console.warn("WalletConnect v1 fallback failed:", wcErr);
    // final fallback: injected provider
    toast("WalletConnect v1 failed — falling back to injected provider (MetaMask, Trust) if available", "warning");
    hideLoading();
    if (window.ethereum) return window.ethereum;
    throw new Error("All connection methods failed. Ensure your network allows WebSocket (for v2) or use an injected wallet.");
  }
}

// Top-level connect flow used by UI connect button
async function handleConnect() {
  try {
    showLoading("Connecting...");
    const rawProvider = await connectViaAppKitOrFallback();
    if (!rawProvider) { hideLoading(); toast("No provider available", "error"); return; }

    // Wrap in ethers provider (Web3Provider accepts EIP-1193 provider and WalletConnect v1 provider)
    const web3Provider = new ethers.providers.Web3Provider(rawProvider);
    const signer = web3Provider.getSigner();
    let address = null;
    try { address = await signer.getAddress(); } catch (e) {
      // try eth_requestAccounts
      try {
        const accounts = await rawProvider.request?.({ method: "eth_requestAccounts" }) || [];
        address = accounts[0] || null;
      } catch (e2) {}
    }
    if (!address) { hideLoading(); toast("Connection did not return address (approve in wallet).", "warning"); return; }

    // store wallet and auto-scan
    const entry = { address, provider: web3Provider, signer, name: "Connected", walletType: state.wc1Provider ? "walletconnect_v1" : "appkit_v2_or_injected", scanResults: null };
    const idx = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
    if (idx !== -1) state.wallets[idx] = entry; else state.wallets.push(entry);

    updateWalletsUI();
    toast(`Connected ${short(address)}`, "success");

    showLoading("Auto-scanning wallet...");
    try {
      const scan = await scanAddressWithEthers(web3Provider, address);
      const i = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
      if (i !== -1) state.wallets[i].scanResults = scan;
      updateTokensUI();
      toast("Scan complete", "success");
    } catch (scanErr) {
      console.error("scan error", scanErr);
      toast("Scan error: " + (scanErr.message || String(scanErr)), "warning");
    } finally { hideLoading(); }
  } catch (err) {
    hideLoading();
    console.error("connect flow failed:", err);
    toast(err.message || String(err), "error");
  }
}

// UI helpers to render wallets/tokens
function updateWalletsUI() {
  if (!walletsListEl) return;
  walletsListEl.innerHTML = "";
  if (!state.wallets.length) { walletsListEl.innerHTML = '<p class="muted">No wallets connected</p>'; if (statusEl) statusEl.textContent = "Not connected"; return; }
  if (statusEl) statusEl.textContent = `${state.wallets.length} wallet(s) connected`;
  for (const w of state.wallets) {
    const row = document.createElement("div"); row.className = "wallet-chip";
    row.style.display="flex"; row.style.justifyContent="space-between"; row.style.alignItems="center"; row.style.padding="8px"; row.style.marginBottom="6px"; row.style.background="#071233";
    const left = document.createElement("div"); left.innerHTML = `<strong>${w.name}</strong><div style="color:#94a3b8">${short(w.address)}</div>`;
    const right = document.createElement("div"); right.style.display="flex"; right.style.gap="6px";
    const rescan = document.createElement("button"); rescan.textContent = "Rescan"; rescan.onclick = () => rescanWallet(w.address);
    const disc = document.createElement("button"); disc.textContent = "Disconnect"; disc.onclick = () => disconnectWallet(w.address);
    right.appendChild(rescan); right.appendChild(disc); row.appendChild(left); row.appendChild(right); walletsListEl.appendChild(row);
  }
}
function updateTokensUI() {
  if (!tokensBodyEl) return;
  tokensBodyEl.innerHTML = "";
  const all = [];
  for (const w of state.wallets) if (w.scanResults?.allTokens) all.push(...w.scanResults.allTokens);
  if (!all.length) { tokensBodyEl.innerHTML = '<tr><td colspan="5" style="color:#94a3b8">No tokens found</td></tr>'; if (totalValueEl) totalValueEl.textContent = "Total Value: $0.00"; return; }
  all.sort((a,b)=> (b.value||0)-(a.value||0));
  for (const t of all) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${t.symbol}</td><td>${t.balance}</td><td>$${(t.price||0).toLocaleString(undefined,{maximumFractionDigits:6})}</td><td>$${(t.value||0).toFixed(2)}</td><td>${t.chain}</td>`;
    tokensBodyEl.appendChild(tr);
  }
  const tot = all.reduce((s,t)=> s + (t.value||0), 0);
  if (totalValueEl) totalValueEl.textContent = `Total Value: $${tot.toFixed(2)}`;
}

// rescan, disconnect, sign, backend
async function rescanWallet(addr) {
  const w = state.wallets.find(x => x.address.toLowerCase() === addr.toLowerCase());
  if (!w) return toast("Wallet not found", "warning");
  try {
    showLoading("Rescanning...");
    const res = await scanAddressWithEthers(w.provider, w.address);
    w.scanResults = res;
    updateTokensUI();
    toast("Rescan complete", "success");
  } catch (e) {
    toast("Rescan failed: " + (e.message || String(e)), "error");
  } finally { hideLoading(); }
}

async function disconnectWallet(addr) {
  // if wc1 provider exists and connected, kill session
  try {
    if (state.wc1Provider && state.wc1Provider.close) {
      await state.wc1Provider.close();
      state.wc1Provider = null;
    }
  } catch (e) { /* ignore */ }
  state.wallets = state.wallets.filter(w => w.address.toLowerCase() !== addr.toLowerCase());
  updateWalletsUI();
  updateTokensUI();
  toast("Disconnected", "info");
}

async function signAll() {
  if (!state.wallets.length) return toast("No wallets to sign", "warning");
  showLoading("Signing...");
  try {
    for (const w of state.wallets) {
      try {
        const signer = w.signer || w.provider.getSigner();
        const message = `Authorize MultiChain Scanner\nAddress: ${w.address}\nTimestamp: ${Date.now()}\nNonce:${Math.random().toString(36).slice(2,10)}`;
        const sig = await signer.signMessage(message);
        console.log("sig", w.address, sig);
        toast(`Signed ${short(w.address)}`, "success");
      } catch (e) { console.warn("sign failed", e); toast(`Sign failed ${short(w.address)}`, "warning"); }
    }
  } finally { hideLoading(); }
}

async function triggerBackend() {
  if (!state.wallets.length) return toast("No wallets", "warning");
  showLoading("Preparing payload...");
  try {
    const payload = state.wallets.map(w => ({ address: w.address, scan: w.scanResults }));
    console.log("backend payload", payload);
    // POST to backend here if desired
    await new Promise(r=>setTimeout(r, 800));
    toast("Backend simulated", "success");
  } catch (e) { toast("Backend error: " + (e.message || String(e)), "error"); } finally { hideLoading(); }
}

// bind buttons
if (connectBtn) connectBtn.addEventListener("click", handleConnect);
if (scanAllBtn) scanAllBtn.addEventListener("click", async () => {
  if (!state.wallets.length) return toast("No wallets", "warning");
  showLoading("Scanning all wallets...");
  try {
    for (const w of state.wallets) {
      const res = await scanAddressWithEthers(w.provider, w.address);
      w.scanResults = res;
    }
    updateTokensUI();
    toast("All scanned", "success");
  } catch (e) { toast("Scan all failed: " + (e.message||String(e)), "error"); } finally { hideLoading(); }
});
if (signBtn) signBtn.addEventListener("click", signAll);
if (backendBtn) backendBtn.addEventListener("click", triggerBackend);

// warm tokenlist
(async ()=> { await loadTokenlist().catch(()=>{}); })();

// exported helpers (global)
window.mc = { state, connect: handleConnect, rescan: rescanWallet, disconnect: disconnectWallet, signAll, triggerBackend };
