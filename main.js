import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

const projectId = "962425907914a3e80a7d8e7288b23f62";

// Simplified but reliable chain configurations
const CHAINS = [
  {
    id: 1,
    name: "Ethereum",
    rpcUrl: "https://rpc.ankr.com/eth",
    nativeCurrency: "ETH",
    blockExplorer: "https://etherscan.io"
  },
  {
    id: 56,
    name: "BNB Chain",
    rpcUrl: "https://bsc-dataseed.binance.org",
    nativeCurrency: "BNB",
    blockExplorer: "https://bscscan.com"
  },
  {
    id: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    nativeCurrency: "MATIC",
    blockExplorer: "https://polygonscan.com"
  },
  {
    id: 42161,
    name: "Arbitrum",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    nativeCurrency: "ETH",
    blockExplorer: "https://arbiscan.io"
  },
  {
    id: 10,
    name: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
    nativeCurrency: "ETH",
    blockExplorer: "https://optimistic.etherscan.io"
  },
  {
    id: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    nativeCurrency: "ETH",
    blockExplorer: "https://basescan.org"
  }
];

// Initialize AppKit with proper configuration
let appKit;
let isInitialized = false;

async function initializeWalletKit() {
  try {
    console.log("Initializing Wallet Kit...");
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error("Not in browser environment");
    }
    
    appKit = createAppKit({
      adapters: [new EthersAdapter()],
      projectId,
      networks: CHAINS,
      metadata: {
        name: "Multichain Token Scanner",
        description: "Scan your tokens across multiple chains",
        url: window.location.origin,
        icons: ["https://walletconnect.com/_next/static/media/logo_mark.84dd8525.svg"]
      },
      themeVariables: {
        "--w3m-accent": "#3b82f6",
        "--w3m-border-radius-master": "12px",
        "--w3m-font-family": "Inter, sans-serif"
      },
      themeMode: "dark",
      features: {
        analytics: false,
        email: false,
        allWallets: true
      },
      connectors: [
        {
          id: 'injected',
          name: 'Browser Wallet'
        }
      ]
    });
    
    isInitialized = true;
    console.log("Wallet Kit initialized successfully");
    return true;
    
  } catch (error) {
    console.error("Failed to initialize Wallet Kit:", error);
    showError("Failed to initialize wallet connector. Please refresh the page.");
    return false;
  }
}

// DOM elements
let connectBtn, disconnectBtn, status, walletInfo, chainsInfo, scanBtn, scanResults, chainSelect;

// State
let isConnected = false;
let currentAccount = null;
let currentChain = null;
let provider = null;

// Common tokens for scanning
const COMMON_TOKENS = {
  1: {
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  },
  56: {
    'BUSD': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    'USDT': '0x55d398326f99059fF775485246999027B3197955',
    'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
  },
  137: {
    'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  },
  42161: {
    'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    'USDC': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  },
  10: {
    'USDT': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    'USDC': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
  },
  8453: {
    'USDbC': '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    'cbETH': '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
  }
};

// ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// Initialize DOM elements
function initializeElements() {
  connectBtn = document.getElementById("connectBtn");
  disconnectBtn = document.getElementById("disconnectBtn");
  status = document.getElementById("status");
  walletInfo = document.getElementById("walletInfo");
  chainsInfo = document.getElementById("chainsInfo");
  scanBtn = document.getElementById("scanBtn");
  scanResults = document.getElementById("scanResults");
  chainSelect = document.getElementById("chainSelect");
  
  if (!connectBtn) {
    console.error("Connect button not found!");
    return false;
  }
  
  return true;
}

// Initialize chain select
function initializeChainSelect() {
  if (!chainSelect) return;
  
  chainSelect.innerHTML = '<option value="">Select a network...</option>';
  CHAINS.forEach(chain => {
    const option = document.createElement("option");
    option.value = chain.id;
    option.textContent = `${chain.name} (${chain.id})`;
    chainSelect.appendChild(option);
  });
}

// Connect wallet
async function connectWallet() {
  if (!appKit || !isInitialized) {
    showError("Wallet connector not ready. Please refresh the page.");
    return;
  }
  
  try {
    // Disable button and show loading
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<span class="spinner"></span> Connecting...';
    status.textContent = "Opening wallet modal...";
    status.className = "status-message";
    
    // Clear any previous errors
    clearErrors();
    
    // Open modal with timeout
    const modalPromise = appKit.open();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Wallet modal timeout")), 15000);
    });
    
    await Promise.race([modalPromise, timeoutPromise]);
    
    // Button will be re-enabled by state change handler
    console.log("Wallet modal opened successfully");
    
  } catch (error) {
    console.error("Connection error:", error);
    
    let errorMessage = "Failed to connect wallet";
    if (error.message.includes("timeout")) {
      errorMessage = "Connection timeout. Please try again.";
    } else if (error.message.includes("rejected")) {
      errorMessage = "Connection rejected by user";
    } else if (error.message.includes("expired")) {
      errorMessage = "Connection expired. Please try again.";
    }
    
    showError(errorMessage);
    
    // Re-enable button
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect Wallet";
  }
}

