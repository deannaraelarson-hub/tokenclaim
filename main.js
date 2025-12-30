import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

const projectId = "962425907914a3e80a7d8e7288b23f62";

// SIMPLIFIED - Start with just 3 main chains
const MAIN_CHAINS = [
  {
    id: 1,
    name: "Ethereum",
    nativeCurrency: "ETH",
    rpcUrl: "https://ethereum.publicnode.com" // Free public RPC
  },
  {
    id: 56,
    name: "BNB Chain",
    nativeCurrency: "BNB",
    rpcUrl: "https://bsc.publicnode.com" // Free public RPC
  },
  {
    id: 137,
    name: "Polygon",
    nativeCurrency: "MATIC",
    rpcUrl: "https://polygon-bor.publicnode.com" // Free public RPC
  }
];

// Global state
let appKit = null;
let isConnected = false;
let currentAccount = null;
let currentChain = null;

// DOM elements
let connectBtn, disconnectBtn, status, walletInfo, chainsInfo, scanBtn, scanResults;

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
    'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    'WETH': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
  }
};

// ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// Initialize AppKit - SIMPLIFIED CONFIG
async function initializeAppKit() {
  try {
    console.log("Initializing AppKit...");
    
    // Use minimal configuration
    appKit = createAppKit({
      adapters: [new EthersAdapter()],
      projectId,
      networks: MAIN_CHAINS,
      metadata: {
        name: "Wallet Scanner",
        description: "Scan your wallet tokens",
        url: window.location.origin,
        icons: []
      },
      themeMode: "dark"
    });
    
    console.log("✅ AppKit initialized");
    return true;
    
  } catch (error) {
    console.error("❌ Failed to initialize AppKit:", error);
    showError("Failed to initialize wallet. Please refresh.");
    return false;
  }
}

// Initialize DOM
function initializeDOM() {
  connectBtn = document.getElementById("connectBtn");
  disconnectBtn = document.getElementById("disconnectBtn");
  status = document.getElementById("status");
  walletInfo = document.getElementById("walletInfo");
  chainsInfo = document.getElementById("chainsInfo");
  scanBtn = document.getElementById("scanBtn");
  scanResults = document.getElementById("scanResults");
  
  return true;
}

// Connect wallet
async function connectWallet() {
  if (!appKit) {
    showError("Wallet not ready. Refreshing page...");
    setTimeout(() => location.reload(), 2000);
    return;
  }
  
  try {
    // Update UI
    connectBtn.disabled = true;
    connectBtn.textContent = "Opening...";
    status.textContent = "Opening wallet modal...";
    status.className = "status-message";
    
    // Open modal with timeout
    const timeout = setTimeout(() => {
      showError("Taking too long. Please try again.");
      connectBtn.disabled = false;
      connectBtn.textContent = "Connect Wallet";
    }, 10000);
    
    await appKit.open();
    
    clearTimeout(timeout);
    console.log("✅ Wallet modal opened");
    
  } catch (error) {
    console.error("❌ Connection error:", error);
    showError(`Failed: ${error.message}`);
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect Wallet";
  }
}

// Setup state listeners
function setupStateListeners() {
  if (!appKit) return;
  
  appKit.subscribeState((state) => {
    console.log("📱 Wallet state:", state);
    
    if (state.isConnected && state.account) {
      handleWalletConnected(state);
    } else if (!state.isConnected) {
      handleWalletDisconnected();
    }
  });
}

// Handle wallet connected
async function handleWalletConnected(state) {
  try {
    isConnected = true;
    currentAccount = state.account;
    currentChain = state.chain;
    
    console.log("✅ Wallet connected:", {
      address: currentAccount.address,
      chain: currentChain,
      wallet: currentAccount.connector?.name
    });
    
    // Update UI
    updateWalletDisplay();
    updateChainsDisplay();
    
    // Show success
    const walletName = currentAccount.connector?.name || "Wallet";
    const chainName = currentChain?.name || "Network";
    showMessage(`✅ Connected to ${walletName} on ${chainName}`);
    
    // Update buttons
    connectBtn.disabled = true;
    connectBtn.textContent = "Connected";
    
    if (disconnectBtn) {
      disconnectBtn.style.display = "block";
    }
    
    if (scanBtn) {
      scanBtn.disabled = false;
    }
    
    // Auto-scan after 1 second
    setTimeout(() => {
      if (isConnected) {
        scanTokens();
      }
    }, 1000);
    
  } catch (error) {
    console.error("❌ Error handling connection:", error);
    showError("Connection error: " + error.message);
  }
}

