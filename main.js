import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

const projectId = "962425907914a3e80a7d8e7288b23f62";

// State
let appKit = null;
let isConnected = false;
let currentAccount = null;
let currentChain = null;

// DOM Elements
let connectBtn, disconnectBtn, status, walletInfo, chainsInfo, scanBtn, scanResults;

// Common tokens
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
  }
};

// ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// Initialize AppKit with SIMPLE configuration
async function initializeAppKit() {
  try {
    console.log("🔄 Initializing wallet...");
    
    // Use only essential configuration
    appKit = createAppKit({
      adapters: [new EthersAdapter()],
      projectId,
      networks: [
        { id: 1, name: "Ethereum", rpcUrl: "https://ethereum.publicnode.com" },
        { id: 56, name: "BNB Chain", rpcUrl: "https://bsc-dataseed.binance.org" },
        { id: 137, name: "Polygon", rpcUrl: "https://polygon-rpc.com" }
      ],
      metadata: {
        name: "Wallet Scanner",
        description: "Scan your wallet tokens",
        url: window.location.origin,
        icons: []
      },
      themeMode: "dark",
      features: {
        analytics: false,
        email: false
      }
    });
    
    console.log("✅ Wallet initialized");
    return true;
    
  } catch (error) {
    console.error("❌ Failed to initialize wallet:", error);
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
  
  if (!connectBtn) {
    console.error("❌ Connect button not found!");
    return false;
  }
  
  return true;
}

// Connect wallet
async function connectWallet() {
  if (!appKit) {
    showError("Wallet not ready. Please refresh.");
    return;
  }
  
  try {
    // Update UI
    connectBtn.disabled = true;
    connectBtn.textContent = "Opening...";
    status.textContent = "Opening wallet modal...";
    status.className = "status-message";
    
    // Open modal
    await appKit.open();
    
    console.log("✅ Wallet modal opened");
    
  } catch (error) {
    console.error("❌ Connection error:", error);
    showError("Failed to open wallet. Please try again.");
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect Wallet";
  }
}

// Setup state listeners
function setupStateListeners() {
  if (!appKit) return;
  
  appKit.subscribeState((state) => {
    console.log("📱 Wallet state update:", state);
    
    // Check if connected
    if (state.isConnected && state.account && state.account.address) {
      handleConnectionSuccess(state);
    } else {
      handleDisconnection();
    }
  });
}

// Handle successful connection
async function handleConnectionSuccess(state) {
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
    updateUI();
    
    // Show success message
    const walletName = currentAccount.connector?.name || "Wallet";
    const chainName = currentChain?.name || "Network";
    showMessage(`✅ Connected to ${walletName} on ${chainName}`);
    
    // Auto-scan after delay
    setTimeout(() => {
      if (isConnected) {
        scanTokens();
      }
    }, 1000);
    
  } catch (error) {
    console.error("❌ Error handling connection:", error);
    showError("Connection error");
  }
}

// Handle disconnection
function handleDisconnection() {
  isConnected = false;
  currentAccount = null;
  currentChain = null;
  
  console.log("🔌 Wallet disconnected");
  
  // Reset UI
  resetUI();
  showMessage("Ready to connect");
}