// Disconnect wallet
async function disconnectWallet() {
  try {
    if (appKit) {
      await appKit.disconnect();
    }
    resetConnection();
    showMessage("Disconnected successfully");
  } catch (error) {
    console.error("Disconnect error:", error);
    showError("Failed to disconnect");
  }
}

// Subscribe to state changes
function setupStateSubscription() {
  if (!appKit) return;
  
  appKit.subscribeState(async (state) => {
    console.log("Wallet state changed:", state);
    
    if (state.isConnected && state.account) {
      await handleConnectedState(state);
    } else {
      handleDisconnectedState();
    }
  });
}

// Handle connected state
async function handleConnectedState(state) {
  try {
    isConnected = true;
    currentAccount = state.account;
    currentChain = state.chain;
    
    // Get provider
    try {
      provider = await appKit.getProvider();
    } catch (error) {
      console.warn("Failed to get provider:", error);
      provider = null;
    }
    
    // Update UI
    updateWalletInfo();
    updateChainInfo();
    
    // Update status
    const walletName = currentAccount.connector?.name || "Unknown Wallet";
    const chainName = currentChain?.name || "Unknown Network";
    showMessage(`Connected to ${walletName} on ${chainName}`);
    
    // Update buttons
    connectBtn.disabled = true;
    connectBtn.textContent = "Connected";
    
    if (disconnectBtn) {
      disconnectBtn.style.display = "block";
    }
    
    if (scanBtn) {
      scanBtn.disabled = false;
    }
    
    // Auto-scan after a short delay
    setTimeout(() => {
      if (isConnected && provider) {
        scanTokens();
      }
    }, 1000);
    
  } catch (error) {
    console.error("Error handling connected state:", error);
    showError(`Connection error: ${error.message}`);
    resetConnectButton();
  }
}

// Handle disconnected state
function handleDisconnectedState() {
  isConnected = false;
  currentAccount = null;
  currentChain = null;
  provider = null;
  
  resetUI();
  resetConnectButton();
  
  if (disconnectBtn) {
    disconnectBtn.style.display = "none";
  }
  
  if (scanBtn) {
    scanBtn.disabled = true;
  }
  
  showMessage("Ready to connect");
}

// Update wallet info display
function updateWalletInfo() {
  if (!walletInfo || !currentAccount || !currentChain) return;
  
  const shortAddress = `${currentAccount.address.substring(0, 6)}...${currentAccount.address.substring(38)}`;
  const walletName = currentAccount.connector?.name || "Unknown Wallet";
  
  walletInfo.innerHTML = `
    <div class="wallet-details">
      <h3>🔗 Wallet Connected</h3>
      <div class="detail-row">
        <span class="label">Wallet:</span>
        <span class="value">${walletName}</span>
      </div>
      <div class="detail-row">
        <span class="label">Address:</span>
        <span class="value address" title="${currentAccount.address}">${shortAddress}</span>
      </div>
      <div class="detail-row">
        <span class="label">Network:</span>
        <span class="value network">${currentChain.name} (ID: ${currentChain.id})</span>
      </div>
      <div class="detail-row">
        <span class="label">Native Token:</span>
        <span class="value">${currentChain.nativeCurrency}</span>
      </div>
    </div>
  `;
}

