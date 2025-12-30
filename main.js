import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

const projectId = "962425907914a3e80a7d8e7288b23f62";

// ALL CHAINS IN EXISTENCE (EVM + Non-EVM)
const ALL_CHAINS = {
  // EVM Chains (by chainId)
  evm: {
    1: { name: "Ethereum", native: "ETH", type: "evm", scan: "etherscan.io" },
    56: { name: "BNB Chain", native: "BNB", type: "evm", scan: "bscscan.com" },
    137: { name: "Polygon", native: "MATIC", type: "evm", scan: "polygonscan.com" },
    42161: { name: "Arbitrum", native: "ETH", type: "evm", scan: "arbiscan.io" },
    10: { name: "Optimism", native: "ETH", type: "evm", scan: "optimistic.etherscan.io" },
    8453: { name: "Base", native: "ETH", type: "evm", scan: "basescan.org" },
    43114: { name: "Avalanche", native: "AVAX", type: "evm", scan: "snowtrace.io" },
    250: { name: "Fantom", native: "FTM", type: "evm", scan: "ftmscan.com" },
    25: { name: "Cronos", native: "CRO", type: "evm", scan: "cronoscan.com" },
    100: { name: "Gnosis", native: "xDAI", type: "evm", scan: "gnosisscan.io" },
    1284: { name: "Moonbeam", native: "GLMR", type: "evm", scan: "moonscan.io" },
    42220: { name: "Celo", native: "CELO", type: "evm", scan: "celoscan.io" },
    1666600000: { name: "Harmony", native: "ONE", type: "evm", scan: "explorer.harmony.one" },
    8217: { name: "Klaytn", native: "KLAY", type: "evm", scan: "scope.klaytn.com" },
    1313161554: { name: "Aurora", native: "ETH", type: "evm", scan: "explorer.aurora.dev" },
    1285: { name: "Moonriver", native: "MOVR", type: "evm", scan: "moonriver.moonscan.io" },
    1088: { name: "Metis", native: "METIS", type: "evm", scan: "andromeda-explorer.metis.io" },
    288: { name: "Boba", native: "ETH", type: "evm", scan: "bobascan.com" },
    1101: { name: "Polygon zkEVM", native: "ETH", type: "evm", scan: "zkevm.polygonscan.com" },
    324: { name: "zkSync Era", native: "ETH", type: "evm", scan: "explorer.zksync.io" },
    59144: { name: "Linea", native: "ETH", type: "evm", scan: "lineascan.build" },
    5000: { name: "Mantle", native: "MNT", type: "evm", scan: "explorer.mantle.xyz" },
    81457: { name: "Blast", native: "ETH", type: "evm", scan: "blastscan.io" },
    534352: { name: "Scroll", native: "ETH", type: "evm", scan: "scrollscan.com" },
    204: { name: "opBNB", native: "BNB", type: "evm", scan: "opbnbscan.com" },
    7777777: { name: "Zora", native: "ETH", type: "evm", scan: "explorer.zora.energy" }
  },
  
  // Non-EVM Chains (by identifier)
  nonEVM: {
    "solana": { name: "Solana", native: "SOL", type: "solana", scan: "solscan.io" },
    "bitcoin": { name: "Bitcoin", native: "BTC", type: "bitcoin", scan: "blockchain.com" },
    "cosmos": { name: "Cosmos Hub", native: "ATOM", type: "cosmos", scan: "www.mintscan.io/cosmos" },
    "osmosis": { name: "Osmosis", native: "OSMO", type: "cosmos", scan: "www.mintscan.io/osmosis" },
    "juno": { name: "Juno", native: "JUNO", type: "cosmos", scan: "www.mintscan.io/juno" },
    "secret": { name: "Secret Network", native: "SCRT", type: "cosmos", scan: "www.mintscan.io/secret" },
    "terra": { name: "Terra", native: "LUNA", type: "cosmos", scan: "finder.terra.money" },
    "injective": { name: "Injective", native: "INJ", type: "cosmos", scan: "explorer.injective.network" },
    "polkadot": { name: "Polkadot", native: "DOT", type: "substrate", scan: "polkadot.subscan.io" },
    "kusama": { name: "Kusama", native: "KSM", type: "substrate", scan: "kusama.subscan.io" },
    "cardano": { name: "Cardano", native: "ADA", type: "cardano", scan: "cardanoscan.io" },
    "near": { name: "NEAR", native: "NEAR", type: "near", scan: "explorer.near.org" },
    "aptos": { name: "Aptos", native: "APT", type: "move", scan: "explorer.aptoslabs.com" },
    "sui": { name: "Sui", native: "SUI", type: "move", scan: "suiscan.xyz" },
    "ton": { name: "TON", native: "TON", type: "ton", scan: "tonscan.org" },
    "tron": { name: "Tron", native: "TRX", type: "tron", scan: "tronscan.org" },
    "algorand": { name: "Algorand", native: "ALGO", type: "algorand", scan: "algoexplorer.io" },
    "tezos": { name: "Tezos", native: "XTZ", type: "tezos", scan: "tzkt.io" },
    "stellar": { name: "Stellar", native: "XLM", type: "stellar", scan: "stellar.expert" },
    "ripple": { name: "Ripple", native: "XRP", type: "ripple", scan: "xrpscan.com" },
    "litecoin": { name: "Litecoin", native: "LTC", type: "bitcoin", scan: "blockchair.com/litecoin" },
    "dogecoin": { name: "Dogecoin", native: "DOGE", type: "bitcoin", scan: "dogechain.info" },
    "bitcoincash": { name: "Bitcoin Cash", native: "BCH", type: "bitcoin", scan: "blockchair.com/bitcoin-cash" },
    "zcash": { name: "Zcash", native: "ZEC", type: "bitcoin", scan: "zcashblockexplorer.com" },
    "monero": { name: "Monero", native: "XMR", type: "monero", scan: "xmrchain.net" },
    "dash": { name: "Dash", native: "DASH", type: "bitcoin", scan: "explorer.dash.org" },
    "avalanche-x": { name: "Avalanche X", native: "AVAX", type: "avalanche", scan: "avascan.info" },
    "hedera": { name: "Hedera", native: "HBAR", type: "hedera", scan: "hashscan.io" },
    "elrond": { name: "Elrond", native: "EGLD", type: "elrond", scan: "explorer.elrond.com" },
    "fio": { name: "FIO", native: "FIO", type: "fio", scan: "fio.bloks.io" },
    "wax": { name: "WAX", native: "WAX", type: "eos", scan: "wax.bloks.io" },
    "telos": { name: "Telos", native: "TLOS", type: "eos", scan: "telos.bloks.io" },
    "proton": { name: "Proton", native: "XPR", type: "eos", scan: "proton.bloks.io" },
    "eos": { name: "EOS", native: "EOS", type: "eos", scan: "bloks.io" }
  }
};

