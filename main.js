// main.js — Robust AppKit + ethers scanner
// - Uses package imports (suitable for Vite builds).
// - Handles AppKit provider wait and falls back to injected provider (window.ethereum).
// - Avoids large template literals that broke previous builds; uses DOM creation.
// - Uses "import * as ethers from 'ethers'" to ensure ethers.providers is available in ESM builds.
// - Scans native balances and a limited set of ERC20 tokens (common + optional tokenlist).
//
// Requirements:
// - npm install @reown/appkit @reown/appkit-adapter-ethers ethers
// - Build with Vite as before.
// - The page must include elements with IDs used below (connectBtn, scanAllBtn, signBtn, backendBtn, status, walletsList, tokensBody, totalValue, toastContainer, loadingOverlay, loadingText).
//
// Note about WalletConnect relay errors:
// - If you see WebSocket connection errors to wss://relay.walletconnect.org, that's a network/environment issue (firewall/Netlify preview limitations or adblocker).
// - This script will try AppKit, then fall back to window.ethereum (MetaMask/Trust injected) if AppKit provider doesn't appear in time.

import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import * as ethers from "ethers";

const PROJECT_ID = "962425907914a3e80a7d8e7288b23f62";

const CONFIG = {
  EVM_CHAINS: [
    { id: 1, name: "Ethereum", rpc: "https://cloudflare-eth.com", symbol: "ETH", cgPlatform: "ethereum" },
    { id: 56, name: "BNB Chain", rpc: "https://bsc-dataseed.binance.org", symbol: "BNB", cgPlatform: "binance-smart-chain" },
    { id: 137, name: "Polygon", rpc: "https://polygon-rpc.com", symbol: "MATIC", cgPlatform: "polygon-pos" }
    // add more chains here if needed
  ],
  TOKENLIST_URL: "https://tokens.coingecko.com/uniswap/all.json",
  PRICE_API_BASE: "https://api.coingecko.com/api/v3",
  PRICE_PROXY: "https://api.allorigins.win/raw?url=",
  TOKEN_SCAN_LIMIT: 200,
  RPC_CONCURRENCY: 6,
  APPKIT_PROVIDER_TIMEOUT_MS: 15000 // wait for provider from appKit before fallback to injected
};

// create AppKit
const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  projectId: PROJECT_ID,
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

// DOM refs
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

// app state
const state = {
  wallets: [], // { address, provider (ethers), signer, name, walletType, scanResults }
  tokenlist: null
};

// UI helpers
function toast(message, type = "info") {
  if (!toastContainer) return console.log(`[${type}]`, message);
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 6000);
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