// Update UI after connection
function updateUI() {
  if (!walletInfo || !currentAccount || !currentChain) return;
  
  const shortAddress = `${currentAccount.address.substring(0, 6)}...${currentAccount.address.substring(currentAccount.address.length - 4)}`;
  const walletName = currentAccount.connector?.name || "Unknown Wallet";
  
  // Update wallet info
  walletInfo.innerHTML = `
    <div class="wallet-connected">
      <h3>✅ Wallet Connected</h3>
      <p><strong>Wallet:</strong> ${walletName}</p>
      <p><strong>Address:</strong> ${shortAddress}</p>
      <p><strong>Network:</strong> ${currentChain.name}</p>
      <p><strong>Chain ID:</strong> ${currentChain.id}</p>
    </div>
  `;
  
  // Update chains info
  if (chainsInfo) {
    chainsInfo.innerHTML = `
      <div class="chains-list">
        <h3>🌐 Supported Networks</h3>
        <div class="chains">
          <div class="chain ${currentChain.id === 1 ? 'active' : ''}">Ethereum</div>
          <div class="chain ${currentChain.id === 56 ? 'active' : ''}">BNB Chain</div>
          <div class="chain ${currentChain.id === 137 ? 'active' : ''}">Polygon</div>
        </div>
      </div>
    `;
  }
  
  // Update buttons
  connectBtn.disabled = true;
  connectBtn.textContent = "Connected";
  
  if (disconnectBtn) {
    disconnectBtn.style.display = "block";
  }
  
  if (scanBtn) {
    scanBtn.disabled = false;
  }
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
        <p>Scanning wallet...</p>
      </div>
    `;

    // Get provider
    let provider;
    try {
      provider = await appKit.getProvider();
    } catch (error) {
      console.warn("Using fallback RPC");
      // Fallback to public RPC
      const rpcUrls = {
        1: "https://ethereum.publicnode.com",
        56: "https://bsc-dataseed.binance.org",
        137: "https://polygon-rpc.com"
      };
      provider = new ethers.JsonRpcProvider(rpcUrls[currentChain.id] || rpcUrls[1]);
    }
    
    const tokens = await scanWallet(provider);
    
    // Display results
    displayResults(tokens);
    
    // Update UI
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Tokens";
    showMessage(`Found ${tokens.length} tokens`);
    
  } catch (error) {
    console.error("❌ Scan error:", error);
    showError(`Scan failed: ${error.message}`);
    
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Tokens";
    
    scanResults.innerHTML = `
      <div class="error">
        <p>❌ Scan failed</p>
        <p>${error.message}</p>
        <button onclick="scanTokens()" class="retry">Try Again</button>
      </div>
    `;
  }
}

// Scan wallet
async function scanWallet(provider) {
  const tokens = [];
  const address = currentAccount.address;
  
  // Create ethers provider
  const ethersProvider = new ethers.BrowserProvider(provider);
  
  // 1. Get native balance
  try {
    const nativeBalance = await ethersProvider.getBalance(address);
    const nativeSymbol = currentChain.id === 56 ? 'BNB' : currentChain.id === 137 ? 'MATIC' : 'ETH';
    
    tokens.push({
      type: 'native',
      symbol: nativeSymbol,
      name: `${currentChain.name} Native`,
      balance: ethers.formatEther(nativeBalance),
      value: parseFloat(ethers.formatEther(nativeBalance))
    });
  } catch (error) {
    console.warn("Failed to get native balance:", error);
  }
  
  // 2. Check common tokens
  const chainTokens = COMMON_TOKENS[currentChain.id] || {};
  
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
          name: symbol,
          balance: formattedBalance,
          value: parseFloat(formattedBalance)
        });
      }
    } catch (error) {
      // Token might not exist
      continue;
    }
  }
  
  // Sort by value
  tokens.sort((a, b) => b.value - a.value);
  
  return tokens;
}

// Display results
function displayResults(tokens) {
  if (!scanResults) return;
  
  if (tokens.length === 0) {
    scanResults.innerHTML = `
      <div class="no-tokens">
        <p>📭 No tokens found on ${currentChain.name}</p>
        <p>Try switching to a different network</p>
      </div>
    `;
    return;
  }

  const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
  
  scanResults.innerHTML = `
    <div class="tokens">
      <div class="tokens-header">
        <h3>💰 Tokens (${tokens.length})</h3>
        <div class="total">Total: ${totalValue.toFixed(6)}</div>
      </div>
      <div class="tokens-list">
        ${tokens.map(token => `
          <div class="token">
            <div class="token-symbol">${token.symbol}</div>
            <div class="token-balance">${parseFloat(token.balance).toFixed(6)}</div>
            <div class="token-type">${token.type}</div>
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
    walletInfo.innerHTML = '<p>Connect wallet to see details</p>';
  }
  
  if (chainsInfo) {
    chainsInfo.innerHTML = '<p>Networks will appear here</p>';
  }
  
  if (scanResults) {
    scanResults.innerHTML = '<p>Scan results will appear here</p>';
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
    
    // Reset UI
    resetUI();
    
    // Initialize wallet
    const initialized = await initializeAppKit();
    if (!initialized) {
      showError("Failed to initialize wallet");
      connectBtn.disabled = true;
      connectBtn.textContent = "Initialization Failed";
      return;
    }
    
    // Setup event listeners
    connectBtn.addEventListener("click", connectWallet);
    if (disconnectBtn) disconnectBtn.addEventListener("click", disconnectWallet);
    if (scanBtn) scanBtn.addEventListener("click", scanTokens);
    
    // Setup state listeners
    setupStateListeners();
    
    // Check initial state
    if (appKit) {
      const state = appKit.getState();
      if (state.isConnected && state.account) {
        handleConnectionSuccess(state);
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

// Add basic CSS
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
  
  .scanning, .error, .no-tokens {
    text-align: center;
    padding: 40px;
  }
  
  .wallet-connected {
    background: rgba(255,255,255,0.05);
    border-radius: 10px;
    padding: 20px;
    margin: 10px 0;
  }
  
  .chains {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
  
  .chain {
    background: rgba(255,255,255,0.1);
    padding: 10px 15px;
    border-radius: 8px;
  }
  
  .chain.active {
    background: rgba(59, 130, 246, 0.2);
    border: 2px solid #3b82f6;
  }
  
  .tokens {
    margin-top: 20px;
  }
  
  .token {
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
    padding: 15px;
    margin: 10px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .status-message {
    background: rgba(16, 185, 129, 0.1);
    border-left: 4px solid #10b981;
    color: #10b981;
    padding: 12px;
    border-radius: 8px;
  }
  
  .status-error {
    background: rgba(239, 68, 68, 0.1);
    border-left: 4px solid #ef4444;
    color: #ef4444;
    padding: 12px;
    border-radius: 8px;
  }
`;
document.head.appendChild(style);
