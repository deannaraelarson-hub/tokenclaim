// main.js - Universal Wallet Scanner (Pure JavaScript - No Build Tools Needed)

// Check if ethers is available (from CDN)
if (typeof ethers === 'undefined') {
    console.error('❌ Ethers.js not loaded. Make sure you include the CDN in your HTML:');
    console.error('<script src="https://cdn.ethers.io/lib/ethers-5.7.umd.min.js"></script>');
    document.getElementById('status').textContent = '❌ Ethers.js not loaded. Please check console.';
    document.getElementById('status').className = 'status-error';
}

class UniversalScanner {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.chainId = null;
        this.isConnected = false;
        this.ethers = ethers; // From CDN
        
        console.log('🚀 Universal Scanner Initialized');
        this.init();
    }

    async init() {
        console.log('🔄 Checking for Web3 wallet...');
        this.showMessage('🔄 Checking for Web3 wallet...');
        
        // Check if MetaMask/Web3 is available
        if (typeof window.ethereum !== 'undefined') {
            console.log('✅ Web3 wallet detected');
            try {
                this.provider = new this.ethers.providers.Web3Provider(window.ethereum);
                this.setupEventListeners();
                
                // Check if already connected
                await this.checkExistingConnection();
            } catch (error) {
                console.error('❌ Error initializing provider:', error);
                this.showError('Failed to initialize wallet connection');
            }
        } else {
            console.warn('⚠️ No web3 wallet detected');
            this.showError('❌ Please install MetaMask or a Web3 wallet');
            return;
        }
        
        this.displayChains();
        this.showMessage('✅ Ready to connect');
    }

    setupEventListeners() {
        // Connect button
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connect());
        }
        
        // Disconnect button
        const disconnectBtn = document.getElementById('disconnectBtn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnect());
        }
        
        // Scan button
        const scanBtn = document.getElementById('scanBtn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.scanTokens());
        }
        
        // Listen for account/chain changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                console.log('Accounts changed:', accounts);
                if (accounts.length === 0) {
                    this.handleDisconnection();
                } else {
                    this.address = accounts[0];
                    this.updateUI();
                    this.showMessage('🔄 Account changed');
                }
            });
            
            window.ethereum.on('chainChanged', (chainId) => {
                console.log('Chain changed:', chainId);
                this.chainId = parseInt(chainId, 16);
                this.updateUI();
                this.showMessage(`🔄 Switched to ${this.getChainName(this.chainId)}`);
                
                // Auto-rescan on chain change
                setTimeout(() => {
                    if (this.isConnected) {
                        this.scanTokens();
                    }
                }, 1000);
            });
        }
    }

    async checkExistingConnection() {
        try {
            console.log('🔍 Checking existing connection...');
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts && accounts.length > 0) {
                console.log('✅ Found existing connection:', accounts[0]);
                this.isConnected = true;
                this.address = accounts[0];
                this.signer = this.provider.getSigner();
                
                // Get chain ID
                const network = await this.provider.getNetwork();
                this.chainId = network.chainId;
                
                this.updateUI();
                this.showMessage('✅ Wallet already connected');
            } else {
                console.log('ℹ️ No existing connection found');
            }
        } catch (error) {
            console.log('ℹ️ No existing connection:', error.message);
        }
    }

    async connect() {
        try {
            console.log('🔄 Connecting wallet...');
            this.showMessage('🔄 Connecting...');
            
            // Request account access
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts.length > 0) {
                console.log('✅ Connected:', accounts[0]);
                this.isConnected = true;
                this.address = accounts[0];
                this.signer = this.provider.getSigner();
                
                // Get chain ID
                const network = await this.provider.getNetwork();
                this.chainId = network.chainId;
                
                this.updateUI();
                
                const shortAddr = `${this.address.substring(0, 6)}...${this.address.substring(this.address.length - 4)}`;
                this.showMessage(`✅ Connected: ${shortAddr}`);
                
                // Auto-scan after 1 second
                setTimeout(() => {
                    if (this.isConnected) {
                        this.scanTokens();
                    }
                }, 1000);
            }
            
        } catch (error) {
            console.error('❌ Connection error:', error);
            
            if (error.code === 4001) {
                this.showError('❌ Connection rejected');
            } else {
                this.showError(`❌ Connection failed: ${error.message}`);
            }
        }
    }

    disconnect() {
        console.log('🔌 Disconnecting...');
        this.isConnected = false;
        this.address = null;
        this.signer = null;
        this.chainId = null;
        
        this.updateUI();
        this.showMessage('🔌 Disconnected');
        
        // Clear scan results
        const resultsEl = document.getElementById('scanResults');
        if (resultsEl) {
            resultsEl.innerHTML = '<div class="empty-state">Connect and scan to see tokens</div>';
        }
    }

    handleDisconnection() {
        console.log('🔌 Wallet disconnected');
        this.isConnected = false;
        this.address = null;
        this.signer = null;
        
        this.updateUI();
        this.showMessage('🔌 Wallet disconnected');
    }

    updateUI() {
        const connectBtn = document.getElementById('connectBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');
        const scanBtn = document.getElementById('scanBtn');
        const walletInfo = document.getElementById('walletInfo');
        
        if (this.isConnected && this.address) {
            // Update buttons
            if (connectBtn) {
                connectBtn.disabled = true;
                connectBtn.textContent = '✅ Connected';
            }
            
            if (disconnectBtn) {
                disconnectBtn.style.display = 'block';
            }
            
            if (scanBtn) {
                scanBtn.disabled = false;
            }
            
            // Update wallet info
            if (walletInfo) {
                const shortAddr = `${this.address.substring(0, 6)}...${this.address.substring(this.address.length - 4)}`;
                const chainName = this.getChainName(this.chainId);
                const nativeSymbol = this.getNativeSymbol(this.chainId);
                
                walletInfo.innerHTML = `
                    <div class="wallet-details">
                        <h3>✅ Wallet Connected</h3>
                        <div class="detail-row">
                            <span class="label">Address:</span>
                            <span class="value address" title="${this.address}">${shortAddr}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Network:</span>
                            <span class="value">${chainName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Chain ID:</span>
                            <span class="value">${this.chainId || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Native Token:</span>
                            <span class="value">${nativeSymbol}</span>
                        </div>
                    </div>
                `;
            }
        } else {
            // Reset UI
            if (connectBtn) {
                connectBtn.disabled = false;
                connectBtn.textContent = '🔗 Connect Wallet';
            }
            
            if (disconnectBtn) {
                disconnectBtn.style.display = 'none';
            }
            
            if (scanBtn) {
                scanBtn.disabled = true;
            }
            
            if (walletInfo) {
                walletInfo.innerHTML = '<div class="empty-state">Connect wallet to begin</div>';
            }
        }
    }

    displayChains() {
        const chainsInfo = document.getElementById('chainsInfo');
        if (!chainsInfo) return;
        
        const chains = [
            { id: 1, name: 'Ethereum', symbol: 'ETH' },
            { id: 56, name: 'BNB Chain', symbol: 'BNB' },
            { id: 137, name: 'Polygon', symbol: 'MATIC' },
            { id: 42161, name: 'Arbitrum', symbol: 'ETH' },
            { id: 10, name: 'Optimism', symbol: 'ETH' },
            { id: 43114, name: 'Avalanche', symbol: 'AVAX' },
            { id: 250, name: 'Fantom', symbol: 'FTM' },
            { id: 8453, name: 'Base', symbol: 'ETH' },
        ];
        
        let html = `
            <div class="chains-container">
                <h3>🌍 Supported Networks (${chains.length})</h3>
                <div class="chains-grid">
        `;
        
        chains.forEach(chain => {
            const isActive = chain.id === this.chainId;
            html += `
                <div class="chain-card ${isActive ? 'active' : ''}">
                    <div class="chain-name">${chain.name}</div>
                    <div class="chain-id">ID: ${chain.id}</div>
                    <div class="chain-symbol">${chain.symbol}</div>
                    ${isActive ? '<div class="chain-status">Connected</div>' : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        chainsInfo.innerHTML = html;
    }

    async scanTokens() {
        if (!this.isConnected || !this.address) {
            this.showError('❌ Please connect wallet first');
            return;
        }
        
        try {
            console.log('🔍 Scanning tokens...');
            const scanBtn = document.getElementById('scanBtn');
            const resultsEl = document.getElementById('scanResults');
            
            // Update UI
            if (scanBtn) {
                scanBtn.disabled = true;
                scanBtn.textContent = 'Scanning...';
            }
            
            const chainName = this.getChainName(this.chainId);
            this.showMessage(`🔍 Scanning ${chainName}...`);
            
            if (resultsEl) {
                resultsEl.innerHTML = `
                    <div class="scanning-indicator">
                        <div class="spinner"></div>
                        <h3>Scanning Wallet</h3>
                        <p>Checking token balances on ${chainName}...</p>
                    </div>
                `;
            }
            
            // Scan tokens
            const tokens = await this.fetchTokens();
            
            // Display results
            this.displayResults(tokens);
            
            // Reset button
            if (scanBtn) {
                scanBtn.disabled = false;
                scanBtn.textContent = '🔍 Scan Tokens';
            }
            
            console.log(`✅ Found ${tokens.length} tokens`);
            this.showMessage(`✅ Found ${tokens.length} tokens`);
            
        } catch (error) {
            console.error('❌ Scan error:', error);
            this.showError(`❌ Scan failed: ${error.message}`);
            this.resetScanButton();
        }
    }

    async fetchTokens() {
        const tokens = [];
        
        try {
            if (!this.provider || !this.address) {
                throw new Error('Not connected');
            }
            
            console.log('💰 Fetching native balance...');
            
            // Get native balance
            const nativeBalance = await this.provider.getBalance(this.address);
            const nativeSymbol = this.getNativeSymbol(this.chainId);
            const chainName = this.getChainName(this.chainId);
            
            tokens.push({
                type: 'native',
                symbol: nativeSymbol,
                name: `${chainName} Native`,
                balance: this.ethers.utils.formatEther(nativeBalance),
                value: parseFloat(this.ethers.utils.formatEther(nativeBalance)),
                address: 'native',
                decimals: 18
            });
            
            console.log('📝 Checking ERC20 tokens...');
            
            // Get ERC20 tokens for this chain
            const chainTokens = this.getChainTokens(this.chainId);
            
            // ERC20 ABI
            const ERC20_ABI = [
                "function balanceOf(address owner) view returns (uint256)",
                "function decimals() view returns (uint8)",
                "function symbol() view returns (string)",
                "function name() view returns (string)"
            ];
            
            // Check each token
            for (const [symbol, tokenAddress] of Object.entries(chainTokens)) {
                try {
                    const tokenContract = new this.ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
                    
                    const [balance, decimals] = await Promise.all([
                        tokenContract.balanceOf(this.address),
                        tokenContract.decimals()
                    ]);
                    
                    // Check if balance > 0
                    if (balance.gt(0)) {
                        const formattedBalance = this.ethers.utils.formatUnits(balance, decimals);
                        const name = await tokenContract.name().catch(() => `${symbol} Token`);
                        
                        tokens.push({
                            type: 'erc20',
                            symbol: symbol,
                            name: name,
                            balance: formattedBalance,
                            value: parseFloat(formattedBalance),
                            address: tokenAddress,
                            decimals: Number(decimals)
                        });
                        
                        console.log(`✅ Found ${symbol}: ${formattedBalance}`);
                    }
                    
                } catch (error) {
                    // Skip problematic tokens
                    console.warn(`⚠️ Skipping token ${symbol}:`, error.message);
                    continue;
                }
            }
            
        } catch (error) {
            console.error('❌ Token fetch error:', error);
            throw error;
        }
        
        // Sort by value (highest first)
        return tokens.sort((a, b) => b.value - a.value);
    }

    getChainTokens(chainId) {
        const tokenLists = {
            1: { // Ethereum
                'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
                'SHIB': '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE'
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
                'DAI': '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
                'WETH': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
            },
            42161: { // Arbitrum
                'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
                'USDC': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                'ARB': '0x912CE59144191C1204E64559FE8253a0e49E6548'
            },
            10: { // Optimism
                'USDT': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
                'USDC': '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'
            },
            43114: { // Avalanche
                'USDT': '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
                'USDC': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'
            },
            250: { // Fantom
                'USDT': '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75',
                'USDC': '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75'
            },
            8453: { // Base
                'USDC': '0x833589fCD6eDb6E08f4c7C32d4f71b54bdA02913'
            }
        };
        
        return tokenLists[chainId] || {};
    }

    getChainName(chainId) {
        const chains = {
            1: 'Ethereum Mainnet',
            56: 'BNB Smart Chain',
            137: 'Polygon',
            42161: 'Arbitrum One',
            10: 'Optimism',
            43114: 'Avalanche C-Chain',
            250: 'Fantom Opera',
            8453: 'Base',
            100: 'Gnosis Chain',
            25: 'Cronos',
            1284: 'Moonbeam',
            42220: 'Celo'
        };
        
        return chains[chainId] || `Chain ${chainId}`;
    }

    getNativeSymbol(chainId) {
        const symbols = {
            1: 'ETH',
            56: 'BNB',
            137: 'MATIC',
            42161: 'ETH',
            10: 'ETH',
            43114: 'AVAX',
            250: 'FTM',
            8453: 'ETH',
            100: 'xDAI',
            25: 'CRO',
            1284: 'GLMR',
            42220: 'CELO'
        };
        
        return symbols[chainId] || 'ETH';
    }

    displayResults(tokens) {
        const resultsEl = document.getElementById('scanResults');
        if (!resultsEl) return;
        
        if (tokens.length === 0) {
            resultsEl.innerHTML = `
                <div class="empty-state">
                    <h3>📭 No Tokens Found</h3>
                    <p>No tokens detected on ${this.getChainName(this.chainId)}</p>
                    <p>Try switching to a different network</p>
                </div>
            `;
            return;
        }
        
        const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
        
        let html = `
            <div class="results-container">
                <div class="results-header">
                    <h3>💰 ${this.getChainName(this.chainId)} Tokens (${tokens.length})</h3>
                    ${totalValue > 0 ? `<div class="total-value">Total: ${totalValue.toFixed(4)}</div>` : ''}
                </div>
                <div class="tokens-list">
        `;
        
        tokens.forEach(token => {
            const displayBalance = token.type === 'native' 
                ? parseFloat(token.balance).toFixed(6)
                : parseFloat(token.balance).toFixed(4);
            
            html += `
                <div class="token-item ${token.type}">
                    <div class="token-symbol">${token.symbol}</div>
                    <div class="token-info">
                        <div class="token-name">${token.name}</div>
                        ${token.address !== 'native' ? `
                            <div class="token-address" title="${token.address}">
                                ${token.address.substring(0, 10)}...${token.address.substring(token.address.length - 8)}
                            </div>
                        ` : ''}
                    </div>
                    <div class="token-balance">${displayBalance}</div>
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="scan-actions">
                    <button onclick="scanner.scanTokens()" class="btn btn-secondary">
                        🔄 Rescan
                    </button>
                </div>
            </div>
        `;
        
        resultsEl.innerHTML = html;
    }

    resetScanButton() {
        const scanBtn = document.getElementById('scanBtn');
        if (scanBtn) {
            scanBtn.disabled = false;
            scanBtn.textContent = '🔍 Scan Tokens';
        }
    }

    showMessage(message) {
        const status = document.getElementById('status');
        if (status) {
            status.textContent = message;
            status.className = 'status-message';
        }
    }

    showError(message) {
        const status = document.getElementById('status');
        if (status) {
            status.textContent = message;
            status.className = 'status-error';
        }
    }
}

// Initialize scanner when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.scanner = new UniversalScanner();
});

// Make functions available globally
window.connectWallet = () => window.scanner?.connect();
window.disconnectWallet = () => window.scanner?.disconnect();
window.scanTokens = () => window.scanner?.scanTokens();
