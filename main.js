import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

const projectId = "962425907914a3e80a7d8e7288b23f62";

// Comprehensive chain configurations
const CHAIN_CONFIGS = {
  evm: [
    { id: 1, name: "Ethereum", rpcUrl: "https://cloudflare-eth.com", nativeCurrency: "ETH" },
    { id: 56, name: "Binance Smart Chain", rpcUrl: "https://bsc-dataseed.binance.org", nativeCurrency: "BNB" },
    { id: 137, name: "Polygon", rpcUrl: "https://polygon-rpc.com", nativeCurrency: "MATIC" },
    { id: 250, name: "Fantom", rpcUrl: "https://rpc.ftm.tools", nativeCurrency: "FTM" },
    { id: 43114, name: "Avalanche", rpcUrl: "https://api.avax.network/ext/bc/C/rpc", nativeCurrency: "AVAX" },
    { id: 42161, name: "Arbitrum One", rpcUrl: "https://arb1.arbitrum.io/rpc", nativeCurrency: "ETH" },
    { id: 10, name: "Optimism", rpcUrl: "https://mainnet.optimism.io", nativeCurrency: "ETH" },
    { id: 8453, name: "Base", rpcUrl: "https://mainnet.base.org", nativeCurrency: "ETH" },
    { id: 324, name: "zkSync Era", rpcUrl: "https://mainnet.era.zksync.io", nativeCurrency: "ETH" },
    { id: 59144, name: "Linea", rpcUrl: "https://rpc.linea.build", nativeCurrency: "ETH" },
    { id: 100, name: "Gnosis", rpcUrl: "https://rpc.gnosischain.com", nativeCurrency: "xDAI" },
    { id: 25, name: "Cronos", rpcUrl: "https://evm.cronos.org", nativeCurrency: "CRO" },
    { id: 42220, name: "Celo", rpcUrl: "https://forno.celo.org", nativeCurrency: "CELO" },
    { id: 1284, name: "Moonbeam", rpcUrl: "https://rpc.api.moonbeam.network", nativeCurrency: "GLMR" },
    { id: 1313161554, name: "Aurora", rpcUrl: "https://mainnet.aurora.dev", nativeCurrency: "ETH" },
    { id: 1666600000, name: "Harmony", rpcUrl: "https://api.harmony.one", nativeCurrency: "ONE" },
    { id: 8217, name: "Klaytn", rpcUrl: "https://public-node-api.klaytnapi.com/v1/cypress", nativeCurrency: "KLAY" },
    { id: 11155111, name: "Sepolia", rpcUrl: "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", nativeCurrency: "ETH" },
    { id: 80001, name: "Mumbai", rpcUrl: "https://rpc-mumbai.maticvigil.com", nativeCurrency: "MATIC" },
    { id: 97, name: "BSC Testnet", rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545", nativeCurrency: "BNB" }
  ],
  nonEVM: [
    { id: "cosmoshub-4", name: "Cosmos Hub", type: "cosmos", rpcUrl: "https://rpc.cosmos.network", nativeCurrency: "ATOM" },
    { id: "osmosis-1", name: "Osmosis", type: "cosmos", rpcUrl: "https://rpc.osmosis.zone", nativeCurrency: "OSMO" },
    { id: "juno-1", name: "Juno", type: "cosmos", rpcUrl: "https://rpc.juno.strange.love", nativeCurrency: "JUNO" },
    { id: "secret-4", name: "Secret Network", type: "cosmos", rpcUrl: "https://rpc.secret.express", nativeCurrency: "SCRT" },
    { id: "phoenix-1", name: "Terra 2.0", type: "cosmos", rpcUrl: "https://phoenix-lcd.terra.dev", nativeCurrency: "LUNA" },
    { id: "solana", name: "Solana", type: "solana", rpcUrl: "https://api.mainnet-beta.solana.com", nativeCurrency: "SOL" },
    { id: "bitcoin", name: "Bitcoin", type: "bitcoin", rpcUrl: "", nativeCurrency: "BTC" },
    { id: "polkadot", name: "Polkadot", type: "substrate", rpcUrl: "wss://rpc.polkadot.io", nativeCurrency: "DOT" },
    { id: "kusama", name: "Kusama", type: "substrate", rpcUrl: "wss://kusama-rpc.polkadot.io", nativeCurrency: "KSM" },
    { id: "cardano", name: "Cardano", type: "cardano", rpcUrl: "https://cardano-mainnet.blockfrost.io/api/v0", nativeCurrency: "ADA" },
    { id: "near", name: "NEAR", type: "near", rpcUrl: "https://rpc.mainnet.near.org", nativeCurrency: "NEAR" },
    { id: "aptos", name: "Aptos", type: "aptos", rpcUrl: "https://fullnode.mainnet.aptoslabs.com/v1", nativeCurrency: "APT" },
    { id: "sui", name: "Sui", type: "sui", rpcUrl: "https://fullnode.mainnet.sui.io", nativeCurrency: "SUI" },
    { id: "ton", name: "TON", type: "ton", rpcUrl: "https://toncenter.com/api/v2/jsonRPC", nativeCurrency: "TON" },
    { id: "tron", name: "Tron", type: "tron", rpcUrl: "https://api.trongrid.io", nativeCurrency: "TRX" },
    { id: "algorand", name: "Algorand", type: "algorand", rpcUrl: "https://mainnet-api.algonode.cloud", nativeCurrency: "ALGO" },
    { id: "tezos", name: "Tezos", type: "tezos", rpcUrl: "https://mainnet.api.tez.ie", nativeCurrency: "XTZ" },
    { id: "stellar", name: "Stellar", type: "stellar", rpcUrl: "https://horizon.stellar.org", nativeCurrency: "XLM" },
    { id: "ripple", name: "Ripple", type: "ripple", rpcUrl: "https://s1.ripple.com:51234", nativeCurrency: "XRP" },
    { id: "litecoin", name: "Litecoin", type: "litecoin", rpcUrl: "", nativeCurrency: "LTC" },
    { id: "dogecoin", name: "Dogecoin", type: "dogecoin", rpcUrl: "", nativeCurrency: "DOGE" }
  ]
};

// Initialize AppKit with all networks
const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  projectId,
  networks: CHAIN_CONFIGS.evm,
  metadata: {
    name: "Multichain Wallet Scanner",
    description: "Scan tokens across all blockchain networks",
    url: window.location.origin,
    icons: ["https://avatars.githubusercontent.com/u/37784886"]
  },
  themeMode: "dark",
  features: {
    analytics: false,
    email: false
  }
});

