// main.js — AppKit + ethers multi-chain scanner (DOM-safe, avoids large template literals)
// Use package imports (install dependencies: @reown/appkit, @reown/appkit-adapter-ethers, ethers)
// This file is safe to build with Vite (no JSX, no ambiguous template literals).

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
  RPC_CONCURRENCY: 6
};

// create AppKit
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

// local state
const state = {
  wallets: [],
  tokenlist: null
};

// UI helpers
function addToast(message) {
  if (!toastContainer) return console.log('[toast]', message);
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = message;
  toastContainer.appendChild(d);
  setTimeout(()=> d.remove(), 4500);
}
function showLoading(msg = 'Loading...') {
  if (loadingText) loadingText.textContent = msg;
  if (loadingOverlay) loadingOverlay.style.display = 'flex';
}
function hideLoading() {
  if (loadingOverlay) loadingOverlay.style.display = 'none';
}
function shortAddr(a){ return a ? `${a.slice(0,6)}...${a.slice(-4)}` : ''; }
function fmtNum(n){ return Number(n).toLocaleString(undefined, { maximumFractionDigits: 6 }); }

// Price helpers with CORS fallback
async function fetchWithProxy(url) {
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (r.ok) return r;
  } catch (e) {}
  try {
    const proxy = CONFIG.PRICE_CORS_PROXY + encodeURIComponent(url);
    const r2 = await fetch(proxy);
    if (r2.ok) return r2;
  } catch (e) {}
  return null;
}
async function coinPriceById(id) {
  if (!id) return null;
  const u = `${CONFIG.PRICE_API_BASE}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
  const r = await fetchWithProxy(u);
  if (!r) return null;
  try { const j = await r.json(); return j?.[id]?.usd ?? null; } catch { return null; }
}
async function contractPrice(contractAddress, platformId) {
  if (!contractAddress || !platformId) return null;
  const u = `${CONFIG.PRICE_API_BASE}/simple/token_price/${platformId}?contract_addresses=${encodeURIComponent(contractAddress)}&vs_currencies=usd`;
  const r = await fetchWithProxy(u);
  if (!r) return null;
  try { const j = await r.json(); const k = Object.keys(j||{})[0]; return k ? j[k]?.usd ?? null : null; } catch { return null; }
}

// tokenlist loader (cached)
async function loadTokenList() {
  if (state.tokenlist) return state.tokenlist;
  try {
    const r = await fetch(CONFIG.TOKENLIST_URL);
    if (!r.ok) { state.tokenlist = []; return []; }
    const j = await r.json();
    state.tokenlist = (j.tokens || []).map(t => ({
      chainId: t.chainId,
      address: (t.address||'').toLowerCase(),
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

// common tokens to ensure USDT/USDC/WBTC etc are checked
function commonTokens(chainId) {
  const map = {
    1: [
      { address:'0xdac17f958d2ee523a2206206994597c13d831ec7', symbol:'USDT', decimals:6 },
      { address:'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol:'USDC', decimals:6 },
      { address:'0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol:'WBTC', decimals:8 }
    ],
    56: [
      { address:'0x55d398326f99059ff775485246999027b3197955', symbol:'USDT', decimals:18 },
      { address:'0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', symbol:'USDC', decimals:18 },
      { address:'0xe9e7cea3dedca5984780bafc599bd69add087d56', symbol:'BUSD', decimals:18 }
    ],
    137: [
      { address:'0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol:'USDT', decimals:6 },
      { address:'0x2791bca1f2de4661ed88a30c99a7a9449aa84174', symbol:'USDC', decimals:6 }
    ]
  };
  return map[chainId] || [];
}

// scanner using ethers JSON-RPC per chain
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)","function decimals() view returns (uint8)"];

async function scanProviderBalances(ethersProvider, address) {
  await loadTokenList();
  const out = { walletAddress: address, chainBalances: [], allTokens: [], totalValue: 0, timestamp: Date.now() };

  for (const chain of CONFIG.EVM_CHAINS) {
    try {
      const rpc = chain.rpc;
      const rpcProvider = new ethers.providers.JsonRpcProvider(rpc);
      const raw = await rpcProvider.getBalance(address).catch(()=> ethers.BigNumber.from(0));
      const nativeBal = Number(ethers.utils.formatEther(raw));
      let nativePrice = await coinPriceById(chain.cgPlatform).catch(()=> null);
      if (nativePrice == null) nativePrice = defaultPrice(chain.symbol);
      const nativeVal = nativeBal * nativePrice;

      const chainResult = {
        chain,
        nativeBalance: { symbol: chain.symbol, balance: Number(nativeBal.toFixed(6)), price: nativePrice, value: nativeVal },
        tokens: [],
        totalValue: nativeVal
      };

      // build candidate tokens
      const candidates = commonTokens(chain.id).map(t => ({...t, address: (t.address||'').toLowerCase()}));
      const listForChain = (state.tokenlist || []).filter(t => t.chainId === chain.id).slice(0, CONFIG.TOKEN_SCAN_LIMIT);
      for (const t of listForChain) {
        if (!candidates.some(c => c.address === t.address)) candidates.push({ address: t.address, symbol: t.symbol, decimals: t.decimals || 18, name: t.name });
      }
      const toCheck = candidates.slice(0, CONFIG.TOKEN_SCAN_LIMIT);

      // concurrency token checks
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
            // price resolution
            let price = await contractPrice(tk.address, chain.cgPlatform).catch(()=> null);
            if (price == null) {
              const coinId = symbolToCoinId(tk.symbol);
              price = coinId ? (await coinPriceById(coinId).catch(()=> null)) : null;
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
            // ignore
          }
        }
      };

      const workers = [];
      const concurrency = Math.max(1, Math.min(CONFIG.RPC_CONCURRENCY, 8));
      for (let w=0; w<concurrency; w++) workers.push(worker());
      await Promise.all(workers);

      found.sort((a,b)=> (b.value || 0) - (a.value || 0));
      chainResult.tokens = found;
      chainResult.totalValue += found.reduce((s,t) => s + (t.value||0), 0);

      out.chainBalances.push(chainResult);
      out.allTokens.push({
        address: 'native',
        symbol: chain.symbol,
        name: `${chain.name} Native`,
        balance: chainResult.nativeBalance.balance,
        price: chainResult.nativeBalance.price,
        value: chainResult.nativeBalance.value,
        chain: chain.name,
        type: 'native'
      });
      if (found.length) out.allTokens.push(...found);

    } catch (err) {
      console.warn('scan error', chain.name, err);
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

// AppKit flow
connectBtn.addEventListener('click', async () => {
  try {
    await appKit.open();
  } catch (err) {
    console.error('appKit.open error', err);
    addToast('Wallet modal failed to open');
  }
});

// subscribe to state and handle connection
appKit.subscribeState(async (s) => {
  try {
    if (!s) return;
    if (s.isConnected) {
      let rawProvider = s.provider || s.connector?.provider || null;
      try { if (!rawProvider && appKit.getProvider) rawProvider = await appKit.getProvider(); } catch (_) {}
      if (!rawProvider && window.ethereum) rawProvider = window.ethereum;
      if (!rawProvider) { addToast('Connected but provider not accessible'); return; }

      const ethersProvider = new ethers.providers.Web3Provider(rawProvider);
      const signer = ethersProvider.getSigner();
      let address = null;
      try { address = await signer.getAddress(); } catch (_) { address = s.account || s.accounts?.[0] || s.address || null; }
      if (!address) { addToast('Connected but address not readable'); return; }

      const entry = {
        address,
        provider: ethersProvider,
        signer,
        name: s.name || s.walletName || 'Connected Wallet',
        walletType: s.walletType || 'appkit',
        scanResults: null
      };

      const idx = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
      if (idx !== -1) state.wallets[idx] = entry; else state.wallets.push(entry);

      renderWalletsDOM();
      addToast(`Connected: ${shortAddr(address)}`);

      // auto-scan
      showLoading('Auto-scanning wallet...');
      try {
        const res = await scanProviderBalances(ethersProvider, address);
        const j = state.wallets.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
        if (j !== -1) state.wallets[j].scanResults = res;
        renderTokensDOM();
        addToast('Auto-scan complete');
      } catch (scanErr) {
        console.error('auto-scan error', scanErr);
        addToast('Auto-scan failed');
      } finally { hideLoading(); }
    }
  } catch (e) {
    console.error('subscribeState handler error', e);
  }
});

// DOM rendering via element creation (no template literals)
function renderWalletsDOM() {
  if (!walletsListEl) return;
  walletsListEl.innerHTML = '';
  if (state.wallets.length === 0) {
    const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No wallets connected';
    walletsListEl.appendChild(p);
    statusEl.textContent = 'Not connected';
    return;
  }
  statusEl.textContent = `${state.wallets.length} wallet(s) connected`;
  for (const w of state.wallets) {
    const chip = document.createElement('div'); chip.className = 'wallet-chip';
    const left = document.createElement('div');
    const strong = document.createElement('strong'); strong.textContent = w.name;
    const addr = document.createElement('div'); addr.className = 'muted'; addr.textContent = shortAddr(w.address);
    left.appendChild(strong); left.appendChild(addr);
    const right = document.createElement('div'); right.style.display = 'flex'; right.style.gap = '8px';
    const rescanBtn = document.createElement('button'); rescanBtn.textContent = 'Rescan';
    rescanBtn.addEventListener('click', () => window.rescanWallet(w.address));
    const disconnectBtn = document.createElement('button'); disconnectBtn.textContent = 'Disconnect';
    disconnectBtn.addEventListener('click', () => window.disconnectWallet(w.address));
    right.appendChild(rescanBtn); right.appendChild(disconnectBtn);
    chip.appendChild(left); chip.appendChild(right);
    walletsListEl.appendChild(chip);
  }
}

function renderTokensDOM() {
  if (!tokensBodyEl) return;
  tokensBodyEl.innerHTML = '';
  const all = [];
  for (const w of state.wallets) {
    if (w.scanResults?.allTokens) all.push(...w.scanResults.allTokens);
  }
  if (all.length === 0) {
    const row = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 6; td.className = 'muted'; td.textContent = 'No tokens found'; row.appendChild(td); tokensBodyEl.appendChild(row);
    totalValueEl.textContent = 'Total Value: $0.00'; return;
  }
  all.sort((a,b) => (b.value || 0) - (a.value || 0));
  for (const t of all) {
    const tr = document.createElement('tr');
    const tdSymbol = document.createElement('td'); tdSymbol.textContent = t.symbol;
    const tdBal = document.createElement('td'); tdBal.textContent = fmtNum(t.balance);
    const tdPrice = document.createElement('td'); tdPrice.textContent = `$${(t.price || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
    const tdVal = document.createElement('td'); tdVal.textContent = `$${(t.value || 0).toFixed(2)}`;
    const tdChain = document.createElement('td'); tdChain.textContent = t.chain;
    const tdAddr = document.createElement('td'); tdAddr.style.fontSize = '12px'; tdAddr.style.color = '#94a3b8'; tdAddr.textContent = t.address === 'native' ? '-' : t.address;
    tr.appendChild(tdSymbol); tr.appendChild(tdBal); tr.appendChild(tdPrice); tr.appendChild(tdVal); tr.appendChild(tdChain); tr.appendChild(tdAddr);
    tokensBodyEl.appendChild(tr);
  }
  const total = all.reduce((s,t) => s + (t.value || 0), 0);
  totalValueEl.textContent = `Total Value: $${total.toFixed(2)}`;
}

// global functions for UI buttons
window.rescanWallet = async (address) => {
  const w = state.wallets.find(x => x.address.toLowerCase() === address.toLowerCase());
  if (!w) { addToast('Wallet not found'); return; }
  showLoading('Rescanning wallet...');
  try {
    const res = await scanProviderBalances(w.provider, w.address);
    w.scanResults = res;
    renderTokensDOM();
    addToast('Rescan complete');
  } catch (e) {
    console.error('rescan failed', e);
    addToast('Rescan failed');
  } finally { hideLoading(); }
};

window.disconnectWallet = async (address) => {
  try { if (appKit.disconnect) await appKit.disconnect(); } catch (e) {}
  state.wallets = state.wallets.filter(w => w.address.toLowerCase() !== address.toLowerCase());
  renderWalletsDOM();
  renderTokensDOM();
  addToast('Wallet disconnected');
};

// buttons
scanAllBtn.addEventListener('click', async () => {
  if (!state.wallets.length) { addToast('No wallets connected'); return; }
  showLoading('Scanning all wallets...');
  try {
    for (const w of state.wallets) {
      const res = await scanProviderBalances(w.provider, w.address);
      w.scanResults = res;
    }
    renderTokensDOM();
    addToast('All wallets scanned');
  } catch (e) {
    console.error('scan all failed', e);
    addToast('Scan all failed');
  } finally { hideLoading(); }
});

signBtn.addEventListener('click', async () => {
  if (!state.wallets.length) { addToast('No wallets to sign'); return; }
  showLoading('Signing messages...');
  try {
    for (const w of state.wallets) {
      try {
        if (!w.signer) w.signer = w.provider.getSigner();
        const msg = `Authorize MultiChain Scanner\nAddress: ${w.address}\nTimestamp: ${Date.now()}\nNonce:${Math.random().toString(36).slice(2,10)}`;
        const sig = await w.signer.signMessage(msg);
        console.log('Signature', w.address, sig);
        addToast(`Signed: ${shortAddr(w.address)}`);
      } catch (e) {
        console.warn('sign failed', e);
        addToast(`Sign failed for ${shortAddr(w.address)}`);
      }
    }
  } finally { hideLoading(); }
});

backendBtn.addEventListener('click', async () => {
  if (!state.wallets.length) { addToast('No wallets'); return; }
  showLoading('Preparing backend payload...');
  try {
    const payload = state.wallets.map(w => ({ address: w.address, walletType: w.walletType, scanResults: w.scanResults }));
    console.log('Backend payload:', payload);
    // send to backend here (example commented)
    // await fetch('/api/process', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    await new Promise(r => setTimeout(r, 700));
    addToast('Backend processed (simulated)');
  } catch (e) {
    console.error('backend failed', e);
    addToast('Backend failed');
  } finally { hideLoading(); }
});

// warm tokenlist
(async function init() {
  showLoading('Warming tokenlist...');
  await loadTokenList().catch(()=>{});
  hideLoading();
  addToast('Ready — open the wallet modal to connect.');
})();
