// ==============================
// main.js — AppKit + Ethers integration for multi-chain scanning
// - Index HTML expects this file as an ESM module.
// - Uses @reown/appkit and @reown/appkit-adapter-ethers (via unpkg module imports).
// - Uses ethers (ESM build) for provider/signer and contract calls.
// - Scans native balances and common ERC20 tokens across major EVM chains.
// - Uses CoinGecko with CORS-fallback proxy (allorigins) for prices to avoid direct CORS issues.
// - Provides sign & backend trigger handlers.
// NOTE: This script assumes the environment can import modules from unpkg CDN. If you bundle with Vite/Rollup/etc, replace imports with package imports.
// ==============================

import { createAppKit } from "https://unpkg.com/@reown/appkit@1.3.0?module";
import { EthersAdapter } from "https://unpkg.com/@reown/appkit-adapter-ethers@1.1.0?module";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

// CONFIG (update projectId with your value)
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
  NON_EVM_CHAINS: [
    { id: 'solana', name: 'Solana', rpc: 'https://api.mainnet-beta.solana.com', symbol: 'SOL', cgPlatform: 'solana' }
  ],
  PRICE_API_BASE: 'https://api.coingecko.com/api/v3',
  PRICE_CORS_PROXY: 'https://api.allorigins.win/raw?url=', // fallback if direct CORS blocked
  TOKENLIST_URL: 'https://tokens.coingecko.com/uniswap/all.json',
  TOKEN_SCAN_LIMIT: 220,
  RPC_CONCURRENCY: 6
};

// APPKIT initialization
const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  projectId,
  networks: CONFIG.EVM_CHAINS.map(c => ({ id: c.id, name: c.name, rpcUrl: c.rpc })),
  metadata: {
    name: "Local WalletConnect Test",
    description: "Testing WalletConnect modal locally",
    url: window.location.origin,
    icons: []
  },
  themeMode: "dark",
  features: { analytics: false }
});

// UI elements
const connectBtn = document.getElementById('connectBtn');
const statusEl = document.getElementById('status');
const walletsListEl = document.getElementById('walletsList');
const tokensBodyEl = document.getElementById('tokensBody');
const totalValueEl = document.getElementById('totalValue');
const scanAllBtn = document.getElementById('scanAllBtn');
const signBtn = document.getElementById('signBtn');
const backendBtn = document.getElementById('backendBtn');
const toastContainer = document.getElementById('toastContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');

// Local state
const state = {
  wallets: [], // { address, provider (ethers Provider), signer, walletType, name, scanResults }
  tokenlist: null
};

// Helpers: UI
function toast(message, type = 'info') {
  if (!toastContainer) return console.log('[toast]', type, message);
  const d = document.createElement('div');
  d.className = 'toast ' + type;
  d.innerText = message;
  toastContainer.appendChild(d);
  setTimeout(() => d.remove(), 5000);
}