// UI Elements
const connectBtn = document.getElementById("connectBtn");
const status = document.getElementById("status");
const walletInfo = document.getElementById("walletInfo");
const chainsInfo = document.getElementById("chainsInfo");
const scanBtn = document.getElementById("scanBtn");
const scanResults = document.getElementById("scanResults");

// Wallet connection state
let isWalletConnected = false;
let currentAccount = null;
let currentChain = null;
let walletProvider = null;

// Token ABIs (simplified ERC20 ABI)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// Common token addresses by chain
const COMMON_TOKENS = {
  1: { // Ethereum
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    'LINK': '0x514910771AF9Ca656af840dff83E8264EcF986CA'
  },
  56: { // BSC
    'BUSD': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    'USDT': '0x55d398326f99059fF775485246999027B3197955',
    'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    'CAKE': '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'
  },
  137: { // Polygon
    'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    'MATIC': '0x0000000000000000000000000000000000001010',
    'QUICK': '0x831753DD7087CaC61aB5644b308642cc1c33Dc13'
  },
  43114: { // Avalanche
    'USDT': '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    'USDC': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    'AVAX': '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'
  }
};

// Connect button handler
connectBtn.addEventListener("click", async () => {
  try {
    await appKit.open();
    status.textContent = "Opening wallet modal...";
    connectBtn.disabled = true;
  } catch (err) {
    console.error("Modal failed to open:", err);
    status.textContent = "Failed to open wallet modal";
    connectBtn.disabled = false;
  }
});

