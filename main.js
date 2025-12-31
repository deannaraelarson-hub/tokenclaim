import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

const projectId = "962425907914a3e80a7d8e7288b23f62";

// Simplified configuration
const CONFIG = {
  chains: [
    {
      id: 1,
      name: "Ethereum",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://eth.llamarpc.com"] } },
      blockExplorers: { default: { name: "Etherscan", url: "https://etherscan.io" } }
    },
    {
      id: 56,
      name: "BNB Smart Chain",
      nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
      rpcUrls: { default: { http: ["https://bsc-dataseed.binance.org"] } },
      blockExplorers: { default: { name: "BscScan", url: "https://bscscan.com" } }
    },
    {
      id: 137,
      name: "Polygon",
      nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
      rpcUrls: { default: { http: ["https://polygon-rpc.com"] } },
      blockExplorers: { default: { name: "Polygonscan", url: "https://polygonscan.com" } }
    },
    {
      id: 42161,
      name: "Arbitrum One",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://arb1.arbitrum.io/rpc"] } },
      blockExplorers: { default: { name: "Arbiscan", url: "https://arbiscan.io" } }
    }
  ],
  
  tokens: {
    1: {
      'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
    },
    56: {
      'BUSD': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      'USDT': '0x55d398326f99059fF775485246999027B3197955'
    },
    137: {
      'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
    }
  }
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

class WalletConnector {
  constructor() {
    this.appKit = null;
    this.provider = null;
    this.isConnected = false;
    this.walletInfo = {
      address: null,
      chainId: null,
      chainName: null,
      walletName: null
    };
    
    this.init();
  }
  
  async init() {
    try {
      console.log("🔄 Initializing Wallet Connector...");
      
      // Create networks array for AppKit
      const networks = CONFIG.chains.map(chain => ({
        id: chain.id,
        name: chain.name,
        rpcUrl: chain.rpcUrls.default.http[0]
      }));
      
      // Initialize AppKit with minimal configuration
      this.appKit = createAppKit({
        adapters: [new EthersAdapter()],
        projectId,
        networks,
        defaultNetwork: networks[0],
        metadata: {
          name: "Universal Scanner",
          description: "Scan your wallet across chains",
          url: window.location.origin,
          icons: ["https://avatars.githubusercontent.com/u/37784886"]
        },
        themeVariables: {
          "--w3m-accent": "#3b82f6",
          "--w3m-border-radius-master": "12px",
          "--w3m-font-family": "system-ui, sans-serif"
        },
        themeMode: "dark",
        features: {
          analytics: false,
          email: false,
          allWallets: false
        }
      });
      
      console.log("✅ Wallet Connector initialized");
      this.setupEventListeners();
      this.updateUI();
      
    } catch (error) {
      console.error("❌ Initialization failed:", error);
      this.showError("Failed to initialize wallet connector");
    }
  }
  
  setupEventListeners() {
    // Subscribe to state changes
    this.appKit.subscribeState((state) => {
      console.log("📱 Wallet state:", state);
      
      if (state.isConnected && state.account) {
        this.handleConnection(state);
      } else if (!state.isConnected) {
        this.handleDisconnection();
      }
    });
    
    // Subscribe to events
    this.appKit.subscribeEvents((event) => {
      console.log("📡 Wallet event:", event.type);
    });
    
    // Setup button listeners
    document.getElementById('connectBtn')?.addEventListener('click', () => this.connect());
    document.getElementById('disconnectBtn')?.addEventListener('click', () => this.disconnect());
    document.getElementById('scanBtn')?.addEventListener('click', () => this.scanTokens());
  }
  
  async connect() {
    try {
      const connectBtn = document.getElementById('connectBtn');
      const status = document.getElementById('status');
      
      connectBtn.disabled = true;
      connectBtn.innerHTML = '<span class="spinner"></span> Connecting...';
      status.textContent = "Opening wallet...";
      status.className = "status-message";
      
      await this.appKit.open();
      
    } catch (error) {
      console.error("❌ Connection error:", error);
      this.showError("Failed to open wallet");
      this.resetConnectButton();
    }
  }
  
  async handleConnection(state) {
    try {
      this.isConnected = true;
      
      // Get provider
      this.provider = await this.appKit.getProvider();
      
      // Update wallet info
      this.walletInfo.address = state.account.address;
      this.walletInfo.chainId = state.chain?.id || 1;
      this.walletInfo.walletName = state.account.connector?.name || "Unknown Wallet";
      
      // Find chain name
      const chain = CONFIG.chains.find(c => c.id === this.walletInfo.chainId);
      this.walletInfo.chainName = chain?.name || `Chain ${this.walletInfo.chainId}`;
      
      // Update UI
      this.updateUI();
      this.showMessage(`✅ Connected to ${this.walletInfo.walletName}`);
      
      // Auto scan after 2 seconds
      setTimeout(() => this.scanTokens(), 2000);
      
    } catch (error) {
      console.error("❌ Error handling connection:", error);
      this.showError("Connection error");
    }
  }
  
  async disconnect() {
    try {
      await this.appKit.disconnect();
      this.handleDisconnection();
      this.showMessage("✅ Disconnected");
    } catch (error) {
      console.error("❌ Disconnect error:", error);
      this.showError("Failed to disconnect");
    }
  }
  
  handleDisconnection() {
    this.isConnected = false;
    this.provider = null;
    this.walletInfo = {
      address: null,
      chainId: null,
      chainName: null,
      walletName: null
    };
    
    this.updateUI();
  }
  
  async scanTokens() {
    if (!this.isConnected) {
      this.showError("Please connect wallet first");
      return;
    }
    
    try {
      const scanBtn = document.getElementById('scanBtn');
      const status = document.getElementById('status');
      const scanResults = document.getElementById('scanResults');
      
      scanBtn.disabled = true;
      scanBtn.textContent = "Scanning...";
      status.textContent = `Scanning ${this.walletInfo.chainName}...`;
      status.className = "status-message";
      
      scanResults.innerHTML = `
        <div class="scanning-indicator">
          <div class="spinner"></div>
          <p>Scanning ${this.walletInfo.chainName} wallet...</p>
        </div>
      `;
      
      const tokens = await this.fetchTokens();
      this.displayTokens(tokens);
      
      scanBtn.disabled = false;
      scanBtn.textContent = "Scan Tokens";
      this.showMessage(`✅ Found ${tokens.length} tokens`);
      
    } catch (error) {
      console.error("❌ Scan error:", error);
      this.showError(`Scan failed: ${error.message}`);
      this.resetScanButton();
    }
  }
  
  async fetchTokens() {
    const tokens = [];
    
    try {
      if (!this.provider) {
        throw new Error("No provider available");
      }
      
      const ethersProvider = new ethers.BrowserProvider(this.provider);
      const address = this.walletInfo.address;
      
      // Get native token balance
      const nativeBalance = await ethersProvider.getBalance(address);
      const chain = CONFIG.chains.find(c => c.id === this.walletInfo.chainId);
      const nativeSymbol = chain?.nativeCurrency?.symbol || 'ETH';
      
      tokens.push({
        type: 'native',
        symbol: nativeSymbol,
        name: `${this.walletInfo.chainName} Native`,
        balance: ethers.formatEther(nativeBalance),
        decimals: 18,
        value: parseFloat(ethers.formatEther(nativeBalance))
      });
      
      // Check for ERC20 tokens
      const chainTokens = CONFIG.tokens[this.walletInfo.chainId] || {};
      
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
          // Token might not exist or have issues, skip it
          console.warn(`Token ${symbol} error:`, error.message);
        }
      }
      
    } catch (error) {
      console.error("❌ Token fetch error:", error);
      throw error;
    }
    
    return tokens.sort((a, b) => b.value - a.value);
  }
  
  displayTokens(tokens) {
    const scanResults = document.getElementById('scanResults');
    
    if (!scanResults) return;
    
    if (tokens.length === 0) {
      scanResults.innerHTML = `
        <div class="no-tokens">
          <p>📭 No tokens found on ${this.walletInfo.chainName}</p>
          <p class="hint">Try connecting to a different network</p>
        </div>
      `;
      return;
    }
    
    const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
    
    scanResults.innerHTML = `
      <div class="tokens-container">
        <div class="tokens-header">
          <h3>💰 ${this.walletInfo.chainName} Tokens (${tokens.length})</h3>
          ${totalValue > 0 ? `<div class="total-value">Total: ${totalValue.toFixed(4)}</div>` : ''}
        </div>
        <div class="tokens-list">
          ${tokens.map(token => `
            <div class="token-card ${token.type}">
              <div class="token-header">
                <div class="token-symbol">${token.symbol}</div>
                <div class="token-type">${token.type}</div>
              </div>
              <div class="token-body">
                <div class="token-name">${token.name}</div>
                <div class="token-balance">${parseFloat(token.balance).toFixed(4)}</div>
                ${token.address && token.address !== 'native' ? `
                  <div class="token-address" title="${token.address}">
                    ${token.address.substring(0, 10)}...${token.address.substring(token.address.length - 8)}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  updateUI() {
    // Update connect button
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const scanBtn = document.getElementById('scanBtn');
    const walletInfoEl = document.getElementById('walletInfo');
    const chainsInfo = document.getElementById('chainsInfo');
    
    if (connectBtn) {
      connectBtn.disabled = this.isConnected;
      connectBtn.textContent = this.isConnected ? "Connected" : "Connect Wallet";
    }
    
    if (disconnectBtn) {
      disconnectBtn.style.display = this.isConnected ? "block" : "none";
    }
    
    if (scanBtn) {
      scanBtn.disabled = !this.isConnected;
    }
    
    // Update wallet info display
    if (walletInfoEl) {
      if (this.isConnected && this.walletInfo.address) {
        const shortAddress = `${this.walletInfo.address.substring(0, 6)}...${this.walletInfo.address.substring(this.walletInfo.address.length - 4)}`;
        
        walletInfoEl.innerHTML = `
          <div class="wallet-details">
            <h3>🌐 Wallet Connected</h3>
            <div class="detail-row">
              <span class="label">Wallet:</span>
              <span class="value">${this.walletInfo.walletName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Address:</span>
              <span class="value address" title="${this.walletInfo.address}">${shortAddress}</span>
            </div>
            <div class="detail-row">
              <span class="label">Network:</span>
              <span class="value">${this.walletInfo.chainName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Chain ID:</span>
              <span class="value">${this.walletInfo.chainId}</span>
            </div>
          </div>
        `;
      } else {
        walletInfoEl.innerHTML = '<p class="empty-state">No wallet connected</p>';
      }
    }
    
    // Update chains info
    if (chainsInfo) {
      chainsInfo.innerHTML = `
        <div class="chains-container">
          <h3>🌍 Supported Networks (${CONFIG.chains.length})</h3>
          <div class="chains-grid">
            ${CONFIG.chains.map(chain => {
              const isActive = chain.id === this.walletInfo.chainId;
              return `
                <div class="chain-card ${isActive ? 'active' : ''}" title="${chain.name}">
                  <div class="chain-name">${chain.name}</div>
                  <div class="chain-id">ID: ${chain.id}</div>
                  ${isActive ? '<div class="chain-status">Connected</div>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
  }
  
  resetConnectButton() {
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.textContent = "Connect Wallet";
    }
  }
  
  resetScanButton() {
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
      scanBtn.disabled = false;
      scanBtn.textContent = "Scan Tokens";
    }
  }
  
  showMessage(message) {
    const status = document.getElementById('status');
    if (status) {
      status.textContent = message;
      status.className = "status-message";
    }
  }
  
  showError(message) {
    const status = document.getElementById('status');
    if (status) {
      status.textContent = message;
      status.className = "status-error";
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.walletConnector = new WalletConnector();
  
  // Add tab switching function
  window.showChainTab = function(tab) {
    const evmChains = document.getElementById('evm-chains');
    const nonEvmChains = document.getElementById('non-evm-chains');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    if (tab === 'evm') {
      if (evmChains) evmChains.style.display = 'grid';
      if (nonEvmChains) nonEvmChains.style.display = 'none';
      tabBtns[0]?.classList.add('active');
      tabBtns[1]?.classList.remove('active');
    } else {
      if (evmChains) evmChains.style.display = 'none';
      if (nonEvmChains) nonEvmChains.style.display = 'grid';
      tabBtns[0]?.classList.remove('active');
      tabBtns[1]?.classList.add('active');
    }
  };
});
