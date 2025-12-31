```javascript
// main.js — AppKit + ethers multi-chain scanner (package imports for Vite/Rollup build)
// Ensure packages are installed in your project: @reown/appkit, @reown/appkit-adapter-ethers, ethers
import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

// Your projectId (keep your existing value)
const projectId = "962425907914a3e80a7d8e7288b23f62";

// Configuration (chains, price endpoints)
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
  RPC_CONCURRENCY: 6
};

// Initialize AppKit (modal, adapters)
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

// UI hooks
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

// App state
const state = {
  wallets: [], // { address, provider: ethers.Provider, signer, name, walletType, scanResults }
  tokenlist: null
};

// UI helpers
function toast(msg, type = "info") {
  if (!toastContainer) return console.log(`[${type}]`, msg);
  const d = document.createElement("div");
  d.className = "toast " + type;
  d.innerText = msg;
  toastContainer.appendChild(d);
  setTimeout(() => d.remove(), 5000);
}
function showLoading(msg = "Loading...") { if (loadingText) loadingText.textContent = msg; if (loadingOverlay) loadingOverlay.style.display = "flex"; }
function hideLoading() { if (loadingOverlay) loadingOverlay.style.display = "none"; }
function shortAddr(a){ return a ? `${a.slice(0,6)}...${a.slice(-4)}` : ""; }
function formatNum(n){ return Number(n).toLocaleString(undefined, { maximumFractionDigits: 6 }); }

// Price fetch with CORS fallback
async function fetchWithCorsFallback(url) {
  try {
    const r = await fetch(url, { mode: "cors" });
    if (r.ok) return r;
  } catch (e) { /* try proxy next */ }
  try {
    const proxy = CONFIG.PRICE_CORS_PROXY + encodeURIComponent(url);
    const r2 = await fetch(proxy);
    if (r2.ok) return r2;
  } catch (e) {}
  return null;
}
async function getCoinPrice(coinId) {
  if (!coinId) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd`;
  const resp = await fetchWithCorsFallback(url);
  if (!resp) return null;
  const j = await resp.json();
  return j?.[coinId]?.usd ?? null;
}
async function getContractTokenPrice(contractAddress, platformId) {
  if (!contractAddress || !platformId) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/token_price/${platformId}?contract_addresses=${encodeURIComponent(contractAddress)}&vs_currencies=usd`;
  const resp = await fetchWithCorsFallback(url);
  if (!resp) return null;
  const j = await resp.json();
  const key = Object.keys(j || {})[0];
  return key ? j[key]?.usd ?? null : null;
}

// Tokenlist loader (cached)
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

// Common tokens (quick discovery)
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

// Scan routine using ethers JSON-RPC provider per chain
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];

async function scanWithProvider(ethersProvider, address) {
  const out = { walletAddress: address, chainBalances: [], allTokens: [], totalValue: 0, timestamp: Date.now() };
  await loadTokenList();

  for (const chain of CONFIG.EVM_CHAINS) {
    try {
      const rpcProvider = new ethers.providers.JsonRpcProvider(chain.rpc);
      const nativeRaw = await rpcProvider.getBalance(address).catch(()=> ethers.BigNumber.from(0));
      const nativeBal = Number(ethers.utils.formatEther(nativeRaw));
      const coinPrice = (await getCoinPrice(chain.cgPlatform).catch(()=> null)) ?? defaultPrice(chain.symbol);
      const nativeValue = nativeBal * coinPrice;
      const chainResult = {
        chain,
        nativeBalance: { symbol: chain.symbol, balance: Number(nativeBal.toFixed(6)), price: coinPrice, value: nativeValue },
        tokens: [],
        totalValue: nativeValue
      };

      // candidates: common tokens + tokenlist filtered (limited)
      const candidates = commonTokens(chain.id).map(t => ({...t}));
      const listForChain = (state.tokenlist || []).filter(t => t.chainId === chain.id).slice(0, CONFIG.TOKEN_SCAN_LIMIT);
      for (const t of listForChain) {
        if (!candidates.some(c => c.address === t.address)) candidates.push({ address: t.address, symbol: t.symbol, decimals: t.decimals || 18, name: t.name });
      }
      const toCheck = candidates.slice(0, CONFIG.TOKEN_SCAN_LIMIT);

      // concurrent token checks
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
            // price resolution: contract -> symbol -> fallback
            let price = await getContractTokenPrice(tk.address, chain.cgPlatform).catch(()=> null);
            if (price == null) {
              const coinId = symbolToCoinId(tk.symbol);
              price = coinId ? (await getCoinPrice(coinId).catch(()=> null)) : null;
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
              type: 'erc20'
            });
          } catch (e) {
            // per-token ignore
          }
        }
      };

      const workers = [];
      const concurrency = Math.max(1, Math.min(CONFIG.RPC_CONCURRENCY, 8));
      for (let w=0; w<concurrency; w++) workers.push(worker());
      await Promise.all(workers);

      found.sort((a,b) => (b.value || 0) - (a.value || 0));
      chainResult.tokens = found;
      chainResult.totalValue += found.reduce((s,t)=> s + (t.value||0), 0);

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
      console.warn("chain scan error", chain.name, err);
    }
    await new Promise(r => setTimeout(r, 250));
  }

  out.totalValue = out.allTokens.reduce((s,t) => s + (t.value || 0), 0);
  return out;
}

function symbolToCoinId(sym) {
  const map = { 'ETH':'ethereum','BNB':'binancecoin','MATIC':'matic-network','SOL':'solana','AVAX':'avalanche-2','FTM':'fantom','BTC':'bitcoin','USDT':'tether','USDC':'usd-coin','DAI':'dai','BUSD':'binance-usd' };
  return map[(sym||'').toUpperCase()] || null;
}
function defaultPrice(sym) {
  const map = { 'ETH':2500,'BNB':300,'MATIC':0.8,'SOL':100,'AVAX':30,'FTM':0.3,'BTC':45000,'USDT':1,'USDC':1,'DAI':1,'BUSD':1 };
  return map[(sym||'').toUpperCase()] || 0;
}

// AppKit UI flow
connectBtn.addEventListener("click", async () => {
  try {
    await appKit.open();
  } catch (err) {
    console.error("AppKit open failed:", err);
    toast("Wallet modal failed to open", "error");
  }
});

// Subscribe to AppKit state changes
appKit.subscribeState(async (s) => {
  try {
    if (!s) return;
    if (s.isConnected) {
      // Obtain provider via multiple fallbacks
      let rawProvider = s.provider || s.connector?.provider || null;
      try { if (!rawProvider && appKit.getProvider) rawProvider = await appKit.getProvider(); } catch (e) {}
      if (!rawProvider && window.ethereum) rawProvider = window.ethereum;

      if (!rawProvider) {
        toast("Connected but provider not available", "warning");
        return;
      }

      const ethersProvider = new ethers.providers.Web3Provider(rawProvider);
      const signer = ethersProvider.getSigner();
      let address = null;
      try { address = await signer.getAddress(); } catch (e) { address = s.account || s.accounts?.[0] || s.address || null; }
      if (!address) {
        toast("Connected but failed to read address", "error");
        return;
      }

      const walletEntry = {
        address,
        provider: ethersProvider,
        signer,
        name: s.name || s.walletName || "Connected Wallet",
        walletType: s.walletType || "appkit",
        scanResults: null
      };

      const idx = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
      if (idx !== -1) state.wallets[idx] = walletEntry; else state.wallets.push(walletEntry);

      renderWalletsUI();
      toast(`Connected: ${shortAddr(address)}`, "success");

      // auto-scan
      showLoading("Auto-scanning connected wallet...");
      try {
        const scanResults = await scanWithProvider(ethersProvider, address);
        const j = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
        if (j !== -1) state.wallets[j].scanResults = scanResults;
        renderTokensUI();
        toast("Auto-scan complete", "success");
      } catch (scanErr) {
        console.error("Auto-scan failed:", scanErr);
        toast("Auto-scan failed: " + (scanErr.message || scanErr), "warning");
      } finally {
        hideLoading();
      }
    }
  } catch (err) {
    console.error("subscribeState handler error:", err);
  }
});

// Render functions (separate names to avoid collisions with earlier attempts)
function renderWalletsUI() {
  if (!walletsListEl) return;
  if (state.wallets.length === 0) { walletsListEl.innerHTML = '<p class="muted">No wallets connected</p>'; statusEl.textContent = "Not connected"; return; }
  statusEl.textContent = `${state.wallets.length} wallet(s) connected`;
  walletsListEl.innerHTML = state.wallets.map(w => `
    <div class="wallet-chip">
      <div><strong>${w.name}</strong><div class="muted">${shortAddr(w.address)}</div></div>
      <div style="display:flex; gap:8px;">
        <button onclick="window.rescanWallet('${w.address}')">Rescan</button>
        <button onclick="window.disconnectWallet('${w.address}')">Disconnect</button>
      </div>
    </div>
  `).join("");
}

function renderTokensUI() {
  if (!tokensBodyEl) return;
  const all = [];
  state.wallets.forEach(w => { if (w.scanResults?.allTokens) all.push(...w.scanResults.allTokens); });
  if (all.length === 0) { tokensBodyEl.innerHTML = '<tr><td colspan="6" class="muted">No tokens found</td></tr>'; totalValueEl.textContent = 'Total Value: $0.00'; return; }
  all.sort((a,b) => (b.value || 0) - (a.value || 0));
  tokensBodyEl.innerHTML = all.map(t => `
    <tr>
      <td>${t.symbol}</td>
      <td>${formatNum(t.balance)}</td>
      <td>$${(t.price || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
      <td>$${(t.value || 0).toFixed(2)}</td>
      <td>${t.chain}</td>
      <td style="font-size:12px;color:#94a3b8">${t.address === 'native' ? '-' : t.address}</td>
    </tr>
  `).join("");
  const total = all.reduce((s,t) => s + (t.value || 0), 0);
  totalValueEl.textContent = `Total Value: $${total.toFixed(2)}`;
}

// global helpers used by UI
window.rescanWallet = async (address) => {
  const w = state.wallets.find(x => x.address.toLowerCase() === address.toLowerCase());
  if (!w) return toast("Wallet not found", "warning");
  showLoading("Rescanning wallet...");
  try {
    const res = await scanWithProvider(w.provider, w.address);
    w.scanResults = res;
    renderTokensUI();
    toast("Rescan complete", "success");
  } catch (e) {
    console.error("Rescan failed:", e);
    toast("Rescan failed: " + (e.message || e), "error");
  } finally { hideLoading(); }
};

window.disconnectWallet = async (address) => {
  try { if (appKit.disconnect) await appKit.disconnect(); } catch (e) {}
  state.wallets = state.wallets.filter(w => w.address.toLowerCase() !== address.toLowerCase());
  renderWalletsUI();
  renderTokensUI();
  toast("Wallet disconnected", "info");
};

// Button handlers
scanAllBtn.addEventListener("click", async () => {
  if (!state.wallets.length) return toast("No wallets connected", "warning");
  showLoading("Scanning all connected wallets...");
  try {
    for (const w of state.wallets) {
      const res = await scanWithProvider(w.provider, w.address);
      w.scanResults = res;
    }
    renderTokensUI();
    toast("All wallets scanned", "success");
  } catch (e) {
    console.error("Scan all failed:", e);
    toast("Scan all failed: " + (e.message || e), "error");
  } finally { hideLoading(); }
});

signBtn.addEventListener("click", async () => {
  if (!state.wallets.length) return toast("No wallets to sign", "warning");
  showLoading("Signing messages...");
  try {
    for (const w of state.wallets) {
      try {
        if (!w.signer) w.signer = w.provider.getSigner();
        const message = `Authorize MultiChain Scanner\nAddress: ${w.address}\nTimestamp: ${Date.now()}\nNonce:${Math.random().toString(36).slice(2,10)}`;
        const signature = await w.signer.signMessage(message);
        console.log("Signature", w.address, signature);
        toast(`Signed: ${shortAddr(w.address)}`, "success");
      } catch (e) {
        console.warn("Sign failed for", w.address, e);
        toast(`Sign failed: ${shortAddr(w.address)}`, "warning");
      }
    }
  } finally { hideLoading(); }
});

backendBtn.addEventListener("click", async () => {
  if (!state.wallets.length) return toast("No wallets", "warning");
  showLoading("Preparing backend payload...");
  try {
    const payload = state.wallets.map(w => ({ address: w.address, walletType: w.walletType, scanResults: w.scanResults }));
    console.log("Backend payload:", payload);
    // TODO: POST to backend here
    await new Promise(r => setTimeout(r, 800));
    toast("Backend processed (simulated)", "success");
  } catch (e) {
    toast("Backend trigger failed: " + (e.message || e), "error");
  } finally { hideLoading(); }
});

// Warm tokenlist on startup
(async function init() {
  showLoading("Warming tokenlist...");
  await loadTokenList().catch(()=>{});
  hideLoading();
  toast('Ready. Click "Open Wallet Modal" to connect a wallet.', "info");
})();

// export for debugging if needed
export { appKit };