// Subscribe to AppKit state changes
appKit.subscribeState(async (state) => {
  console.log("AppKit state changed:", state);
  
  if (state.isConnected && state.account) {
    isWalletConnected = true;
    currentAccount = state.account;
    currentChain = state.chain;
    
    // Get the provider
    walletProvider = await appKit.getProvider();
    
    updateWalletInfo();
    status.textContent = `Connected to ${state.chain?.name || 'Unknown chain'}`;
    
    // Auto-scan for EVM chains
    if (isEVMChain(currentChain?.id)) {
      setTimeout(() => {
        scanTokens();
      }, 1000);
    }
    
    // Enable scan button for non-EVM chains
    scanBtn.disabled = false;
    scanBtn.style.display = 'block';
  } else if (!state.isConnected) {
    isWalletConnected = false;
    currentAccount = null;
    currentChain = null;
    walletProvider = null;
    
    resetUI();
    status.textContent = "Disconnected";
    scanBtn.disabled = true;
    scanBtn.style.display = 'none';
  }
});

// Scan button handler
scanBtn.addEventListener("click", async () => {
  if (!isWalletConnected || !currentAccount) {
    status.textContent = "Please connect wallet first";
    return;
  }
  
  await scanTokens();
});

// Update wallet information display
function updateWalletInfo() {
  if (!currentAccount || !currentChain) return;
  
  walletInfo.innerHTML = `
    <div class="wallet-info-card">
      <h3>Wallet Connected</h3>
      <p><strong>Address:</strong> ${formatAddress(currentAccount.address)}</p>
      <p><strong>Network:</strong> ${currentChain.name} (ID: ${currentChain.id})</p>
      <p><strong>Wallet:</strong> ${currentAccount.connector?.name || 'Unknown'}</p>
      <p><strong>Type:</strong> ${isEVMChain(currentChain.id) ? 'EVM' : 'Non-EVM'}</p>
    </div>
  `;
  
  // Display supported chains
  displaySupportedChains();
}

