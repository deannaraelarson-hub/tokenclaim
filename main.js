// main.js - Universal Wallet Scanner
console.log('🚀 Universal Wallet Scanner starting...');

class UniversalScanner {
    constructor() {
        console.log('🔧 Initializing scanner...');
        
        // Check if ethers is loaded
        if (typeof ethers === 'undefined') {
            this.showError('Ethers.js not loaded. Please refresh.');
            return;
        }
        
        this.ethers = ethers;
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.chainId = null;
        this.isConnected = false;
        
        this.init();
    }

    async init() {
        console.log('🔍 Checking for wallet...');
        this.showMessage('Checking for wallet...');
        
        // Check for Web3 provider
        if (typeof window.ethereum !== 'undefined') {
            console.log('✅ Web3 wallet detected');
            this.provider = new this.ethers.providers.Web3Provider(window.ethereum);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check existing connection
            await this.checkExistingConnection();
            
            this.showMessage('Ready to connect');
        } else {
            console.warn('❌ No wallet found');
            this.showError('Please install MetaMask or a Web3 wallet');
        }
        
        this.displayChains();
    }

    setupEventListeners() {
        // Connect button
        document.getElementById('connectBtn').addEventListener('click', () => this.connect());
        
        // Disconnect button
        document.getElementById('disconnectBtn').addEventListener('click', () => this.disconnect());
        
        // Scan button
        document.getElementById('scanBtn').addEventListener('click', () => this.scanTokens());
        
        // Wallet events
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                console.log('Accounts changed:', accounts);
                if (accounts.length === 0) {
                    this.handleDisconnection();
                } else {
                    this.address = accounts[0];
                    this.updateUI();
                }
            });
            
            window.ethereum.on('chainChanged', (chainId) => {
                console.log('Chain changed:', chainId);
                this.chainId = parseInt(chainId, 16);
                this.updateUI();
                this.showMessage(`Switched to chain ${this.chainId}`);
            });
        }
    }

    async checkExistingConnection() {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            
            if (accounts && accounts.length > 0) {
                this.isConnected = true;
                this.address = accounts[0];
                this.signer = this.provider.getSigner();
                
                // Get chain ID
                const network = await this.provider.getNetwork();
                this.chainId = network.chainId;
                
                this.updateUI();
                this.showMessage('Already connected');
            }
        } catch (error) {
            console.log('No existing connection');
        }
    }

    async connect() {
        try {
            this.showMessage('Connecting...');
            
            // Request accounts
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts.length > 0) {
                this.isConnected = true;
                this.address = accounts[0];
                this.signer = this.provider.getSigner();
                
                // Get chain
                const network = await this.provider.getNetwork();
                this.chainId = network.chainId;
                
                this.updateUI();
                this.showMessage(`Connected: ${this.address.substring(0, 6)}...`);
                
                // Auto scan
                setTimeout(() => this.scanTokens(), 1000);
            }
            
        } catch (error) {
            console.error('Connection error:', error);
            this.showError(error.message);
        }
    }

    disconnect() {
        this.isConnected = false;
        this.address = null;
        this.signer = null;
        this.chainId = null;
        
        this.updateUI();
        this.showMessage('Disconnected');
        
        document.getElementById('scanResults').innerHTML = 'Connect and scan to see tokens';
    }

    handleDisconnection() {
        this.isConnected = false;
        this.address = null;
        this.signer = null;
        
        this.updateUI();
        this.showMessage('Wallet disconnected');
    }

    updateUI() {
        const connectBtn = document.getElementById('connectBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');
        const scanBtn = document.getElementById('scanBtn');
        const walletInfo = document.getElementById('walletInfo');
        
        if (this.isConnected && this.address) {
            // Update buttons
            connectBtn.disabled = true;
            connectBtn.textContent = 'Connected';
            
            disconnectBtn.style.display = 'inline-block';
            scanBtn.disabled = false;
            
            // Update wallet info
            const shortAddr = `${this.address.substring(0, 6)}...${this.address.substring(this.address.length - 4)}`;
            walletInfo.innerHTML = `
                <div>
                    <p><strong>Address:</strong> ${shortAddr}</p>
                    <p><strong>Chain ID:</strong> ${this.chainId}</p>
                    <p><strong>Network:</strong> ${this.getChainName(this.chainId)}</p>
                </div>
            `;
        } else {
            // Reset buttons
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect Wallet';
            
            disconnectBtn.style.display = 'none';
            scanBtn.disabled = true;
            
            walletInfo.innerHTML = 'Not connected';
        }
    }

    displayChains() {
        const chainsInfo = document.getElementById('chainsInfo');
        
        const chains = [
            { id: 1, name: 'Ethereum', symbol: 'ETH' },
            { id: 56, name: 'BNB Chain', symbol: 'BNB' },
            { id: 137, name: 'Polygon', symbol: 'MATIC' },
            { id: 42161, name: 'Arbitrum', symbol: 'ETH' },
            { id: 10, name: 'Optimism', symbol: 'ETH' },
        ];
        
        let html = '<div>';
        chains.forEach(chain => {
            const isActive = chain.id === this.chainId;
            html += `
                <div style="margin: 5px; padding: 5px; border: 1px solid #ddd; border-radius: 3px; ${isActive ? 'background: #e3f2fd;' : ''}">
                    ${chain.name} (${chain.symbol}) - ID: ${chain.id}
                </div>
            `;
        });
        html += '</div>';
        
        chainsInfo.innerHTML = html;
    }

    async scanTokens() {
        if (!this.isConnected) {
            this.showError('Please connect first');
            return;
        }
        
        try {
            this.showMessage('Scanning...');
            const scanBtn = document.getElementById('scanBtn');
            const resultsEl = document.getElementById('scanResults');
            
            scanBtn.disabled = true;
            scanBtn.textContent = 'Scanning...';
            
            resultsEl.innerHTML = `
                <div style="text-align: center;">
                    <div class="spinner"></div>
                    <p>Scanning wallet...</p>
                </div>
            `;
            
            // Fetch tokens
            const tokens = await this.fetchTokens();
            
            // Display results
            this.displayResults(tokens);
            
            scanBtn.disabled = false;
            scanBtn.textContent = 'Scan Tokens';
            this.showMessage(`Found ${tokens.length} tokens`);
            
        } catch (error) {
            console.error('Scan error:', error);
            this.showError(`Scan failed: ${error.message}`);
            this.resetScanButton();
        }
    }

    async fetchTokens() {
        const tokens = [];
        
        try {
            // Get native balance
            const nativeBalance = await this.provider.getBalance(this.address);
            const nativeSymbol = this.getNativeSymbol(this.chainId);
            
            tokens.push({
                type: 'native',
                symbol: nativeSymbol,
                name: `${this.getChainName(this.chainId)} Native`,
                balance: this.ethers.utils.formatEther(nativeBalance),
                value: parseFloat(this.ethers.utils.formatEther(nativeBalance))
            });
            
            // Get ERC20 tokens
            const chainTokens = this.getChainTokens(this.chainId);
            
            // ERC20 ABI
            const ERC20_ABI = [
                "function balanceOf(address owner) view returns (uint256)",
                "function decimals() view returns (uint8)",
                "function symbol() view returns (string)",
                "function name() view returns (string)"
            ];
            
            for (const [symbol, address] of Object.entries(chainTokens)) {
                try {
                    const contract = new this.ethers.Contract(address, ERC20_ABI, this.provider);
                    
                    const [balance, decimals] = await Promise.all([
                        contract.balanceOf(this.address),
                        contract.decimals()
                    ]);
                    
                    if (balance.gt(0)) {
                        const formattedBalance = this.ethers.utils.formatUnits(balance, decimals);
                        const name = await contract.name().catch(() => `${symbol} Token`);
                        
                        tokens.push({
                            type: 'erc20',
                            symbol: symbol,
                            name: name,
                            balance: formattedBalance,
                            value: parseFloat(formattedBalance),
                            address: address
                        });
                    }
                } catch (error) {
                    // Skip problematic tokens
                    continue;
                }
            }
            
        } catch (error) {
            console.error('Fetch tokens error:', error);
            throw error;
        }
        
        return tokens.sort((a, b) => b.value - a.value);
    }

    getChainTokens(chainId) {
        const tokens = {
            1: { // Ethereum
                'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            },
            56: { // BSC
                'BUSD': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
                'USDT': '0x55d398326f99059fF775485246999027B3197955'
            },
            137: { // Polygon
                'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
            }
        };
        
        return tokens[chainId] || {};
    }

    getChainName(chainId) {
        const chains = {
            1: 'Ethereum',
            56: 'BNB Chain',
            137: 'Polygon',
            42161: 'Arbitrum',
            10: 'Optimism'
        };
        return chains[chainId] || `Chain ${chainId}`;
    }

    getNativeSymbol(chainId) {
        const symbols = {
            1: 'ETH',
            56: 'BNB',
            137: 'MATIC',
            42161: 'ETH',
            10: 'ETH'
        };
        return symbols[chainId] || 'ETH';
    }

    displayResults(tokens) {
        const resultsEl = document.getElementById('scanResults');
        
        if (tokens.length === 0) {
            resultsEl.innerHTML = '<p>No tokens found</p>';
            return;
        }
        
        let html = '<div>';
        tokens.forEach(token => {
            const displayBalance = parseFloat(token.balance).toFixed(6);
            html += `
                <div class="token-item">
                    <div>
                        <strong>${token.symbol}</strong> - ${token.name}
                    </div>
                    <div>${displayBalance}</div>
                </div>
            `;
        });
        html += '</div>';
        
        resultsEl.innerHTML = html;
    }

    resetScanButton() {
        const scanBtn = document.getElementById('scanBtn');
        scanBtn.disabled = false;
        scanBtn.textContent = 'Scan Tokens';
    }

    showMessage(message) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = 'status-message';
    }

    showError(message) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = 'status-error';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing scanner...');
    window.scanner = new UniversalScanner();
});
