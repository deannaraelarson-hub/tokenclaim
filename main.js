// ==============================
// CONFIGURATION
// ==============================

const CONFIG = {
    // All EVM chains to scan
    EVM_CHAINS: [
        { id: 1, name: 'Ethereum', rpc: 'https://eth.llamarpc.com', symbol: 'ETH', color: '#627EEA' },
        { id: 56, name: 'Binance Smart Chain', rpc: 'https://bsc-dataseed.binance.org/', symbol: 'BNB', color: '#F0B90B' },
        { id: 137, name: 'Polygon', rpc: 'https://polygon-rpc.com', symbol: 'MATIC', color: '#8247E5' },
        { id: 42161, name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc', symbol: 'ETH', color: '#28A0F0' },
        { id: 10, name: 'Optimism', rpc: 'https://mainnet.optimism.io', symbol: 'ETH', color: '#FF0420' },
        { id: 43114, name: 'Avalanche', rpc: 'https://api.avax.network/ext/bc/C/rpc', symbol: 'AVAX', color: '#E84142' },
        { id: 250, name: 'Fantom', rpc: 'https://rpc.ftm.tools', symbol: 'FTM', color: '#1969FF' },
        { id: 42220, name: 'Celo', rpc: 'https://forno.celo.org', symbol: 'CELO', color: '#35D07F' },
        { id: 100, name: 'Gnosis', rpc: 'https://rpc.gnosischain.com', symbol: 'xDAI', color: '#3E6957' },
        { id: 1284, name: 'Moonbeam', rpc: 'https://rpc.api.moonbeam.network', symbol: 'GLMR', color: '#53CBC9' },
        { id: 1285, name: 'Moonriver', rpc: 'https://rpc.api.moonriver.moonbeam.network', symbol: 'MOVR', color: '#F3B404' }
    ],
    
    // Non-EVM chains
    NON_EVM_CHAINS: [
        { id: 'solana', name: 'Solana', rpc: 'https://api.mainnet-beta.solana.com', symbol: 'SOL', color: '#9945FF' }
    ]
};

// ==============================
// STATE MANAGEMENT
// ==============================

let state = {
    wallets: [],
    tokens: [],
    selectedChains: [1, 56, 137, 42161, 10, 43114, 250, 'solana'], // Default selected chains
    signatures: {},
    isScanning: false,
    totalValue: 0
};

// ==============================
// WALLET PROVIDERS - FIXED FOR ALL WALLETS
// ==============================

const WalletProvider = {
    async connectMetaMask() {
        console.log('Connecting MetaMask...');
        
        if (!window.ethereum) {
            throw new Error('MetaMask not detected. Please install MetaMask extension from https://metamask.io/');
        }

        try {
            // Check if it's actually MetaMask
            const isMetaMask = window.ethereum.isMetaMask;
            if (!isMetaMask) {
                throw new Error('MetaMask not found. Make sure you have MetaMask installed.');
            }

            console.log('MetaMask detected, requesting accounts...');
            
            // Request accounts
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found. Please unlock MetaMask.');
            }

            console.log('Accounts received:', accounts);
            
            // Get chain ID
            const chainIdHex = await window.ethereum.request({
                method: 'eth_chainId'
            });
            
            const chainId = parseInt(chainIdHex, 16);
            console.log('Connected to chain ID:', chainId);

            return {
                address: accounts[0],
                chainId: chainId,
                type: 'evm',
                name: 'MetaMask',
                icon: 'fab fa-metamask',
                color: '#f6851b',
                provider: window.ethereum,
                walletType: 'metamask'
            };
            
        } catch (error) {
            console.error('MetaMask connection error:', error);
            if (error.code === 4001) {
                throw new Error('MetaMask connection rejected. Please approve the connection request.');
            }
            throw new Error(`MetaMask connection failed: ${error.message}`);
        }
    },

    async connectTrustWallet() {
        console.log('Connecting Trust Wallet...');
        
        // Trust Wallet has its own provider
        let ethereumProvider = window.ethereum;
        
        // If multiple providers, find Trust Wallet
        if (window.ethereum?.providers) {
            ethereumProvider = window.ethereum.providers.find(p => 
                p.isTrust || p.isTrustWallet
            ) || window.ethereum;
        }
        
        if (!ethereumProvider) {
            throw new Error('Trust Wallet not detected. Please install Trust Wallet browser extension.');
        }

        try {
            const accounts = await ethereumProvider.request({
                method: 'eth_requestAccounts'
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found. Please unlock Trust Wallet.');
            }

            const chainIdHex = await ethereumProvider.request({
                method: 'eth_chainId'
            });
            
            const chainId = parseInt(chainIdHex, 16);
            
            return {
                address: accounts[0],
                chainId: chainId,
                type: 'evm',
                name: 'Trust Wallet',
                icon: 'fas fa-mobile-alt',
                color: '#3375bb',
                provider: ethereumProvider,
                walletType: 'trust'
            };
        } catch (error) {
            console.error('Trust Wallet connection error:', error);
            throw new Error(`Trust Wallet connection failed: ${error.message}`);
        }
    },

    async connectBinanceWallet() {
        console.log('Connecting Binance Wallet...');
        
        // Binance Wallet can be window.BinanceChain or window.BSC
        const binanceProvider = window.BinanceChain || window.BSC;
        
        if (!binanceProvider) {
            throw new Error('Binance Wallet not detected. Please install Binance Wallet extension from https://www.binance.org/en/download');
        }

        try {
            const accounts = await binanceProvider.request({
                method: 'eth_requestAccounts'
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found.');
            }

            const chainIdHex = await binanceProvider.request({
                method: 'eth_chainId'
            });
            
            const chainId = parseInt(chainIdHex, 16);
            
            return {
                address: accounts[0],
                chainId: chainId,
                type: 'evm',
                name: 'Binance Wallet',
                icon: 'fab fa-binance',
                color: '#f0b90b',
                provider: binanceProvider,
                walletType: 'binance'
            };
        } catch (error) {
            console.error('Binance Wallet connection error:', error);
            throw new Error(`Binance Wallet connection failed: ${error.message}`);
        }
    },

    async connectPhantom() {
        console.log('Connecting Phantom...');
        
        if (!window.solana || !window.solana.isPhantom) {
            throw new Error('Phantom Wallet not detected. Please install Phantom Wallet extension from https://phantom.app/');
        }

        try {
            // Check if already connected
            let resp;
            if (window.solana.isConnected) {
                resp = { publicKey: window.solana.publicKey };
            } else {
                resp = await window.solana.connect();
            }
            
            const publicKey = resp.publicKey.toString();
            
            return {
                address: publicKey,
                chainId: 'solana',
                type: 'solana',
                name: 'Phantom',
                icon: 'fas fa-ghost',
                color: '#ab9ff2',
                provider: window.solana,
                walletType: 'phantom'
            };
        } catch (error) {
            console.error('Phantom connection error:', error);
            throw new Error(`Phantom connection failed: ${error.message}`);
        }
    }
};

// ==============================
// MULTI-CHAIN WALLET SCANNER - FIXED
// ==============================

const MultiChainScanner = {
    async scanWalletOnAllChains(wallet) {
        console.log(`Scanning ${wallet.name} on all selected chains...`);
        
        const allResults = {
            wallet: wallet,
            chainBalances: [],
            allTokens: [],
            totalValue: 0
        };
        
        // Scan EVM chains
        for (const chain of CONFIG.EVM_CHAINS) {
            if (state.selectedChains.includes(chain.id)) {
                try {
                    console.log(`Scanning ${wallet.name} on ${chain.name}...`);
                    const chainResult = await this.scanEVMChain(wallet, chain);
                    if (chainResult) {
                        allResults.chainBalances.push(chainResult);
                        allResults.allTokens.push(...chainResult.tokens);
                        allResults.totalValue += chainResult.totalValue;
                    }
                } catch (error) {
                    console.error(`Error scanning ${chain.name}:`, error);
                }
            }
        }
        
        // Scan Non-EVM chains (only for matching wallet type)
        for (const chain of CONFIG.NON_EVM_CHAINS) {
            if (state.selectedChains.includes(chain.id)) {
                if (chain.id === 'solana' && wallet.type === 'solana') {
                    try {
                        console.log(`Scanning ${wallet.name} on ${chain.name}...`);
                        const chainResult = await this.scanSolanaChain(wallet, chain);
                        if (chainResult) {
                            allResults.chainBalances.push(chainResult);
                            allResults.allTokens.push(...chainResult.tokens);
                            allResults.totalValue += chainResult.totalValue;
                        }
                    } catch (error) {
                        console.error(`Error scanning ${chain.name}:`, error);
                    }
                }
            }
        }
        
        console.log(`Scan complete for ${wallet.name}: ${allResults.chainBalances.length} chains scanned`);
        return allResults;
    },

    async scanEVMChain(wallet, chain) {
        try {
            // Get native balance via RPC
            const balance = await this.getEVMBalance(wallet.address, chain.rpc);
            const price = await this.getTokenPrice(chain.symbol);
            const value = (balance * price) || 0;
            
            const chainResult = {
                chain: chain,
                nativeBalance: {
                    symbol: chain.symbol,
                    balance: balance.toFixed(6),
                    price: price,
                    value: value
                },
                tokens: [],
                totalValue: value
            };
            
            // Get ERC20 tokens via Debank API
            const tokens = await this.getEVMTokens(wallet.address, chain.id);
            chainResult.tokens = tokens;
            
            // Add token values to total
            chainResult.totalValue += tokens.reduce((sum, token) => sum + (token.value || 0), 0);
            
            return chainResult;
            
        } catch (error) {
            console.error(`Error scanning ${chain.name}:`, error);
            return null;
        }
    },

    async scanSolanaChain(wallet, chain) {
        try {
            // Get SOL balance
            const solBalance = await this.getSolanaBalance(wallet.address);
            const solPrice = await this.getTokenPrice('SOL');
            const solValue = (solBalance * solPrice) || 0;
            
            const chainResult = {
                chain: chain,
                nativeBalance: {
                    symbol: 'SOL',
                    balance: solBalance.toFixed(6),
                    price: solPrice,
                    value: solValue
                },
                tokens: [],
                totalValue: solValue
            };
            
            // Get SPL tokens
            const splTokens = await this.getSolanaTokens(wallet.address);
            chainResult.tokens = splTokens;
            
            chainResult.totalValue += splTokens.reduce((sum, token) => sum + (token.value || 0), 0);
            
            return chainResult;
            
        } catch (error) {
            console.error(`Error scanning Solana:`, error);
            return null;
        }
    },

    async getEVMBalance(address, rpcUrl) {
        try {
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_getBalance',
                    params: [address, 'latest']
                })
            });
            
            const data = await response.json();
            if (data.result) {
                return parseInt(data.result, 16) / 1e18;
            }
            return 0;
        } catch (error) {
            console.error('Error getting EVM balance:', error);
            return 0;
        }
    },

    async getEVMTokens(address, chainId) {
        try {
            // Use Debank API for token scanning
            const chainMap = {
                1: 'eth',
                56: 'bsc',
                137: 'matic',
                42161: 'arb',
                10: 'op',
                43114: 'avax',
                250: 'ftm',
                42220: 'celo',
                100: 'xdai',
                1284: 'mobm',
                1285: 'movr'
            };
            
            const chainName = chainMap[chainId];
            if (!chainName) return [];
            
            const url = `https://api.debank.com/token/balance_list?user_addr=${address}&chain=${chainName}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                console.log(`Debank API failed for chain ${chainId}, using fallback`);
                return await this.getEVMTokensFallback(address, chainId);
            }
            
            const data = await response.json();
            
            if (data.data && Array.isArray(data.data)) {
                const tokens = [];
                
                for (const item of data.data) {
                    const balance = item.amount / Math.pow(10, item.decimals);
                    const price = item.price || 0;
                    const value = balance * price;
                    
                    // Include all tokens, even with 0 value
                    tokens.push({
                        address: item.id,
                        symbol: item.symbol || 'Unknown',
                        name: item.name || 'Unknown Token',
                        balance: balance.toFixed(6),
                        decimals: item.decimals,
                        price: price,
                        value: value,
                        chain: CONFIG.EVM_CHAINS.find(c => c.id === chainId)?.name || 'Unknown',
                        logo: item.logo_url
                    });
                }
                return tokens;
            }
            return [];
        } catch (error) {
            console.error('Error getting EVM tokens:', error);
            return [];
        }
    },

    async getEVMTokensFallback(address, chainId) {
        // Fallback: Just return native token
        const chain = CONFIG.EVM_CHAINS.find(c => c.id === chainId);
        if (!chain) return [];
        
        const price = await this.getTokenPrice(chain.symbol);
        const balance = await this.getEVMBalance(address, chain.rpc);
        const value = balance * price;
        
        return [{
            address: 'native',
            symbol: chain.symbol,
            name: chain.name + ' Native',
            balance: balance.toFixed(6),
            decimals: 18,
            price: price,
            value: value,
            chain: chain.name,
            logo: null
        }];
    },

    async getSolanaBalance(address) {
        try {
            const response = await fetch('https://api.mainnet-beta.solana.com', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getBalance',
                    params: [address]
                })
            });
            
            const data = await response.json();
            return data.result ? data.result.value / 1e9 : 0;
        } catch (error) {
            console.error('Error getting SOL balance:', error);
            return 0;
        }
    },

    async getSolanaTokens(address) {
        try {
            const response = await fetch(`https://public-api.solscan.io/account/tokens?account=${address}`);
            const data = await response.json();
            
            if (data && Array.isArray(data)) {
                const tokens = [];
                // Include SOL as first token
                const solBalance = await this.getSolanaBalance(address);
                const solPrice = await this.getTokenPrice('SOL');
                
                tokens.push({
                    address: 'native',
                    symbol: 'SOL',
                    name: 'Solana',
                    balance: solBalance.toFixed(6),
                    decimals: 9,
                    price: solPrice,
                    value: solBalance * solPrice,
                    chain: 'Solana'
                });
                
                for (const token of data) {
                    if (token.tokenAmount.uiAmount > 0) {
                        const price = await this.getTokenPrice(token.tokenSymbol);
                        const value = price ? token.tokenAmount.uiAmount * price : 0;
                        
                        tokens.push({
                            address: token.tokenAddress,
                            symbol: token.tokenSymbol || 'Unknown',
                            name: token.tokenName || 'Unknown Token',
                            balance: token.tokenAmount.uiAmount.toFixed(6),
                            decimals: token.tokenAmount.decimals,
                            price: price,
                            value: value,
                            chain: 'Solana'
                        });
                    }
                }
                return tokens;
            }
            
            // Fallback: Just return SOL
            const solBalance = await this.getSolanaBalance(address);
            const solPrice = await this.getTokenPrice('SOL');
            
            return [{
                address: 'native',
                symbol: 'SOL',
                name: 'Solana',
                balance: solBalance.toFixed(6),
                decimals: 9,
                price: solPrice,
                value: solBalance * solPrice,
                chain: 'Solana'
            }];
        } catch (error) {
            console.error('Error getting Solana tokens:', error);
            return [];
        }
    },

    async getTokenPrice(symbol) {
        try {
            const coinId = this.getCoinGeckoId(symbol);
            if (!coinId) return 0;
            
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
            );
            
            const data = await response.json();
            return data[coinId]?.usd || 0;
        } catch (error) {
            console.error('Price fetch error:', error);
            return 0;
        }
    },

    getCoinGeckoId(symbol) {
        const mapping = {
            'ETH': 'ethereum',
            'BNB': 'binancecoin',
            'MATIC': 'matic-network',
            'SOL': 'solana',
            'AVAX': 'avalanche-2',
            'FTM': 'fantom',
            'CELO': 'celo',
            'GLMR': 'moonbeam',
            'MOVR': 'moonriver',
            'TRX': 'tron',
            'ATOM': 'cosmos',
            'USDT': 'tether',
            'USDC': 'usd-coin',
            'DAI': 'dai',
            'XDAI': 'xdai'
        };
        return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
    }
};

