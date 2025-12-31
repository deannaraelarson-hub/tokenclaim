// main.js - AppKit + Ethers multi-chain scanner (clean, no duplicate identifiers)
// - Uses AppKit modal to let the user pick a wallet/provider (many wallets supported).
// - Wraps the returned provider into ethers.js Web3Provider and scans EVM chains for native + ERC20 tokens.
// - Uses CoinGecko with a CORS-proxy fallback when needed.
// - Designed to build with Vite (ESM, unique function/identifier names).
//
// Notes:
// - Keep your projectId valid. The appKit modal will show many wallet connectors; select one to connect.
// - For bulky token discovery, this script uses a tokenlist + common tokens and caps scanning to avoid RPC overload.
//
// External imports are pulled from CDN (unpkg/jsdelivr). If you bundle locally, replace URLs with package imports.

import { createAppKit } from "https://unpkg.com/@reown/appkit@1.3.0?module";
import { EthersAdapter } from "https://unpkg.com/@reown/appkit-adapter-ethers@1.1.0?module";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

const projectId = "962425907914a3e80a7d8e7288b23f62";

const CONFIG = {
  EVM_CHAINS: [
    { id: 1, name: 'Ethereum', rpc: 'https://cloudflare-eth.com', symbol: 'ETH', cgPlatform: 'ethereum' },
    { id: 56, name: 'BNB Chain', rpc: 'https://bsc-dataseed.binance.org', symbol: 'BNB', cgPlatform: 'binance-smart-chain' },
    { id: 137, name: 'Polygon', rpc: 'https://polygon-rpc.com', symbol: 'MATIC', cgPlatform: 'polygon-pos' },
    { id: 42161, name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc', symbol: 'ETH', cgPlatform: 'arbitrum-one' },
    { id: 10, name: 'Optimism', rpc: 'https://mainnet.optimism.io', symbol: 'ETH', cgPlatform: 'optimistic-ethereum' },
    { id: 43114, name: 'Avalanche', rpc: 'https://api.avax.network/ext/bc/C/rpc', symbol: 'AVAX', cgPlatform: 'avalanche' },
    { id: 250, name: 'Fantom', rpc: 'https://rpc.ankr.com/fantom', symbol: 'FTM', cgPlatform: 'fantom' }
  ],
  PRICE_API_BASE: 'https://api.coingecko.com/api/v3',
  PRICE_CORS_PROXY: 'https://api.allorigins.win/raw?url=', // fallback proxy if CORS blocks direct request
  TOKENLIST_URL: 'https://tokens.coingecko.com/uniswap/all.json',
  TOKEN_SCAN_LIMIT: 220,
  RPC_CONCURRENCY: 6
};

// create AppKit once
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

// UI elements
const connectBtn = document.getElementById('connectBtn');
const scanAllBtn = document.getElementById('scanAllBtn');
const signBtn = document.getElementById('signBtn');
const backendBtn = document.getElementById('backendBtn');
const statusEl = document.getElementById('status');
const walletsListEl = document.getElementById('walletsList');
const tokensBodyEl = document.getElementById('tokensBody');
const totalValueEl = document.getElementById('totalValue');
const toastContainer = document.getElementById('toastContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');

// local state
const state = {
  wallets: [], // { address, provider: ethers.Provider, signer, name, walletType, scanResults }
  tokenlist: null
};

// UI helpers
function showToast(message, type = 'info') {
  if (!toastContainer) return console.log(`[${type}] ${message}`);
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerText = message;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}
function showLoading(msg = 'Loading...') {
  if (loadingText) loadingText.textContent = msg;
  if (loadingOverlay) loadingOverlay.style.display = 'flex';
}
function hideLoading() {
  if (loadingOverlay) loadingOverlay.style.display = 'none';
}
function shortAddr(a) { if (!a) return ''; return `${a.slice(0,6)}...${a.slice(-4)}`; }
function formatNum(n) { return Number(n).toLocaleString(undefined, { maximumFractionDigits: 6 }); }

// render helpers
function renderWallets() {
  if (!walletsListEl) return;
  if (state.wallets.length === 0) {
    walletsListEl.innerHTML = '<p class="small">No wallets connected</p>';
    statusEl.textContent = 'Not connected';
    return;
  }
  statusEl.textContent = `${state.wallets.length} wallet(s) connected`;
  walletsListEl.innerHTML = state.wallets.map(w => `
    <div class="wallet-chip">
      <div>
        <strong>${w.name}</strong>
        <div style="color:var(--muted)">${shortAddr(w.address)}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center">
        <button onclick="rescanWallet('${w.address}')">Rescan</button>
        <button onclick="disconnectWallet('${w.address}')">Disconnect</button>
      </div>
    </div>
  `).join('');
}

function renderTokensTable() {
  if (!tokensBodyEl) return;
  const all = [];
  state.wallets.forEach(w => { if (w.scanResults?.allTokens) all.push(...w.scanResults.allTokens); });
  if (all.length === 0) {
    tokensBodyEl.innerHTML = '<tr><td colspan="6" class="small">No tokens found</td></tr>';
    totalValueEl.textContent = 'Total Value: $0.00';
    return;
  }
  all.sort((a,b) => (b.value || 0) - (a.value || 0));
  tokensBodyEl.innerHTML = all.map(t => `
    <tr>
      <td>${t.symbol}</td>
      <td>${formatNum(t.balance)}</td>
      <td>$${(t.price || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
      <td>$${(t.value || 0).toFixed(2)}</td>
      <td>${t.chain}</td>
      <td style="font-size:12px;color:var(--muted)">${t.address === 'native' ? '-' : t.address}</td>
    </tr>
  `).join('');
  const total = all.reduce((s,t) => s + (t.value || 0), 0);
  totalValueEl.textContent = `Total Value: $${total.toFixed(2)}`;
}

// CORS-friendly fetch for CoinGecko (tries direct then proxy)
async function fetchWithCorsFallback(url) {
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (r.ok) return r;
  } catch (e) {
    // fall through to proxy
  }
  try {
    const proxied = CONFIG.PRICE_CORS_PROXY + encodeURIComponent(url);
    const r2 = await fetch(proxied);
    if (r2.ok) return r2;
  } catch (e) { /* ignore */ }
  return null;
}