// Update chain info
function updateChainInfo() {
  if (!chainsInfo) return;
  
  chainsInfo.innerHTML = `
    <div class="chains-container">
      <h3>🌐 Supported Networks (${CHAINS.length})</h3>
      <div class="chains-grid">
        ${CHAINS.map(chain => {
          const isActive = chain.id === currentChain?.id;
          return `
            <div class="chain-card ${isActive ? 'active' : ''} evm">
              <div class="chain-name">${chain.name}</div>
              <div class="chain-type">EVM</div>
              ${isActive ? '<div class="chain-status">Connected</div>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Scan tokens
async function scanTokens() {
  if (!isConnected || !currentAccount || !currentChain) {
    showError("Please connect wallet first");
    return;
  }
  
  if (!scanBtn || !scanResults || !status) return;
  
  try {
    // Disable scan button and show loading
    scanBtn.disabled = true;
    scanBtn.textContent = "Scanning...";
    status.textContent = `Scanning tokens on ${currentChain.name}...`;
    status.className = "status-message";
    
    scanResults.innerHTML = `
      <div class="scanning-indicator">
        <div class="spinner"></div>
        <p>Scanning wallet for tokens...</p>
      </div>
    `;

    // Scan tokens
    const tokens = await scanEVMTokens();
    
    // Display results
    displayScanResults(tokens);
    
    // Re-enable scan button
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Tokens";
    showMessage(`Found ${tokens.length} tokens on ${currentChain.name}`);
    
  } catch (error) {
    console.error("Scan error:", error);
    showError(`Scan failed: ${error.message}`);
    
    if (scanBtn) {
      scanBtn.disabled = false;
      scanBtn.textContent = "Scan Tokens";
    }
    
    if (scanResults) {
      scanResults.innerHTML = `
        <div class="error-message">
          <p>❌ Scan failed: ${error.message}</p>
          <button onclick="scanTokens()" class="retry-btn">Retry Scan</button>
        </div>
      `;
    }
  }
}

// Scan EVM tokens
async function scanEVMTokens() {
  const tokens = [];
  const address = currentAccount.address;
  
  try {
    // Create ethers provider
    let ethersProvider;
    
    if (provider) {
      ethersProvider = new ethers.BrowserProvider(provider);
    } else {
      // Fallback: use public RPC
      const chain = CHAINS.find(c => c.id === currentChain.id);
      if (!chain) throw new Error("Chain not found");
      
      ethersProvider = new ethers.JsonRpcProvider(chain.rpcUrl);
    }
    
    // Get native token balance
    try {
      const nativeBalance = await ethersProvider.getBalance(address);
      const nativeSymbol = currentChain.nativeCurrency || 'ETH';
      
      tokens.push({
        type: 'native',
        symbol: nativeSymbol,
        name: nativeSymbol,
        balance: ethers.formatEther(nativeBalance),
        decimals: 18,
        address: 'native',
        value: parseFloat(ethers.formatEther(nativeBalance))
      });
    } catch (error) {
      console.warn("Failed to get native balance:", error);
    }
    
    // Check common tokens for this chain
    const chainTokens = COMMON_TOKENS[currentChain.id] || {};
    const tokenAddresses = Object.entries(chainTokens);
    
    // Process tokens in batches
    const batchSize = 3;
    for (let i = 0; i < tokenAddresses.length; i += batchSize) {
      const batch = tokenAddresses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ([symbol, tokenAddress]) => {
        try {
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, ethersProvider);
          
          const [balance, decimals, name] = await Promise.all([
            tokenContract.balanceOf(address),
            tokenContract.decimals(),
            tokenContract.name()
          ]);
          
          if (balance > 0n) {
            const formattedBalance = ethers.formatUnits(balance, decimals);
            return {
              type: 'erc20',
              symbol: symbol,
              name: name,
              balance: formattedBalance,
              decimals: decimals,
              address: tokenAddress,
              value: parseFloat(formattedBalance)
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch token ${symbol}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(token => {
        if (token) tokens.push(token);
      });
      
      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Sort by value (highest first)
    tokens.sort((a, b) => b.value - a.value);
    
    return tokens;
    
  } catch (error) {
    throw new Error(`Failed to scan tokens: ${error.message}`);
  }
}

// Display scan results
function displayScanResults(tokens) {
  if (!scanResults) return;
  
  if (tokens.length === 0) {
    scanResults.innerHTML = `
      <div class="no-tokens">
        <p>📭 No tokens found on this network</p>
        <p class="hint">Try switching to a different network where you have tokens</p>
      </div>
    `;
    return;
  }

  const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
  
  scanResults.innerHTML = `
    <div class="tokens-container">
      <div class="tokens-header">
        <h3>💰 Token Balances (${tokens.length})</h3>
        <div class="total-value">
          Total: ${totalValue.toFixed(4)}
        </div>
      </div>
      <div class="tokens-list">
        ${tokens.map(token => `
          <div class="token-card ${token.type}">
            <div class="token-header">
              <div class="token-symbol">${token.symbol}</div>
              <div class="token-badge">${token.type.toUpperCase()}</div>
            </div>
            <div class="token-body">
              <div class="token-name">${token.name}</div>
              <div class="token-balance">
                <span class="balance-value">${parseFloat(token.balance).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6
                })}</span>
              </div>
              ${token.address !== 'native' ? `
                <div class="token-address" title="${token.address}">
                  ${token.address.substring(0, 10)}...${token.address.substring(34)}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Switch chain
async function switchChain(chainId) {
  if (!isConnected || !appKit) {
    showError("Please connect wallet first");
    return;
  }

  try {
    status.textContent = `Switching to chain ${chainId}...`;
    status.className = "status-message";
    
    await appKit.switchNetwork(chainId);
    
    // Wait for chain switch to complete
    setTimeout(() => {
      scanTokens();
    }, 1000);
    
  } catch (error) {
    console.error("Chain switch error:", error);
    showError(`Failed to switch chain: ${error.message}`);
  }
}

// UI helpers
function showMessage(message) {
  if (status) {
    status.textContent = message;
    status.className = "status-message";
  }
}

function showError(message) {
  if (status) {
    status.textContent = message;
    status.className = "status-error";
  }
}

function clearErrors() {
  if (status) {
    status.textContent = "";
    status.className = "";
  }
}

function resetConnectButton() {
  if (connectBtn) {
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect Wallet";
  }
}

function resetUI() {
  if (walletInfo) {
    walletInfo.innerHTML = '<p class="empty-state">No wallet connected</p>';
  }
  
  if (chainsInfo) {
    chainsInfo.innerHTML = '<p class="empty-state">Connect wallet to see networks</p>';
  }
  
  if (scanResults) {
    scanResults.innerHTML = '<p class="empty-state">Scan results will appear here</p>';
  }
  
  if (chainSelect) {
    chainSelect.value = "";
  }
}

function resetConnection() {
  isConnected = false;
  currentAccount = null;
  currentChain = null;
  provider = null;
  resetUI();
  resetConnectButton();
  
  if (disconnectBtn) {
    disconnectBtn.style.display = "none";
  }
  
  if (scanBtn) {
    scanBtn.disabled = true;
  }
}

// Setup event listeners
function setupEventListeners() {
  if (connectBtn) {
    connectBtn.addEventListener("click", connectWallet);
  }
  
  if (disconnectBtn) {
    disconnectBtn.addEventListener("click", disconnectWallet);
  }
  
  if (scanBtn) {
    scanBtn.addEventListener("click", scanTokens);
  }
  
  if (chainSelect) {
    chainSelect.addEventListener("change", (e) => {
      const chainId = parseInt(e.target.value);
      if (chainId && chainId !== currentChain?.id) {
        switchChain(chainId);
      }
    });
  }
}

// Initialize everything
async function initialize() {
  try {
    // Check if DOM elements exist
    if (!initializeElements()) {
      console.error("Required DOM elements not found");
      return;
    }
    
    // Initialize UI
    initializeChainSelect();
    resetConnection();
    setupEventListeners();
    
    // Initialize Wallet Kit
    const initialized = await initializeWalletKit();
    if (!initialized) {
      connectBtn.disabled = true;
      connectBtn.textContent = "Failed to Initialize";
      return;
    }
    
    // Setup state subscription
    setupStateSubscription();
    
    // Check initial state
    if (appKit) {
      const initialState = appKit.getState();
      if (initialState.isConnected && initialState.account) {
        await handleConnectedState(initialState);
      }
    }
    
    showMessage("Ready to connect wallet");
    
  } catch (error) {
    console.error("Initialization error:", error);
    showError("Failed to initialize application");
    
    if (connectBtn) {
      connectBtn.disabled = true;
      connectBtn.textContent = "Initialization Failed";
    }
  }
}

// Expose functions globally for HTML onclick
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.scanTokens = scanTokens;
window.switchChain = switchChain;

// Start when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
