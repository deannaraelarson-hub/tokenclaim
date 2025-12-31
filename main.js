// main.js — AppKit + Ethers multi-chain scanner with robust provider wait + fallbacks
// Usage: install packages via npm: @reown/appkit @reown/appkit-adapter-ethers ethers
// Build with Vite (npm run build). Keep your projectId unchanged.

import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

const projectId = "962425907914a3e80a7d8e7288b23f62";

const CONFIG = {
  EVM_CHAINS: [
    { id: 1, name: "Ethereum", rpc: "https://cloudflare-eth.com", symbol: "ETH", cgPlatform: "ethereum" },
    { id: 56, name: "BNB Chain", rpc: "https://bsc-dataseed.binance.org", symbol: "BNB", cgPlatform: "binance-smart-chain" },
    { id: 137, name: "Polygon", rpc: "https://polygon-rpc.com", symbol: "MATIC", cgPlatform: "polygon-pos" },
    { id: 42161, name: "Arbitrum", rpc: "https://arb1.arbitrum.io/rpc", symbol: "ETH", cgPlatform: "arbitrum-one" },
    { id: 10, name: "Optimism", rpc: "https://mainnet.optimism.io", symbol: "ETH", cgPlatform: "optimistic-ethereum" },
    { id: 43114, name: "Avalanche", rpc: "https://api.avax.network/ext/bc/C/rpc", symbol: "AVAX", cgPlatform: "avalanche" },
    { id: 250, name: "Fantom", rpc: "https://rpc.ankr.com/fantom", symbol: "FTM", cgPlatform: "fantom" }
  ],
  PRICE_API_BASE: "https://api.coingecko.com/api/v3",
  PRICE_CORS_PROXY: "https://api.allorigins.win/raw?url=",
  TOKENLIST_URL: "https://tokens.coingecko.com/uniswap/all.json",
  TOKEN_SCAN_LIMIT: 220,
  RPC_CONCURRENCY: 6,
  PROVIDER_WAIT_MS: 20000 // how long to wait for AppKit provider before fallback
};

// Create AppKit
const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  projectId,
  networks: CONFIG.EVM_CHAINS.map(c => ({ id: c.id, name: c.name, rpcUrl: c.rpc })),
  metadata: {
    name: "Local WalletConnect Test",
    description: "AppKit modal for multi-wallet connection",
    url: window.location.origin,
    icons: []
  },
  themeMode: "dark",
  features: { analytics: false }
});

// DOM refs (page should have these IDs)
const connectBtn = document.getElementById("connectBtn");
const scanAllBtn = document.getElementById("scanAllBtn");
const signBtn = document.getElementById("signBtn");
const backendBtn = document.getElementById("backendBtn");
const statusEl = document.getElementById("status");
const walletsListEl = document.getElementById("walletsList");
const tokensBodyEl = document.getElementById("tokensBody");
const totalValueEl = document.getElementById("totalValue");
const toastContainer = document.getElementById("toastContainer");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");

// Application state
const state = {
  wallets: [],
  tokenlist: null
};

// Utilities: UI & toast
function toast(msg, type = "info") {
  if (!toastContainer) return console.log(`[${type}]`, msg);
  const d = document.createElement("div");
  d.className = "toast " + type;
  d.textContent = msg;
  toastContainer.appendChild(d);
  setTimeout(() => d.remove(), 5000);
}
function showLoading(msg = "Loading...") {
  if (loadingText) loadingText.textContent = msg;
  if (loadingOverlay) loadingOverlay.style.display = "flex";
}
function hideLoading() {
  if (loadingOverlay) loadingOverlay.style.display = "none";
}
function shortAddr(a) { return a ? `${a.slice(0,6)}...${a.slice(-4)}` : ""; }
function fmtNum(n) { return Number(n).toLocaleString(undefined, { maximumFractionDigits: 6 }); }

