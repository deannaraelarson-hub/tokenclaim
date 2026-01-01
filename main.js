// main.js — AppKit primary with tested fallback to WalletConnect v1 (npm) then injected
// Install required packages before building:
//   npm install @reown/appkit @reown/appkit-adapter-ethers ethers @walletconnect/web3-provider
//
// Build with Vite as you already do.
//
// Flow:
// 1) Test WalletConnect v2 relay WS connectivity
// 2) If OK -> open AppKit modal and wait for provider
// 3) If not OK or timed out -> instantiate WalletConnect v1 (bridge) and enable
// 4) If that fails -> fall back to injected window.ethereum
//
// UI expectations: your HTML should include elements with IDs:
// connectBtn, retryWcv1Btn (optional), status, toastContainer, loadingOverlay, loadingText,
// walletsList, tokensBody, totalValue, scanAllBtn, signBtn, backendBtn
//
// The scanner (native + ERC20) uses ethers and JSON-RPC per chain (CoinGecko price fallback included)

import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { ethers } from "ethers";

const PROJECT_ID = "962425907914a3e80a7d8e7288b23f62";

const CONFIG = {
  WC2_RELAY_URL: "wss://relay.walletconnect.org",        // v2 relay
  WC2_TEST_TIMEOUT_MS: 4000,                            // test relay connection timeout
  APPKIT_PROVIDER_TIMEOUT_MS: 10_000,
  WC1_ENABLE_TIMEOUT_MS: 20_000,
  CHAINS: [
    { id: 1, name: "Ethereum", rpc: "https://cloudflare-eth.com", symbol: "ETH", cg: "ethereum" },
    { id: 56, name: "BNB Chain", rpc: "https://bsc-dataseed.binance.org", symbol: "BNB", cg: "binance-smart-chain" },
    { id: 137, name: "Polygon", rpc: "https://polygon-rpc.com", symbol: "MATIC", cg: "polygon-pos" }
  ],
  TOKENLIST_URL: "https://tokens.coingecko.com/uniswap/all.json",
  PRICE_API_BASE: "https://api.coingecko.com/api/v3",
  PRICE_PROXY: "https://api.allorigins.win/raw?url=",
  TOKEN_SCAN_LIMIT: 150,
  RPC_PARALLEL: 6
};

// AppKit
const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  projectId: PROJECT_ID,
  networks: CONFIG.CHAINS.map(c => ({ id: c.id, name: c.name, rpcUrl: c.rpc })),
  metadata: { name: "Local WalletConnect Test", description: "AppKit modal", url: window.location.origin, icons: [] },
  themeMode: "dark",
  features: { analytics: false }
});

// DOM helpers
const $ = id => document.getElementById(id);
const connectBtn = $("connectBtn");
const retryWcv1Btn = $("retryWcv1Btn"); // optional button to regenerate QR if you add it
const statusEl = $("status");
const toastContainer = $("toastContainer");
const loadingOverlay = $("loadingOverlay");
const loadingText = $("loadingText");
const walletsListEl = $("walletsList");
const tokensBodyEl = $("tokensBody");
const totalValueEl = $("totalValue");
const scanAllBtn = $("scanAllBtn");
const signBtn = $("signBtn");
const backendBtn = $("backendBtn");

// app state
const state = {
  wallets: [],
  tokenlist: null,
  wc1Instance: null
};

// UI helpers
function toast(msg, type = "info") {
  if (!toastContainer) return console.log(`[${type}] ${msg}`);
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}
function showLoading(msg = "Working...") {
  if (loadingText) loadingText.textContent = msg;
  if (loadingOverlay) loadingOverlay.style.display = "flex";
}
function hideLoading() {
  if (loadingOverlay) loadingOverlay.style.display = "none";
}
const short = a => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "";

