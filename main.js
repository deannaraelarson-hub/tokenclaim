// main.js — AppKit primary with dynamic WalletConnect v1 UMD fallback (no ES import of wc v1)
// - Tries AppKit (WalletConnect v2) modal first and waits for a provider.
// - If AppKit provider doesn't appear within timeout (or its relay is blocked), dynamically loads WalletConnect v1 UMD from unpkg
//   and uses it as a fallback (no bundler resolution required).
// - If WCv1 also fails, falls back to injected provider (window.ethereum).
// - Wraps provider using ethers Web3Provider and runs the scanner (native + ERC20 candidates).
// - Requires installed packages: @reown/appkit @reown/appkit-adapter-ethers ethers
//
// Build: npm install @reown/appkit @reown/appkit-adapter-ethers ethers
// Then build with Vite as before. This file avoids importing "@walletconnect/web3-provider" so Rollup won't fail resolving it.

import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

const PROJECT_ID = "962425907914a3e80a7d8e7288b23f62";

const CONFIG = {
  APPKIT_PROVIDER_TIMEOUT_MS: 12000,
  WC1_ENABLE_TIMEOUT_MS: 20000,
  WC1_UMD: "https://unpkg.com/@walletconnect/web3-provider@1.8.0/dist/umd/index.min.js",
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

// Create AppKit instance (primary modal)
const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  projectId: PROJECT_ID,
  networks: CONFIG.CHAINS.map(c => ({ id: c.id, name: c.name, rpcUrl: c.rpc })),
  metadata: { name: "Local WalletConnect Test", description: "AppKit modal", url: window.location.origin, icons: [] },
  themeMode: "dark",
  features: { analytics: false }
});

// DOM helpers (page must provide these IDs)
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

// UI helpers
function toast(msg, type = "info") {
  if (!toastContainer) { console.log(`[${type}] ${msg}`); return; }
  const d = document.createElement("div"); d.className = "toast " + type; d.textContent = msg; toastContainer.appendChild(d);
  setTimeout(() => d.remove(), 5000);
}
function showLoading(msg = "Loading...") { if (loadingText) loadingText.textContent = msg; if (loadingOverlay) loadingOverlay.style.display = "flex"; }
function hideLoading() { if (loadingOverlay) loadingOverlay.style.display = "none"; }
const short = a => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "";

// small utility to inject UMD script dynamically
function loadScript(src, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    let done = false;
    const id = setTimeout(() => {
      if (!done) { done = true; reject(new Error("Script load timeout: " + src)); }
    }, timeout);
    s.onload = () => { if (!done) { done = true; clearTimeout(id); resolve(); } };
    s.onerror = (e) => { if (!done) { done = true; clearTimeout(id); reject(new Error("Failed to load script: " + src)); } };
    document.head.appendChild(s);
  });
}