function showLoading(msg) {
  if (loadingText) loadingText.textContent = msg || 'Loading...';
  if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

function hideLoading() {
  if (loadingOverlay) loadingOverlay.style.display = 'none';
}

function renderWallets() {
  if (!walletsListEl) return;
  if (state.wallets.length === 0) {
    walletsListEl.innerHTML = '<p>No wallets connected</p>';
    statusEl.textContent = 'Not connected';
    return;
  }
  statusEl.textContent = `${state.wallets.length} wallet(s) connected`;
  walletsListEl.innerHTML = state.wallets.map(w => `
    <div class="wallet-chip">
      <div>
        <strong>${w.name}</strong>
        <div style="color:#94a3b8">${shortAddress(w.address)}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center">
        <button onclick="rescanWallet('${w.address}')">Rescan</button>
        <button onclick="disconnectWallet('${w.address}')">Disconnect</button>
      </div>
    </div>
  `).join('');
}

function renderTokens() {
  if (!tokensBodyEl) return;
  const all = [];
  state.wallets.forEach(w => {
    if (w.scanResults?.allTokens) all.push(...w.scanResults.allTokens);
  });
  if (all.length === 0) {
    tokensBodyEl.innerHTML = '<tr><td colspan="6">No tokens found</td></tr>';
    totalValueEl.textContent = 'Total Value: $0.00';
    return;
  }
  // sort by value
  all.sort((a,b) => (b.value || 0) - (a.value || 0));
  tokensBodyEl.innerHTML = all.map(t => `
    <tr>
      <td>${t.symbol}</td>
      <td>${formatAmount(t.balance)}</td>
      <td>$${(t.price || 0).toLocaleString(undefined, {maximumFractionDigits:6})}</td>
      <td>$${(t.value || 0).toFixed(2)}</td>
      <td>${t.chain}</td>
      <td style="font-size:11px;color:#94a3b8">${t.address === 'native' ? '-' : t.address}</td>
    </tr>
  `).join('');
  const total = all.reduce((s,t) => s + (t.value || 0), 0);
  totalValueEl.textContent = `Total Value: $${total.toFixed(2)}`;
}

function shortAddress(addr) {
  if (!addr) return '';
  return `${addr.substring(0,6)}...${addr.substring(addr.length-4)}`;
}
function formatAmount(v) {
  if (v === undefined || v === null) return '0';
  return Number(v).toLocaleString(undefined, {maximumFractionDigits:6});
}

// CORS-aware fetch for CoinGecko
async function fetchWithCorsFallback(url) {
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (resp.ok) return resp;
  } catch (e) {
    // likely CORS blocked
  }
  // try allorigins proxy
  try {
    const px = CONFIG.PRICE_CORS_PROXY + encodeURIComponent(url);
    const resp2 = await fetch(px);
    if (resp2.ok) return resp2;
  } catch (e) {
    // fallback
  }
  return null;
}