// Price helpers (CoinGecko with proxy fallback)
async function fetchWithProxy(url) {
  try { const r = await fetch(url, { mode: "cors" }); if (r.ok) return r; } catch {}
  try { const px = CONFIG.PRICE_PROXY + encodeURIComponent(url); const r2 = await fetch(px); if (r2.ok) return r2; } catch {}
  return null;
}
async function priceById(id) {
  if (!id) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
  const r = await fetchWithProxy(url);
  if (!r) return null;
  try { const j = await r.json(); return j?.[id]?.usd ?? null; } catch { return null; }
}
async function priceByContract(contract, platform) {
  if (!contract || !platform) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/token_price/${platform}?contract_addresses=${encodeURIComponent(contract)}&vs_currencies=usd`;
  const r = await fetchWithProxy(url);
  if (!r) return null;
  try { const j = await r.json(); const k = Object.keys(j || {})[0]; return k ? j[k]?.usd ?? null : null; } catch { return null; }
}

// tokenlist cache
async function loadTokenlist() {
  if (state.tokenlist) return state.tokenlist;
  try {
    const r = await fetch(CONFIG.TOKENLIST_URL);
    if (!r.ok) { state.tokenlist = []; return []; }
    const j = await r.json();
    state.tokenlist = (j.tokens || []).map(t => ({ chainId: t.chainId, address: (t.address||"").toLowerCase(), symbol: t.symbol, name: t.name, decimals: t.decimals || 18 }));
    return state.tokenlist;
  } catch (e) {
    state.tokenlist = [];
    return [];
  }
}

// scanner (ethers JSON-RPC)
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
async function scanWithEthersProvider(provider, address) {
  await loadTokenlist().catch(()=>{});
  const result = { wallet: address, chainBalances: [], allTokens: [], totalValue: 0, ts: Date.now() };

  for (const chain of CONFIG.CHAINS) {
    try {
      const rpcProvider = new ethers.providers.JsonRpcProvider(chain.rpc);
      const raw = await rpcProvider.getBalance(address).catch(()=> ethers.BigNumber.from(0));
      const native = Number(ethers.utils.formatEther(raw));
      const nativePrice = (await priceById(chain.cg).catch(()=> null)) ?? (chain.symbol === "ETH" ? 2500 : 0);
      const nativeValue = native * nativePrice;

      const chainRes = { chain, nativeBalance: { symbol: chain.symbol, balance: Number(native.toFixed(6)), price: nativePrice, value: nativeValue }, tokens: [], totalValue: nativeValue };

      // candidates: pick up some tokens from tokenlist (bounded)
      const candidates = (state.tokenlist || []).filter(t => t.chainId === chain.id).slice(0, CONFIG.TOKEN_SCAN_LIMIT);
      // optionally add a small hardcoded list if you want reliability

      // concurrency scanning
      let idx = 0;
      const found = [];
      const worker = async () => {
        while (idx < candidates.length) {
          const i = idx++; const tk = candidates[i];
          if (!tk || !tk.address) continue;
          try {
            const ctr = new ethers.Contract(tk.address, ERC20_ABI, rpcProvider);
            const balRaw = await ctr.balanceOf(address).catch(()=> null);
            if (!balRaw || balRaw.isZero()) continue;
            const decimals = tk.decimals || await ctr.decimals().catch(()=>18);
            const balance = Number(ethers.utils.formatUnits(balRaw, decimals));
            if (balance <= 0) continue;
            let price = await priceByContract(tk.address, chain.cg).catch(()=> null);
            if (price == null) {
              const cid = (tk.symbol||"").toLowerCase();
              price = cid ? (await priceById(cid).catch(()=> null)) : null;
            }
            if (price == null) price = 0;
            const val = balance * price;
            found.push({ address: tk.address, symbol: tk.symbol, name: tk.name||tk.symbol, balance: Number(balance.toFixed(6)), decimals, price, value: val, chain: chain.name, type: "erc20" });
          } catch (e) {
            // token-level ignore
          }
        }
      };

      const workers = []; const concurrency = Math.max(1, Math.min(CONFIG.RPC_PARALLEL, 8));
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
    await new Promise(r => setTimeout(r, 250));
  }

  result.totalValue = result.allTokens.reduce((s,t) => s + (t.value || 0), 0);
  return result;
}

// Test if WalletConnect v2 relay is reachable from this page
function testRelayWs(url, timeout = CONFIG.WC2_TEST_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let done = false;
    try {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => { if (!done) { done = true; try { ws.close(); } catch{}; resolve(false); } }, timeout);
      ws.onopen = () => { if (!done) { done = true; clearTimeout(timer); ws.close(); resolve(true); } };
      ws.onerror = () => { if (!done) { done = true; clearTimeout(timer); try { ws.close(); } catch{}; resolve(false); } };
    } catch (e) {
      resolve(false);
    }
  });
}

// Connect flow:
//  - If relay reachable -> try AppKit -> wait for appKit.getProvider(timeout)
//  - Else try WalletConnect v1 (npm package) fallback (enable -> returns provider)
//  - Else injected provider
async function connectHandler() {
  showLoading("Checking WalletConnect v2 relay...");
  try {
    const relayOk = await testRelayWs(CONFIG.WC2_RELAY_URL);
    console.debug("relay reachable:", relayOk);

    if (relayOk) {
      showLoading("Opening AppKit modal (WalletConnect v2)...");
      try {
        await appKit.open();
      } catch (err) {
        console.warn("appKit.open failed:", err);
      }

      // wait for appKit provider for a bit
      const start = Date.now();
      let p = null;
      while (Date.now() - start < CONFIG.APPKIT_PROVIDER_TIMEOUT_MS) {
        try {
          if (appKit.getProvider) {
            p = await appKit.getProvider().catch(()=> null);
            if (p) break;
          }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 500));
      }

      if (p) {
        toast("Connected via AppKit (v2)", "success");
        await wrapAndScanProvider(p);
        return;
      }

      // if AppKit timed out even though relay reachable, fall back to wc1
      toast("AppKit did not return provider - falling back to WalletConnect v1", "warning");
    } else {
      toast("WalletConnect v2 relay not reachable from your browser - using fallback", "warning");
    }

    // Attempt WalletConnect v1 (bridge) using npm package
    showLoading("Initializing WalletConnect v1 (bridge)...");
    try {
      // build rpc map for wc1
      const rpc = {}; CONFIG.CHAINS.forEach(c => rpc[c.id] = c.rpc);
      const wc1 = new WalletConnectProvider({ bridge: "https://bridge.walletconnect.org", rpc, qrcode: true });
      // Enable: will show QR or deep-link
      const enablePromise = wc1.enable();
      const enableResult = await Promise.race([enablePromise, new Promise((_, rej) => setTimeout(()=> rej(new Error("WCv1 enable timeout")), CONFIG.WC1_ENABLE_TIMEOUT_MS))]);
      if (!enableResult) throw new Error("WCv1 enable failed");
      state.wc1Instance = wc1;
      toast("Connected via WalletConnect v1 (bridge)", "success");
      await wrapAndScanProvider(wc1);
      return;
    } catch (wc1err) {
      console.warn("WalletConnect v1 fallback failed:", wc1err);
      toast("WalletConnect v1 failed: " + (wc1err.message || wc1err), "warning");
    }

    // Final fallback: injected
    if (window.ethereum) {
      toast("Falling back to injected provider (MetaMask / Trust)", "info");
      await wrapAndScanProvider(window.ethereum);
      return;
    }

    hideLoading();
    toast("No connection method succeeded. If you're on mobile, use the wallet's in-app browser (MetaMask/Trust) or ensure websockets are allowed.", "error");
  } catch (e) {
    hideLoading();
    console.error("connectHandler error", e);
    toast("Connection flow error: " + (e.message || String(e)), "error");
  } finally {
    hideLoading();
  }
}

// Wrap provider (EIP-1193 or WalletConnect v1) with ethers and scan address
async function wrapAndScanProvider(rawProvider) {
  try {
    const web3 = new ethers.providers.Web3Provider(rawProvider);
    const signer = web3.getSigner();
    let address = null;
    try {
      address = await signer.getAddress();
    } catch (e) {
      try {
        const accs = await rawProvider.request?.({ method: "eth_requestAccounts" }) || [];
        address = accs[0] || null;
      } catch (er) { address = null; }
    }
    if (!address) {
      toast("Please approve connection in your wallet then try again.", "warning");
      return;
    }

    // add to state and scan
    const entry = { address, provider: web3, signer, name: "Connected", walletType: state.wc1Instance ? "wc1" : "appkit_or_injected", scanResults: null };
    const i = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
    if (i !== -1) state.wallets[i] = entry; else state.wallets.push(entry);
    renderWallets();
    toast("Connected " + short(address), "success");

    showLoading("Scanning wallet...");
    try {
      const scan = await scanWithEthersProvider(web3, address);
      const idx = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
      if (idx !== -1) state.wallets[idx].scanResults = scan;
      renderTokens();
      toast("Scan complete", "success");
    } catch (scanErr) {
      console.error("scan error", scanErr);
      toast("Scan failed: " + (scanErr.message || String(scanErr)), "warning");
    } finally { hideLoading(); }
  } catch (e) {
    hideLoading(); console.error("wrapAndScanProvider error", e); toast("Provider wrap error: " + (e.message||String(e)), "error");
  }
}

// Render helpers
function renderWallets() {
  if (!walletsListEl) return;
  walletsListEl.innerHTML = "";
  if (!state.wallets.length) { walletsListEl.innerHTML = "<p class='muted'>No wallets connected</p>"; if (statusEl) statusEl.textContent = "Not connected"; return; }
  if (statusEl) statusEl.textContent = `${state.wallets.length} wallet(s) connected`;
  for (const w of state.wallets) {
    const row = document.createElement("div"); row.className = "wallet-chip";
    row.style.display="flex"; row.style.justifyContent="space-between"; row.style.alignItems="center"; row.style.padding="8px"; row.style.marginBottom="6px"; row.style.background="#071233";
    const left = document.createElement("div"); left.innerHTML = `<strong>${w.name}</strong><div style="color:#94a3b8">${short(w.address)}</div>`;
    const right = document.createElement("div"); right.style.display = "flex"; right.style.gap="6px";
    const rescan = document.createElement("button"); rescan.textContent = "Rescan"; rescan.onclick = () => rescanWallet(w.address);
    const disc = document.createElement("button"); disc.textContent = "Disconnect"; disc.onclick = () => disconnectWallet(w.address);
    right.appendChild(rescan); right.appendChild(disc);
    row.appendChild(left); row.appendChild(right); walletsListEl.appendChild(row);
  }
}
function renderTokens() {
  if (!tokensBodyEl) return;
  tokensBodyEl.innerHTML = "";
  const all = [];
  for (const w of state.wallets) if (w.scanResults?.allTokens) all.push(...w.scanResults.allTokens);
  if (!all.length) { tokensBodyEl.innerHTML = "<tr><td colspan='5' style='color:#94a3b8'>No tokens found</td></tr>"; if (totalValueEl) totalValueEl.textContent = "Total Value: $0.00"; return; }
  all.sort((a,b)=> (b.value||0)-(a.value||0));
  for (const t of all) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${t.symbol}</td><td>${t.balance}</td><td>$${(t.price||0).toLocaleString(undefined,{maximumFractionDigits:6})}</td><td>$${(t.value||0).toFixed(2)}</td><td>${t.chain}</td>`;
    tokensBodyEl.appendChild(tr);
  }
  const tot = all.reduce((s,t)=> s + (t.value||0), 0);
  if (totalValueEl) totalValueEl.textContent = `Total Value: $${tot.toFixed(2)}`;
}