// CoinGecko CORS-safe helper
async function fetchWithFallback(url) {
  try {
    const r = await fetch(url, { mode: "cors" });
    if (r.ok) return r;
  } catch (e) { /* fall through */ }
  try {
    const r2 = await fetch(CONFIG.PRICE_PROXY + encodeURIComponent(url));
    if (r2.ok) return r2;
  } catch (e) { /* ignore */ }
  return null;
}
async function priceByCoinId(id) {
  if (!id) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
  const r = await fetchWithFallback(url);
  if (!r) return null;
  try { const j = await r.json(); return j?.[id]?.usd ?? null; } catch { return null; }
}
async function priceByContract(addr, platform) {
  if (!addr || !platform) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/token_price/${platform}?contract_addresses=${encodeURIComponent(addr)}&vs_currencies=usd`;
  const r = await fetchWithFallback(url);
  if (!r) return null;
  try { const j = await r.json(); const k = Object.keys(j || {})[0]; return k ? j[k]?.usd ?? null : null; } catch { return null; }
}

// tokenlist load (cached)
async function loadTokenListOnce() {
  if (state.tokenlist) return state.tokenlist;
  try {
    const resp = await fetch(CONFIG.TOKENLIST_URL);
    if (!resp.ok) { state.tokenlist = []; return []; }
    const j = await resp.json();
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

// simple common token set to ensure USDT/USDC/WBTC detection across major chains
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

// scanner (ethers JSON-RPC per chain)
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];

async function scanEvmWallet(ethersProvider, address) {
  await loadTokenListOnce();
  const result = { wallet: address, chainBalances: [], allTokens: [], totalValue: 0, timestamp: Date.now() };

  for (const chain of CONFIG.EVM_CHAINS) {
    try {
      const rpcProvider = new ethers.providers.JsonRpcProvider(chain.rpc);
      const raw = await rpcProvider.getBalance(address).catch(() => ethers.BigNumber.from(0));
      const native = Number(ethers.utils.formatEther(raw));
      let nativePrice = await priceByCoinId(chain.cgPlatform).catch(() => null);
      if (nativePrice == null) nativePrice = defaultPrice(chain.symbol);
      const nativeValue = native * nativePrice;

      const chainResult = {
        chain,
        nativeBalance: { symbol: chain.symbol, balance: Number(native.toFixed(6)), price: nativePrice, value: nativeValue },
        tokens: [],
        totalValue: nativeValue
      };

      // Build token candidate list
      const candidates = commonTokens(chain.id).map(t => ({ ...t, address: (t.address || "").toLowerCase() }));
      const listForChain = (state.tokenlist || []).filter(t => t.chainId === chain.id).slice(0, CONFIG.TOKEN_SCAN_LIMIT);
      for (const t of listForChain) {
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
            const ctr = new ethers.Contract(tk.address, ERC20_ABI, rpcProvider);
            const balRaw = await ctr.balanceOf(address).catch(() => null);
            if (!balRaw || balRaw.isZero()) continue;
            const decimals = tk.decimals || await ctr.decimals().catch(() => 18);
            const balance = Number(ethers.utils.formatUnits(balRaw, decimals));
            if (balance <= 0) continue;
            let price = await priceByContract(tk.address, chain.cgPlatform).catch(() => null);
            if (price == null) {
              const coinId = symbolToCoinId(tk.symbol);
              price = coinId ? (await priceByCoinId(coinId).catch(() => null)) : null;
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
            // ignore token errors
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

      result.chainBalances.push(chainResult);
      result.allTokens.push({
        address: "native",
        symbol: chain.symbol,
        name: `${chain.name} Native`,
        balance: chainResult.nativeBalance.balance,
        price: chainResult.nativeBalance.price,
        value: chainResult.nativeBalance.value,
        chain: chain.name,
        type: "native"
      });
      if (found.length) result.allTokens.push(...found);

    } catch (err) {
      console.warn("Chain scan error:", chain.name, err);
    }
    // throttle between chains
    await new Promise(r => setTimeout(r, 300));
  }

  result.totalValue = result.allTokens.reduce((s, t) => s + (t.value || 0), 0);
  return result;
}

function symbolToCoinId(sym) {
  const map = { ETH: "ethereum", BNB: "binancecoin", MATIC: "matic-network", SOL: "solana", AVAX: "avalanche-2", FTM: "fantom", BTC: "bitcoin", USDT: "tether", USDC: "usd-coin", DAI: "dai", BUSD: "binance-usd" };
  return map[(sym || "").toUpperCase()] || null;
}
function defaultPrice(sym) {
  const map = { ETH: 2500, BNB: 300, MATIC: 0.8, SOL: 100, AVAX: 30, FTM: 0.3, BTC: 45000, USDT: 1, USDC: 1, DAI: 1, BUSD: 1 };
  return map[(sym || "").toUpperCase()] || 0;
}

// Attempt to open AppKit modal and wait for provider; fallback to injected if timeout
async function openModalAndGetProvider(timeoutMs = CONFIG.APPKIT_PROVIDER_TIMEOUT_MS) {
  // open modal (non-blocking)
  try {
    await appKit.open();
  } catch (err) {
    // opening modal may fail in some environments; still proceed to wait for provider briefly
    console.warn("appKit.open() failed:", err);
  }

  // Wait for provider via appKit.getProvider() or appKit.subscribeState -> get provider from subscribe handler.
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (appKit.getProvider) {
        const p = await appKit.getProvider().catch(() => null);
        if (p) return p;
      }
    } catch (e) {
      // ignore
    }
    // small delay
    await new Promise(r => setTimeout(r, 500));
  }

  // Timeout -> fallback to injected provider (MetaMask/Trust)
  if (window.ethereum) {
    toast("AppKit provider not available, falling back to injected provider (MetaMask/Trust). If you intended WalletConnect, your environment may be blocking WebSocket relay (wss://relay.walletconnect.org).", "warning");
    return window.ethereum;
  }

  // No provider
  throw new Error("No provider found. Ensure you're using a browser with an injected wallet or allow WebSocket connections (wss://relay.walletconnect.org) for WalletConnect flows.");
}

// UI update functions (DOM creation, safe for bundlers)
function updateWalletsUI() {
  if (!walletsListEl) return;
  walletsListEl.innerHTML = "";
  if (!state.wallets.length) {
    const p = document.createElement("p"); p.textContent = "No wallets connected"; p.className = "muted";
    walletsListEl.appendChild(p);
    if (statusEl) statusEl.textContent = "Not connected";
    return;
  }
  if (statusEl) statusEl.textContent = `${state.wallets.length} wallet(s) connected`;
  for (const w of state.wallets) {
    const chip = document.createElement("div"); chip.className = "wallet-chip";
    const left = document.createElement("div");
    const name = document.createElement("strong"); name.textContent = w.name || "Wallet";
    const addr = document.createElement("div"); addr.className = "muted"; addr.textContent = shortAddr(w.address);
    left.appendChild(name); left.appendChild(addr);
    const right = document.createElement("div"); right.style.display = "flex"; right.style.gap = "8px";
    const rescanBtn = document.createElement("button"); rescanBtn.textContent = "Rescan"; rescanBtn.onclick = () => window.rescanWallet(w.address);
    const discBtn = document.createElement("button"); discBtn.textContent = "Disconnect"; discBtn.onclick = () => window.disconnectWallet(w.address);
    right.appendChild(rescanBtn); right.appendChild(discBtn);
    chip.appendChild(left); chip.appendChild(right);
    walletsListEl.appendChild(chip);
  }
}

function updateTokensUI() {
  if (!tokensBodyEl) return;
  tokensBodyEl.innerHTML = "";
  const items = [];
  for (const w of state.wallets) {
    if (w.scanResults?.allTokens) items.push(...w.scanResults.allTokens);
  }
  if (!items.length) {
    const tr = document.createElement("tr"); const td = document.createElement("td"); td.colSpan = 6; td.className = "muted"; td.textContent = "No tokens found"; tr.appendChild(td); tokensBodyEl.appendChild(tr);
    if (totalValueEl) totalValueEl.textContent = "Total Value: $0.00";
    return;
  }

  items.sort((a, b) => (b.value || 0) - (a.value || 0));
  for (const t of items) {
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
  const total = items.reduce((s, it) => s + (it.value || 0), 0);
  if (totalValueEl) totalValueEl.textContent = `Total Value: $${total.toFixed(2)}`;
}

// Connect button handler: open modal, obtain provider, wrap and scan
if (connectBtn) {
  connectBtn.addEventListener("click", async () => {
    showLoading("Opening wallet modal...");
    try {
      const provider = await openModalAndGetProvider(CONFIG.APPKIT_PROVIDER_TIMEOUT_MS);
      if (!provider) { hideLoading(); toast("No provider available after modal.", "error"); return; }

      // Wrap in ethers provider safely (ensure ethers.providers exists)
      if (!ethers.providers || !ethers.providers.Web3Provider) {
        hideLoading();
        toast("ethers.providers.Web3Provider not available in this runtime build.", "error");
        return;
      }

      const web3Provider = new ethers.providers.Web3Provider(provider);
      const signer = web3Provider.getSigner();
      let address = null;
      try { address = await signer.getAddress(); } catch (e) {
        // try request accounts
        try {
          const accounts = await provider.request?.({ method: "eth_requestAccounts" }) || [];
          address = accounts[0] || null;
        } catch (_) {}
      }

      if (!address) {
        hideLoading();
        toast("Connected but address not returned. Please approve connection in the wallet and try again.", "warning");
        return;
      }

      const entry = { address, provider: web3Provider, signer, name: "Connected Wallet", walletType: "appkit", scanResults: null };
      const idx = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
      if (idx !== -1) state.wallets[idx] = entry; else state.wallets.push(entry);

      updateWalletsUI();
      toast(`Connected ${shortAddr(address)}`, "success");

      // Auto-scan
      showLoading("Auto scanning wallet...");
      try {
        const res = await scanEvmWallet(web3Provider, address);
        const idy = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
        if (idy !== -1) state.wallets[idy].scanResults = res;
        updateTokensUI();
        toast("Auto-scan complete", "success");
      } catch (scanErr) {
        console.error("Auto-scan failed:", scanErr);
        toast("Auto-scan failed: " + (scanErr.message || String(scanErr)), "warning");
      } finally { hideLoading(); }
    } catch (err) {
      hideLoading();
      console.error("connect error:", err);
      toast(err.message || String(err), "error");
    }
  });
}

// global helpers for UI actions
window.rescanWallet = async (address) => {
  const w = state.wallets.find(x => x.address.toLowerCase() === address.toLowerCase());
  if (!w) { toast("Wallet not found", "warning"); return; }
  showLoading("Rescanning wallet...");
  try {
    const res = await scanEvmWallet(w.provider, w.address);
    w.scanResults = res;
    updateTokensUI();
    toast("Rescan complete", "success");
  } catch (e) {
    console.error("rescan error", e);
    toast("Rescan failed: " + (e.message || String(e)), "error");
  } finally { hideLoading(); }
};

window.disconnectWallet = async (address) => {
  try { if (appKit.disconnect) await appKit.disconnect(); } catch (e) {}
  state.wallets = state.wallets.filter(w => w.address.toLowerCase() !== address.toLowerCase());
  updateWalletsUI();
  updateTokensUI();
  toast("Wallet disconnected", "info");
};

// scan all button
if (scanAllBtn) scanAllBtn.addEventListener("click", async () => {
  if (!state.wallets.length) { toast("No wallets connected", "warning"); return; }
  showLoading("Scanning all connected wallets...");
  try {
    for (const w of state.wallets) {
      const res = await scanEvmWallet(w.provider, w.address);
      w.scanResults = res;
    }
    updateTokensUI();
    toast("All wallets scanned", "success");
  } catch (e) {
    console.error("scan all error", e);
    toast("Scan all failed: " + (e.message || String(e)), "error");
  } finally { hideLoading(); }
});

// sign button
if (signBtn) signBtn.addEventListener("click", async () => {
  if (!state.wallets.length) { toast("No wallets to sign", "warning"); return; }
  showLoading("Signing messages...");
  try {
    for (const w of state.wallets) {
      try {
        if (!w.signer) w.signer = w.provider.getSigner();
        const message = `Authorize MultiChain Scanner\nAddress: ${w.address}\nTimestamp: ${Date.now()}\nNonce:${Math.random().toString(36).slice(2,10)}`;
        const signature = await w.signer.signMessage(message);
        console.log("signature for", w.address, signature);
        toast(`Signed ${shortAddr(w.address)}`, "success");
      } catch (e) {
        console.warn("sign failed", e);
        toast(`Sign failed ${shortAddr(w.address)}`, "warning");
      }
    }
  } finally { hideLoading(); }
});

// backend trigger (simulated)
if (backendBtn) backendBtn.addEventListener("click", async () => {
  if (!state.wallets.length) { toast("No wallets", "warning"); return; }
  showLoading("Preparing backend payload...");
  try {
    const payload = state.wallets.map(w => ({ address: w.address, walletType: w.walletType, scanResults: w.scanResults }));
    console.log("Backend payload:", payload);
    // TODO: send to real backend via fetch POST
    await new Promise(r => setTimeout(r, 800));
    toast("Backend processed (simulated)", "success");
  } catch (e) {
    console.error("backend error", e);
    toast("Backend failed: " + (e.message || String(e)), "error");
  } finally { hideLoading(); }
});

// pre-warm tokenlist
(async function warm() {
  showLoading("Warming token list...");
  await loadTokenListOnce().catch(() => {});
  hideLoading();
  toast("Ready. Click 'Open Wallet Modal' to connect.", "info");
})();
