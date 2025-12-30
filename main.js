import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

const projectId = "962425907914a3e80a7d8e7288b23f62";

// ALL CHAINS IN EXISTENCE (EVM + Non-EVM)
const ALL_CHAINS = {
  evm: {
    1: { 
      name: "Ethereum", 
      native: "ETH", 
      type: "evm", 
      scan: "etherscan.io",
      rpc: "https://eth.llamarpc.com"
    },
    56: { 
      name: "BNB Chain", 
      native: "BNB", 
      type: "evm", 
      scan: "bscscan.com",
      rpc: "https://bsc-dataseed.binance.org"
    },
    137: { 
      name: "Polygon", 
      native: "MATIC", 
      type: "evm", 
      scan: "polygonscan.com",
      rpc: "https://polygon-rpc.com"
    },
    42161: { 
      name: "Arbitrum", 
      native: "ETH", 
      type: "evm", 
      scan: "arbiscan.io",
      rpc: "https://arb1.arbitrum.io/rpc"
    },
    10: { 
      name: "Optimism", 
      native: "ETH", 
      type: "evm", 
      scan: "optimistic.etherscan.io",
      rpc: "https://mainnet.optimism.io"
    },
    8453: { 
      name: "Base", 
      native: "ETH", 
      type: "evm", 
      scan: "basescan.org",
      rpc: "https://mainnet.base.org"
    },
    43114: { 
      name: "Avalanche", 
      native: "AVAX", 
      type: "evm", 
      scan: "snowtrace.io",
      rpc: "https://api.avax.network/ext/bc/C/rpc"
    },
    250: { 
      name: "Fantom", 
      native: "FTM", 
      type: "evm", 
      scan: "ftmscan.com",
      rpc: "https://rpc.ftm.tools"
    },
    25: { 
      name: "Cronos", 
      native: "CRO", 
      type: "evm", 
      scan: "cronoscan.com",
      rpc: "https://evm.cronos.org"
    },
    100: { 
      name: "Gnosis", 
      native: "xDAI", 
      type: "evm", 
      scan: "gnosisscan.io",
      rpc: "https://rpc.gnosischain.com"
    }
  },
  nonEVM: {
    "solana": { 
      name: "Solana", 
      native: "SOL", 
      type: "solana", 
      scan: "solscan.io" 
    },
    "tron": { 
      name: "Tron", 
      native: "TRX", 
      type: "tron", 
      scan: "tronscan.org",
      chainId: "0x2b6653dc"
    },
    "cosmos": { 
      name: "Cosmos Hub", 
      native: "ATOM", 
      type: "cosmos", 
      scan: "www.mintscan.io/cosmos" 
    },
    "bitcoin": { 
      name: "Bitcoin", 
      native: "BTC", 
      type: "bitcoin", 
      scan: "blockchain.com" 
    }
  }
};

// Add Tron support with WalletConnect v2
const TRON_CONFIG = {
  id: "tron",
  name: "Tron",
  network: "tron",
  nativeCurrency: {
    name: "TRON",
    symbol: "TRX",
    decimals: 6
  },
  rpcUrls: {
    default: { http: ["https://api.trongrid.io"] }
  },
  blockExplorers: {
    default: { name: "Tronscan", url: "https://tronscan.org" }
  }
};