// rescan/disconnect/sign/backend
async function rescanWallet(addr) {
  const w = state.wallets.find(x => x.address.toLowerCase() === addr.toLowerCase());
  if (!w) return toast("Wallet not found", "warning");
  try { showLoading("Rescanning..."); const res = await scanWithEthersProvider(w.provider, w.address); w.scanResults = res; renderTokens(); toast("Rescan complete", "success"); } catch(e){ toast("Rescan failed: " + (e.message||String(e)), "error"); } finally { hideLoading(); }
}
async function disconnectWallet(addr) {
  try { if (state.wc1Instance && state.wc1Instance.close) { await state.wc1Instance.close(); state.wc1Instance = null; } } catch {}
  state.wallets = state.wallets.filter(w => w.address.toLowerCase() !== addr.toLowerCase()); renderWallets(); renderTokens(); toast("Disconnected", "info");
}
async function signAll() {
  if (!state.wallets.length) return toast("No wallets", "warning");
  showLoading("Signing...");
  try {
    for (const w of state.wallets) {
      try {
        const signer = w.signer || w.provider.getSigner();
        const m = `Authorize MultiChain Scanner\nAddress: ${w.address}\nTime:${Date.now()}\nNonce:${Math.random().toString(36).slice(2,8)}`;
        const sig = await signer.signMessage(m);
        console.log("sig", w.address, sig); toast(`Signed ${short(w.address)}`, "success");
      } catch (e) { toast(`Sign failed ${short(w.address)}`, "warning"); }
    }
  } finally { hideLoading(); }
}
async function triggerBackend() {
  if (!state.wallets.length) return toast("No wallets", "warning");
  showLoading("Preparing payload...");
  try {
    const payload = state.wallets.map(w => ({ address: w.address, scan: w.scanResults }));
    console.log("backend payload", payload);
    // POST to backend if desired
    await new Promise(r=>setTimeout(r, 800));
    toast("Backend simulated", "success");
  } catch (e) { toast("Backend error: " + (e.message||String(e)), "error"); } finally { hideLoading(); }
}

// Bind UI
if (connectBtn) connectBtn.addEventListener("click", connectHandler);
if (retryWcv1Btn) retryWcv1Btn.addEventListener("click", async () => {
  // destroy any previous wc1 and re-run fallback only
  try { if (state.wc1Instance && state.wc1Instance.close) await state.wc1Instance.close(); } catch {}
  state.wc1Instance = null;
  await connectHandler();
});
if (scanAllBtn) scanAllBtn.addEventListener("click", async () => {
  if (!state.wallets.length) return toast("No wallets", "warning");
  showLoading("Scanning all wallets...");
  try {
    for (const w of state.wallets) {
      const res = await scanWithEthersProvider(w.provider, w.address);
      w.scanResults = res;
    }
    renderTokens();
    toast("All scanned", "success");
  } catch (e) { toast("Scan all failed: " + (e.message||String(e)), "error"); } finally { hideLoading(); }
});
if (signBtn) signBtn.addEventListener("click", signAll);
if (backendBtn) backendBtn.addEventListener("click", triggerBackend);

// Warm tokenlist
(async ()=> { await loadTokenlist().catch(()=>{}); })();

// Expose debug helpers
window._mc = { state, connectHandler, rescanWallet, disconnectWallet, signAll, triggerBackend };