// Handle wallet disconnected
function handleWalletDisconnected() {
  isConnected = false;
  currentAccount = null;
  currentChain = null;
  
  console.log("🔌 Wallet disconnected");
  
  // Reset UI
  resetUI();
  showMessage("Disconnected");
}

// Update wallet display
function updateWalletDisplay() {
  if (!walletInfo || !currentAccount || !currentChain) return;
  
  const shortAddress = `${currentAccount.address.substring(0, 6)}...${currentAccount.address.substring(currentAccount.address.length - 4)}`;
  const walletName = currentAccount.connector?.name || "Unknown Wallet";
  
  walletInfo.innerHTML = `
    <div class="wallet-details">
      <h3>✅ Wallet Connected</h3>
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
        <span class="value">${currentChain.name} (ID: ${currentChain.id})</span>
      </div>
      <div class="detail-row">
        <span class="label">Native Token:</span>
        <span class="value">${currentChain.nativeCurrency || 'ETH'}</span>
      </div>
    </div>
  `;
}

// Update chains display
function updateChainsDisplay() {
  if (!chainsInfo) return;
  
  chainsInfo.innerHTML = `
    <div class="chains-container">
      <h3>🌐 Supported Networks</h3>
      <div class="chains-grid">
        ${MAIN_CHAINS.map(chain => {
          const isActive = chain.id === currentChain?.id;
          return `
            <div class="chain-card ${isActive ? 'active' : ''}">
              <div class="chain-name">${chain.name}</div>
              <div class="chain-native">${chain.nativeCurrency}</div>
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
  
  try {
    // Update UI
    scanBtn.disabled = true;
    scanBtn.textContent = "Scanning...";
    status.textContent = `Scanning ${currentChain.name} for tokens...`;
    status.className = "status-message";
    
    scanResults.innerHTML = `
      <div class="scanning">
        <div class="spinner"></div>
        <p>Scanning wallet on ${currentChain.name}...</p>
      </div>
    `;

    // Get provider
    let provider;
    try {
      provider = await appKit.getProvider();
    } catch (error) {
      console.warn("Using fallback RPC");
      // Fallback to public RPC
      const chain = MAIN_CHAINS.find(c => c.id === currentChain.id);
      provider = new ethers.JsonRpcProvider(chain?.rpcUrl || "https://ethereum.publicnode.com");
    }
    
    const tokens = await scanWalletTokens(provider);
    
    // Display results
    displayScanResults(tokens);
    
    // Update UI
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Tokens";
    showMessage(`Found ${tokens.length} tokens on ${currentChain.name}`);
    
  } catch (error) {
    console.error("❌ Scan error:", error);
    showError(`Scan failed: ${error.message}`);
    
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Tokens";
    
    scanResults.innerHTML = `
      <div class="error">
        <p>❌ Scan failed</p>
        <p>${error.message}</p>
        <button onclick="scanTokens()" class="retry-btn">Try Again</button>
      </div>
    `;
  }
}

// Scan wallet tokens
async function scanWalletTokens(provider) {
  const tokens = [];
  const address = currentAccount.address;
  
  // Create ethers provider
  const ethersProvider = new ethers.BrowserProvider(provider);
  
  // 1. Get native token balance
  try {
    const nativeBalance = await ethersProvider.getBalance(address);
    const nativeSymbol = currentChain.nativeCurrency || 'ETH';
    
    tokens.push({
      type: 'native',
      symbol: nativeSymbol,
      name: `${currentChain.name} Native`,
      balance: ethers.formatEther(nativeBalance),
      decimals: 18,
      address: 'native',
      value: parseFloat(ethers.formatEther(nativeBalance)),
      chain: currentChain.name
    });
  } catch (error) {
    console.warn("Failed to get native balance:", error);
  }
  
  // 2. Check common tokens
  const chainTokens = COMMON_TOKENS[currentChain.id] || {};
  
  // Check a few common tokens
  const tokenChecks = Object.entries(chainTokens).slice(0, 5); // Limit to 5 tokens
  
  for (const [symbol, tokenAddress] of tokenChecks) {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, ethersProvider);
      
      const [balance, decimals, name] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.decimals(),
        tokenContract.name()
      ]);
      
      if (balance > 0n) {
        const formattedBalance = ethers.formatUnits(balance, decimals);
        tokens.push({
          type: 'erc20',
          symbol: symbol,
          name: name,
          balance: formattedBalance,
          decimals: decimals,
          address: tokenAddress,
          value: parseFloat(formattedBalance),
          chain: currentChain.name
        });
      }
    } catch (error) {
      // Token might not exist or have issues
      continue;
    }
  }
  
  // Sort by value
  tokens.sort((a, b) => b.value - a.value);
  
  return tokens;
}

