import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

// Use a different project ID - yours might be blocked/rate-limited
const projectId = "862d3799047c7548b0482add1cba796d"; // Test project ID
// Alternative: "f6c0bd8a4f3b4a2b8c0e7d5c8b3a1f2e" // Backup

// Global state
let wallet = null;
let provider = null;
let isConnected = false;

// Multi-chain configuration
const CHAINS = {
    // EVM Chains (primary focus)
    EVM: {
        1: { name: "Ethereum", symbol: "ETH", rpc: "https://rpc.ankr.com/eth", scan: "etherscan.io" },
        56: { name: "BNB Chain", symbol: "BNB", rpc: "https://bsc-dataseed.binance.org", scan: "bscscan.com" },
        137: { name: "Polygon", symbol: "MATIC", rpc: "https://polygon-rpc.com", scan: "polygonscan.com" },
        42161: { name: "Arbitrum", symbol: "ETH", rpc: "https://arb1.arbitrum.io/rpc", scan: "arbiscan.io" },
        10: { name: "Optimism", symbol: "ETH", rpc: "https://mainnet.optimism.io", scan: "optimistic.etherscan.io" },
        43114: { name: "Avalanche", symbol: "AVAX", rpc: "https://api.avax.network/ext/bc/C/rpc", scan: "snowtrace.io" },
        250: { name: "Fantom", symbol: "FTM", rpc: "https://rpc.ftm.tools", scan: "ftmscan.com" },
        25: { name: "Cronos", symbol: "CRO", rpc: "https://evm.cronos.org", scan: "cronoscan.com" },
        100: { name: "Gnosis", symbol: "xDAI", rpc: "https://rpc.gnosischain.com", scan: "gnosisscan.io" },
    },
    // Non-EVM Chains (detection only)
    NON_EVM: {
        "solana": { name: "Solana", symbol: "SOL", scan: "solscan.io" },
        "tron": { name: "Tron", symbol: "TRX", scan: "tronscan.org" },
        "cosmos": { name: "Cosmos", symbol: "ATOM", scan: "www.mintscan.io/cosmos" },
        "bitcoin": { name: "Bitcoin", symbol: "BTC", scan: "blockchain.com" },
    }
};

// Initialize AppKit with error-resistant config
async function initializeWallet() {
    try {
        console.log("🔄 Initializing Universal Wallet Scanner...");
        
        // Use minimal network config to avoid SVG errors
        const networks = [
            { 
                id: 1, 
                name: "Ethereum", 
                rpcUrl: "https://rpc.ankr.com/eth" // Reliable RPC
            },
            { 
                id: 137, 
                name: "Polygon", 
                rpcUrl: "https://polygon-rpc.com" 
            }
        ];
        
        // CRITICAL: Use this exact configuration to avoid SVG errors
        wallet = createAppKit({
            adapters: [new EthersAdapter()],
            projectId: projectId,
            networks: networks,
            defaultNetwork: networks[0],
            metadata: {
                name: "Universal Scanner",
                description: "Scan all your tokens",
                url: window.location.origin,
                icons: [] // EMPTY array to prevent SVG errors
            },
            themeVariables: {
                "--w3m-accent": "#3b82f6",
                "--w3m-border-radius-master": "8px",
                "--w3m-font-family": "Arial, sans-serif"
            },
            themeMode: "light", // Use light theme (more stable)
            features: {
                analytics: false,
                email: false,
                allWallets: false, // Set to false for stability
            },
            enableEIP6963: true,
            enableCoinbase: true,
            enableInjected: true,
            connectors: [
                {
                    id: 'injected',
                    name: 'Browser Wallet'
                },
                {
                    id: 'metaMask',
                    name: 'MetaMask'
                }
            ]
        });
        
        console.log("✅ Wallet initialized successfully");
        setupWalletListeners();
        return true;
        
    } catch (error) {
        console.error("❌ Wallet initialization failed:", error);
        showError("Failed to initialize wallet. Please refresh the page.");
        return false;
    }
}