// Common tokens by chain
const COMMON_TOKENS = {
  // Ethereum
  1: {
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    'SHIB': '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
    'LINK': '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    'UNI': '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    'AAVE': '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
  },
  // BNB Chain
  56: {
    'BUSD': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    'USDT': '0x55d398326f99059fF775485246999027B3197955',
    'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    'CAKE': '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    'XRP': '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
    'ADA': '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
    'DOT': '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402'
  },
  // Polygon
  137: {
    'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    'DAI': '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    'WETH': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    'AAVE': '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
    'QUICK': '0x831753DD7087CaC61aB5644b308642cc1c33Dc13'
  },
  // Arbitrum
  42161: {
    'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    'USDC': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    'DAI': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    'ARB': '0x912CE59144191C1204E64559FE8253a0e49E6548',
    'GMX': '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
  },
  // Solana (placeholder addresses)
  "solana": {
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    'SRM': 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt'
  }
};

// ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)"
];

// Global state
let appKit = null;
let isConnected = false;
let walletInfo = {
  address: null,
  chainId: null,
  chainType: null,
  walletName: null,
  connector: null
};

// DOM elements
let connectBtn, disconnectBtn, status, walletInfoEl, chainsInfo, scanBtn, scanResults;

// Initialize AppKit with ALL CHAINS support
async function initializeAppKit() {
  try {
    console.log("Initializing AppKit for multichain support...");
    
    // Convert all EVM chains to AppKit format
    const evmChains = Object.entries(ALL_CHAINS.evm).map(([chainId, chain]) => ({
      id: parseInt(chainId),
      name: chain.name,
      rpcUrl: getRPCEndpoint(parseInt(chainId))
    }));
    
    appKit = createAppKit({
      adapters: [new EthersAdapter()],
      projectId,
      networks: evmChains,
      metadata: {
        name: "Universal Chain Scanner",
        description: "Scan tokens across ALL blockchain networks",
        url: window.location.origin,
        icons: ["https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Logo/Blue%20(Default)/Logo.png"]
      },
      themeVariables: {
        "--w3m-accent": "#3b82f6",
        "--w3m-border-radius-master": "12px"
      },
      themeMode: "dark",
      features: {
        analytics: false,
        email: false,
        allWallets: true
      },
      connectors: [
        {
          id: 'injected',
          name: 'Browser Wallet'
        },
        {
          id: 'metaMask',
          name: 'MetaMask'
        },
        {
          id: 'coinbaseWallet',
          name: 'Coinbase Wallet'
        },
        {
          id: 'walletConnect',
          name: 'WalletConnect'
        }
      ]
    });
    
    console.log("AppKit initialized successfully");
    return true;
    
  } catch (error) {
    console.error("Failed to initialize AppKit:", error);
    return false;
  }
}