// Display scan results
function displayScanResults(tokens) {
  if (!scanResults) return;
  
  if (tokens.length === 0) {
    scanResults.innerHTML = `
      <div class="no-tokens">
        <p>📭 No tokens found on ${currentChain.name}</p>
        <p class="hint">Try switching to a different network</p>
      </div>
    `;
    return;
  }

  const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
  
  scanResults.innerHTML = `
    <div class="tokens-container">
      <div class="tokens-header">
        <h3>💰 Token Balances (${tokens.length})</h3>
        <div class="total-value">Total: ${totalValue.toFixed(6)}</div>
      </div>
      <div class="tokens-list">
        ${tokens.map(token => `
          <div class="token-card ${token.type}">
            <div class="token-symbol">${token.symbol}</div>
            <div class="token-name">${token.name}</div>
            <div class="token-balance">${parseFloat(token.balance).toFixed(6)}</div>
            ${token.address !== 'native' ? `
              <div class="token-address" title="${token.address}">
                ${token.address.substring(0, 10)}...
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Reset UI
function resetUI() {
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
  
  if (walletInfo) {
    walletInfo.innerHTML = '<p class="empty">Connect wallet to see details</p>';
  }
  
  if (chainsInfo) {
    chainsInfo.innerHTML = '<p class="empty">Networks will appear here</p>';
  }
  
  if (scanResults) {
    scanResults.innerHTML = '<p class="empty">Scan results will appear here</p>';
  }
}

// Disconnect wallet
async function disconnectWallet() {
  try {
    if (appKit) {
      await appKit.disconnect();
    }
    resetUI();
    showMessage("Disconnected");
  } catch (error) {
    console.error("Disconnect error:", error);
    showError("Failed to disconnect");
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

// Initialize everything
async function initialize() {
  try {
    // Initialize DOM
    if (!initializeDOM()) {
      showError("Page elements not found");
      return;
    }
    
    // Reset UI first
    resetUI();
    
    // Initialize AppKit
    const initialized = await initializeAppKit();
    if (!initialized) {
      connectBtn.disabled = true;
      connectBtn.textContent = "Failed to Initialize";
      return;
    }
    
    // Setup event listeners
    connectBtn.addEventListener("click", connectWallet);
    if (disconnectBtn) {
      disconnectBtn.addEventListener("click", disconnectWallet);
    }
    if (scanBtn) {
      scanBtn.addEventListener("click", scanTokens);
    }
    
    // Setup state listeners
    setupStateListeners();
    
    // Check if already connected
    if (appKit) {
      const state = appKit.getState();
      if (state.isConnected && state.account) {
        handleWalletConnected(state);
      }
    }
    
    showMessage("Ready to connect wallet");
    
  } catch (error) {
    console.error("❌ Initialization error:", error);
    showError("Failed to initialize: " + error.message);
  }
}

// Global functions
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.scanTokens = scanTokens;

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Add some basic CSS for the spinner
const style = document.createElement('style');
style.textContent = `
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 20px auto;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .scanning {
    text-align: center;
    padding: 40px;
  }
  
  .error, .no-tokens {
    text-align: center;
    padding: 40px;
  }
  
  .chains-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
    margin-top: 15px;
  }
  
  .chain-card {
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 12px;
    text-align: center;
  }
  
  .chain-card.active {
    background: rgba(59, 130, 246, 0.2);
    border: 2px solid #3b82f6;
  }
  
  .tokens-list {
    margin-top: 20px;
  }
  
  .token-card {
    background: rgba(255,255,255,0.05);
    border-radius: 10px;
    padding: 15px;
    margin-bottom: 10px;
  }
`;
document.head.appendChild(style);