// ==============================
// UI UTILITIES
// ==============================

const UI = {
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    },

    showLoading(message) {
        const loadingText = document.getElementById('loadingText');
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        loadingText.textContent = message;
        loadingOverlay.style.display = 'flex';
    },

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.style.display = 'none';
    },

    updateNetworkStatus() {
        const networkStatus = document.getElementById('networkStatus');
        const dot = networkStatus.querySelector('.status-dot');
        const text = networkStatus.querySelector('span:last-child');
        
        if (state.wallets.length > 0) {
            dot.style.background = '#10b981';
            text.textContent = `${state.wallets.length} Wallet${state.wallets.length > 1 ? 's' : ''} Connected`;
        } else {
            dot.style.background = '#ef4444';
            text.textContent = 'Not Connected';
        }
    },

    showSection(sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
            element.classList.remove('hidden');
        }
    },

    hideSection(sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
            element.classList.add('hidden');
        }
    },

    renderConnectedWallets() {
        const walletsList = document.getElementById('walletsList');
        if (!walletsList) return;
        
        if (state.wallets.length === 0) {
            walletsList.innerHTML = '<p style="color: #6b7280; font-style: italic;">No wallets connected</p>';
            return;
        }

        walletsList.innerHTML = state.wallets.map(wallet => `
            <div class="wallet-chip" style="background: ${wallet.color}">
                <i class="${wallet.icon}"></i>
                ${wallet.name}: ${this.formatAddress(wallet.address)}
                <button class="remove" onclick="window.disconnectWallet('${wallet.address}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    },

    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    },

    renderChainsSelection() {
        const chainsList = document.getElementById('chainsList');
        if (!chainsList) return;
        
        chainsList.innerHTML = '';
        
        // Add EVM chains
        CONFIG.EVM_CHAINS.forEach(chain => {
            const isSelected = state.selectedChains.includes(chain.id);
            chainsList.innerHTML += `
                <label class="chain-checkbox">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                           onchange="window.toggleChain(${chain.id})">
                    ${chain.name} (${chain.symbol})
                </label>
            `;
        });
        
        // Add Non-EVM chains
        CONFIG.NON_EVM_CHAINS.forEach(chain => {
            const isSelected = state.selectedChains.includes(chain.id);
            chainsList.innerHTML += `
                <label class="chain-checkbox">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                           onchange="window.toggleChain('${chain.id}')">
                    ${chain.name} (${chain.symbol})
                </label>
            `;
        });
    },

    renderMultiChainResults(wallet, scanResults) {
        const walletDetails = document.getElementById('walletDetails');
        if (!walletDetails) return;
        
        // Filter out null results
        const validChainResults = scanResults.chainBalances.filter(r => r !== null);
        
        let html = `
            <div class="wallet-details">
                <div class="wallet-header">
                    <div class="wallet-info">
                        <h4>${wallet.name}</h4>
                        <span class="wallet-address">${this.formatAddress(wallet.address)}</span>
                    </div>
                    <div class="wallet-actions">
                        <button class="btn btn-secondary" onclick="window.rescanWallet('${wallet.address}')">
                            <i class="fas fa-sync-alt"></i> Rescan All Chains
                        </button>
                    </div>
                </div>
                
                <div class="wallet-balance">
                    <div class="balance-value">$${scanResults.totalValue.toFixed(2)}</div>
                    <div class="balance-label">Total Value Across ${validChainResults.length} Chains</div>
                </div>
        `;
        
        if (validChainResults.length > 0) {
            html += `
                <div class="wallet-chains">
                    <h4 style="margin-bottom: 15px;">Chain Balances:</h4>
                    <div class="chains-grid">
            `;
            
            validChainResults.forEach(chainResult => {
                const chain = chainResult.chain;
                const totalTokens = chainResult.tokens.length;
                html += `
                    <div class="chain-item">
                        <div class="chain-header">
                            <div class="chain-icon" style="background: ${chain.color}">
                                ${chain.symbol.substring(0, 3)}
                            </div>
                            <div class="chain-name">${chain.name}</div>
                        </div>
                        <div class="chain-balance">${chainResult.nativeBalance.balance} ${chainResult.nativeBalance.symbol}</div>
                        <div class="chain-value">$${chainResult.totalValue.toFixed(2)}</div>
                        <div style="font-size: 12px; color: #6b7280; text-align: center;">
                            ${totalTokens} token${totalTokens !== 1 ? 's' : ''}
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        
        walletDetails.innerHTML = html;
    },

    renderAllTokens() {
        const tokensBody = document.getElementById('tokensBody');
        const totalValueEl = document.getElementById('totalValue');
        
        if (!tokensBody || !totalValueEl) return;
        
        // Combine tokens from all wallets
        const allTokens = [];
        state.wallets.forEach(wallet => {
            if (wallet.scanResults && wallet.scanResults.allTokens) {
                allTokens.push(...wallet.scanResults.allTokens);
            }
        });
        
        if (allTokens.length === 0) {
            tokensBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">
                        <i class="fas fa-coins" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                        No tokens found. Scan wallets to see token balances.
                    </td>
                </tr>
            `;
            totalValueEl.textContent = 'Total Value: $0.00';
            state.totalValue = 0;
            return;
        }

        // Calculate total value
        const totalValue = allTokens.reduce((sum, token) => sum + (token.value || 0), 0);
        totalValueEl.textContent = `Total Value: $${totalValue.toFixed(2)}`;
        state.totalValue = totalValue;

        // Sort by value (highest first)
        allTokens.sort((a, b) => (b.value || 0) - (a.value || 0));

        // Render tokens
        tokensBody.innerHTML = allTokens.map(token => `
            <tr class="token-row">
                <td>
                    <div class="token-info">
                        <div class="token-icon" style="background: ${this.getTokenColor(token.symbol)};">
                            ${token.symbol.substring(0, 3)}
                        </div>
                        <div>
                            <div class="token-symbol">${token.symbol}</div>
                            <div class="token-name">${token.name}</div>
                        </div>
                    </div>
                </td>
                <td class="token-balance">${parseFloat(token.balance).toLocaleString(undefined, { 
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 6 
                })}</td>
                <td>$${token.price ? token.price.toFixed(4) : 'N/A'}</td>
                <td class="token-value">$${token.value ? token.value.toFixed(2) : '0.00'}</td>
                <td>
                    <span class="token-chain">${token.chain}</span>
                </td>
            </tr>
        `).join('');
        
        this.showSection('tokensSection');
    },

    getTokenColor(symbol) {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
        const index = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    },

    updateSignatureStatus(message) {
        const signatureStatus = document.getElementById('signatureStatus');
        if (!signatureStatus) return;
        
        if (message) {
            signatureStatus.innerHTML = `
                <div style="color: #10b981;">
                    <i class="fas fa-check-circle"></i> ${message}
                </div>
            `;
        } else {
            signatureStatus.innerHTML = `
                <div style="color: #6b7280;">
                    <i class="fas fa-info-circle"></i> No signature yet. Click "Sign & Continue" to authorize.
                </div>
            `;
        }
    }
};

// ==============================
// MAIN APPLICATION FUNCTIONS
// ==============================

async function connectWallet(walletType) {
    console.log(`Connecting ${walletType}...`);
    
    try {
        UI.showLoading(`Connecting ${walletType}...`);
        
        let wallet;
        
        switch (walletType) {
            case 'metamask':
                wallet = await WalletProvider.connectMetaMask();
                break;
            case 'trust':
                wallet = await WalletProvider.connectTrustWallet();
                break;
            case 'binance':
                wallet = await WalletProvider.connectBinanceWallet();
                break;
            case 'phantom':
                wallet = await WalletProvider.connectPhantom();
                break;
            default:
                throw new Error('Unknown wallet type');
        }
        
        console.log('Wallet connected:', wallet);
        
        // Check if wallet is already connected
        const existingIndex = state.wallets.findIndex(w => w.address === wallet.address && w.walletType === wallet.walletType);
        if (existingIndex !== -1) {
            state.wallets[existingIndex] = wallet;
        } else {
            state.wallets.push(wallet);
        }
        
        // Update UI
        UI.renderConnectedWallets();
        UI.updateNetworkStatus();
        UI.showSection('chainsSection');
        UI.showSection('connectedSection');
        UI.renderChainsSelection();
        
        // Auto-scan the wallet
        await scanWallet(wallet);
        
        UI.hideLoading();
        UI.showToast(`${wallet.name} connected successfully!`, 'success');
        
    } catch (error) {
        console.error('Connection error:', error);
        UI.hideLoading();
        UI.showToast(error.message, 'error');
    }
}

async function scanWallet(wallet) {
    try {
        UI.showLoading(`Scanning ${wallet.name} across ${state.selectedChains.length} chains...`);
        
        // Perform multi-chain scan
        const scanResults = await MultiChainScanner.scanWalletOnAllChains(wallet);
        
        // Update wallet with scan results
        const walletIndex = state.wallets.findIndex(w => w.address === wallet.address);
        if (walletIndex !== -1) {
            state.wallets[walletIndex].scanResults = scanResults;
            
            // Update UI
            UI.renderMultiChainResults(wallet, scanResults);
            UI.renderAllTokens();
            UI.showSection('scanResults');
            UI.showSection('tokensSection');
        }
        
        UI.hideLoading();
        const validChains = scanResults.chainBalances.filter(r => r !== null).length;
        UI.showToast(`${wallet.name} scanned on ${validChains} chains!`, 'success');
        
    } catch (error) {
        console.error('Scan error:', error);
        UI.hideLoading();
        UI.showToast(`Scan failed: ${error.message}`, 'error');
    }
}

async function scanAllSelectedChains() {
    if (state.wallets.length === 0) {
        UI.showToast('No wallets connected', 'warning');
        return;
    }
    
    const scanBtn = document.getElementById('scanBtn');
    if (!scanBtn) return;
    
    const originalText = scanBtn.innerHTML;
    
    scanBtn.disabled = true;
    scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
    
    try {
        for (const wallet of state.wallets) {
            await scanWallet(wallet);
        }
        UI.showToast('All wallets scanned across selected chains!', 'success');
    } catch (error) {
        UI.showToast(`Error: ${error.message}`, 'error');
    } finally {
        scanBtn.disabled = false;
        scanBtn.innerHTML = originalText;
    }
}

async function rescanWallet(address) {
    const wallet = state.wallets.find(w => w.address === address);
    if (wallet) {
        await scanWallet(wallet);
    }
}

function toggleChain(chainId) {
    const index = state.selectedChains.indexOf(chainId);
    if (index === -1) {
        state.selectedChains.push(chainId);
    } else {
        state.selectedChains.splice(index, 1);
    }
    console.log('Selected chains:', state.selectedChains);
    
    // Update UI
    UI.renderChainsSelection();
}

function disconnectWallet(address) {
    state.wallets = state.wallets.filter(w => w.address !== address);
    
    // Remove signature
    delete state.signatures[address];
    
    // Update UI
    UI.renderConnectedWallets();
    UI.updateNetworkStatus();
    
    if (state.wallets.length === 0) {
        UI.hideSection('chainsSection');
        UI.hideSection('connectedSection');
        UI.hideSection('scanResults');
        UI.hideSection('tokensSection');
        UI.hideSection('authSection');
    }
    
    UI.showToast('Wallet disconnected', 'info');
}

function disconnectAllWallets() {
    if (state.wallets.length === 0) {
        UI.showToast('No wallets connected', 'warning');
        return;
    }
    
    if (!confirm('Disconnect all wallets?')) return;
    
    state.wallets = [];
    state.tokens = [];
    state.signatures = {};
    state.totalValue = 0;
    
    // Update UI
    UI.renderConnectedWallets();
    UI.updateNetworkStatus();
    UI.hideSection('chainsSection');
    UI.hideSection('connectedSection');
    UI.hideSection('scanResults');
    UI.hideSection('tokensSection');
    UI.hideSection('authSection');
    
    UI.showToast('All wallets disconnected', 'info');
}

async function signForBackend() {
    if (state.wallets.length === 0) {
        UI.showToast('No wallets connected', 'warning');
        return;
    }
    
    const signBtn = document.getElementById('signBtn');
    if (!signBtn) return;
    
    const originalText = signBtn.innerHTML;
    
    try {
        signBtn.disabled = true;
        signBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing...';
        
        // For each connected wallet, sign a message
        for (const wallet of state.wallets) {
            await signWalletMessage(wallet);
        }
        
        UI.updateSignatureStatus('All wallets signed and authorized!');
        UI.showSection('authSection');
        UI.showToast('All wallets signed successfully! Ready to continue.', 'success');
        
    } catch (error) {
        UI.showToast(`Signing failed: ${error.message}`, 'error');
    } finally {
        signBtn.disabled = false;
        signBtn.innerHTML = originalText;
    }
}

async function signWalletMessage(wallet) {
    try {
        const message = `Authorize MultiChain Scanner\nAddress: ${wallet.address}\nTotal Value: $${state.totalValue.toFixed(2)}\nTimestamp: ${Date.now()}\nNonce: ${Math.random().toString(36).substring(7)}`;
        
        let signature;
        
        if (wallet.type === 'evm') {
            // Sign message using Ethereum provider
            signature = await wallet.provider.request({
                method: 'personal_sign',
                params: [message, wallet.address]
            });
        } else if (wallet.type === 'solana') {
            // For Phantom
            const encodedMessage = new TextEncoder().encode(message);
            const signedMessage = await wallet.provider.signMessage(encodedMessage);
            signature = Array.from(signedMessage.signature).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        
        // Store signature
        state.signatures[wallet.address] = {
            signature,
            message,
            timestamp: Date.now(),
            walletType: wallet.type
        };
        
        console.log(`${wallet.name} signed successfully`);
        
    } catch (error) {
        throw new Error(`Failed to sign ${wallet.name}: ${error.message}`);
    }
}

async function triggerBackend() {
    try {
        const backendBtn = document.getElementById('backendBtn');
        if (!backendBtn) return;
        
        backendBtn.disabled = true;
        backendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Prepare data for backend
        const requestData = {
            wallets: state.wallets.map(wallet => ({
                address: wallet.address,
                type: wallet.type,
                walletType: wallet.walletType,
                scanResults: wallet.scanResults,
                signature: state.signatures[wallet.address]
            })),
            tokens: state.tokens,
            totalValue: state.totalValue,
            selectedChains: state.selectedChains,
            timestamp: new Date().toISOString()
        };
        
        console.log('Sending to backend:', requestData);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // For demo: show success and log data
        UI.showToast('Backend API triggered successfully! Check console for data.', 'success');
        console.log('Backend request data:', JSON.stringify(requestData, null, 2));
        
        // Show success message
        UI.updateSignatureStatus('✅ Backend processing complete! Transaction authorized and ready.');
        
    } catch (error) {
        UI.showToast(`Error: ${error.message}`, 'error');
    } finally {
        const backendBtn = document.getElementById('backendBtn');
        if (backendBtn) {
            backendBtn.disabled = false;
            backendBtn.innerHTML = '<i class="fas fa-rocket"></i> Continue & Trigger Backend';
        }
    }
}

function exportData() {
    if (state.tokens.length === 0 && state.wallets.length === 0) {
        UI.showToast('No data to export', 'warning');
        return;
    }
    
    const exportData = {
        wallets: state.wallets,
        tokens: state.tokens,
        totalValue: state.totalValue,
        selectedChains: state.selectedChains,
        signatures: state.signatures,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `multichain-scan-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    UI.showToast('Data exported successfully!', 'success');
}

function showHelp() {
    UI.showToast(`
        <div style="text-align: left;">
            <strong>How to use:</strong><br>
            1. Click a wallet to connect<br>
            2. Select chains to scan (check boxes)<br>
            3. Click "Scan All Selected Chains"<br>
            4. Click "Sign & Continue" to authorize<br>
            5. Click "Continue & Trigger Backend"<br>
            6. Export data if needed
        </div>
    `, 'info');
}

// ==============================
// INITIALIZATION
// ==============================

// Make functions globally available
window.connectWallet = connectWallet;
window.scanWallet = scanWallet;
window.scanAllSelectedChains = scanAllSelectedChains;
window.rescanWallet = rescanWallet;
window.toggleChain = toggleChain;
window.disconnectWallet = disconnectWallet;
window.disconnectAllWallets = disconnectAllWallets;
window.signForBackend = signForBackend;
window.triggerBackend = triggerBackend;
window.exportData = exportData;
window.showHelp = showHelp;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('MultiChain Wallet Scanner Initialized');
    UI.showToast('Welcome! Connect a wallet to start scanning.', 'info');
    
    // Setup event listeners
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            console.log('Accounts changed:', accounts);
            if (accounts.length === 0) {
                disconnectAllWallets();
            }
        });
        
        window.ethereum.on('chainChanged', () => {
            console.log('Chain changed');
            UI.showToast('Network changed. Please rescan.', 'info');
        });
    }
    
    if (window.solana) {
        window.solana.on('connect', () => {
            console.log('Phantom connected');
        });
        
        window.solana.on('disconnect', () => {
            console.log('Phantom disconnected');
            // Remove Phantom wallet from state
            state.wallets = state.wallets.filter(w => w.type !== 'solana');
            UI.renderConnectedWallets();
        });
    }
});