// Get RPC endpoint for chain
function getRPCEndpoint(chainId) {
  const endpoints = {
    1: "https://eth.llamarpc.com",
    56: "https://bsc-dataseed.binance.org",
    137: "https://polygon-rpc.com",
    42161: "https://arb1.arbitrum.io/rpc",
    10: "https://mainnet.optimism.io",
    8453: "https://mainnet.base.org",
    43114: "https://api.avax.network/ext/bc/C/rpc",
    250: "https://rpc.ftm.tools",
    25: "https://evm.cronos.org",
    100: "https://rpc.gnosischain.com"
  };
  
  return endpoints[chainId] || `https://${ALL_CHAINS.evm[chainId]?.name.toLowerCase().replace(/\s+/g, '')}.rpc.com`;
}

// Initialize DOM
function initializeDOM() {
  connectBtn = document.getElementById("connectBtn");
  disconnectBtn = document.getElementById("disconnectBtn");
  status = document.getElementById("status");
  walletInfoEl = document.getElementById("walletInfo");
  chainsInfo = document.getElementById("chainsInfo");
  scanBtn = document.getElementById("scanBtn");
  scanResults = document.getElementById("scanResults");
  
  if (!connectBtn) {
    console.error("Connect button not found!");
    return false;
  }
  
  return true;
}

// Connect wallet
async function connectWallet() {
  if (!appKit) {
    showError("Wallet connector not ready. Please refresh the page.");
    return;
  }
  
  try {
    // Update UI
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<span class="spinner"></span> Connecting...';
    status.textContent = "Opening wallet modal...";
    status.className = "status-message";
    
    // Open modal
    await appKit.open();
    
    console.log("Wallet modal opened");
    
  } catch (error) {
    console.error("Connection error:", error);
    showError(`Failed to connect: ${error.message}`);
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect Wallet";
  }
}

// Disconnect wallet
async function disconnectWallet() {
  try {
    if (appKit) {
      await appKit.disconnect();
    }
    resetWallet();
    showMessage("Disconnected successfully");
  } catch (error) {
    console.error("Disconnect error:", error);
    showError("Failed to disconnect");
  }
}

// Setup state subscription
function setupStateListeners() {
  if (!appKit) return;
  
  appKit.subscribeState(async (state) => {
    console.log("Wallet state:", state);
    
    if (state.isConnected && state.account) {
      await handleWalletConnected(state);
    } else {
      handleWalletDisconnected();
    }
  });
}