// Display all supported chains
function displaySupportedChains() {
  const allChains = [...CHAIN_CONFIGS.evm, ...CHAIN_CONFIGS.nonEVM];
  
  chainsInfo.innerHTML = `
    <div class="chains-list">
      <h3>Supported Networks (${allChains.length})</h3>
      <div class="chains-grid">
        ${allChains.map(chain => `
          <div class="chain-card ${chain.id === currentChain?.id ? 'active' : ''} ${chain.type || 'evm'}">
            <span class="chain-name">${chain.name}</span>
            <span class="chain-type">${chain.type || 'EVM'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Scan tokens on connected chain
async function scanTokens() {
  if (!isWalletConnected || !currentAccount || !currentChain) {
    status.textContent = "Wallet not connected";
    return;
  }
  
  status.textContent = `Scanning tokens on ${currentChain.name}...`;
  scanResults.innerHTML = '<div class="loading">Scanning tokens...</div>';
  
  try {
    let tokens = [];
    
    if (isEVMChain(currentChain.id)) {
      tokens = await scanEVMTokens();
    } else {
      tokens = await scanNonEVMTokens();
    }
    
    displayScanResults(tokens);
    status.textContent = `Found ${tokens.length} tokens on ${currentChain.name}`;
    
    // Trigger backend API call with scan results
    await sendToBackend(tokens);
    
  } catch (error) {
    console.error("Scan error:", error);
    scanResults.innerHTML = `<div class="error">Scan failed: ${error.message}</div>`;
    status.textContent = "Scan failed";
  }
}

// Scan EVM tokens
async function scanEVMTokens() {
  if (!walletProvider) throw new Error("Provider not available");
  
  const tokens = [];
  const address = currentAccount.address;
  const provider = new ethers.BrowserProvider(walletProvider);
  const signer = await provider.getSigner();
  
  // Get native balance
  const nativeBalance = await provider.getBalance(address);
  const nativeDecimals = 18;
  const nativeSymbol = currentChain.nativeCurrency || 'ETH';
  
  tokens.push({
    type: 'native',
    address: 'native',
    name: nativeSymbol,
    symbol: nativeSymbol,
    decimals: nativeDecimals,
    balance: ethers.formatUnits(nativeBalance, nativeDecimals),
    chainId: currentChain.id,
    chainName: currentChain.name
  });
  
  // Check common tokens on this chain
  const commonTokens = COMMON_TOKENS[currentChain.id] || {};
  
  for (const [symbol, tokenAddress] of Object.entries(commonTokens)) {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      const [balance, decimals, name, tokenSymbol] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.decimals(),
        tokenContract.name(),
        tokenContract.symbol()
      ]);
      
      if (balance > 0) {
        tokens.push({
          type: 'erc20',
          address: tokenAddress,
          name,
          symbol: tokenSymbol,
          decimals,
          balance: ethers.formatUnits(balance, decimals),
          chainId: currentChain.id,
          chainName: currentChain.name
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch token ${symbol}:`, error);
    }
  }
  
  return tokens;
}

// Scan non-EVM tokens (placeholder - requires specific SDKs)
async function scanNonEVMTokens() {
  const tokens = [];
  
  // This is a placeholder - actual implementation requires
  // specific blockchain SDKs for each non-EVM chain
  
  tokens.push({
    type: 'native',
    address: 'native',
    name: currentChain.nativeCurrency,
    symbol: currentChain.nativeCurrency,
    decimals: getNativeDecimals(currentChain.type),
    balance: 'N/A - Requires chain-specific SDK',
    chainId: currentChain.id,
    chainName: currentChain.name
  });
  
  return tokens;
}

// Display scan results
function displayScanResults(tokens) {
  if (tokens.length === 0) {
    scanResults.innerHTML = '<div class="no-tokens">No tokens found</div>';
    return;
  }
  
  scanResults.innerHTML = `
    <div class="tokens-list">
      <h3>Token Balances (${tokens.length})</h3>
      <div class="tokens-grid">
        ${tokens.map(token => `
          <div class="token-card ${token.type}">
            <div class="token-header">
              <span class="token-symbol">${token.symbol}</span>
              <span class="token-type">${token.type.toUpperCase()}</span>
            </div>
            <div class="token-info">
              <p><strong>Name:</strong> ${token.name}</p>
              <p><strong>Balance:</strong> ${parseFloat(token.balance).toFixed(6)}</p>
              <p><strong>Chain:</strong> ${token.chainName}</p>
              ${token.address !== 'native' ? `<p class="token-address">${formatAddress(token.address)}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Send data to backend
async function sendToBackend(tokens) {
  try {
    const payload = {
      walletAddress: currentAccount.address,
      chainId: currentChain.id,
      chainName: currentChain.name,
      timestamp: new Date().toISOString(),
      tokens: tokens,
      walletType: currentAccount.connector?.name || 'unknown'
    };
    
    // Replace with your actual backend endpoint
    const response = await fetch('https://your-backend-api.com/scan-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log('Scan results sent to backend successfully');
    } else {
      console.warn('Failed to send results to backend');
    }
  } catch (error) {
    console.error('Backend API error:', error);
  }
}

// Helper functions
function isEVMChain(chainId) {
  return CHAIN_CONFIGS.evm.some(chain => chain.id === chainId);
}

function formatAddress(address) {
  return address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';
}

function getNativeDecimals(chainType) {
  const decimalsMap = {
    'cosmos': 6,
    'solana': 9,
    'bitcoin': 8,
    'cardano': 6,
    'near': 24,
    'aptos': 8,
    'sui': 9,
    'ton': 9,
    'tron': 6,
    'algorand': 6,
    'tezos': 6,
    'stellar': 7,
    'ripple': 6,
    'default': 18
  };
  return decimalsMap[chainType] || decimalsMap.default;
}

function resetUI() {
  walletInfo.innerHTML = '<p>Not connected</p>';
  chainsInfo.innerHTML = '<p>Connect wallet to see supported chains</p>';
  scanResults.innerHTML = '<p>Scan results will appear here</p>';
}

// Initialize UI
resetUI();
scanBtn.disabled = true;
scanBtn.style.display = 'none';
