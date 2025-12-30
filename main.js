import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

const projectId = "962425907914a3e80a7d8e7288b23f62";

// Simplified chain configurations - start with fewer reliable chains
const CHAINS = [
  {
    id: 1,
    name: "Ethereum",
    rpcUrl: "https://eth.llamarpc.com",
    nativeCurrency: "ETH",
    blockExplorer: "https://etherscan.io"
  },
  {
    id: 56,
    name: "Binance Smart Chain",
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

// Initialize AppKit with better configuration
let appKit;

try {
  appKit = createAppKit({
    adapters: [new EthersAdapter()],
    projectId,
    networks: CHAINS,
    metadata: {
      name: "Multichain Wallet Scanner",
      description: "Scan tokens across multiple blockchains",
      url: window.location.origin,
      icons: ["https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Logo/Blue%20(Default)/Logo.png"]
    },
    themeVariables: {
      "--w3m-accent": "#3b82f6",
      "--w3m-border-radius-master": "12px"
    },
    themeMode: "dark",
    features: {
      analytics: false,
      email: false,
      allWallets: true
    },
    connectors: [
      {
        id: 'binance',
        name: 'Binance Wallet',
        links: {
          native: 'bnc://app.binance.com/wc',
          universal: 'https://app.binance.com/wc'
        }
      }
    ]
  });
} catch (error) {
  console.error("Failed to initialize AppKit:", error);
  document.getElementById("status").textContent = "Failed to initialize wallet connector";
}

// UI Elements
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const status = document.getElementById("status");
const walletInfo = document.getElementById("walletInfo");
const chainsInfo = document.getElementById("chainsInfo");
const scanBtn = document.getElementById("scanBtn");
const scanResults = document.getElementById("scanResults");
const chainSelect = document.getElementById("chainSelect");

// State management
let isConnected = false;
let currentAccount = null;
let currentChain = null;
let provider = null;
let signer = null;

// Common tokens for scanning
const COMMON_TOKENS = {
  1: { // Ethereum
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
  },
  56: { // Binance Smart Chain
    'BUSD': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    'USDT': '0x55d398326f99059fF775485246999027B3197955',
    'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    'CAKE': '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'
  },
  137: { // Polygon
    'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    'WETH': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    'AAVE': '0xD6DF932A45C0f255f85145f286eA0b292B21C90B'
  },
  42161: { // Arbitrum
    'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    'USDC': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    'ARB': '0x912CE59144191C1204E64559FE8253a0e49E6548'
  },
  10: { // Optimism
    'USDT': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    'USDC': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    'OP': '0x4200000000000000000000000000000000000042'
  },
  8453: { // Base
    'USDbC': '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    'cbETH': '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'
  }
};

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)"
];

// Initialize chain select dropdown
function initializeChainSelect() {
  CHAINS.forEach(chain => {
    const option = document.createElement("option");
    option.value = chain.id;
    option.textContent = `${chain.name} (${chain.id})`;
    chainSelect.appendChild(option);
  });
}