// Handle wallet connection
async function handleWalletConnected(state) {
  try {
    isConnected = true;
    
    // Extract wallet info
    walletInfo.address = state.account.address;
    walletInfo.chainId = state.chain?.id || 1;
    walletInfo.walletName = state.account.connector?.name || "Unknown Wallet";
    walletInfo.connector = state.account.connector;
    
    // Determine chain type
    if (ALL_CHAINS.evm[walletInfo.chainId]) {
      walletInfo.chainType = "evm";
      walletInfo.chainName = ALL_CHAINS.evm[walletInfo.chainId].name;
      walletInfo.nativeCurrency = ALL_CHAINS.evm[walletInfo.chainId].native;
    } else {
      // Check if it's a non-EVM chain by wallet name
      walletInfo.chainType = detectChainType(walletInfo.walletName);
      walletInfo.chainName = walletInfo.chainType.charAt(0).toUpperCase() + walletInfo.chainType.slice(1);
      walletInfo.nativeCurrency = getNativeCurrency(walletInfo.chainType);
    }
    
    // Update UI
    updateWalletDisplay();
    updateNetworksDisplay();
    
    // Show success message
    showMessage(`Connected to ${walletInfo.walletName} on ${walletInfo.chainName}`);
    
    // Update buttons
    connectBtn.disabled = true;
    connectBtn.textContent = "Connected";
    
    if (disconnectBtn) {
      disconnectBtn.style.display = "block";
    }
    
    if (scanBtn) {
      scanBtn.disabled = false;
    }
    
    // Auto-scan after connection
    setTimeout(() => {
      if (isConnected) {
        scanTokens();
      }
    }, 1500);
    
  } catch (error) {
    console.error("Error handling connection:", error);
    showError(`Connection error: ${error.message}`);
  }
}

// Detect chain type from wallet name
function detectChainType(walletName) {
  const walletNameLower = walletName.toLowerCase();
  
  if (walletNameLower.includes("solana") || walletNameLower.includes("phantom")) return "solana";
  if (walletNameLower.includes("cosmos") || walletNameLower.includes("keplr")) return "cosmos";
  if (walletNameLower.includes("polkadot") || walletNameLower.includes("polkadot.js")) return "polkadot";
  if (walletNameLower.includes("cardano") || walletNameLower.includes("yoroi")) return "cardano";
  if (walletNameLower.includes("near")) return "near";
  if (walletNameLower.includes("tron") || walletNameLower.includes("tronlink")) return "tron";
  if (walletNameLower.includes("algorand")) return "algorand";
  if (walletNameLower.includes("tezos") || walletNameLower.includes("temple")) return "tezos";
  if (walletNameLower.includes("bitcoin") || walletNameLower.includes("ledger") || walletNameLower.includes("trezor")) return "bitcoin";
  
  return "evm"; // Default to EVM
}

// Get native currency for chain type
function getNativeCurrency(chainType) {
  const currencies = {
    solana: "SOL",
    cosmos: "ATOM",
    polkadot: "DOT",
    cardano: "ADA",
    near: "NEAR",
    tron: "TRX",
    algorand: "ALGO",
    tezos: "XTZ",
    bitcoin: "BTC",
    ethereum: "ETH"
  };
  
  return currencies[chainType] || "Native";
}

// Handle wallet disconnection
function handleWalletDisconnected() {
  isConnected = false;
  walletInfo = {
    address: null,
    chainId: null,
    chainType: null,
    walletName: null,
    connector: null
  };
  
  resetDisplay();
  showMessage("Disconnected");
}

// Update wallet display
function updateWalletDisplay() {
  if (!walletInfoEl) return;
  
  const shortAddress = walletInfo.address 
    ? `${walletInfo.address.substring(0, 6)}...${walletInfo.address.substring(walletInfo.address.length - 4)}`
    : "Not connected";
  
  walletInfoEl.innerHTML = `
    <div class="wallet-details">
      <h3>🌐 Universal Wallet Connected</h3>
      <div class="detail-row">
        <span class="label">Wallet:</span>
        <span class="value">${walletInfo.walletName}</span>
      </div>
      <div class="detail-row">
        <span class="label">Address:</span>
        <span class="value address" title="${walletInfo.address}">${shortAddress}</span>
      </div>
      <div class="detail-row">
        <span class="label">Chain Type:</span>
        <span class="value">${walletInfo.chainType.toUpperCase()}</span>
      </div>
      <div class="detail-row">
        <span class="label">Network:</span>
        <span class="value">${walletInfo.chainName}</span>
      </div>
      <div class="detail-row">
        <span class="label">Native Currency:</span>
        <span class="value">${walletInfo.nativeCurrency}</span>
      </div>
      ${walletInfo.chainId ? `<div class="detail-row">
        <span class="label">Chain ID:</span>
        <span class="value">${walletInfo.chainId}</span>
      </div>` : ''}
    </div>
  `;
}