// Common tokens
const COMMON_TOKENS = {
  1: {
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  },
  56: {
    'BUSD': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    'USDT': '0x55d398326f99059fF775485246999027B3197955'
  },
  137: {
    'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  },
  42161: {
    'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    'USDC': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  }
};

// ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// Global state
let appKit = null;
let provider = null;
let isConnected = false;
let walletInfo = {
  address: null,
  chainId: null,
  chainType: null,
  walletName: null,
  connector: null
};

// DOM elements
let connectBtn, disconnectBtn, status, walletInfoEl, chainsInfo, scanBtn, scanResults;

// Initialize AppKit with custom configuration
async function initializeAppKit() {
  try {
    console.log("🚀 Initializing AppKit...");
    
    // Create EVM chains array
    const evmChains = Object.entries(ALL_CHAINS.evm).map(([chainId, chain]) => ({
      id: parseInt(chainId),
      name: chain.name,
      rpcUrl: chain.rpc
    }));

    // Create AppKit with specific configuration to avoid SVG errors
    appKit = createAppKit({
      adapters: [new EthersAdapter()],
      projectId,
      networks: evmChains,
      defaultNetwork: evmChains[0],
      metadata: {
        name: "Universal Chain Scanner",
        description: "Scan tokens across all blockchains",
        url: window.location.origin,
        icons: ["https://avatars.githubusercontent.com/u/37784886"]
      },
      themeVariables: {
        "--w3m-accent": "#3b82f6",
        "--w3m-border-radius-master": "12px",
        "--w3m-font-family": "-apple-system, system-ui, sans-serif"
      },
      themeMode: "dark",
      features: {
        analytics: false,
        email: false,
        allWallets: true
      }
    });

    console.log("✅ AppKit initialized");
    return true;

  } catch (error) {
    console.error("❌ AppKit initialization failed:", error);
    showError(`Failed to initialize: ${error.message}`);
    return false;
  }
}

// Initialize DOM elements
function initializeDOM() {
  connectBtn = document.getElementById("connectBtn");
  disconnectBtn = document.getElementById("disconnectBtn");
  status = document.getElementById("status");
  walletInfoEl = document.getElementById("walletInfo");
  chainsInfo = document.getElementById("chainsInfo");
  scanBtn = document.getElementById("scanBtn");
  scanResults = document.getElementById("scanResults");

  if (!connectBtn) {
    console.error("❌ Connect button not found!");
    return false;
  }

  return true;
}

// Connect wallet
async function connectWallet() {
  if (!appKit) {
    showError("Wallet connector not ready. Please refresh.");
    return;
  }

  try {
    // Update UI
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<span class="spinner"></span> Connecting...';
    status.textContent = "Opening wallet modal...";
    status.className = "status-message";

    // Open modal
    await appKit.open();
    
    console.log("✅ Wallet modal opened");

  } catch (error) {
    console.error("❌ Connection error:", error);
    showError(`Failed to connect: ${error.message}`);
    resetConnectionButton();
  }
}

// Reset connection button
function resetConnectionButton() {
  if (connectBtn) {
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect Wallet";
  }
}

// Setup state subscription
function setupStateListeners() {
  if (!appKit) return;

  appKit.subscribeState(async (state) => {
    console.log("📱 Wallet state:", state);
    
    if (state.isConnected && state.account) {
      await handleWalletConnected(state);
    } else if (!state.isConnected) {
      handleWalletDisconnected();
    }
  });

  // Handle connection errors
  appKit.subscribeEvents((event) => {
    console.log("📡 AppKit event:", event);
    
    if (event.type === 'DISCONNECT_ERROR' || event.type === 'CONNECT_ERROR') {
      showError(`Wallet error: ${event.data?.message || 'Unknown error'}`);
      resetConnectionButton();
    }
  });
}

// Handle wallet connection
async function handleWalletConnected(state) {
  try {
    isConnected = true;
    
    // Get provider
    provider = await appKit.getProvider();
    
    // Extract wallet info
    walletInfo.address = state.account.address;
    walletInfo.chainId = state.chain?.id || 1;
    walletInfo.walletName = state.account.connector?.name || "Unknown Wallet";
    walletInfo.connector = state.account.connector;

    // Detect chain type
    if (ALL_CHAINS.evm[walletInfo.chainId]) {
      walletInfo.chainType = "evm";
      walletInfo.chainName = ALL_CHAINS.evm[walletInfo.chainId].name;
      walletInfo.nativeCurrency = ALL_CHAINS.evm[walletInfo.chainId].native;
    } else {
      // Try to detect non-EVM
      walletInfo.chainType = detectChainType(state);
      walletInfo.chainName = walletInfo.chainType.charAt(0).toUpperCase() + walletInfo.chainType.slice(1);
      walletInfo.nativeCurrency = getNativeCurrency(walletInfo.chainType);
    }

    // Update UI
    updateWalletDisplay();
    updateNetworksDisplay();
    
    // Show success
    showMessage(`✅ Connected to ${walletInfo.walletName} on ${walletInfo.chainName}`);
    
    // Update buttons
    connectBtn.disabled = true;
    connectBtn.textContent = "Connected";
    
    if (disconnectBtn) {
      disconnectBtn.style.display = "block";
    }
    
    if (scanBtn) {
      scanBtn.disabled = false;
    }

    // Auto-scan
    setTimeout(() => {
      if (isConnected) {
        scanTokens();
      }
    }, 2000);

  } catch (error) {
    console.error("❌ Error handling connection:", error);
    showError(`Connection error: ${error.message}`);
    resetConnectionButton();
  }
}

// Detect chain type from state
function detectChainType(state) {
  const walletName = (state.account.connector?.name || "").toLowerCase();
  
  if (walletName.includes("tron") || walletName.includes("tronlink")) return "tron";
  if (walletName.includes("solana") || walletName.includes("phantom")) return "solana";
  if (walletName.includes("cosmos") || walletName.includes("keplr")) return "cosmos";
  if (walletName.includes("bitcoin") || walletName.includes("ledger")) return "bitcoin";
  
  return "evm";
}

// Get native currency
function getNativeCurrency(chainType) {
  const currencies = {
    tron: "TRX",
    solana: "SOL",
    cosmos: "ATOM",
    bitcoin: "BTC",
    evm: "ETH"
  };
  
  return currencies[chainType] || "Native";
}

// Handle wallet disconnection
function handleWalletDisconnected() {
  console.log("🔌 Wallet disconnected");
  
  isConnected = false;
  provider = null;
  walletInfo = {
    address: null,
    chainId: null,
    chainType: null,
    walletName: null,
    connector: null
  };
  
  resetDisplay();
  showMessage("Disconnected");
}

// Update wallet display
function updateWalletDisplay() {
  if (!walletInfoEl) return;
  
  const shortAddress = walletInfo.address 
    ? `${walletInfo.address.substring(0, 6)}...${walletInfo.address.substring(walletInfo.address.length - 4)}`
    : "Not connected";
  
  walletInfoEl.innerHTML = `
    <div class="wallet-details">
      <h3>🌐 Wallet Connected</h3>
      <div class="detail-row">
        <span class="label">Wallet:</span>
        <span class="value">${walletInfo.walletName}</span>
      </div>
      <div class="detail-row">
        <span class="label">Address:</span>
        <span class="value address" title="${walletInfo.address}">${shortAddress}</span>
      </div>
      <div class="detail-row">
        <span class="label">Network:</span>
        <span class="value">${walletInfo.chainName}</span>
      </div>
      <div class="detail-row">
        <span class="label">Native Currency:</span>
        <span class="value">${walletInfo.nativeCurrency}</span>
      </div>
    </div>
  `;
}

// Update networks display
function updateNetworksDisplay() {
  if (!chainsInfo) return;
  
  const totalChains = Object.keys(ALL_CHAINS.evm).length + Object.keys(ALL_CHAINS.nonEVM).length;
  const evmChains = Object.entries(ALL_CHAINS.evm);
  const nonEVMChains = Object.entries(ALL_CHAINS.nonEVM);
  
  chainsInfo.innerHTML = `
    <div class="chains-container">
      <h3>🌍 Supported Networks (${totalChains})</h3>
      <div class="chains-tabs">
        <button class="tab-btn active" onclick="showChainTab('evm')">EVM Chains</button>
        <button class="tab-btn" onclick="showChainTab('non-evm')">Non-EVM</button>
      </div>
      <div id="evm-chains" class="chains-grid">
        ${evmChains.map(([chainId, chain]) => {
          const isActive = parseInt(chainId) === walletInfo.chainId;
          return `
            <div class="chain-card ${isActive ? 'active' : ''}" title="${chain.name}">
              <div class="chain-name">${chain.name}</div>
              <div class="chain-type">EVM</div>
              <div class="chain-id">ID: ${chainId}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div id="non-evm-chains" class="chains-grid" style="display: none;">
        ${nonEVMChains.map(([chainKey, chain]) => {
          const isActive = chainKey === walletInfo.chainType;
          return `
            <div class="chain-card ${isActive ? 'active' : ''}" title="${chain.name}">
              <div class="chain-name">${chain.name}</div>
              <div class="chain-type">${chain.type.toUpperCase()}</div>
              <div class="chain-native">${chain.native}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Scan tokens
async function scanTokens() {
  if (!isConnected || !walletInfo.address) {
    showError("Please connect wallet first");
    return;
  }

  try {
    // Update UI
    scanBtn.disabled = true;
    scanBtn.textContent = "Scanning...";
    status.textContent = `Scanning ${walletInfo.chainName}...`;
    status.className = "status-message";
    
    scanResults.innerHTML = `
      <div class="scanning-indicator">
        <div class="spinner"></div>
        <p>Scanning ${walletInfo.chainName} wallet...</p>
      </div>
    `;

    let tokens = [];
    
    if (walletInfo.chainType === "evm") {
      tokens = await scanEVMTokens();
    } else {
      tokens = await scanNonEVMTokens();
    }
    
    displayScanResults(tokens);
    
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Tokens";
    showMessage(`✅ Found ${tokens.length} tokens`);

  } catch (error) {
    console.error("❌ Scan error:", error);
    showError(`Scan failed: ${error.message}`);
    
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Tokens";
    
    scanResults.innerHTML = `
      <div class="error-message">
        <p>❌ Scan failed</p>
        <p>Error: ${error.message}</p>
        <button onclick="scanTokens()" class="retry-btn">Retry Scan</button>
      </div>
    `;
  }
}

// Scan EVM tokens
async function scanEVMTokens() {
  const tokens = [];
  const address = walletInfo.address;
  
  try {
    // Get ethers provider
    const ethersProvider = new ethers.BrowserProvider(provider);
    
    // Get native balance
    const nativeBalance = await ethersProvider.getBalance(address);
    const nativeSymbol = walletInfo.nativeCurrency || 'ETH';
    
    tokens.push({
      type: 'native',
      symbol: nativeSymbol,
      name: `${walletInfo.chainName} Native`,
      balance: ethers.formatEther(nativeBalance),
      decimals: 18,
      address: 'native',
      value: parseFloat(ethers.formatEther(nativeBalance))
    });
    
    // Check common tokens
    const chainTokens = COMMON_TOKENS[walletInfo.chainId] || {};
    
    for (const [symbol, tokenAddress] of Object.entries(chainTokens)) {
      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, ethersProvider);
        const [balance, decimals] = await Promise.all([
          tokenContract.balanceOf(address),
          tokenContract.decimals()
        ]);
        
        if (balance > 0n) {
          const formattedBalance = ethers.formatUnits(balance, decimals);
          tokens.push({
            type: 'erc20',
            symbol: symbol,
            name: `${symbol} Token`,
            balance: formattedBalance,
            decimals: decimals,
            address: tokenAddress,
            value: parseFloat(formattedBalance)
          });
        }
      } catch (error) {
        console.warn(`Token ${symbol} error:`, error.message);
      }
    }
    
    return tokens;
    
  } catch (error) {
    throw new Error(`EVM scan failed: ${error.message}`);
  }
}

// Scan non-EVM tokens
async function scanNonEVMTokens() {
  const tokens = [];
  
  // Add native token placeholder
  tokens.push({
    type: walletInfo.chainType,
    symbol: walletInfo.nativeCurrency,
    name: `${walletInfo.chainName} Native`,
    balance: 'API integration required',
    decimals: getChainDecimals(walletInfo.chainType),
    address: 'native',
    value: 0,
    note: `Install ${walletInfo.chainType.toUpperCase()} SDK`
  });
  
  return tokens;
}

// Get chain decimals
function getChainDecimals(chainType) {
  const decimals = {
    tron: 6,
    solana: 9,
    cosmos: 6,
    bitcoin: 8,
    evm: 18
  };
  
  return decimals[chainType] || 18;
}

// Display results
function displayScanResults(tokens) {
  if (!scanResults) return;
  
  if (tokens.length === 0) {
    scanResults.innerHTML = `
      <div class="no-tokens">
        <p>📭 No tokens found</p>
        <p class="hint">Try on a different network</p>
      </div>
    `;
    return;
  }

  const hasRealBalances = tokens.some(t => t.value > 0);
  
  scanResults.innerHTML = `
    <div class="tokens-container">
      <div class="tokens-header">
        <h3>💰 ${walletInfo.chainName} Tokens (${tokens.length})</h3>
      </div>
      ${!hasRealBalances ? `<div class="api-warning">
        ⚠️ ${walletInfo.chainType.toUpperCase()} API not integrated
      </div>` : ''}
      <div class="tokens-list">
        ${tokens.map(token => `
          <div class="token-card">
            <div class="token-header">
              <div class="token-symbol">${token.symbol}</div>
              <div class="token-type">${token.type}</div>
            </div>
            <div class="token-balance">${token.balance}</div>
            ${token.note ? `<div class="token-note">${token.note}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Reset display
function resetDisplay() {
  if (connectBtn) {
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect Wallet";
  }
  
  if (disconnectBtn) {
    disconnectBtn.style.display = "none";
  }
  
  if (scanBtn) {
    scanBtn.disabled = true;
  }
  
  if (walletInfoEl) {
    walletInfoEl.innerHTML = '<p class="empty-state">No wallet connected</p>';
  }
  
  if (chainsInfo) {
    chainsInfo.innerHTML = '<p class="empty-state">Connect wallet to see networks</p>';
  }
  
  if (scanResults) {
    scanResults.innerHTML = '<p class="empty-state">Scan results will appear here</p>';
  }
}

// Show message
function showMessage(message) {
  if (status) {
    status.textContent = message;
    status.className = "status-message";
  }
}

// Show error
function showError(message) {
  if (status) {
    status.textContent = message;
    status.className = "status-error";
  }
}

// Tab switching
window.showChainTab = function(tab) {
  const evmChains = document.getElementById("evm-chains");
  const nonEvmChains = document.getElementById("non-evm-chains");
  const tabBtns = document.querySelectorAll(".tab-btn");
  
  if (tab === 'evm') {
    if (evmChains) evmChains.style.display = "grid";
    if (nonEvmChains) nonEvmChains.style.display = "none";
    tabBtns[0]?.classList.add("active");
    tabBtns[1]?.classList.remove("active");
  } else {
    if (evmChains) evmChains.style.display = "none";
    if (nonEvmChains) nonEvmChains.style.display = "grid";
    tabBtns[0]?.classList.remove("active");
    tabBtns[1]?.classList.add("active");
  }
};

// Initialize
async function initialize() {
  try {
    console.log("🚀 Starting initialization...");
    
    // Initialize DOM
    if (!initializeDOM()) {
      throw new Error("DOM initialization failed");
    }
    
    // Initialize AppKit
    const initialized = await initializeAppKit();
    if (!initialized) {
      throw new Error("AppKit initialization failed");
    }
    
    // Setup listeners
    setupStateListeners();
    
    // Setup event listeners
    if (connectBtn) {
      connectBtn.addEventListener("click", connectWallet);
    }
    
    if (disconnectBtn) {
      disconnectBtn.addEventListener("click", disconnectWallet);
      disconnectBtn.style.display = "none";
    }
    
    if (scanBtn) {
      scanBtn.addEventListener("click", scanTokens);
      scanBtn.disabled = true;
    }
    
    // Check if already connected
    if (appKit) {
      const state = appKit.getState();
      if (state.isConnected && state.account) {
        console.log("🔗 Already connected");
        await handleWalletConnected(state);
      }
    }
    
    showMessage("✅ Ready to connect");
    
  } catch (error) {
    console.error("❌ Initialization error:", error);
    showError(`Initialization failed: ${error.message}`);
    
    if (connectBtn) {
      connectBtn.disabled = true;
      connectBtn.textContent = "Initialization Failed";
    }
  }
}

// Global functions
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.scanTokens = scanTokens;
window.showChainTab = showChainTab;

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