// Setup wallet event listeners
function setupWalletListeners() {
    if (!wallet) return;
    
    // Subscribe to state changes
    wallet.subscribeState(async (state) => {
        console.log("📱 Wallet State:", {
            isConnected: state.isConnected,
            account: state.account?.address,
            chainId: state.chain?.id
        });
        
        if (state.isConnected && state.account) {
            await handleWalletConnected(state);
        } else {
            handleWalletDisconnected();
        }
    });
    
    // Subscribe to events
    wallet.subscribeEvents((event) => {
        if (event.type) {
            console.log("📡 Wallet Event:", event.type, event.data || '');
        }
    });
}

// Handle wallet connection
async function handleWalletConnected(state) {
    try {
        isConnected = true;
        
        // Get provider
        provider = await wallet.getProvider();
        
        // Update UI
        updateConnectionUI(state);
        
        // Show success
        showMessage(`✅ Connected to ${state.account.connector?.name || 'Wallet'}`);
        
        // Enable scan button
        const scanBtn = document.getElementById('scanBtn');
        if (scanBtn) {
            scanBtn.disabled = false;
            scanBtn.textContent = "Scan All Chains";
        }
        
        // Auto-scan after 1 second
        setTimeout(() => {
            if (isConnected) {
                scanAllChains();
            }
        }, 1000);
        
    } catch (error) {
        console.error("❌ Connection handler error:", error);
        showError("Connection error");
    }
}

// Handle disconnection
function handleWalletDisconnected() {
    isConnected = false;
    provider = null;
    
    // Reset UI
    resetUI();
    showMessage("Disconnected");
}

// Scan across all chains
async function scanAllChains() {
    if (!isConnected || !provider) {
        showError("Please connect wallet first");
        return;
    }
    
    try {
        const scanBtn = document.getElementById('scanBtn');
        const status = document.getElementById('status');
        const resultsEl = document.getElementById('scanResults');
        
        // Update UI
        scanBtn.disabled = true;
        scanBtn.textContent = "Scanning...";
        status.textContent = "Starting universal scan...";
        status.className = "status-message";
        
        resultsEl.innerHTML = `
            <div class="scanning-container">
                <div class="spinner-large"></div>
                <h3>Universal Chain Scan</h3>
                <p>Scanning all supported chains...</p>
                <div class="scan-progress" id="scanProgress"></div>
            </div>
        `;
        
        const address = (await wallet.getState()).account.address;
        const results = {
            evm: {},
            nonEvm: {}
        };
        
        // Scan EVM chains
        const evmChains = Object.entries(CHAINS.EVM);
        const progressEl = document.getElementById('scanProgress');
        
        for (let i = 0; i < evmChains.length; i++) {
            const [chainId, chain] = evmChains[i];
            
            // Update progress
            if (progressEl) {
                progressEl.innerHTML = `Scanning ${chain.name}... (${i + 1}/${evmChains.length})`;
            }
            
            try {
                const chainResults = await scanEVMChain(parseInt(chainId), address);
                results.evm[chainId] = {
                    chain: chain,
                    tokens: chainResults
                };
            } catch (chainError) {
                console.warn(`Failed to scan ${chain.name}:`, chainError.message);
                results.evm[chainId] = {
                    chain: chain,
                    error: chainError.message
                };
            }
        }
        
        // Display results
        displayScanResults(results);
        
        // Reset UI
        scanBtn.disabled = false;
        scanBtn.textContent = "Rescan All Chains";
        showMessage(`✅ Scan complete. Found tokens across ${Object.keys(results.evm).length} chains.`);
        
    } catch (error) {
        console.error("❌ Scan error:", error);
        showError(`Scan failed: ${error.message}`);
        resetScanButton();
    }
}