// Update networks display
function updateNetworksDisplay() {
  if (!chainsInfo) return;
  
  const totalChains = Object.keys(ALL_CHAINS.evm).length + Object.keys(ALL_CHAINS.nonEVM).length;
  
  // Get first 20 chains for display (can scroll for more)
  const evmChainArray = Object.entries(ALL_CHAINS.evm).slice(0, 15);
  const nonEVMChainArray = Object.entries(ALL_CHAINS.nonEVM).slice(0, 15);
  
  chainsInfo.innerHTML = `
    <div class="chains-container">
      <h3>🌍 All Supported Networks (${totalChains}+)</h3>
      <div class="chains-tabs">
        <button class="tab-btn active" onclick="showChainTab('evm')">EVM Chains</button>
        <button class="tab-btn" onclick="showChainTab('non-evm')">Non-EVM Chains</button>
      </div>
      <div id="evm-chains" class="chains-grid">
        ${evmChainArray.map(([chainId, chain]) => {
          const isActive = parseInt(chainId) === walletInfo.chainId;
          return `
            <div class="chain-card ${isActive ? 'active' : ''} evm" title="${chain.name}">
              <div class="chain-name">${chain.name}</div>
              <div class="chain-type">EVM</div>
              <div class="chain-native">${chain.native}</div>
              ${isActive ? '<div class="chain-status">Connected</div>' : ''}
            </div>
          `;
        }).join('')}
      </div>
      <div id="non-evm-chains" class="chains-grid" style="display: none;">
        ${nonEVMChainArray.map(([chainKey, chain]) => {
          const isActive = chainKey === walletInfo.chainType;
          return `
            <div class="chain-card ${isActive ? 'active' : ''} non-evm" title="${chain.name}">
              <div class="chain-name">${chain.name}</div>
              <div class="chain-type">${chain.type.toUpperCase()}</div>
              <div class="chain-native">${chain.native}</div>
              ${isActive ? '<div class="chain-status">Connected</div>' : ''}
            </div>
          `;
        }).join('')}
      </div>
      <div class="chains-footer">
        <small>Showing 30 of ${totalChains} networks. Wallet auto-detects chain type.</small>
      </div>
    </div>
  `;
}

// Scan tokens based on chain type
async function scanTokens() {
  if (!isConnected || !walletInfo.address) {
    showError("Please connect wallet first");
    return;
  }
  
  try {
    // Update UI
    scanBtn.disabled = true;
    scanBtn.textContent = "Scanning...";
    status.textContent = `Scanning ${walletInfo.chainName} for tokens...`;
    status.className = "status-message";
    
    scanResults.innerHTML = `
      <div class="scanning-indicator">
        <div class="spinner"></div>
        <p>Scanning ${walletInfo.chainName} wallet...</p>
        <p class="hint">Detected chain type: ${walletInfo.chainType.toUpperCase()}</p>
      </div>
    `;

    let tokens = [];
    
    // Scan based on chain type
    if (walletInfo.chainType === "evm") {
      tokens = await scanEVMTokens();
    } else {
      tokens = await scanNonEVMTokens();
    }
    
    // Display results
    displayScanResults(tokens);
    
    // Update UI
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Tokens";
    showMessage(`Found ${tokens.length} tokens on ${walletInfo.chainName}`);
    
  } catch (error) {
    console.error("Scan error:", error);
    showError(`Scan failed: ${error.message}`);
    
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Tokens";
    
    scanResults.innerHTML = `
      <div class="error-message">
        <p>❌ Scan failed on ${walletInfo.chainName}</p>
        <p>Error: ${error.message}</p>
        <p class="hint">Chain type: ${walletInfo.chainType.toUpperCase()}</p>
        <button onclick="scanTokens()" class="retry-btn">Retry Scan</button>
      </div>
    `;
  }
}