// CoinGecko fetch with CORS fallback
async function fetchWithProxy(url) {
  try {
    const r = await fetch(url, { mode: "cors" });
    if (r.ok) return r;
  } catch (e) {}
  try {
    const proxy = CONFIG.PRICE_CORS_PROXY + encodeURIComponent(url);
    const r2 = await fetch(proxy);
    if (r2.ok) return r2;
  } catch (e) {}
  return null;
}
async function priceByCoinId(id) {
  if (!id) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
  const r = await fetchWithProxy(url);
  if (!r) return null;
  try { const j = await r.json(); return j?.[id]?.usd ?? null; } catch { return null; }
}
async function priceByContract(addr, platformId) {
  if (!addr || !platformId) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/token_price/${platformId}?contract_addresses=${encodeURIComponent(addr)}&vs_currencies=usd`;
  const r = await fetchWithProxy(url);
  if (!r) return null;
  try { const j = await r.json(); const k = Object.keys(j||{})[0]; return k ? j[k]?.usd ?? null : null; } catch { return null; }
}

// Token list load (cached)
async function loadTokenList() {
  if (state.tokenlist) return state.tokenlist;
  try {
    const r = await fetch(CONFIG.TOKENLIST_URL);
    if (!r.ok) { state.tokenlist = []; return []; }
    const j = await r.json();
    state.tokenlist = (j.tokens || []).map(t => ({
      chainId: t.chainId,
      address: (t.address || "").toLowerCase(),
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals || 18
    }));
    return state.tokenlist;
  } catch (e) {
    state.tokenlist = [];
    return [];
  }
}

// Common tokens to ensure we find major stablecoins quickly
function commonTokens(chainId) {
  const map = {
    1: [
      { address: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT", decimals: 6 },
      { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC", decimals: 6 },
      { address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", symbol: "WBTC", decimals: 8 }
    ],
    56: [
      { address: "0x55d398326f99059ff775485246999027b3197955", symbol: "USDT", decimals: 18 },
      { address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", symbol: "USDC", decimals: 18 },
      { address: "0xe9e7cea3dedca5984780bafc599bd69add087d56", symbol: "BUSD", decimals: 18 }
    ],
    137: [
      { address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", symbol: "USDT", decimals: 6 },
      { address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", symbol: "USDC", decimals: 6 }
    ]
  };
  return map[chainId] || [];
}

// Scanner (ethers JSON-RPC per chain)
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
async function scanWithEthersProvider(ethersProvider, address) {
  await loadTokenList();
  const out = { walletAddress: address, chainBalances: [], allTokens: [], totalValue: 0, timestamp: Date.now() };

  for (const chain of CONFIG.EVM_CHAINS) {
    try {
      const rpcProvider = new ethers.providers.JsonRpcProvider(chain.rpc);
      const raw = await rpcProvider.getBalance(address).catch(()=> ethers.BigNumber.from(0));
      const nativeBalance = Number(ethers.utils.formatEther(raw));
      let nativePrice = await priceByCoinId(chain.cgPlatform).catch(()=> null);
      if (nativePrice == null) nativePrice = defaultPrice(chain.symbol);
      const nativeValue = nativeBalance * nativePrice;

      const chainResult = {
        chain,
        nativeBalance: { symbol: chain.symbol, balance: Number(nativeBalance.toFixed(6)), price: nativePrice, value: nativeValue },
        tokens: [],
        totalValue: nativeValue
      };

      // Prepare candidates: common tokens + tokenlist limited
      const candidates = commonTokens(chain.id).map(t => ({ ...t, address: t.address.toLowerCase() }));
      const tokenlistForChain = (state.tokenlist || []).filter(t => t.chainId === chain.id).slice(0, CONFIG.TOKEN_SCAN_LIMIT);
      for (const t of tokenlistForChain) {
        if (!candidates.some(c => c.address === t.address)) candidates.push({ address: t.address, symbol: t.symbol, decimals: t.decimals || 18, name: t.name });
      }
      const toCheck = candidates.slice(0, CONFIG.TOKEN_SCAN_LIMIT);

      // concurrency scanning
      let idx = 0;
      const found = [];
      const worker = async () => {
        while (idx < toCheck.length) {
          const i = idx++;
          const tk = toCheck[i];
          try {
            if (!tk.address) continue;
            const contract = new ethers.Contract(tk.address, ERC20_ABI, rpcProvider);
            const balRaw = await contract.balanceOf(address).catch(()=> null);
            if (!balRaw || balRaw.isZero()) continue;
            const decimals = tk.decimals || await contract.decimals().catch(()=>18);
            const balance = Number(ethers.utils.formatUnits(balRaw, decimals));
            if (balance <= 0) continue;
            let price = await priceByContract(tk.address, chain.cgPlatform).catch(()=> null);
            if (price == null) {
              const coinId = symbolToCoinId(tk.symbol);
              price = coinId ? (await priceByCoinId(coinId).catch(()=> null)) : null;
            }
            if (price == null) price = defaultPrice(tk.symbol);
            const value = balance * (price || 0);
            found.push({
              address: tk.address,
              symbol: tk.symbol,
              name: tk.name || tk.symbol,
              balance: Number(balance.toFixed(6)),
              decimals,
              price,
              value,
              chain: chain.name,
              type: "erc20"
            });
          } catch (err) {
            // token-level ignore
          }
        }
      };

      const workers = [];
      const concurrency = Math.max(1, Math.min(CONFIG.RPC_CONCURRENCY, 8));
      for (let w = 0; w < concurrency; w++) workers.push(worker());
      await Promise.all(workers);

      found.sort((a, b) => (b.value || 0) - (a.value || 0));
      chainResult.tokens = found;
      chainResult.totalValue += found.reduce((s, t) => s + (t.value || 0), 0);

      out.chainBalances.push(chainResult);
      out.allTokens.push({
        address: "native",
        symbol: chain.symbol,
        name: `${chain.name} Native`,
        balance: chainResult.nativeBalance.balance,
        price: chainResult.nativeBalance.price,
        value: chainResult.nativeBalance.value,
        chain: chain.name,
        type: "native"
      });
      if (found.length) out.allTokens.push(...found);

    } catch (err) {
      console.warn("scan error", chain.name, err);
    }
    await new Promise(r => setTimeout(r, 250));
  }

  out.totalValue = out.allTokens.reduce((s, t) => s + (t.value || 0), 0);
  return out;
}

function symbolToCoinId(sym) {
  const map = { 'ETH':'ethereum','BNB':'binancecoin','MATIC':'matic-network','SOL':'solana','AVAX':'avalanche-2','FTM':'fantom','BTC':'bitcoin','USDT':'tether','USDC':'usd-coin','DAI':'dai','BUSD':'binance-usd' };
  return map[(sym || '').toUpperCase()] || null;
}
function defaultPrice(sym) {
  const defs = { 'ETH':2500,'BNB':300,'MATIC':0.8,'SOL':100,'AVAX':30,'FTM':0.3,'BTC':45000,'USDT':1,'USDC':1,'DAI':1,'BUSD':1 };
  return defs[(sym || '').toUpperCase()] || 0;
}

// Wait helper: after opening modal, wait for provider from appKit / subscribeState for some time.
// If none, fallback to window.ethereum (injected) or give user actionable error about blocked websockets.
async function openModalAndGetProvider(timeoutMs = CONFIG.PROVIDER_WAIT_MS) {
  try {
    await appKit.open();
  } catch (err) {
    // opening modal failed — rethrow to caller
    throw new Error("AppKit modal failed to open: " + (err.message || err));
  }

  const start = Date.now();
  // First check if appKit.getProvider is available and returns quickly
  while (Date.now() - start < timeoutMs) {
    try {
      if (appKit.getProvider) {
        const p = await appKit.getProvider().catch(() => null);
        if (p) return p;
      }
    } catch (e) { /* ignore */ }

    // appKit.subscribeState may set provider via subscribeState handler — so check appKit state via getProvider or app state
    // Wait a small delay then retry
    await new Promise(r => setTimeout(r, 500));
  }

  // Timeout reached: try fallback to injected provider
  if (window.ethereum) {
    toast("AppKit timed out, falling back to injected provider (MetaMask/other). If you used WalletConnect, check network/firewall blocking wss://relay.walletconnect.org", "warning");
    return window.ethereum;
  }

  // No injected provider either — show actionable error to user
  throw new Error(
    "No provider detected after opening wallet modal. Common reasons:\n" +
    "- WebSocket to WalletConnect relay (wss://relay.walletconnect.org) blocked by network/firewall/extension\n" +
    "- Adblocker or privacy extension blocked the modal's scripts\n" +
    "Try: open the wallet app's in-app browser (e.g. MetaMask/Trust/Phantom), disable blocking extensions, or allow wss://relay.walletconnect.org."
  );
}

// AppKit button
connectBtn.addEventListener("click", async () => {
  showLoading("Opening wallet modal...");
  try {
    const provider = await openModalAndGetProvider(CONFIG.PROVIDER_WAIT_MS);
    if (!provider) {
      hideLoading();
      toast("No provider available after modal.", "error");
      return;
    }

    // Wrap provider in ethers, attempt to get signer & address
    const ethersProvider = new ethers.providers.Web3Provider(provider);
    const signer = ethersProvider.getSigner();
    let address = null;
    try { address = await signer.getAddress(); } catch (e) {
      // not yet authorized — request accounts
      try {
        const accounts = await provider.request?.({ method: "eth_requestAccounts" }) || [];
        address = accounts[0] || null;
      } catch (err) { /* ignore */ }
    }

    if (!address) {
      hideLoading();
      toast("Connected but failed to read address. Please approve the connection in your wallet.", "warning");
      return;
    }

    // add wallet entry
    const walletEntry = {
      address,
      provider: ethersProvider,
      signer,
      name: "Connected Wallet",
      walletType: "appkit",
      scanResults: null
    };

    const existing = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
    if (existing !== -1) state.wallets[existing] = walletEntry; else state.wallets.push(walletEntry);

    updateWalletsUI();
    toast(`Connected: ${shortAddr(address)}`, "success");

    // Auto-scan
    showLoading("Auto-scanning connected wallet...");
    try {
      const results = await scanWithEthersProvider(ethersProvider, address);
      const idx = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
      if (idx !== -1) state.wallets[idx].scanResults = results;
      updateTokensUI();
      toast("Auto-scan complete", "success");
    } catch (scanErr) {
      console.error("scan error", scanErr);
      toast("Auto-scan failed: " + (scanErr.message || String(scanErr)), "warning");
    } finally {
      hideLoading();
    }

  } catch (err) {
    hideLoading();
    console.error("connect flow failed:", err);
    toast(err.message || String(err), "error");
  }
});

// update UI functions (simple DOM manipulation)
function updateWalletsUI() {
  if (!walletsListEl) return;
  walletsListEl.innerHTML = "";
  if (!state.wallets.length) {
    const p = document.createElement("p"); p.className = "muted"; p.textContent = "No wallets connected"; walletsListEl.appendChild(p);
    if (statusEl) statusEl.textContent = "Not connected";
    return;
  }
  if (statusEl) statusEl.textContent = `${state.wallets.length} wallet(s) connected`;
  for (const w of state.wallets) {
    const chip = document.createElement("div"); chip.className = "wallet-chip";
    const left = document.createElement("div");
    const strong = document.createElement("strong"); strong.textContent = w.name;
    const addr = document.createElement("div"); addr.className = "muted"; addr.textContent = shortAddr(w.address);
    left.appendChild(strong); left.appendChild(addr);
    const right = document.createElement("div"); right.style.display = "flex"; right.style.gap = "8px";
    const rBtn = document.createElement("button"); rBtn.textContent = "Rescan"; rBtn.onclick = () => window.rescanWallet(w.address);
    const dBtn = document.createElement("button"); dBtn.textContent = "Disconnect"; dBtn.onclick = () => window.disconnectWallet(w.address);
    right.appendChild(rBtn); right.appendChild(dBtn);
    chip.appendChild(left); chip.appendChild(right);
    walletsListEl.appendChild(chip);
  }
}

function updateTokensUI() {
  if (!tokensBodyEl) return;
  tokensBodyEl.innerHTML = "";
  const all = [];
  for (const w of state.wallets) if (w.scanResults?.allTokens) all.push(...w.scanResults.allTokens);
  if (!all.length) {
    const tr = document.createElement("tr"); const td = document.createElement("td"); td.colSpan = 6; td.className = "muted"; td.textContent = "No tokens found"; tr.appendChild(td); tokensBodyEl.appendChild(tr);
    if (totalValueEl) totalValueEl.textContent = "Total Value: $0.00";
    return;
  }
  all.sort((a,b) => (b.value || 0) - (a.value || 0));
  for (const t of all) {
    const tr = document.createElement("tr");
    const tdSymbol = document.createElement("td"); tdSymbol.textContent = t.symbol;
    const tdBal = document.createElement("td"); tdBal.textContent = fmtNum(t.balance);
    const tdPrice = document.createElement("td"); tdPrice.textContent = `$${(t.price || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
    const tdVal = document.createElement("td"); tdVal.textContent = `$${(t.value || 0).toFixed(2)}`;
    const tdChain = document.createElement("td"); tdChain.textContent = t.chain;
    const tdAddr = document.createElement("td"); tdAddr.style.fontSize = "12px"; tdAddr.style.color = "#94a3b8"; tdAddr.textContent = t.address === "native" ? "-" : t.address;
    tr.appendChild(tdSymbol); tr.appendChild(tdBal); tr.appendChild(tdPrice); tr.appendChild(tdVal); tr.appendChild(tdChain); tr.appendChild(tdAddr);
    tokensBodyEl.appendChild(tr);
  }
  const total = all.reduce((s,t) => s + (t.value || 0), 0);
  if (totalValueEl) totalValueEl.textContent = `Total Value: $${total.toFixed(2)}`;
}

// expose for UI
window.rescanWallet = async (address) => {
  const w = state.wallets.find(x => x.address.toLowerCase() === address.toLowerCase());
  if (!w) { toast("Wallet not found", "warning"); return; }
  showLoading("Rescanning wallet...");
  try {
    const res = await scanWithEthersProvider(w.provider, w.address);
    w.scanResults = res;
    updateTokensUI();
    toast("Rescan complete", "success");
  } catch (e) {
    console.error("rescan error", e); toast("Rescan failed: " + (e.message || String(e)), "error");
  } finally { hideLoading(); }
};

window.disconnectWallet = async (address) => {
  try { if (appKit.disconnect) await appKit.disconnect(); } catch (e) {}
  state.wallets = state.wallets.filter(w => w.address.toLowerCase() !== address.toLowerCase());
  updateWalletsUI(); updateTokensUI(); toast("Wallet disconnected", "info");
};

// Scan all button
if (scanAllBtn) scanAllBtn.addEventListener("click", async () => {
  if (!state.wallets.length) { toast("No wallets connected", "warning"); return; }
  showLoading("Scanning all connected wallets...");
  try {
    for (const w of state.wallets) {
      const res = await scanWithEthersProvider(w.provider, w.address);
      w.scanResults = res;
    }
    updateTokensUI();
    toast("All wallets scanned", "success");
  } catch (e) {
    console.error("scan all failed", e); toast("Scan all failed: " + (e.message || String(e)), "error");
  } finally { hideLoading(); }
});

// Sign button
if (signBtn) signBtn.addEventListener("click", async () => {
  if (!state.wallets.length) { toast("No wallets to sign", "warning"); return; }
  showLoading("Signing messages...");
  try {
    for (const w of state.wallets) {
      try {
        if (!w.signer) w.signer = w.provider.getSigner();
        const message = `Authorize MultiChain Scanner\nAddress: ${w.address}\nTimestamp: ${Date.now()}\nNonce:${Math.random().toString(36).slice(2,10)}`;
        const sig = await w.signer.signMessage(message);
        console.log("signature:", w.address, sig);
        toast(`Signed ${shortAddr(w.address)}`, "success");
      } catch (e) {
        console.warn("sign failed", e); toast(`Sign failed ${shortAddr(w.address)}`, "warning");
      }
    }
  } finally { hideLoading(); }
});

// Backend trigger (simulated)
if (backendBtn) backendBtn.addEventListener("click", async () => {
  if (!state.wallets.length) { toast("No wallets", "warning"); return; }
  showLoading("Preparing payload...");
  try {
    const payload = state.wallets.map(w => ({ address: w.address, walletType: w.walletType, scanResults: w.scanResults }));
    console.log("backend payload:", payload);
    // TODO: POST to your backend endpoint
    await new Promise(r => setTimeout(r, 900));
    toast("Backend processing simulated (see console)", "success");
  } catch (e) {
    toast("Backend failed: " + (e.message || String(e)), "error");
  } finally { hideLoading(); }
});

// Warm token list at startup
(async function init() {
  showLoading("Warming tokenlist...");
  await loadTokenList().catch(()=>{});
  hideLoading();
  toast('Ready. Click "Open Wallet Modal" to connect a wallet.', 'info');
})();

export { appKit };