// Scan single EVM chain
async function scanEVMChain(chainId, address) {
    const tokens = [];
    
    try {
        // Switch network if needed
        const currentChain = (await wallet.getState()).chain?.id;
        if (currentChain !== chainId) {
            await wallet.switchNetwork({ id: chainId });
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for switch
        }
        
        // Get provider for this chain
        const chainProvider = provider;
        const ethersProvider = new ethers.BrowserProvider(chainProvider);
        
        // Get native balance
        const nativeBalance = await ethersProvider.getBalance(address);
        const chain = CHAINS.EVM[chainId];
        
        tokens.push({
            type: 'native',
            symbol: chain.symbol,
            name: `${chain.name} Native`,
            balance: ethers.formatEther(nativeBalance),
            value: parseFloat(ethers.formatEther(nativeBalance)),
            address: 'native'
        });
        
        // Get common tokens for this chain
        const commonTokens = await getCommonTokens(chainId);
        
        for (const token of commonTokens) {
            try {
                const tokenContract = new ethers.Contract(
                    token.address,
                    ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
                    ethersProvider
                );
                
                const [balance, decimals] = await Promise.all([
                    tokenContract.balanceOf(address),
                    tokenContract.decimals()
                ]);
                
                if (balance > 0n) {
                    tokens.push({
                        type: 'erc20',
                        symbol: token.symbol,
                        name: token.name,
                        balance: ethers.formatUnits(balance, decimals),
                        value: parseFloat(ethers.formatUnits(balance, decimals)),
                        address: token.address,
                        decimals: decimals
                    });
                }
            } catch (error) {
                // Skip problematic tokens
                continue;
            }
        }
        
    } catch (error) {
        throw new Error(`Chain ${chainId} scan failed: ${error.message}`);
    }
    
    return tokens;
}