// Scan EVM tokens
async function scanEVMTokens() {
  const tokens = [];
  const address = walletInfo.address;
  
  try {
    // Get provider from AppKit
    let provider;
    try {
      provider = await appKit.getProvider();
    } catch (error) {
      console.warn("Failed to get provider from AppKit, using fallback RPC");
      provider = new ethers.JsonRpcProvider(getRPCEndpoint(walletInfo.chainId));
    }
    
    const ethersProvider = provider instanceof ethers.BrowserProvider 
      ? provider 
      : new ethers.BrowserProvider(provider);
    
    // Get native token balance
    try {
      const nativeBalance = await ethersProvider.getBalance(address);
      const nativeSymbol = walletInfo.nativeCurrency || 'ETH';
      
      tokens.push({
        type: 'native',
        symbol: nativeSymbol,
        name: `${walletInfo.chainName} Native`,
        balance: ethers.formatEther(nativeBalance),
        decimals: 18,
        address: 'native',
        value: parseFloat(ethers.formatEther(nativeBalance)),
        chain: walletInfo.chainName
      });
    } catch (error) {
      console.warn("Failed to get native balance:", error);
    }
    
    // Check common tokens for this chain
    const chainTokens = COMMON_TOKENS[walletInfo.chainId] || {};
    
    // Process tokens in parallel with rate limiting
    const tokenPromises = Object.entries(chainTokens).map(async ([symbol, tokenAddress]) => {
      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, ethersProvider);
        
        const [balance, decimals, name] = await Promise.all([
          tokenContract.balanceOf(address),
          tokenContract.decimals(),
          tokenContract.name()
        ]);
        
        if (balance > 0n) {
          const formattedBalance = ethers.formatUnits(balance, decimals);
          return {
            type: 'erc20',
            symbol: symbol,
            name: name,
            balance: formattedBalance,
            decimals: decimals,
            address: tokenAddress,
            value: parseFloat(formattedBalance),
            chain: walletInfo.chainName
          };
        }
      } catch (error) {
        console.warn(`Failed to fetch token ${symbol}:`, error);
        return null;
      }
    });
    
    const tokenResults = await Promise.all(tokenPromises);
    tokenResults.forEach(token => {
      if (token) tokens.push(token);
    });
    
    // Sort by value
    tokens.sort((a, b) => b.value - a.value);
    
    return tokens;
    
  } catch (error) {
    throw new Error(`EVM scan failed: ${error.message}`);
  }
}

// Scan non-EVM tokens (placeholder with API integration)
async function scanNonEVMTokens() {
  const tokens = [];
  
  // This is where you'd integrate with chain-specific APIs
  // For now, we'll return a placeholder
  
  tokens.push({
    type: 'native',
    symbol: walletInfo.nativeCurrency,
    name: `${walletInfo.chainName} Native`,
    balance: 'Requires chain-specific API',
    decimals: getChainDecimals(walletInfo.chainType),
    address: 'native',
    value: 0,
    chain: walletInfo.chainName,
    note: `Install ${walletInfo.chainType.toUpperCase()} SDK for full scanning`
  });
  
  // Add placeholder for common tokens based on chain type
  if (COMMON_TOKENS[walletInfo.chainType]) {
    Object.entries(COMMON_TOKENS[walletInfo.chainType]).forEach(([symbol, address]) => {
      tokens.push({
        type: walletInfo.chainType,
        symbol: symbol,
        name: `${symbol} Token`,
        balance: 'Requires API integration',
        decimals: getChainDecimals(walletInfo.chainType),
        address: address.substring(0, 20) + '...',
        value: 0,
        chain: walletInfo.chainName,
        note: 'Chain-specific API required'
      });
    });
  }
  
  return tokens;
}

// Get chain decimals
function getChainDecimals(chainType) {
  const decimals = {
    solana: 9,
    cosmos: 6,
    polkadot: 10,
    cardano: 6,
    near: 24,
    tron: 6,
    algorand: 6,
    tezos: 6,
    bitcoin: 8,
    evm: 18
  };
  
  return decimals[chainType] || 18;
}

