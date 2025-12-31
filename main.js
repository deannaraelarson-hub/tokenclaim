// ==============================
// ULTIMATE MULTI-CHAIN WALLET SCANNER
// ==============================

const CONFIG = {
    // ALL EVM Chains (50+ chains)
    EVM_CHAINS: [
        // Main Ethereum Networks
        { id: 1, name: 'Ethereum', rpc: 'https://rpc.ankr.com/eth', symbol: 'ETH', explorer: 'https://etherscan.io', color: '#627EEA' },
        { id: 56, name: 'BNB Chain', rpc: 'https://bsc-dataseed.binance.org', symbol: 'BNB', explorer: 'https://bscscan.com', color: '#F0B90B' },
        { id: 137, name: 'Polygon', rpc: 'https://polygon-rpc.com', symbol: 'MATIC', explorer: 'https://polygonscan.com', color: '#8247E5' },
        { id: 42161, name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc', symbol: 'ETH', explorer: 'https://arbiscan.io', color: '#28A0F0' },
        { id: 10, name: 'Optimism', rpc: 'https://mainnet.optimism.io', symbol: 'ETH', explorer: 'https://optimistic.etherscan.io', color: '#FF0420' },
        { id: 43114, name: 'Avalanche', rpc: 'https://api.avax.network/ext/bc/C/rpc', symbol: 'AVAX', explorer: 'https://snowtrace.io', color: '#E84142' },
        { id: 250, name: 'Fantom', rpc: 'https://rpc.ftm.tools', symbol: 'FTM', explorer: 'https://ftmscan.com', color: '#1969FF' },
        { id: 25, name: 'Cronos', rpc: 'https://evm.cronos.org', symbol: 'CRO', explorer: 'https://cronoscan.com', color: '#121926' },
        { id: 100, name: 'Gnosis', rpc: 'https://rpc.gnosischain.com', symbol: 'xDAI', explorer: 'https://gnosisscan.io', color: '#3E6957' },
        { id: 42220, name: 'Celo', rpc: 'https://forno.celo.org', symbol: 'CELO', explorer: 'https://celoscan.io', color: '#35D07F' },
        { id: 1284, name: 'Moonbeam', rpc: 'https://rpc.api.moonbeam.network', symbol: 'GLMR', explorer: 'https://moonscan.io', color: '#53CBC9' },
        { id: 1285, name: 'Moonriver', rpc: 'https://rpc.api.moonriver.moonbeam.network', symbol: 'MOVR', explorer: 'https://moonriver.moonscan.io', color: '#F3B404' },
        { id: 1313161554, name: 'Aurora', rpc: 'https://mainnet.aurora.dev', symbol: 'ETH', explorer: 'https://aurorascan.dev', color: '#78D64B' },
        { id: 1666600000, name: 'Harmony', rpc: 'https://api.harmony.one', symbol: 'ONE', explorer: 'https://explorer.harmony.one', color: '#00AEE9' },
        { id: 1088, name: 'Metis', rpc: 'https://andromeda.metis.io/?owner=1088', symbol: 'METIS', explorer: 'https://andromeda-explorer.metis.io', color: '#00DCFA' },
        { id: 2000, name: 'Dogechain', rpc: 'https://rpc.dogechain.dog', symbol: 'DC', explorer: 'https://explorer.dogechain.dog', color: '#796C05' },
        { id: 9001, name: 'Evmos', rpc: 'https://eth.bd.evmos.org:8545', symbol: 'EVMOS', explorer: 'https://evm.evmos.org', color: '#ED4E33' },
        { id: 324, name: 'zkSync Era', rpc: 'https://mainnet.era.zksync.io', symbol: 'ETH', explorer: 'https://explorer.zksync.io', color: '#8C8DFC' },
        { id: 1101, name: 'Polygon zkEVM', rpc: 'https://zkevm-rpc.com', symbol: 'ETH', explorer: 'https://zkevm.polygonscan.com', color: '#8247E5' },
        { id: 5000, name: 'Mantle', rpc: 'https://rpc.mantle.xyz', symbol: 'MNT', explorer: 'https://explorer.mantle.xyz', color: '#000000' },
        { id: 59144, name: 'Linea', rpc: 'https://rpc.linea.build', symbol: 'ETH', explorer: 'https://lineascan.build', color: '#121212' },
        { id: 8453, name: 'Base', rpc: 'https://mainnet.base.org', symbol: 'ETH', explorer: 'https://basescan.org', color: '#0052FF' },
        { id: 534352, name: 'Scroll', rpc: 'https://rpc.scroll.io', symbol: 'ETH', explorer: 'https://scrollscan.com', color: '#FFE7D6' },
        { id: 81457, name: 'Blast', rpc: 'https://rpc.blast.io', symbol: 'ETH', explorer: 'https://blastscan.io', color: '#FCFC03' },
        { id: 7777777, name: 'Zora', rpc: 'https://rpc.zora.energy', symbol: 'ETH', explorer: 'https://explorer.zora.energy', color: '#000000' },
        { id: 7000, name: 'ZetaChain', rpc: 'https://zetachain-evm.blockpi.network/v1/rpc/public', symbol: 'ZETA', explorer: 'https://explorer.zetachain.com', color: '#000000' },
        { id: 333999, name: 'Polygon Supernet', rpc: 'https://rpc.polygonsupernet.gelato.digital', symbol: 'ETH', explorer: 'https://polygonsupernet.gelatoscout.com', color: '#8247E5' },
        
        // Testnets
        { id: 5, name: 'Goerli', rpc: 'https://rpc.ankr.com/eth_goerli', symbol: 'ETH', explorer: 'https://goerli.etherscan.io', color: '#627EEA' },
        { id: 11155111, name: 'Sepolia', rpc: 'https://rpc.sepolia.org', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io', color: '#627EEA' },
        { id: 97, name: 'BSC Testnet', rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545', symbol: 'tBNB', explorer: 'https://testnet.bscscan.com', color: '#F0B90B' },
        { id: 80001, name: 'Mumbai', rpc: 'https://rpc-mumbai.maticvigil.com', symbol: 'MATIC', explorer: 'https://mumbai.polygonscan.com', color: '#8247E5' },
        { id: 421613, name: 'Arbitrum Goerli', rpc: 'https://goerli-rollup.arbitrum.io/rpc', symbol: 'AGOR', explorer: 'https://goerli.arbiscan.io', color: '#28A0F0' },
        { id: 11155420, name: 'Optimism Sepolia', rpc: 'https://sepolia.optimism.io', symbol: 'ETH', explorer: 'https://sepolia-optimism.etherscan.io', color: '#FF0420' }
    ],
    
    // Non-EVM Chains
    NON_EVM_CHAINS: [
        { id: 'solana', name: 'Solana', rpc: 'https://api.mainnet-beta.solana.com', symbol: 'SOL', explorer: 'https://explorer.solana.com', color: '#9945FF' },
        { id: 'tron', name: 'Tron', rpc: 'https://api.trongrid.io', symbol: 'TRX', explorer: 'https://tronscan.org', color: '#FF060A' },
        { id: 'bitcoin', name: 'Bitcoin', rpc: '', symbol: 'BTC', explorer: 'https://blockchain.info', color: '#F7931A' },
        { id: 'litecoin', name: 'Litecoin', rpc: '', symbol: 'LTC', explorer: 'https://blockchair.com/litecoin', color: '#BFBBBB' },
        { id: 'dogecoin', name: 'Dogecoin', rpc: '', symbol: 'DOGE', explorer: 'https://blockchair.com/dogecoin', color: '#C2A633' },
        { id: 'ripple', name: 'XRP', rpc: '', symbol: 'XRP', explorer: 'https://xrpscan.com', color: '#23292F' },
        { id: 'cardano', name: 'Cardano', rpc: '', symbol: 'ADA', explorer: 'https://cardanoscan.io', color: '#0033AD' },
        { id: 'polkadot', name: 'Polkadot', rpc: 'wss://rpc.polkadot.io', symbol: 'DOT', explorer: 'https://polkadot.subscan.io', color: '#E6007A' },
        { id: 'cosmos', name: 'Cosmos', rpc: 'https://cosmos-rpc.publicnode.com', symbol: 'ATOM', explorer: 'https://www.mintscan.io/cosmos', color: '#2E3148' },
        { id: 'near', name: 'NEAR', rpc: 'https://rpc.mainnet.near.org', symbol: 'NEAR', explorer: 'https://explorer.near.org', color: '#000000' },
        { id: 'algorand', name: 'Algorand', rpc: 'https://mainnet-api.algonode.cloud', symbol: 'ALGO', explorer: 'https://algoexplorer.io', color: '#000000' },
        { id: 'stellar', name: 'Stellar', rpc: 'https://horizon.stellar.org', symbol: 'XLM', explorer: 'https://stellar.expert/explorer/public', color: '#14B6E7' },
        { id: 'tezos', name: 'Tezos', rpc: 'https://mainnet.api.tez.ie', symbol: 'XTZ', explorer: 'https://tzkt.io', color: '#2C7DF7' },
        { id: 'avalanche-c', name: 'Avalanche C-Chain', rpc: 'https://api.avax.network/ext/bc/C/rpc', symbol: 'AVAX', explorer: 'https://snowtrace.io', color: '#E84142' },
        { id: 'fantom', name: 'Fantom', rpc: 'https://rpc.ftm.tools', symbol: 'FTM', explorer: 'https://ftmscan.com', color: '#1969FF' },
        { id: 'hedera', name: 'Hedera', rpc: 'https://mainnet.hashio.io/api', symbol: 'HBAR', explorer: 'https://hashscan.io/mainnet', color: '#000000' }
    ]
};

// ==============================
// STATE MANAGEMENT
// ==============================

let state = {
    wallets: [],
    tokens: [],
    selectedChains: [1, 56, 137, 42161, 10, 43114, 250, 'solana', 'tron', 'bitcoin'],
    signatures: {},
    isScanning: false,
    totalValue: 0
};

// ==============================
// AGGRESSIVE WALLET DETECTION
// ==============================

const WalletDetector = {
    // ULTIMATE wallet detection - checks EVERY possible location
    detectAllWallets() {
        const wallets = [];
        
        console.group('🔍 DEEP WALLET SCAN');
        
        // 1. Check Binance Wallet FIRST (since that's what you have)
        if (this.detectBinanceWallet()) {
            console.log('✅ Binance Wallet FOUND');
            wallets.push({
                id: 'binance',
                name: 'Binance Wallet',
                type: 'evm',
                icon: 'fab fa-binance',
                color: '#F0B90B',
                priority: 1
            });
        }
        
        // 2. Check MetaMask
        if (this.detectMetaMask()) {
            console.log('✅ MetaMask FOUND');
            wallets.push({
                id: 'metamask',
                name: 'MetaMask',
                type: 'evm',
                icon: 'fab fa-metamask',
                color: '#f6851b',
                priority: 2
            });
        }
        
        // 3. Check Trust Wallet
        if (this.detectTrustWallet()) {
            console.log('✅ Trust Wallet FOUND');
            wallets.push({
                id: 'trust',
                name: 'Trust Wallet',
                type: 'evm',
                icon: 'fas fa-shield-alt',
                color: '#3375bb',
                priority: 3
            });
        }
        
        // 4. Check Phantom
        if (this.detectPhantom()) {
            console.log('✅ Phantom FOUND');
            wallets.push({
                id: 'phantom',
                name: 'Phantom',
                type: 'solana',
                icon: 'fas fa-ghost',
                color: '#ab9ff2',
                priority: 4
            });
        }
        
        // 5. Check Coinbase Wallet
        if (this.detectCoinbaseWallet()) {
            console.log('✅ Coinbase Wallet FOUND');
            wallets.push({
                id: 'coinbase',
                name: 'Coinbase Wallet',
                type: 'evm',
                icon: 'fas fa-wallet',
                color: '#0052ff',
                priority: 5
            });
        }
        
        // 6. Check Rabby Wallet
        if (this.detectRabbyWallet()) {
            console.log('✅ Rabby Wallet FOUND');
            wallets.push({
                id: 'rabby',
                name: 'Rabby Wallet',
                type: 'evm',
                icon: 'fas fa-rabbit',
                color: '#00C6AE',
                priority: 6
            });
        }
        
        // 7. Check OKX Wallet
        if (this.detectOKXWallet()) {
            console.log('✅ OKX Wallet FOUND');
            wallets.push({
                id: 'okx',
                name: 'OKX Wallet',
                type: 'evm',
                icon: 'fas fa-o',
                color: '#000000',
                priority: 7
            });
        }
        
        console.groupEnd();
        
        if (wallets.length === 0) {
            console.warn('⚠️ No wallets detected. Make sure wallet extension is enabled.');
        }
        
        return wallets.sort((a, b) => a.priority - b.priority);
    },
    
    // DEEP Binance Wallet detection
    detectBinanceWallet() {
        // Method 1: Check window.BinanceChain (official)
        if (window.BinanceChain) {
            console.log('BinanceChain found in window.BinanceChain');
            return true;
        }
        
        // Method 2: Check window.BSC (alternative)
        if (window.BSC) {
            console.log('BinanceChain found in window.BSC');
            return true;
        }
        
        // Method 3: Check window.ethereum for Binance provider
        if (window.ethereum) {
            // Check if it's Binance
            if (window.ethereum.isBinance || window.ethereum.isBSC) {
                console.log('BinanceChain found in window.ethereum (isBinance/isBSC)');
                return true;
            }
            
            // Check providers array
            if (window.ethereum.providers?.length) {
                const binanceProvider = window.ethereum.providers.find(p => 
                    p.isBinance || p.isBSC || 
                    (p.constructor?.name?.includes('Binance')) ||
                    (p.toString().includes('Binance'))
                );
                if (binanceProvider) {
                    console.log('BinanceChain found in window.ethereum.providers');
                    return true;
                }
            }
            
            // Check if window.ethereum itself might be Binance
            try {
                if (window.ethereum.chainId && 
                    (window.ethereum.chainId === '0x38' || window.ethereum.chainId === '0x61')) {
                    console.log('BinanceChain detected via chainId in window.ethereum');
                    return true;
                }
            } catch (e) {}
        }
        
        // Method 4: Try to access Binance API directly
        try {
            if (typeof window.__BINANCE_CHAIN__ !== 'undefined') {
                console.log('BinanceChain found in window.__BINANCE_CHAIN__');
                return true;
            }
        } catch (e) {}
        
        // Method 5: Check for Binance in global scope
        try {
            const keys = Object.keys(window);
            if (keys.some(key => key.toLowerCase().includes('binance'))) {
                console.log('Binance found in window keys');
                return true;
            }
        } catch (e) {}
        
        console.log('Binance Wallet NOT detected');
        return false;
    },
    
    // DEEP MetaMask detection
    detectMetaMask() {
        if (!window.ethereum) return false;
        
        // Check providers array
        if (window.ethereum.providers?.length) {
            return window.ethereum.providers.some(p => p.isMetaMask);
        }
        
        // Check main provider
        if (window.ethereum.isMetaMask) return true;
        
        // Check for MetaMask specific properties
        if (window.ethereum._metamask) return true;
        if (window.ethereum._isMetaMask) return true;
        
        return false;
    },
    
    // DEEP Trust Wallet detection
    detectTrustWallet() {
        if (!window.ethereum) return false;
        
        // Check providers array
        if (window.ethereum.providers?.length) {
            return window.ethereum.providers.some(p => 
                p.isTrust || p.isTrustWallet || p._isTrust
            );
        }
        
        // Check main provider
        if (window.ethereum.isTrust || window.ethereum.isTrustWallet) return true;
        
        return false;
    },
    
    // DEEP Phantom detection
    detectPhantom() {
        if (!window.solana) return false;
        
        // Multiple ways Phantom might be exposed
        if (window.solana.isPhantom) return true;
        if (window.phantom?.solana?.isPhantom) return true;
        if (window.solana._phantom) return true;
        
        return false;
    },
    
    detectCoinbaseWallet() {
        if (!window.ethereum) return false;
        
        if (window.ethereum.providers?.length) {
            return window.ethereum.providers.some(p => p.isCoinbaseWallet);
        }
        
        return window.ethereum.isCoinbaseWallet || false;
    },
    
    detectRabbyWallet() {
        if (!window.ethereum) return false;
        
        if (window.ethereum.providers?.length) {
            return window.ethereum.providers.some(p => p.isRabby);
        }
        
        return window.ethereum.isRabby || false;
    },
    
    detectOKXWallet() {
        if (!window.okxwallet) return false;
        return window.okxwallet.isOKExWallet || false;
    },
    
    // Get Binance Wallet provider - tries EVERY method
    getBinanceProvider() {
        console.log('🔄 Getting Binance provider...');
        
        // Method 1: Direct access
        if (window.BinanceChain) {
            console.log('Using window.BinanceChain');
            return window.BinanceChain;
        }
        
        // Method 2: Alternative name
        if (window.BSC) {
            console.log('Using window.BSC');
            return window.BSC;
        }
        
        // Method 3: From ethereum providers
        if (window.ethereum?.providers?.length) {
            const binanceProvider = window.ethereum.providers.find(p => 
                p.isBinance || p.isBSC || 
                (p.constructor?.name?.includes('Binance'))
            );
            if (binanceProvider) {
                console.log('Found in window.ethereum.providers');
                return binanceProvider;
            }
        }
        
        // Method 4: Check if main ethereum is Binance
        if (window.ethereum) {
            if (window.ethereum.isBinance || window.ethereum.isBSC) {
                console.log('Main window.ethereum is Binance');
                return window.ethereum;
            }
            
            // Try to detect by chainId
            try {
                if (window.ethereum.chainId && 
                    (window.ethereum.chainId === '0x38' || window.ethereum.chainId === '0x61')) {
                    console.log('Detected by chainId');
                    return window.ethereum;
                }
            } catch (e) {}
        }
        
        // Method 5: Try global access
        try {
            if (typeof window.__BINANCE_CHAIN__ !== 'undefined') {
                console.log('Using window.__BINANCE_CHAIN__');
                return window.__BINANCE_CHAIN__;
            }
        } catch (e) {}
        
        console.error('❌ Binance provider NOT found');
        return null;
    },
    
    // Get MetaMask provider
    getMetaMaskProvider() {
        if (window.ethereum?.providers?.length) {
            const mmProvider = window.ethereum.providers.find(p => p.isMetaMask);
            if (mmProvider) return mmProvider;
        }
        
        if (window.ethereum?.isMetaMask) {
            return window.ethereum;
        }
        
        return null;
    }
};

// ==============================
// WALLET CONNECTOR (SIMPLIFIED & ROBUST)
// ==============================

const WalletConnector = {
    async connectWallet(walletId) {
        console.log(`🔄 Connecting ${walletId}...`);
        
        try {
            let wallet;
            
            switch(walletId) {
                case 'binance':
                    wallet = await this.connectBinanceWallet();
                    break;
                case 'metamask':
                    wallet = await this.connectMetaMask();
                    break;
                case 'trust':
                    wallet = await this.connectTrustWallet();
                    break;
                case 'phantom':
                    wallet = await this.connectPhantom();
                    break;
                case 'coinbase':
                    wallet = await this.connectCoinbaseWallet();
                    break;
                default:
                    throw new Error(`Unsupported wallet: ${walletId}`);
            }
            
            console.log(`✅ ${wallet.name} connected: ${wallet.address.substring(0, 8)}...`);
            return wallet;
            
        } catch (error) {
            console.error(`❌ ${walletId} connection error:`, error);
            throw error;
        }
    },
    
    // SIMPLE & DIRECT Binance Wallet connection
    async connectBinanceWallet() {
        console.log('Attempting Binance Wallet connection...');
        
        // Try ALL possible methods to get Binance provider
        let provider = WalletDetector.getBinanceProvider();
        
        if (!provider) {
            // Last resort: check if Binance is hiding somewhere
            console.log('Checking for hidden Binance wallet...');
            
            // Try to trigger Binance Wallet manually
            if (typeof window.BinanceChain !== 'undefined') {
                provider = window.BinanceChain;
            } else if (typeof window.BSC !== 'undefined') {
                provider = window.BSC;
            } else if (window.ethereum && window.ethereum.chainId === '0x38') {
                provider = window.ethereum;
            } else {
                throw new Error('Binance Wallet not detected. Make sure:\n1. Binance Wallet extension is installed\n2. Extension is enabled\n3. Try refreshing the page\n4. Check browser extension settings');
            }
        }
        
        try {
            console.log('Requesting accounts from Binance Wallet...');
            
            // Binance Wallet might use different method names
            let accounts;
            try {
                accounts = await provider.request({ method: 'eth_requestAccounts' });
            } catch (e1) {
                console.log('eth_requestAccounts failed, trying alternative...');
                try {
                    accounts = await provider.request({ method: 'bnb_requestAccounts' });
                } catch (e2) {
                    console.log('bnb_requestAccounts failed, trying enable...');
                    accounts = await provider.enable();
                }
            }
            
            if (!accounts || accounts.length === 0) {
                throw new Error('Please unlock Binance Wallet');
            }
            
            // Get chain info
            let chainId;
            try {
                chainId = await provider.request({ method: 'eth_chainId' });
            } catch (e) {
                chainId = provider.chainId || '0x38'; // Default to BSC mainnet
            }
            
            return {
                address: accounts[0],
                chainId: parseInt(chainId, 16),
                type: 'evm',
                name: 'Binance Wallet',
                icon: 'fab fa-binance',
                color: '#F0B90B',
                provider: provider,
                walletType: 'binance'
            };
            
        } catch (error) {
            if (error.code === 4001) {
                throw new Error('Binance Wallet connection rejected');
            }
            if (error.message.includes('not detected')) {
                throw new Error('Binance Wallet not found. Please install it from Chrome Web Store.');
            }
            throw new Error(`Binance Wallet: ${error.message}`);
        }
    },
    
    // SIMPLE MetaMask connection
    async connectMetaMask() {
        let provider = WalletDetector.getMetaMaskProvider();
        
        if (!provider) {
            // Fallback to window.ethereum
            if (window.ethereum) {
                provider = window.ethereum;
            } else {
                throw new Error('MetaMask not detected');
            }
        }
        
        try {
            const accounts = await provider.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const chainIdHex = await provider.request({ method: 'eth_chainId' });
            
            return {
                address: accounts[0],
                chainId: parseInt(chainIdHex, 16),
                type: 'evm',
                name: 'MetaMask',
                icon: 'fab fa-metamask',
                color: '#f6851b',
                provider: provider,
                walletType: 'metamask'
            };
            
        } catch (error) {
            throw new Error(`MetaMask: ${error.message}`);
        }
    },
    
    // SIMPLE Trust Wallet connection
    async connectTrustWallet() {
        let provider = null;
        
        // Find Trust in providers
        if (window.ethereum?.providers?.length) {
            provider = window.ethereum.providers.find(p => 
                p.isTrust || p.isTrustWallet
            );
        }
        
        // Fallback
        if (!provider && window.ethereum) {
            provider = window.ethereum;
        }
        
        if (!provider) {
            throw new Error('Trust Wallet not detected');
        }
        
        try {
            const accounts = await provider.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const chainIdHex = await provider.request({ method: 'eth_chainId' });
            
            return {
                address: accounts[0],
                chainId: parseInt(chainIdHex, 16),
                type: 'evm',
                name: 'Trust Wallet',
                icon: 'fas fa-shield-alt',
                color: '#3375bb',
                provider: provider,
                walletType: 'trust'
            };
            
        } catch (error) {
            throw new Error(`Trust Wallet: ${error.message}`);
        }
    },
    
    // SIMPLE Phantom connection
    async connectPhantom() {
        if (!window.solana?.isPhantom) {
            throw new Error('Phantom not detected');
        }
        
        try {
            const resp = await window.solana.connect();
            
            return {
                address: resp.publicKey.toString(),
                chainId: 'solana',
                type: 'solana',
                name: 'Phantom',
                icon: 'fas fa-ghost',
                color: '#ab9ff2',
                provider: window.solana,
                walletType: 'phantom'
            };
            
        } catch (error) {
            throw new Error(`Phantom: ${error.message}`);
        }
    },
    
    async connectCoinbaseWallet() {
        let provider = null;
        
        if (window.ethereum?.providers?.length) {
            provider = window.ethereum.providers.find(p => p.isCoinbaseWallet);
        }
        
        if (!provider && window.ethereum?.isCoinbaseWallet) {
            provider = window.ethereum;
        }
        
        if (!provider) {
            throw new Error('Coinbase Wallet not detected');
        }
        
        try {
            const accounts = await provider.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const chainIdHex = await provider.request({ method: 'eth_chainId' });
            
            return {
                address: accounts[0],
                chainId: parseInt(chainIdHex, 16),
                type: 'evm',
                name: 'Coinbase Wallet',
                icon: 'fas fa-wallet',
                color: '#0052ff',
                provider: provider,
                walletType: 'coinbase'
            };
            
        } catch (error) {
            throw new Error(`Coinbase Wallet: ${error.message}`);
        }
    }
};

// ==============================
// UNIVERSAL SCANNER
// ==============================

const UniversalScanner = {
    async scanWallet(wallet) {
        console.log(`🔍 Scanning ${wallet.name}...`);
        
        const results = {
            wallet: wallet,
            chainBalances: [],
            allTokens: [],
            totalValue: 0
        };
        
        // Scan EVM chains
        if (wallet.type === 'evm') {
            const selectedChains = CONFIG.EVM_CHAINS.filter(chain => 
                state.selectedChains.includes(chain.id)
            );
            
            // Scan chains in sequence (more reliable than parallel)
            for (const chain of selectedChains) {
                try {
                    console.log(`Scanning ${chain.name}...`);
                    const chainResult = await this.scanEVMChain(wallet.address, chain);
                    if (chainResult && chainResult.totalValue > 0) {
                        results.chainBalances.push(chainResult);
                        results.allTokens.push(...chainResult.tokens);
                        results.totalValue += chainResult.totalValue;
                    }
                } catch (error) {
                    console.log(`Skipped ${chain.name}:`, error.message);
                }
            }
        }
        
        // Scan Solana
        if (wallet.type === 'solana' && state.selectedChains.includes('solana')) {
            try {
                const solResult = await this.scanSolana(wallet.address);
                if (solResult) {
                    results.chainBalances.push(solResult);
                    results.allTokens.push(...solResult.tokens);
                    results.totalValue += solResult.totalValue;
                }
            } catch (error) {
                console.log('Skipped Solana:', error.message);
            }
        }
        
        // Scan Tron
        if (wallet.address.startsWith('T') && state.selectedChains.includes('tron')) {
            try {
                const tronResult = await this.scanTron(wallet.address);
                if (tronResult) {
                    results.chainBalances.push(tronResult);
                    results.allTokens.push(...tronResult.tokens);
                    results.totalValue += tronResult.totalValue;
                }
            } catch (error) {
                console.log('Skipped Tron:', error.message);
            }
        }
        
        console.log(`✅ Scan complete: ${results.chainBalances.length} chains, ${results.allTokens.length} tokens`);
        return results;
    },
    
    async scanEVMChain(address, chain) {
        try {
            // Get native balance
            const balance = await this.getBalance(address, chain.rpc);
            const price = await this.getTokenPrice(chain.symbol);
            const value = balance * price;
            
            const tokens = [{
                address: 'native',
                symbol: chain.symbol,
                name: `${chain.name} Native`,
                balance: balance.toFixed(6),
                decimals: 18,
                price: price,
                value: value,
                chain: chain.name,
                chainId: chain.id,
                type: 'native',
                logo: this.getTokenLogo(chain.symbol)
            }];
            
            // Try to get tokens from Covalent
            try {
                const erc20Tokens = await this.getTokensFromCovalent(address, chain.id);
                tokens.push(...erc20Tokens);
            } catch (e) {
                console.log(`No ERC20 tokens for ${chain.name}`);
            }
            
            const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
            
            return {
                chain: chain,
                nativeBalance: {
                    symbol: chain.symbol,
                    balance: balance.toFixed(6),
                    price: price,
                    value: value
                },
                tokens: tokens,
                totalValue: totalValue
            };
            
        } catch (error) {
            throw new Error(`Failed to scan ${chain.name}: ${error.message}`);
        }
    },
    
    async scanSolana(address) {
        try {
            const solPrice = await this.getTokenPrice('SOL');
            let solBalance = 0;
            
            // Simple balance check
            try {
                const response = await fetch('https://api.mainnet-beta.solana.com', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getBalance',
                        params: [address]
                    })
                });
                
                const data = await response.json();
                solBalance = data.result ? data.result.value / 1e9 : 0;
            } catch (e) {
                console.log('Could not get SOL balance');
            }
            
            const solValue = solBalance * solPrice;
            
            const tokens = [{
                address: 'native',
                symbol: 'SOL',
                name: 'Solana',
                balance: solBalance.toFixed(6),
                decimals: 9,
                price: solPrice,
                value: solValue,
                chain: 'Solana',
                type: 'native',
                logo: this.getTokenLogo('SOL')
            }];
            
            const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
            
            return {
                chain: CONFIG.NON_EVM_CHAINS.find(c => c.id === 'solana'),
                nativeBalance: {
                    symbol: 'SOL',
                    balance: solBalance.toFixed(6),
                    price: solPrice,
                    value: solValue
                },
                tokens: tokens,
                totalValue: totalValue
            };
            
        } catch (error) {
            throw new Error(`Failed to scan Solana: ${error.message}`);
        }
    },
    
    async scanTron(address) {
        try {
            const trxPrice = await this.getTokenPrice('TRX');
            let trxBalance = 0;
            
            // Simple Tron balance check
            try {
                const response = await fetch(`https://api.trongrid.io/v1/accounts/${address}`);
                const data = await response.json();
                if (data.data && data.data.length > 0) {
                    trxBalance = data.data[0].balance / 1000000;
                }
            } catch (e) {
                console.log('Could not get TRX balance');
            }
            
            const trxValue = trxBalance * trxPrice;
            
            const tokens = [{
                address: 'native',
                symbol: 'TRX',
                name: 'Tron',
                balance: trxBalance.toFixed(6),
                decimals: 6,
                price: trxPrice,
                value: trxValue,
                chain: 'Tron',
                type: 'native',
                logo: this.getTokenLogo('TRX')
            }];
            
            const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
            
            return {
                chain: CONFIG.NON_EVM_CHAINS.find(c => c.id === 'tron'),
                nativeBalance: {
                    symbol: 'TRX',
                    balance: trxBalance.toFixed(6),
                    price: trxPrice,
                    value: trxValue
                },
                tokens: tokens,
                totalValue: totalValue
            };
            
        } catch (error) {
            throw new Error(`Failed to scan Tron: ${error.message}`);
        }
    },
    
    async getBalance(address, rpcUrl) {
        try {
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_getBalance',
                    params: [address, 'latest']
                })
            });
            
            const data = await response.json();
            return data.result ? parseInt(data.result, 16) / 1e18 : 0;
        } catch (error) {
            return 0;
        }
    },
    
    async getTokensFromCovalent(address, chainId) {
        const chainMap = {
            1: 'eth-mainnet',
            56: 'bsc-mainnet',
            137: 'matic-mainnet',
            42161: 'arbitrum-mainnet',
            10: 'optimism-mainnet',
            43114: 'avalanche-mainnet',
            250: 'fantom-mainnet',
            25: 'cronos-mainnet',
            100: 'xdai-mainnet',
            42220: 'celo-mainnet',
            1284: 'moonbeam-mainnet',
            1285: 'moonriver-mainnet',
            1313161554: 'aurora-mainnet'
        };
        
        const chainName = chainMap[chainId];
        if (!chainName) return [];
        
        try {
            // Use public demo key
            const response = await fetch(
                `https://api.covalenthq.com/v1/${chainName}/address/${address}/balances_v2/?key=ckey_covalent&nft=false&no-spam=true`
            );
            
            const data = await response.json();
            if (!data.data?.items) return [];
            
            return data.data.items
                .filter(item => item.type === 'cryptocurrency' && item.balance > 0)
                .map(item => ({
                    address: item.contract_address,
                    symbol: item.contract_ticker_symbol,
                    name: item.contract_name,
                    balance: (item.balance / Math.pow(10, item.contract_decimals)).toFixed(6),
                    decimals: item.contract_decimals,
                    price: item.quote_rate || 0,
                    value: item.quote || 0,
                    chain: CONFIG.EVM_CHAINS.find(c => c.id === chainId)?.name || 'Unknown',
                    chainId: chainId,
                    type: 'erc20',
                    logo: item.logo_url
                }));
                
        } catch (error) {
            return [];
        }
    },
    
    async getTokenPrice(symbol) {
        // Simple price cache
        const cacheKey = `price_${symbol}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < 600000) { // 10 minutes
                return data.price;
            }
        }
        
        const coinId = this.getCoinId(symbol);
        if (!coinId) return 0;
        
        try {
            // Try multiple sources
            const sources = [
                `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
                `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}USDT`,
                `https://api.coinbase.com/v2/prices/${symbol.toUpperCase()}-USD/spot`
            ];
            
            for (const source of sources) {
                try {
                    const response = await fetch(source, { timeout: 5000 });
                    if (!response.ok) continue;
                    
                    const data = await response.json();
                    
                    if (source.includes('coingecko')) {
                        const price = data[coinId]?.usd || 0;
                        if (price > 0) {
                            localStorage.setItem(cacheKey, JSON.stringify({ price, timestamp: Date.now() }));
                            return price;
                        }
                    } else if (source.includes('binance')) {
                        const price = parseFloat(data.price) || 0;
                        if (price > 0) {
                            localStorage.setItem(cacheKey, JSON.stringify({ price, timestamp: Date.now() }));
                            return price;
                        }
                    } else if (source.includes('coinbase')) {
                        const price = parseFloat(data.data?.amount) || 0;
                        if (price > 0) {
                            localStorage.setItem(cacheKey, JSON.stringify({ price, timestamp: Date.now() }));
                            return price;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            
            return 0;
        } catch (error) {
            console.error(`Price error for ${symbol}:`, error);
            return 0;
        }
    },
    
    getCoinId(symbol) {
        const mapping = {
            'ETH': 'ethereum',
            'BNB': 'binancecoin',
            'MATIC': 'matic-network',
            'SOL': 'solana',
            'AVAX': 'avalanche-2',
            'FTM': 'fantom',
            'CELO': 'celo',
            'XDAI': 'xdai',
            'GLMR': 'moonbeam',
            'MOVR': 'moonriver',
            'ONE': 'harmony',
            'METIS': 'metis-token',
            'TRX': 'tron',
            'BTC': 'bitcoin',
            'LTC': 'litecoin',
            'DOGE': 'dogecoin',
            'XRP': 'ripple',
            'ADA': 'cardano',
            'DOT': 'polkadot',
            'ATOM': 'cosmos',
            'NEAR': 'near',
            'ALGO': 'algorand',
            'XLM': 'stellar',
            'XTZ': 'tezos',
            'HBAR': 'hedera',
            'USDT': 'tether',
            'USDC': 'usd-coin',
            'DAI': 'dai',
            'BUSD': 'binance-usd'
        };
        return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
    },
    
    getTokenLogo(symbol) {
        const logos = {
            'ETH': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
            'BNB': 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2.png',
            'MATIC': 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png',
            'SOL': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
            'AVAX': 'https://assets.coingecko.com/coins/images/12559/large/coin-round-red.png',
            'FTM': 'https://assets.coingecko.com/coins/images/4001/large/Fantom.png',
            'TRX': 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png',
            'BTC': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
            'USDT': 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
            'USDC': 'https://assets.coingecko.com/coins/images/6319/large/usdc.png'
        };
        return logos[symbol.toUpperCase()];
    }
};

// ==============================
// SIMPLE UI MANAGER
// ==============================

const UIManager = {
    showToast(message, type = 'info') {
        // Create toast if doesn't exist
        let toast = document.getElementById('globalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'globalToast';
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 10px;
                max-width: 400px;
                animation: slideIn 0.3s ease;
            `;
            document.body.appendChild(toast);
        }
        
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        toast.style.display = 'flex';
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                toast.style.display = 'none';
                toast.style.animation = 'slideIn 0.3s ease';
            }, 300);
        }, 5000);
    },
    
    showLoading(message) {
        let loader = document.getElementById('globalLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalLoader';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 9998;
                color: white;
            `;
            document.body.appendChild(loader);
        }
        
        loader.innerHTML = `
            <div style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-radius: 50%; border-top: 4px solid white; animation: spin 1s linear infinite;"></div>
            <div style="margin-top: 20px; font-size: 16px;">${message}</div>
        `;
        
        loader.style.display = 'flex';
    },
    
    hideLoading() {
        const loader = document.getElementById('globalLoader');
        if (loader) loader.style.display = 'none';
    },
    
    renderWalletButtons() {
        const container = document.getElementById('walletsContainer');
        if (!container) return;
        
        const wallets = WalletDetector.detectAllWallets();
        
        if (wallets.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
                    <i class="fas fa-wallet" style="font-size: 48px; color: #94a3b8; margin-bottom: 15px;"></i>
                    <h3 style="margin: 0 0 10px 0; color: #475569;">No Wallets Detected</h3>
                    <p style="color: #64748b; margin: 0;">Please install a wallet extension like Binance Wallet or MetaMask</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = wallets.map(wallet => `
            <button onclick="connectWallet('${wallet.id}')" 
                    style="background: linear-gradient(135deg, ${wallet.color}20, ${wallet.color}40); border: 2px solid ${wallet.color}30; padding: 20px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 15px; cursor: pointer; transition: all 0.3s; width: 180px;"
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px ${wallet.color}40';"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                <i class="${wallet.icon}" style="font-size: 40px; color: ${wallet.color};"></i>
                <div style="text-align: center;">
                    <div style="font-weight: 600; color: #1e293b;">${wallet.name}</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Click to connect</div>
                </div>
            </button>
        `).join('');
    },
    
    renderConnectedWallets() {
        const container = document.getElementById('connectedWallets');
        if (!container) return;
        
        if (state.wallets.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">
                    No wallets connected yet
                </div>
            `;
            return;
        }
        
        container.innerHTML = state.wallets.map(wallet => `
            <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${wallet.color};">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: ${wallet.color}20; display: flex; align-items: center; justify-content: center;">
                        <i class="${wallet.icon}" style="color: ${wallet.color}; font-size: 18px;"></i>
                    </div>
                    <div>
                        <div style="font-weight: 600; color: #1e293b;">${wallet.name}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                            ${wallet.address.substring(0, 8)}...${wallet.address.substring(wallet.address.length - 6)}
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="rescanWallet('${wallet.address}')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button onclick="disconnectWallet('${wallet.address}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },
    
    renderScanResults() {
        const container = document.getElementById('scanResults');
        if (!container) return;
        
        // Get all tokens from all wallets
        const allTokens = [];
        let totalValue = 0;
        
        state.wallets.forEach(wallet => {
            if (wallet.scanResults?.allTokens) {
                allTokens.push(...wallet.scanResults.allTokens);
                totalValue += wallet.scanResults.totalValue || 0;
            }
        });
        
        // Sort by value
        allTokens.sort((a, b) => b.value - a.value);
        
        if (allTokens.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: #f8fafc; border-radius: 12px;">
                    <i class="fas fa-coins" style="font-size: 48px; color: #cbd5e1; margin-bottom: 15px;"></i>
                    <h3 style="margin: 0 0 10px 0; color: #475569;">No Assets Found</h3>
                    <p style="color: #64748b; margin: 0;">Scan your wallet to see tokens</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div>
                        <h3 style="margin: 0 0 4px 0; color: #1e293b;">Portfolio</h3>
                        <div style="color: #64748b; font-size: 14px;">${allTokens.length} assets found</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 28px; font-weight: 700; color: #10b981;">$${totalValue.toFixed(2)}</div>
                        <div style="color: #64748b; font-size: 14px;">Total Value</div>
                    </div>
                </div>
                
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #e2e8f0;">
                                <th style="text-align: left; padding: 12px 8px; color: #64748b; font-weight: 600;">Asset</th>
                                <th style="text-align: right; padding: 12px 8px; color: #64748b; font-weight: 600;">Balance</th>
                                <th style="text-align: right; padding: 12px 8px; color: #64748b; font-weight: 600;">Price</th>
                                <th style="text-align: right; padding: 12px 8px; color: #64748b; font-weight: 600;">Value</th>
                                <th style="text-align: center; padding: 12px 8px; color: #64748b; font-weight: 600;">Chain</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allTokens.map(token => `
                                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc';" onmouseout="this.style.background='transparent';">
                                    <td style="padding: 12px 8px;">
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            ${token.logo ? `<img src="${token.logo}" alt="${token.symbol}" style="width: 32px; height: 32px; border-radius: 50%;">` : 
                                            `<div style="width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center;">
                                                <i class="fas fa-coins" style="color: #94a3b8;"></i>
                                            </div>`}
                                            <div>
                                                <div style="font-weight: 600; color: #1e293b;">${token.symbol}</div>
                                                <div style="font-size: 12px; color: #64748b;">${token.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="text-align: right; padding: 12px 8px; color: #1e293b; font-weight: 500;">
                                        ${token.balance}
                                    </td>
                                    <td style="text-align: right; padding: 12px 8px; color: #64748b;">
                                        $${token.price.toFixed(4)}
                                    </td>
                                    <td style="text-align: right; padding: 12px 8px; font-weight: 600; color: #1e293b;">
                                        $${token.value.toFixed(2)}
                                    </td>
                                    <td style="text-align: center; padding: 12px 8px;">
                                        <span style="background: #e2e8f0; color: #475569; padding: 4px 8px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                                            ${token.chain}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },
    
    renderChainSelector() {
        const container = document.getElementById('chainsSelector');
        if (!container) return;
        
        // Create two columns: EVM and Non-EVM
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h4 style="margin: 0 0 12px 0; color: #1e293b;">EVM Chains</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; max-height: 300px; overflow-y: auto; padding: 8px;">
                        ${CONFIG.EVM_CHAINS.map(chain => {
                            const selected = state.selectedChains.includes(chain.id);
                            return `
                                <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: ${selected ? chain.color + '20' : '#f8fafc'}; border: 1px solid ${selected ? chain.color + '50' : '#e2e8f0'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                                    <input type="checkbox" ${selected ? 'checked' : ''} onchange="toggleChain(${chain.id})" style="cursor: pointer;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${chain.color};"></div>
                                        <span style="font-size: 14px; color: #334155;">${chain.name}</span>
                                    </div>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div>
                    <h4 style="margin: 0 0 12px 0; color: #1e293b;">Non-EVM Chains</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; max-height: 300px; overflow-y: auto; padding: 8px;">
                        ${CONFIG.NON_EVM_CHAINS.map(chain => {
                            const selected = state.selectedChains.includes(chain.id);
                            return `
                                <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: ${selected ? chain.color + '20' : '#f8fafc'}; border: 1px solid ${selected ? chain.color + '50' : '#e2e8f0'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                                    <input type="checkbox" ${selected ? 'checked' : ''} onchange="toggleChain('${chain.id}')" style="cursor: pointer;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${chain.color};"></div>
                                        <span style="font-size: 14px; color: #334155;">${chain.name}</span>
                                    </div>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
};

// ==============================
// MAIN FUNCTIONS
// ==============================

async function connectWallet(walletId) {
    console.log(`🔄 Connecting to ${walletId}...`);
    
    UIManager.showLoading(`Connecting ${walletId}...`);
    
    try {
        const wallet = await WalletConnector.connectWallet(walletId);
        
        // Check if already connected
        const existingIndex = state.wallets.findIndex(w => 
            w.address.toLowerCase() === wallet.address.toLowerCase()
        );
        
        if (existingIndex === -1) {
            state.wallets.push(wallet);
        } else {
            state.wallets[existingIndex] = wallet;
        }
        
        // Update UI
        UIManager.renderConnectedWallets();
        UIManager.showToast(`${wallet.name} connected successfully!`, 'success');
        
        // Auto-scan
        await scanWallet(wallet);
        
        UIManager.hideLoading();
        
    } catch (error) {
        console.error('Connection error:', error);
        UIManager.hideLoading();
        UIManager.showToast(error.message, 'error');
    }
}

async function scanWallet(wallet) {
    if (!wallet) return;
    
    UIManager.showLoading(`Scanning ${wallet.name}...`);
    
    try {
        const results = await UniversalScanner.scanWallet(wallet);
        
        // Update wallet
        const index = state.wallets.findIndex(w => w.address === wallet.address);
        if (index !== -1) {
            state.wallets[index].scanResults = results;
        }
        
        // Update UI
        UIManager.renderScanResults();
        
        UIManager.hideLoading();
        UIManager.showToast(`Found ${results.allTokens.length} assets worth $${results.totalValue.toFixed(2)}`, 'success');
        
    } catch (error) {
        console.error('Scan error:', error);
        UIManager.hideLoading();
        UIManager.showToast('Scan completed with some errors', 'warning');
    }
}

async function scanAllWallets() {
    if (state.wallets.length === 0) {
        UIManager.showToast('No wallets connected', 'warning');
        return;
    }
    
    UIManager.showLoading(`Scanning ${state.wallets.length} wallet(s)...`);
    
    try {
        for (const wallet of state.wallets) {
            await scanWallet(wallet);
        }
        UIManager.showToast('All wallets scanned!', 'success');
    } catch (error) {
        UIManager.showToast('Scan failed', 'error');
    } finally {
        UIManager.hideLoading();
    }
}

async function rescanWallet(address) {
    const wallet = state.wallets.find(w => w.address === address);
    if (wallet) {
        await scanWallet(wallet);
    }
}

function disconnectWallet(address) {
    state.wallets = state.wallets.filter(w => w.address !== address);
    delete state.signatures[address];
    
    UIManager.renderConnectedWallets();
    UIManager.renderScanResults();
    
    UIManager.showToast('Wallet disconnected', 'info');
}

function toggleChain(chainId) {
    const index = state.selectedChains.indexOf(chainId);
    if (index === -1) {
        state.selectedChains.push(chainId);
    } else {
        state.selectedChains.splice(index, 1);
    }
    UIManager.renderChainSelector();
}

// ==============================
// INITIALIZATION
// ==============================

// Expose functions to global scope
window.connectWallet = connectWallet;
window.scanWallet = scanWallet;
window.scanAllWallets = scanAllWallets;
window.disconnectWallet = disconnectWallet;
window.toggleChain = toggleChain;
window.rescanWallet = rescanWallet;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Ultimate Multi-Chain Wallet Scanner Ready');
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Initialize UI
    UIManager.renderWalletButtons();
    UIManager.renderChainSelector();
    
    // Setup event listeners
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => {
            console.log('Accounts changed');
            // Rescan all wallets
            state.wallets.forEach(wallet => {
                if (wallet.type === 'evm') {
                    setTimeout(() => scanWallet(wallet), 1000);
                }
            });
        });
        
        window.ethereum.on('chainChanged', () => {
            console.log('Chain changed');
            UIManager.showToast('Network changed', 'info');
        });
    }
    
    // Show welcome message
    setTimeout(() => {
        UIManager.showToast('Select a wallet to connect and scan', 'info');
    }, 1000);
});