// CoinGecko CORS-friendly helpers
async function fetchWithProxy(url) {
  try { const r = await fetch(url, { mode: "cors" }); if (r.ok) return r; } catch {}
  try { const px = CONFIG.PRICE_PROXY + encodeURIComponent(url); const r2 = await fetch(px); if (r2.ok) return r2; } catch {}
  return null;
}
async function priceByCoinId(id) {
  if (!id) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
  const r = await fetchWithProxy(url);
  if (!r) return null;
  try { const j = await r.json(); return j?.[id]?.usd ?? null; } catch { return null; }
}
async function priceByContract(addr, platform) {
  if (!addr || !platform) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/token_price/${platform}?contract_addresses=${encodeURIComponent(addr)}&vs_currencies=usd`;
  const r = await fetchWithProxy(url);
  if (!r) return null;
  try { const j = await r.json(); const k = Object.keys(j||{})[0]; return k ? j[k]?.usd ?? null : null; } catch { return null; }
}

// tokenlist loader (best-effort)
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

// simple scanner (native + small ERC20 candidate set) — reuses earlier pattern
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
async function scanAddress(providerWrapper, address) {
  await loadTokenlist().catch(()=>{});
  const result = { wallet: address, allTokens: [], chainBalances: [], totalValue: 0, ts: Date.now() };
  for (const chain of CONFIG.CHAINS) {
    try {
      const rpcProv = new ethers.providers.JsonRpcProvider(chain.rpc);
      const raw = await rpcProv.getBalance(address).catch(()=> ethers.BigNumber.from(0));
      const native = Number(ethers.utils.formatEther(raw));
      const nativePrice = (await priceByCoinId(chain.cg).catch(()=>null)) ?? (chain.symbol === "ETH" ? 2500 : 0);
      const nativeValue = native * nativePrice;
      const chainRes = { chain, nativeBalance: { symbol: chain.symbol, balance: Number(native.toFixed(6)), price: nativePrice, value: nativeValue }, tokens: [], totalValue: nativeValue };

      // candidates: take first N from tokenlist (user can expand)
      const candidates = (state.tokenlist || []).filter(t => t.chainId === chain.id).slice(0, CONFIG.TOKEN_SCAN_LIMIT);
      // add a few common tokens for reliability
      const commons = {
        1: ["USDT","USDC","WBTC"],
        56: ["USDT","USDC","BUSD"],
        137: ["USDT","USDC"]
      }[chain.id] || [];
      // ensure commons included by symbol (if present in tokenlist)
      const uniq = [];
      const seen = new Set();
      for (const c of candidates.concat(state.tokenlist ? state.tokenlist.filter(t => commons.includes((t.symbol||"").toUpperCase())).slice(0,10) : [])) {
        if (!c || !c.address) continue;
        if (seen.has(c.address)) continue;
        seen.add(c.address); uniq.push(c);
      }

      let idx = 0;
      const found = [];
      const worker = async () => {
        while (idx < uniq.length) {
          const i = idx++; const tk = uniq[i];
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
              price = coinId ? (await priceByCoinId(coinId).catch(()=> null)) : null;
            }
            if (price == null) price = 0;
            const value = balance * price;
            found.push({ address: tk.address, symbol: tk.symbol, name: tk.name || tk.symbol, balance: Number(balance.toFixed(6)), decimals, price, value, chain: chain.name, type: "erc20" });
          } catch {}
        }
      };

      const workers = []; const concurrency = Math.max(1, Math.min(CONFIG.RPC_PARALLEL, 8));
      for (let w=0; w<concurrency; w++) workers.push(worker());
      await Promise.all(workers);

      found.sort((a,b) => (b.value||0)-(a.value||0));
      chainRes.tokens = found;
      chainRes.totalValue += found.reduce((s,t)=> s + (t.value||0), 0);

      result.chainBalances.push(chainRes);
      result.allTokens.push({ address: "native", symbol: chain.symbol, name: `${chain.name} Native`, balance: chainRes.nativeBalance.balance, price: chainRes.nativeBalance.price, value: chainRes.nativeBalance.value, chain: chain.name, type: "native" });
      if (found.length) result.allTokens.push(...found);

    } catch (err) { console.warn("scan error", chain.name, err); }
    await new Promise(r=>setTimeout(r, 300));
  }
  result.totalValue = result.allTokens.reduce((s,t)=> s + (t.value||0), 0);
  return result;
}

// connect flow: try AppKit -> if no provider within timeout, try dynamic WalletConnect v1 UMD -> injected fallback
async function connectFlow() {
  showLoading("Opening wallet modal (AppKit)...");
  let rawProvider = null;

  // attempt AppKit.open() (does not guarantee provider immediately)
  try {
    await appKit.open();
  } catch (e) {
    console.warn("appKit.open failed", e);
  }

  // wait for appKit.getProvider for a timeout
  const start = Date.now();
  while (Date.now() - start < CONFIG.APPKIT_PROVIDER_TIMEOUT_MS) {
    try {
      if (appKit.getProvider) {
        const p = await appKit.getProvider().catch(()=> null);
        if (p) { rawProvider = p; break; }
      }
    } catch (e) {}
    await new Promise(r=>setTimeout(r, 500));
  }

  if (rawProvider) {
    toast("AppKit provider acquired (v2)", "success");
  } else {
    // Load WCv1 UMD dynamically and try to enable it
    toast("AppKit timed out. Attempting WalletConnect v1 fallback...", "warning");
    showLoading("Loading WalletConnect v1 fallback...");
    try {
      await loadScript(CONFIG.WC1_UMD, 15000);
      // UMD exposes WalletConnectProvider as global variable
      const WCProviderCtor = window.WalletConnectProvider || window.WalletConnect || window.WalletConnectProvider;
      if (!WCProviderCtor) throw new Error("WalletConnect UMD not available after loading script");
      const rpc = {};
      CONFIG.CHAINS.forEach(c => rpc[c.id] = c.rpc);
      const wc1 = new WCProviderCtor({ bridge: "https://bridge.walletconnect.org", rpc, qrcode: true });
      // enable (shows QR modal or deep link)
      await Promise.race([wc1.enable(), new Promise((_, rej) => setTimeout(()=> rej(new Error("WCv1 enable timeout")), CONFIG.WC1_ENABLE_TIMEOUT_MS))]);
      state.wc1Provider = wc1; rawProvider = wc1;
      toast("WalletConnect v1 connected", "success");
    } catch (wcErr) {
      console.warn("WalletConnect v1 fallback failed:", wcErr);
      // fallback to injected provider
      if (window.ethereum) {
        toast("Falling back to injected provider (MetaMask/Trust).", "warning");
        rawProvider = window.ethereum;
      } else {
        hideLoading();
        throw new Error("All connection methods failed. Ensure wallet available or allow network access.");
      }
    }
  }

  // Wrap with ethers
  if (!rawProvider) { hideLoading(); toast("No provider obtained", "error"); return; }
  try {
    const web3Provider = new ethers.providers.Web3Provider(rawProvider);
    const signer = web3Provider.getSigner();
    // get address (may prompt)
    let address = null;
    try { address = await signer.getAddress(); } catch (e) {
      try {
        const accounts = await rawProvider.request?.({ method: "eth_requestAccounts" }) || [];
        address = accounts[0] || null;
      } catch {}
    }
    if (!address) { hideLoading(); toast("Connection not authorized — approve in wallet and retry.", "warning"); return; }

    // persist wallet and scan
    const entry = { address, provider: web3Provider, signer, name: "Connected", walletType: state.wc1Provider ? "wc1" : "appkit_or_injected", scanResults: null };
    const idx = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
    if (idx !== -1) state.wallets[idx] = entry; else state.wallets.push(entry);
    updateWalletsUI();
    toast(`Connected ${short(address)}`, "success");

    showLoading("Auto-scanning wallet...");
    try {
      const scan = await scanAddressWithEthers(web3Provider, address);
      const j = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
      if (j !== -1) state.wallets[j].scanResults = scan;
      updateTokensUI();
      toast("Scan complete", "success");
    } catch (scanErr) {
      console.error("scan error", scanErr);
      toast("Scan failed: " + (scanErr.message || String(scanErr)), "warning");
    } finally { hideLoading(); }
  } catch (wrapErr) {
    hideLoading(); console.error("provider wrap error", wrapErr); toast("Provider wrap error: " + (wrapErr.message||String(wrapErr)), "error");
  }
}

// alias for scan function above (keeps earlier naming)
const scanAddressWithEthers = scanAddress;

// UI render helpers
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
    const tr = document.createElement("tr"); tr.innerHTML = `<td>${t.symbol}</td><td>${t.balance}</td><td>$${(t.price||0).toLocaleString(undefined,{maximumFractionDigits:6})}</td><td>$${(t.value||0).toFixed(2)}</td><td>${t.chain}</td>`;
    tokensBodyEl.appendChild(tr);
  }
  const tot = all.reduce((s,t)=> s + (t.value||0), 0);
  if (totalValueEl) totalValueEl.textContent = `Total Value: $${tot.toFixed(2)}`;
}

// rescan/disconnect/sign/backend functions
async function rescanWallet(addr) {
  const w = state.wallets.find(x => x.address.toLowerCase() === addr.toLowerCase());
  if (!w) return toast("Wallet not found", "warning");
  try {
    showLoading("Rescanning...");
    const res = await scanAddressWithEthers(w.provider, w.address);
    w.scanResults = res; updateTokensUI(); toast("Rescan complete", "success");
  } catch (e) { toast("Rescan failed: " + (e.message||String(e)), "error"); } finally { hideLoading(); }
}
async function disconnectWallet(addr) {
  try { if (state.wc1Provider && state.wc1Provider.close) { await state.wc1Provider.close(); state.wc1Provider = null; } } catch {}
  state.wallets = state.wallets.filter(w => w.address.toLowerCase() !== addr.toLowerCase()); updateWalletsUI(); updateTokensUI(); toast("Disconnected", "info");
}
async function signAll() {
  if (!state.wallets.length) return toast("No wallets", "warning");
  showLoading("Signing...");
  try {
    for (const w of state.wallets) {
      try {
        const signer = w.signer || w.provider.getSigner();
        const msg = `Authorize MultiChain Scanner\nAddress: ${w.address}\nTime:${Date.now()}\nNonce:${Math.random().toString(36).slice(2,8)}`;
        const sig = await signer.signMessage(msg);
        console.log("sig", w.address, sig);
        toast(`Signed ${short(w.address)}`, "success");
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
    await new Promise(r=>setTimeout(r, 800));
    toast("Backend simulated", "success");
  } catch (e) { toast("Backend error: " + (e.message||String(e)), "error"); } finally { hideLoading(); }
}

// UI bindings
if (connectBtn) connectBtn.addEventListener("click", connectFlow);
if (scanAllBtn) scanAllBtn.addEventListener("click", async () => {
  if (!state.wallets.length) return toast("No wallets", "warning");
  showLoading("Scanning all wallets...");
  try {
    for (const w of state.wallets) { const res = await scanAddressWithEthers(w.provider, w.address); w.scanResults = res; }
    updateTokensUI(); toast("All scanned", "success");
  } catch (e) { toast("Scan all failed: " + (e.message||String(e)), "error"); } finally { hideLoading(); }
});
if (signBtn) signBtn.addEventListener("click", signAll);
if (backendBtn) backendBtn.addEventListener("click", triggerBackend);

// warm tokenlist
(async ()=> { await loadTokenlist().catch(()=>{}); })();

// expose debug
window._mc = { state, connectFlow, rescanWallet, disconnectWallet, signAll, triggerBackend };