// Display scan results
function displayScanResults(tokens) {
  if (!scanResults) return;
  
  if (tokens.length === 0) {
    scanResults.innerHTML = `
      <div class="no-tokens">
        <p>📭 No tokens detected on ${walletInfo.chainName}</p>
        <p class="hint">Wallet scanning requires ${walletInfo.chainType.toUpperCase()} API integration</p>
        <div class="api-hint">
          <p><strong>To enable full scanning:</strong></p>
          <ul>
            <li>For EVM chains: Already working</li>
            <li>For ${walletInfo.chainType.toUpperCase()}: Install chain SDK</li>
            <li>Contact us for full multichain API</li>
          </ul>
        </div>
      </div>
    `;
    return;
  }

  const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
  const hasRealBalances = tokens.some(t => t.value > 0);
  
  scanResults.innerHTML = `
    <div class="tokens-container">
      <div class="tokens-header">
        <h3>💰 ${walletInfo.chainName} Tokens (${tokens.length})</h3>
        ${hasRealBalances ? `<div class="total-value">Total: ${totalValue.toFixed(4)}</div>` : ''}
      </div>
      ${!hasRealBalances ? `<div class="api-warning">
        ⚠️ Chain API not integrated. Install ${walletInfo.chainType.toUpperCase()} SDK for real balances.
      </div>` : ''}
      <div class="tokens-list">
        ${tokens.map(token => `
          <div class="token-card ${token.type}">
            <div class="token-header">
              <div class="token-symbol">${token.symbol}</div>
              <div class="token-badge">${token.chain}</div>
            </div>
            <div class="token-body">
              <div class="token-name">${token.name}</div>
              <div class="token-balance">
                <span class="balance-value">${token.balance}</span>
              </div>
              ${token.address !== 'native' ? `
                <div class="token-address" title="${token.address}">
                  ${token.address.length > 30 ? token.address.substring(0, 20) + '...' : token.address}
                </div>
              ` : ''}
              ${token.note ? `<div class="token-note">${token.note}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Reset display
function resetDisplay() {
  if (connectBtn) {
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect Wallet";
  }
  
  if (disconnectBtn) {
    disconnectBtn.style.display = "none";
  }
  
  if (scanBtn) {
    scanBtn.disabled = true;
  }
  
  if (walletInfoEl) {
    walletInfoEl.innerHTML = '<p class="empty-state">No wallet connected</p>';
  }
  
  if (chainsInfo) {
    chainsInfo.innerHTML = '<p class="empty-state">Connect wallet to see all networks</p>';
  }
  
  if (scanResults) {
    scanResults.innerHTML = '<p class="empty-state">Scan results will appear here</p>';
  }
}

// Reset wallet
function resetWallet() {
  isConnected = false;
  walletInfo = {
    address: null,
    chainId: null,
    chainType: null,
    walletName: null,
    connector: null
  };
  resetDisplay();
}

// Show message
function showMessage(message) {
  if (status) {
    status.textContent = message;
    status.className = "status-message";
  }
}

// Show error
function showError(message) {
  if (status) {
    status.textContent = message;
    status.className = "status-error";
  }
}

// Tab switching for chains
window.showChainTab = function(tab) {
  const evmChains = document.getElementById("evm-chains");
  const nonEvmChains = document.getElementById("non-evm-chains");
  const tabBtns = document.querySelectorAll(".tab-btn");
  
  if (tab === 'evm') {
    evmChains.style.display = "grid";
    nonEvmChains.style.display = "none";
    tabBtns[0].classList.add("active");
    tabBtns[1].classList.remove("active");
  } else {
    evmChains.style.display = "none";
    nonEvmChains.style.display = "grid";
    tabBtns[0].classList.remove("active");
    tabBtns[1].classList.add("active");
  }
};

// Initialize everything
async function initialize() {
  try {
    // Initialize DOM
    if (!initializeDOM()) {
      showError("Failed to initialize page elements");
      return;
    }
    
    // Initialize AppKit
    const appKitInitialized = await initializeAppKit();
    if (!appKitInitialized) {
      showError("Failed to initialize wallet connector");
      connectBtn.disabled = true;
      return;
    }
    
    // Setup listeners
    setupStateListeners();
    
    // Setup event listeners
    if (connectBtn) {
      connectBtn.addEventListener("click", connectWallet);
    }
    
    if (disconnectBtn) {
      disconnectBtn.addEventListener("click", disconnectWallet);
    }
    
    if (scanBtn) {
      scanBtn.addEventListener("click", scanTokens);
    }
    
    // Check initial state
    if (appKit) {
      const initialState = appKit.getState();
      if (initialState.isConnected && initialState.account) {
        await handleWalletConnected(initialState);
      }
    }
    
    showMessage("Ready to connect any wallet");
    
  } catch (error) {
    console.error("Initialization error:", error);
    showError("Failed to initialize: " + error.message);
  }
}

// Global functions for HTML
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.scanTokens = scanTokens;
window.showChainTab = showChainTab;

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