// Connect wallet
async function connectWallet() {
  if (!appKit) {
    showError("Wallet connector not initialized");
    return;
  }

  try {
    connectBtn.disabled = true;
    connectBtn.textContent = "Connecting...";
    status.textContent = "Opening wallet modal...";
    
    // Clear any previous connection errors
    clearErrors();
    
    // Open the modal
    await appKit.open();
    
  } catch (error) {
    console.error("Connection error:", error);
    showError(`Connection failed: ${error.message || "Unknown error"}`);
    resetConnectButton();
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
if (appKit) {
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
    
    // Get provider and signer
    provider = await appKit.getProvider();
    if (provider) {
      const ethersProvider = new ethers.BrowserProvider(provider);
      signer = await ethersProvider.getSigner();
    }
    
    // Update UI
    updateWalletInfo();
    updateChainInfo();
    
    // Update status
    const walletName = currentAccount.connector?.name || "Unknown Wallet";
    showMessage(`Connected to ${walletName} on ${currentChain?.name || "Unknown Network"}`);
    
    // Enable scan button
    scanBtn.disabled = false;
    disconnectBtn.style.display = "block";
    connectBtn.textContent = "Connected";
    connectBtn.disabled = true;
    
    // Auto-scan after connection
    setTimeout(() => {
      scanTokens();
    }, 1500);
    
  } catch (error) {
    console.error("Error handling connected state:", error);
    showError(`Connection error: ${error.message}`);
  }
}

// Handle disconnected state
function handleDisconnectedState() {
  isConnected = false;
  currentAccount = null;
  currentChain = null;
  provider = null;
  signer = null;
  
  resetUI();
  resetConnectButton();
  disconnectBtn.style.display = "none";
  showMessage("Disconnected");
}

// Update wallet information
function updateWalletInfo() {
  if (!currentAccount || !currentChain) return;
  
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

// Update chain information
function updateChainInfo() {
  const evmChains = CHAINS.filter(chain => chain.id <= 999999999);
  const otherChains = [
    { id: "solana", name: "Solana", type: "non-evm" },
    { id: "cosmos", name: "Cosmos", type: "non-evm" },
    { id: "polkadot", name: "Polkadot", type: "non-evm" },
    { id: "tron", name: "Tron", type: "non-evm" }
  ];
  
  const allChains = [...evmChains, ...otherChains];
  
  chainsInfo.innerHTML = `
    <div class="chains-container">
      <h3>🌐 Supported Networks (${allChains.length})</h3>
      <div class="chains-grid">
        ${allChains.map(chain => {
          const isActive = chain.id === currentChain?.id;
          const isEVM = chain.id <= 999999999;
          return `
            <div class="chain-card ${isActive ? 'active' : ''} ${isEVM ? 'evm' : 'non-evm'}">
              <div class="chain-name">${chain.name}</div>
              <div class="chain-type">${isEVM ? 'EVM' : chain.type || 'Non-EVM'}</div>
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
  if (!isConnected || !currentAccount || !currentChain || !provider) {
    showError("Please connect wallet first");
    return;
  }

  try {
    scanBtn.disabled = true;
    scanBtn.textContent = "Scanning...";
    status.textContent = `Scanning tokens on ${currentChain.name}...`;
    
    scanResults.innerHTML = `
      <div class="scanning-indicator">
        <div class="spinner"></div>
        <p>Scanning wallet for tokens...</p>
      </div>
    `;

    const tokens = await scanEVMTokens();
    displayScanResults(tokens);
    
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Tokens";
    showMessage(`Found ${tokens.length} tokens on ${currentChain.name}`);
    
  } catch (error) {
    console.error("Scan error:", error);
    showError(`Scan failed: ${error.message}`);
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Tokens";
    scanResults.innerHTML = `
      <div class="error-message">
        <p>❌ Scan failed: ${error.message}</p>
        <button onclick="scanTokens()" class="retry-btn">Retry Scan</button>
      </div>
    `;
  }
}

// Scan EVM tokens
async function scanEVMTokens() {
  const tokens = [];
  const address = currentAccount.address;
  
  try {
    // Create ethers provider
    const ethersProvider = new ethers.BrowserProvider(provider);
    
    // Get native token balance
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
    
    // Check common tokens for this chain
    const chainTokens = COMMON_TOKENS[currentChain.id] || {};
    
    // Process tokens in parallel with rate limiting
    const tokenPromises = Object.entries(chainTokens).map(async ([symbol, tokenAddress]) => {
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
    
    const tokenResults = await Promise.all(tokenPromises);
    tokenResults.forEach(token => {
      if (token) tokens.push(token);
    });
    
    // Sort by value (highest first)
    tokens.sort((a, b) => b.value - a.value);
    
    return tokens;
    
  } catch (error) {
    throw new Error(`Failed to scan tokens: ${error.message}`);
  }
}

// Display scan results
function displayScanResults(tokens) {
  if (tokens.length === 0) {
    scanResults.innerHTML = `
      <div class="no-tokens">
        <p>📭 No tokens found on this network</p>
        <p class="hint">Try switching to a different network where you have tokens</p>
      </div>
    `;
    return;
  }

  scanResults.innerHTML = `
    <div class="tokens-container">
      <div class="tokens-header">
        <h3>💰 Token Balances (${tokens.length})</h3>
        <div class="total-value">
          Total: ${tokens.reduce((sum, token) => sum + token.value, 0).toFixed(4)}
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
    
    await appKit.switchNetwork(chainId);
    
    // Wait a moment for the switch to complete
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
  status.textContent = message;
  status.className = "status-message";
}

function showError(message) {
  status.textContent = message;
  status.className = "status-error";
}

function clearErrors() {
  status.textContent = "";
  status.className = "";
}

function resetConnectButton() {
  connectBtn.disabled = false;
  connectBtn.textContent = "Connect Wallet";
}

function resetUI() {
  walletInfo.innerHTML = '<p class="empty-state">No wallet connected</p>';
  chainsInfo.innerHTML = '<p class="empty-state">Connect wallet to see networks</p>';
  scanResults.innerHTML = '<p class="empty-state">Scan results will appear here</p>';
}

function resetConnection() {
  isConnected = false;
  currentAccount = null;
  currentChain = null;
  provider = null;
  signer = null;
  resetUI();
  resetConnectButton();
  disconnectBtn.style.display = "none";
}

// Initialize
function initialize() {
  if (!appKit) {
    showError("Failed to initialize wallet connector. Please refresh the page.");
    connectBtn.disabled = true;
    return;
  }
  
  initializeChainSelect();
  
  // Check if already connected
  const initialState = appKit.getState();
  if (initialState.isConnected && initialState.account) {
    handleConnectedState(initialState);
  } else {
    handleDisconnectedState();
  }
}

// Event listeners
connectBtn.addEventListener("click", connectWallet);
disconnectBtn.addEventListener("click", disconnectWallet);
scanBtn.addEventListener("click", scanTokens);
chainSelect.addEventListener("change", (e) => {
  const chainId = parseInt(e.target.value);
  if (chainId && chainId !== currentChain?.id) {
    switchChain(chainId);
  }
});

// Expose functions to global scope for HTML onclick events
window.scanTokens = scanTokens;
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.switchChain = (chainId) => switchChain(chainId);

// Initialize on load
document.addEventListener("DOMContentLoaded", initialize);