async function getPriceByCoinId(coinId) {
  if (!coinId) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd`;
  const resp = await fetchWithCorsFallback(url);
  if (!resp) return null;
  try {
    const j = await resp.json();
    return j?.[coinId]?.usd ?? null;
  } catch (e) { return null; }
}

async function getPriceByContract(contractAddress, platformId) {
  if (!contractAddress || !platformId) return null;
  const url = `${CONFIG.PRICE_API_BASE}/simple/token_price/${platformId}?contract_addresses=${encodeURIComponent(contractAddress)}&vs_currencies=usd`;
  const resp = await fetchWithCorsFallback(url);
  if (!resp) return null;
  try {
    const j = await resp.json();
    const key = Object.keys(j || {})[0];
    return key ? j[key]?.usd ?? null : null;
  } catch (e) { return null; }
}

// Tokenlist loading
async function loadTokenList() {
  if (state.tokenlist) return state.tokenlist;
  try {
    const resp = await fetch(CONFIG.TOKENLIST_URL);
    if (!resp.ok) { state.tokenlist = []; return []; }
    const j = await resp.json();
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

// ERC20 minimal ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// Scanning logic (uses ethers Provider / Signer returned by AppKit)
async function scanWithEthersProvider(ethersProvider, address) {
  const results = { walletAddress: address, chainBalances: [], allTokens: [], totalValue: 0, timestamp: Date.now() };

  await loadTokenList();

  for (const chain of CONFIG.EVM_CHAINS) {
    try {
      const rpc = chain.rpc;
      // create a JSON-RPC provider for this chain to avoid mixing chain contexts
      const chainProvider = new ethers.providers.JsonRpcProvider(rpc);
      // native balance
      const rawBal = await chainProvider.getBalance(address).catch(()=> ethers.BigNumber.from(0));
      const nativeBal = Number(ethers.utils.formatEther(rawBal));
      const coinPrice = await getPriceByCoinId(chain.cgPlatform).catch(()=> null);
      const nativeValue = nativeBal * (coinPrice ?? 0);

      const chainResult = {
        chain,
        nativeBalance: { symbol: chain.symbol, balance: Number(nativeBal.toFixed(6)), price: coinPrice ?? 0, value: nativeValue },
        tokens: [],
        totalValue: nativeValue
      };

      // Build candidate tokens: common list + tokenlist filtered
      const candidates = getCommonTokens(chain.id).map(t => ({...t}));
      const listForChain = (state.tokenlist || []).filter(t => t.chainId === chain.id).slice(0, CONFIG.TOKEN_SCAN_LIMIT);
      for (const t of listForChain) {
        if (!candidates.some(c => (c.address||'').toLowerCase() === t.address)) {
          candidates.push({ address: t.address, symbol: t.symbol, name: t.name, decimals: t.decimals });
        }
      }
      const toCheck = candidates.slice(0, CONFIG.TOKEN_SCAN_LIMIT);

      // concurrency scan
      let idx = 0;
      const found = [];
      const worker = async () => {
        while (idx < toCheck.length) {
          const i = idx++;
          const tk = toCheck[i];
          try {
            if (!tk.address || tk.address === '0x') continue;
            const contract = new ethers.Contract(tk.address, ERC20_ABI, chainProvider);
            // Use callStatic balanceOf (view)
            let balRaw;
            try { balRaw = await contract.balanceOf(address); }
            catch (e) { continue; }
            if (!balRaw || balRaw.isZero()) continue;
            const decimals = tk.decimals || (await contract.decimals().catch(()=>18));
            const balance = Number(ethers.utils.formatUnits(balRaw, decimals));
            if (balance <= 0) continue;
            // price by contract
            let price = await getPriceByContractOrSymbol(tk.address, chain.cgPlatform, tk.symbol);
            const value = balance * (price ?? 0);
            found.push({
              address: tk.address,
              symbol: tk.symbol,
              name: tk.name,
              balance: Number(balance.toFixed(6)),
              decimals,
              price: price ?? 0,
              value,
              chain: chain.name,
              type: 'erc20'
            });
          } catch (e) {
            // ignore token failures
          }
        }
      };

      // spawn workers
      const workers = [];
      for (let w=0; w<Math.max(1, Math.min(6, CONFIG.RPC_CONCURRENCY)); w++) workers.push(worker());
      await Promise.all(workers);

      found.sort((a,b) => (b.value || 0) - (a.value || 0));
      chainResult.tokens = found;
      chainResult.totalValue += found.reduce((s,t)=> s + (t.value||0), 0);

      // push native and found tokens
      results.chainBalances.push(chainResult);
      results.allTokens.push({
        address: 'native',
        symbol: chain.symbol,
        name: `${chain.name} Native`,
        balance: chainResult.nativeBalance.balance,
        price: chainResult.nativeBalance.price,
        value: chainResult.nativeBalance.value,
        chain: chain.name,
        type: 'native'
      });
      if (found.length) results.allTokens.push(...found);
    } catch (err) {
      console.warn('chain scan error', chain.name, err);
    }
    // throttle
    await new Promise(r => setTimeout(r, 300));
  }

  // Solana handling (best-effort) — if AppKit provider or window.solana available, user might connect Phantom separately
  // Not implemented here beyond native SOL check — can be extended to enumerate SPL tokens.
  results.totalValue = results.allTokens.reduce((s,t) => s + (t.value || 0), 0);
  return results;
}

async function getPriceByContractOrSymbol(contractAddress, platformId, symbol) {
  // try contract -> coin id -> fallback defaults
  let price = null;
  try { price = await getPriceByContract(contractAddress, platformId); } catch(e) { price = null; }
  if (price != null) return price;
  const id = symbolToCoinId(symbol);
  if (id) {
    const p = await getPriceByCoinId(id).catch(()=> null);
    if (p != null) return p;
  }
  // fallback defaults
  return defaultPrice(symbol);
}

async function getPriceByContract(contractAddress, platformId) {
  const val = await getPriceByContractHelper(contractAddress, platformId);
  return val;
}
async function getPriceByContractHelper(contractAddress, platformId) {
  try {
    const url = `${CONFIG.PRICE_API_BASE}/simple/token_price/${platformId}?contract_addresses=${encodeURIComponent(contractAddress)}&vs_currencies=usd`;
    const resp = await fetchWithCorsFallback(url);
    if (!resp) return null;
    const j = await resp.json();
    const key = Object.keys(j || {})[0];
    if (!key) return null;
    return j[key]?.usd ?? null;
  } catch (e) {
    return null;
  }
}

function symbolToCoinId(sym) {
  const map = { 'ETH':'ethereum','BNB':'binancecoin','MATIC':'matic-network','SOL':'solana','AVAX':'avalanche-2','FTM':'fantom','BTC':'bitcoin','USDT':'tether','USDC':'usd-coin','DAI':'dai','BUSD':'binance-usd' };
  return map[(sym||'').toUpperCase()] || null;
}
function defaultPrice(sym) {
  const def = { 'ETH':2500,'BNB':300,'MATIC':0.8,'SOL':100,'AVAX':30,'FTM':0.3,'BTC':45000,'USDT':1,'USDC':1,'DAI':1,'BUSD':1 };
  return def[(sym||'').toUpperCase()] || 0;
}

async function fetchWithCorsFallback(url) {
  // reuse function above (client-side)
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (resp.ok) return resp;
  } catch (e) {}
  // try proxy
  try {
    const px = CONFIG.PRICE_CORS_PROXY + encodeURIComponent(url);
    const resp2 = await fetch(px);
    if (resp2.ok) return resp2;
  } catch (e) {}
  return null;
}

// Minimal common token list per chain
function getCommonTokens(chainId) {
  const map = {
    1: [
      { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether', decimals: 6 },
      { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 }
    ],
    56: [
      { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether', decimals: 18 },
      { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18 },
      { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'Binance USD', decimals: 18 }
    ],
    137: [
      { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', name: 'Tether', decimals: 6 },
      { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6 }
    ]
  };
  return map[chainId] || [];
}

// AppKit connect flow & state subscription
connectBtn.addEventListener('click', async () => {
  try {
    await appKit.open();
  } catch (err) {
    console.error('Modal failed to open:', err);
    toast('Wallet modal failed to open', 'error');
  }
});

// Subscribe to appKit state changes — when connected, appKit will set state.isConnected
appKit.subscribeState(async (s) => {
  try {
    if (s.isConnected) {
      // Try to extract provider / signer from appKit state.
      // Different versions may expose different properties. Try a few ways.
      let provider = s.provider || s.connector?.provider || null;

      // If adapter provides a getProvider or signer, try those
      if (!provider && appKit.getProvider) {
        try { provider = await appKit.getProvider(); } catch (e) {}
      }

      // If still no provider, fallback to window.ethereum
      if (!provider && window.ethereum) provider = window.ethereum;

      if (!provider) {
        toast('Connected but provider not available. AppKit returned connection state but no provider accessible.', 'warning');
        return;
      }

      // Wrap provider with ethers
      const ethersProvider = new ethers.providers.Web3Provider(provider);
      const signer = ethersProvider.getSigner();
      let address;
      try {
        address = await signer.getAddress();
      } catch (e) {
        // sometimes state contains account(s)
        address = (s.account || s.accounts?.[0] || s.address) || null;
      }
      if (!address) {
        toast('Connected but failed to get account address', 'error');
        return;
      }

      // Compose a wallet entry and store
      const walletEntry = {
        address,
        provider: ethersProvider,
        signer,
        name: s.name || (s.walletName || 'Connected Wallet'),
        walletType: s.walletType || 'appkit',
        scanResults: null
      };

      // Update or add
      const existingIdx = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
      if (existingIdx !== -1) state.wallets[existingIdx] = walletEntry;
      else state.wallets.push(walletEntry);

      renderWallets();
      toast(`Connected: ${shortAddress(address)}`, 'success');

      // Auto-scan newly connected wallet
      showLoading('Auto-scanning connected wallet...');
      try {
        const scanResults = await scanWithEthersProvider(ethersProvider, address);
        const idx = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
        if (idx !== -1) state.wallets[idx].scanResults = scanResults;
        renderTokens();
        toast('Auto-scan complete', 'success');
      } catch (scanErr) {
        console.error('Auto-scan failed:', scanErr);
        toast('Auto-scan failed: ' + (scanErr.message || scanErr), 'warning');
      } finally {
        hideLoading();
      }
    } else {
      // disconnected state - optional cleanup
      // console.log('appKit state: disconnected');
    }
  } catch (outerErr) {
    console.error('subscribeState handler error:', outerErr);
  }
});

// Rescan, Disconnect, Sign, Backend triggers
window.rescanWallet = async (address) => {
  const w = state.wallets.find(x => x.address.toLowerCase() === address.toLowerCase());
  if (!w) return toast('Wallet not found', 'warning');
  showLoading('Rescanning wallet...');
  try {
    const results = await scanWithEthersProvider(w.provider, w.address);
    w.scanResults = results;
    renderTokens();
    toast('Rescan complete', 'success');
  } catch (e) {
    toast('Rescan failed: ' + (e.message || e), 'error');
  } finally { hideLoading(); }
};

window.disconnectWallet = async (address) => {
  // If appKit exposes disconnect method for the active session, call it
  try {
    if (appKit.disconnect) await appKit.disconnect();
  } catch (e) {}
  state.wallets = state.wallets.filter(w => w.address.toLowerCase() !== address.toLowerCase());
  renderWallets();
  renderTokens();
  toast('Wallet disconnected', 'info');
};

scanAllBtn.addEventListener('click', async () => {
  if (!state.wallets.length) return toast('No wallets connected', 'warning');
  showLoading('Scanning all connected wallets...');
  try {
    for (const w of state.wallets) {
      const res = await scanWithEthersProvider(w.provider, w.address);
      w.scanResults = res;
    }
    renderTokens();
    toast('All wallets scanned', 'success');
  } catch (e) {
    toast('Scan all failed: ' + (e.message || e), 'error');
  } finally { hideLoading(); }
});

signBtn.addEventListener('click', async () => {
  if (!state.wallets.length) return toast('No wallets to sign', 'warning');
  showLoading('Signing with connected wallets...');
  try {
    for (const w of state.wallets) {
      try {
        if (!w.signer) {
          w.signer = w.provider.getSigner();
        }
        const message = `Authorize MultiChain Scanner\nAddress: ${w.address}\nTimestamp: ${Date.now()}\nNonce:${Math.random().toString(36).slice(2,10)}`;
        const sig = await w.signer.signMessage(message);
        console.log('Signature for', w.address, sig);
        toast(`Signed: ${shortAddress(w.address)}`, 'success');
      } catch (e) {
        console.warn('Sign failed for', w.address, e);
        toast(`Sign failed: ${shortAddress(w.address)}`, 'warning');
      }
    }
  } finally { hideLoading(); }
});

backendBtn.addEventListener('click', async () => {
  if (!state.wallets.length) return toast('No wallets', 'warning');
  showLoading('Preparing payload for backend...');
  try {
    const payload = state.wallets.map(w => ({
      address: w.address,
      walletType: w.walletType,
      scanResults: w.scanResults
    }));
    console.log('Backend payload:', payload);
    // Simulated backend call:
    await new Promise(r => setTimeout(r, 900));
    toast('Backend processing simulated (see console)', 'success');
  } catch (e) {
    toast('Backend trigger failed: ' + (e.message || e), 'error');
  } finally { hideLoading(); }
});

// Init: pre-load tokenlist for faster scanning
(async function init() {
  showLoading('Warming tokenlist...');
  await loadTokenList().catch(()=>{});
  hideLoading();
  toast('Ready. Click "Open Wallet Modal" to connect a wallet.', 'info');
})();

export { appKit }; // exported for debugging if needed