async function priceByCoinId(coinId) {
  if (!coinId) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd`;
  const resp = await fetchWithCorsFallback(url);
  if (!resp) return null;
  try { const j = await resp.json(); return j?.[coinId]?.usd ?? null; } catch { return null; }
}

async function priceByContractAddress(contractAddress, platformId) {
  if (!contractAddress || !platformId) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/token_price/${platformId}?contract_addresses=${encodeURIComponent(contractAddress)}&vs_currencies=usd`;
  const resp = await fetchWithCorsFallback(url);
  if (!resp) return null;
  try { const j = await resp.json(); const key = Object.keys(j || {})[0]; return key ? j[key]?.usd ?? null : null; } catch { return null; }
}

// Tokenlist loader (cached)
async function loadTokenListOnce() {
  if (state.tokenlist) return state.tokenlist;
  try {
    const r = await fetch(CONFIG.TOKENLIST_URL);
    if (!r.ok) { state.tokenlist = []; return []; }
    const j = await r.json();
    state.tokenlist = (j.tokens || []).map(t => ({
      chainId: t.chainId,
      address: (t.address || '').toLowerCase(),
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

// minimal common token list per chain (important stable tokens)
function commonTokensForChain(chainId) {
  const map = {
    1: [
      { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', decimals: 6 },
      { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', decimals: 6 },
      { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC', decimals: 8 }
    ],
    56: [
      { address: '0x55d398326f99059ff775485246999027b3197955', symbol: 'USDT', decimals: 18 },
      { address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', symbol: 'USDC', decimals: 18 },
      { address: '0xe9e7cea3dedca5984780bafc599bd69add087d56', symbol: 'BUSD', decimals: 18 }
    ],
    137: [
      { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol: 'USDT', decimals: 6 },
      { address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', symbol: 'USDC', decimals: 6 }
    ]
  };
  return map[chainId] || [];
}

// scanner using ethers provider per chain
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];

async function scanWithProvider(ethersProvider, address) {
  const result = { walletAddress: address, chainBalances: [], allTokens: [], totalValue: 0, timestamp: Date.now() };
  await loadTokenListOnce();

  for (const chain of CONFIG.EVM_CHAINS) {
    try {
      const rpcProvider = new ethers.providers.JsonRpcProvider(chain.rpc);
      const raw = await rpcProvider.getBalance(address).catch(()=> ethers.BigNumber.from(0));
      const nativeBalance = Number(ethers.utils.formatEther(raw));
      const nativePrice = (await priceByCoinId(chain.cgPlatform).catch(()=>null)) ?? defaultPrice(chain.symbol);
      const nativeValue = nativeBalance * nativePrice;

      const chainResult = {
        chain,
        nativeBalance: { symbol: chain.symbol, balance: Number(nativeBalance.toFixed(6)), price: nativePrice, value: nativeValue },
        tokens: [],
        totalValue: nativeValue
      };

      // build candidate list
      const candidates = commonTokensForChain(chain.id).map(t => ({...t}));
      const tokenlistForChain = (state.tokenlist || []).filter(t => t.chainId === chain.id).slice(0, CONFIG.TOKEN_SCAN_LIMIT);
      for (const t of tokenlistForChain) {
        if (!candidates.some(c => c.address === t.address)) candidates.push({ address: t.address, symbol: t.symbol, decimals: t.decimals || 18, name: t.name });
      }
      const toCheck = candidates.slice(0, CONFIG.TOKEN_SCAN_LIMIT);

      // concurrency scanning
      let idx = 0;
      const foundTokens = [];
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
            // price by contract
            let price = await priceByContractAddress(tk.address, chain.cgPlatform).catch(()=> null);
            if (price == null) {
              const coinId = symbolToCoinId(tk.symbol);
              price = coinId ? (await priceByCoinId(coinId).catch(()=> null)) : null;
            }
            if (price == null) price = defaultPrice(tk.symbol);
            const value = balance * (price || 0);
            foundTokens.push({
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
            // ignore token-level errors
          }
        }
      };

      const workers = [];
      const concurrency = Math.max(1, Math.min(CONFIG.RPC_CONCURRENCY, 8));
      for (let w=0; w<concurrency; w++) workers.push(worker());
      await Promise.all(workers);

      foundTokens.sort((a,b) => (b.value || 0) - (a.value || 0));
      chainResult.tokens = foundTokens;
      chainResult.totalValue += foundTokens.reduce((s,t) => s + (t.value||0), 0);

      result.chainBalances.push(chainResult);
      result.allTokens.push({
        address: 'native',
        symbol: chain.symbol,
        name: `${chain.name} Native`,
        balance: chainResult.nativeBalance.balance,
        price: chainResult.nativeBalance.price,
        value: chainResult.nativeBalance.value,
        chain: chain.name,
        type: 'native'
      });
      if (foundTokens.length) result.allTokens.push(...foundTokens);

    } catch (err) {
      console.warn('Scan error for chain', chain.name, err);
    }
    // throttle slightly
    await new Promise(r => setTimeout(r, 250));
  }

  result.totalValue = result.allTokens.reduce((s,t) => s + (t.value || 0), 0);
  return result;
}

function symbolToCoinId(sym) {
  const map = { 'ETH':'ethereum','BNB':'binancecoin','MATIC':'matic-network','SOL':'solana','AVAX':'avalanche-2','FTM':'fantom','BTC':'bitcoin','USDT':'tether','USDC':'usd-coin','DAI':'dai','BUSD':'binance-usd' };
  return map[(sym||'').toUpperCase()] || null;
}
function defaultPrice(sym) {
  const def = { 'ETH':2500,'BNB':300,'MATIC':0.8,'SOL':100,'AVAX':30,'FTM':0.3,'BTC':45000,'USDT':1,'USDC':1,'DAI':1,'BUSD':1 };
  return def[(sym||'').toUpperCase()] || 0;
}

// AppKit modal control and subscription
connectBtn.addEventListener('click', async () => {
  try {
    await appKit.open();
  } catch (err) {
    console.error('AppKit modal failed to open:', err);
    showToast('Wallet modal failed to open', 'error');
  }
});

// subscribe to AppKit state and handle new connections
appKit.subscribeState(async (s) => {
  try {
    if (!s) return;
    if (s.isConnected) {
      // try to obtain provider from appKit
      let rawProvider = null;
      try {
        rawProvider = s.provider || s.connector?.provider || (appKit.getProvider ? await appKit.getProvider() : null);
      } catch (e) {
        rawProvider = s.provider || null;
      }
      // last resort: window.ethereum
      if (!rawProvider && window.ethereum) rawProvider = window.ethereum;

      if (!rawProvider) {
        showToast('Connected but provider unavailable', 'warning');
        return;
      }

      const ethersProvider = new ethers.providers.Web3Provider(rawProvider);
      const signer = ethersProvider.getSigner();
      let address = null;
      try { address = await signer.getAddress(); } catch (e) { address = s.account || s.accounts?.[0] || s.address || null; }

      if (!address) {
        showToast('Connected but failed to read address', 'error');
        return;
      }

      const walletEntry = {
        address,
        provider: ethersProvider,
        signer,
        name: s.name || s.walletName || 'Connected Wallet',
        walletType: s.walletType || 'appkit',
        scanResults: null
      };

      // add/update state
      const idx = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
      if (idx !== -1) state.wallets[idx] = walletEntry;
      else state.wallets.push(walletEntry);

      renderWallets();
      showToast(`Connected: ${shortAddr(address)}`, 'success');

      // auto-scan
      showLoading('Auto-scanning connected wallet...');
      try {
        const scanResults = await scanWithProvider(ethersProvider, address);
        const j = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
        if (j !== -1) state.wallets[j].scanResults = scanResults;
        renderTokensTable();
        showToast('Auto-scan complete', 'success');
      } catch (scanErr) {
        console.error('Auto-scan failed', scanErr);
        showToast('Auto-scan failed: ' + (scanErr.message || scanErr), 'warning');
      } finally {
        hideLoading();
      }
    } else {
      // optional: handle disconnect
    }
  } catch (err) {
    console.error('subscribeState handler error', err);
  }
});

// public global functions used by buttons in the UI markup
window.rescanWallet = async (address) => {
  const w = state.wallets.find(x => x.address.toLowerCase() === address.toLowerCase());
  if (!w) return showToast('Wallet not found', 'warning');
  showLoading('Rescanning wallet...');
  try {
    const res = await scanWithProvider(w.provider, w.address);
    w.scanResults = res;
    renderTokensTable();
    showToast('Rescan complete', 'success');
  } catch (e) {
    console.error('Rescan failed', e);
    showToast('Rescan failed: ' + (e.message || e), 'error');
  } finally { hideLoading(); }
};

window.disconnectWallet = async (address) => {
  // if appKit supports disconnect, call it to close session
  try { if (appKit.disconnect) await appKit.disconnect(); } catch (e) {}
  state.wallets = state.wallets.filter(w => w.address.toLowerCase() !== address.toLowerCase());
  renderWallets();
  renderTokensTable();
  showToast('Wallet disconnected', 'info');
};

scanAllBtn.addEventListener('click', async () => {
  if (!state.wallets.length) return showToast('No wallets connected', 'warning');
  showLoading('Scanning all connected wallets...');
  try {
    for (const w of state.wallets) {
      const res = await scanWithProvider(w.provider, w.address);
      w.scanResults = res;
    }
    renderTokensTable();
    showToast('All wallets scanned', 'success');
  } catch (e) {
    console.error('Scan all failed', e);
    showToast('Scan all failed: ' + (e.message || e), 'error');
  } finally { hideLoading(); }
});

signBtn.addEventListener('click', async () => {
  if (!state.wallets.length) return showToast('No wallets to sign', 'warning');
  showLoading('Signing messages...');
  try {
    for (const w of state.wallets) {
      try {
        if (!w.signer) w.signer = w.provider.getSigner();
        const message = `Authorize MultiChain Scanner\nAddress: ${w.address}\nTimestamp: ${Date.now()}\nNonce:${Math.random().toString(36).slice(2,10)}`;
        const signature = await w.signer.signMessage(message);
        console.log('Signature', w.address, signature);
        showToast(`Signed: ${shortAddr(w.address)}`, 'success');
      } catch (e) {
        console.warn('Sign failed for', w.address, e);
        showToast(`Sign failed: ${shortAddr(w.address)}`, 'warning');
      }
    }
  } finally { hideLoading(); }
});

backendBtn.addEventListener('click', async () => {
  if (!state.wallets.length) return showToast('No wallets', 'warning');
  showLoading('Preparing backend payload...');
  try {
    const payload = state.wallets.map(w => ({
      address: w.address,
      walletType: w.walletType,
      scanResults: w.scanResults
    }));
    console.log('Backend payload:', payload);
    // Replace with real backend call; simulated here:
    await new Promise(r => setTimeout(r, 900));
    showToast('Backend processing simulated (see console)', 'success');
  } catch (e) {
    showToast('Backend trigger failed: ' + (e.message || e), 'error');
  } finally { hideLoading(); }
});

// warm tokenlist on load
(async function warmTokenlist() {
  showLoading('Warming tokenlist...');
  await loadTokenListOnce().catch(()=>{});
  hideLoading();
  showToast('Ready. Click "Open Wallet Modal" to connect a wallet.', 'info');
})();