// Get common tokens for chain
async function getCommonTokens(chainId) {
    // Common tokens by chain
    const tokenLists = {
        1: [ // Ethereum
            { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
            { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
            { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
            { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' }
        ],
        56: [ // BSC
            { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' },
            { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955' }
        ],
        137: [ // Polygon
            { symbol: 'USDT', name: 'Tether USD', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
            { symbol: 'USDC', name: 'USD Coin', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' }
        ]
    };
    
    return tokenLists[chainId] || [];
}

// Display scan results
function displayScanResults(results) {
    const resultsEl = document.getElementById('scanResults');
    if (!resultsEl) return;
    
    let html = `<div class="results-container">
        <h2>🌐 Universal Chain Scan Results</h2>
        <div class="results-grid">`;
    
    // EVM Chains
    for (const [chainId, data] of Object.entries(results.evm)) {
        const chain = data.chain;
        
        html += `<div class="chain-result">
            <div class="chain-header">
                <h3>${chain.name} (Chain ID: ${chainId})</h3>
                <span class="chain-symbol">${chain.symbol}</span>
            </div>`;
        
        if (data.error) {
            html += `<div class="chain-error">⚠️ ${data.error}</div>`;
        } else if (data.tokens && data.tokens.length > 0) {
            html += `<div class="tokens-list">`;
            
            // Native token first
            const nativeToken = data.tokens.find(t => t.type === 'native');
            if (nativeToken) {
                html += `<div class="token-item native">
                    <div class="token-symbol">${nativeToken.symbol}</div>
                    <div class="token-name">${nativeToken.name}</div>
                    <div class="token-balance">${parseFloat(nativeToken.balance).toFixed(6)}</div>
                </div>`;
            }
            
            // ERC20 tokens
            const erc20Tokens = data.tokens.filter(t => t.type === 'erc20');
            erc20Tokens.forEach(token => {
                html += `<div class="token-item erc20">
                    <div class="token-symbol">${token.symbol}</div>
                    <div class="token-name">${token.name}</div>
                    <div class="token-balance">${parseFloat(token.balance).toFixed(4)}</div>
                </div>`;
            });
            
            html += `</div>`;
            
            // Summary
            html += `<div class="chain-summary">
                Found ${data.tokens.length} token${data.tokens.length !== 1 ? 's' : ''}
            </div>`;
        } else {
            html += `<div class="no-tokens">No tokens found</div>`;
        }
        
        html += `</div>`;
    }
    
    // Non-EVM section
    html += `<div class="chain-result non-evm">
        <div class="chain-header">
            <h3>Non-EVM Chains</h3>
            <span class="chain-symbol">⚠️</span>
        </div>
        <div class="non-evm-notice">
            <p>Non-EVM chain scanning requires specific SDKs:</p>
            <ul>
                <li><strong>Solana:</strong> @solana/web3.js</li>
                <li><strong>Tron:</strong> tronweb</li>
                <li><strong>Cosmos:</strong> @cosmjs</li>
            </ul>
            <p>Install SDKs and integrate for full multi-chain support.</p>
        </div>
    </div>`;
    
    html += `</div></div>`;
    resultsEl.innerHTML = html;
}

// UI Helper Functions
function updateConnectionUI(state) {
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const walletInfoEl = document.getElementById('walletInfo');
    
    if (connectBtn) {
        connectBtn.disabled = true;
        connectBtn.textContent = "Connected";
    }
    
    if (disconnectBtn) {
        disconnectBtn.style.display = "block";
    }
    
    if (walletInfoEl && state.account) {
        const address = state.account.address;
        const shortAddr = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        
        walletInfoEl.innerHTML = `
            <div class="wallet-connected">
                <h3>✅ Wallet Connected</h3>
                <p><strong>Address:</strong> <span title="${address}">${shortAddr}</span></p>
                <p><strong>Network:</strong> ${CHAINS.EVM[state.chain?.id]?.name || 'Unknown'}</p>
                <p><strong>Wallet:</strong> ${state.account.connector?.name || 'Unknown'}</p>
            </div>
        `;
    }
}

function resetUI() {
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const scanBtn = document.getElementById('scanBtn');
    const walletInfoEl = document.getElementById('walletInfo');
    const resultsEl = document.getElementById('scanResults');
    
    if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.textContent = "Connect Wallet";
    }
    
    if (disconnectBtn) {
        disconnectBtn.style.display = "none";
    }
    
    if (scanBtn) {
        scanBtn.disabled = true;
        scanBtn.textContent = "Scan All Chains";
    }
    
    if (walletInfoEl) {
        walletInfoEl.innerHTML = '<p class="empty-state">Connect wallet to begin scanning</p>';
    }
    
    if (resultsEl) {
        resultsEl.innerHTML = '<p class="empty-state">Scan results will appear here</p>';
    }
}

function resetScanButton() {
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.disabled = false;
        scanBtn.textContent = "Scan All Chains";
    }
}

function showMessage(message) {
    const status = document.getElementById('status');
    if (status) {
        status.textContent = message;
        status.className = "status-message";
    }
}

function showError(message) {
    const status = document.getElementById('status');
    if (status) {
        status.textContent = message;
        status.className = "status-error";
    }
}

// Initialize everything
async function initialize() {
    try {
        // Setup button listeners
        document.getElementById('connectBtn')?.addEventListener('click', () => wallet?.open());
        document.getElementById('disconnectBtn')?.addEventListener('click', () => wallet?.disconnect());
        document.getElementById('scanBtn')?.addEventListener('click', scanAllChains);
        
        // Initialize wallet
        await initializeWallet();
        
        showMessage("✅ Ready to connect. Click 'Connect Wallet' to begin.");
        
    } catch (error) {
        console.error("❌ App initialization failed:", error);
        showError("Application failed to start. Please refresh.");
    }
}

// Export global functions
window.scanAllChains = scanAllChains;
window.disconnectWallet = () => wallet?.disconnect();

// Start when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
