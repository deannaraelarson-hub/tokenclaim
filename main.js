import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";

/* ---------------------------
   CONFIG
---------------------------- */
const projectId = "962425907914a3e80a7d8e7288b23f62";

const BACKEND_URL = "https://tokenbackend-5xab.onrender.com/session";

/* ---------------------------
   UI ELEMENTS
---------------------------- */
const connectBtn = document.getElementById("connectBtn");
const statusEl = document.getElementById("status");
const tokensEl = document.getElementById("tokens");

/* ---------------------------
   INTERNAL STATE
---------------------------- */
let backendTriggered = false;

/* ---------------------------
   APPKIT INITIALIZATION
---------------------------- */
const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  projectId,

  // IMPORTANT: common EVM chains ONLY
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

/* ---------------------------
   CONNECT BUTTON
---------------------------- */
connectBtn.addEventListener("click", async () => {
  try {
    backendTriggered = false;
    statusEl.textContent = "Opening wallet modal...";
    if (tokensEl) tokensEl.innerHTML = "";

    // CRITICAL: kills stale WalletConnect sessions (Binance fix)
    await appKit.disconnect();
    await appKit.open();

  } catch (err) {
    console.error("Modal error:", err);
    statusEl.textContent = "Failed to open wallet modal";
  }
});

/* ---------------------------
   STATE SUBSCRIPTION
---------------------------- */
appKit.subscribeState(async (state) => {
  if (!state.isConnected) return;

  const account = appKit.account;
  const chain = appKit.chain;

  // Wait for full hydration
  if (!account?.address || !chain?.id) return;
  if (backendTriggered) return;

  backendTriggered = true;

  statusEl.textContent =
    `Connected\nAddress: ${account.address}\nChain ID: ${chain.id}`;

  // Trigger backend (session logging only)
  triggerBackend(account.address, chain.id);

  // Read-only token scan
  fetchTokens(account.address, chain.id);
});

/* ---------------------------
   BACKEND TRIGGER (SAFE)
---------------------------- */
async function triggerBackend(address, chainId) {
  try {
    await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, chainId })
    });
  } catch (err) {
    console.error("Backend trigger failed:", err);
  }
}

/* ---------------------------
   READ-ONLY TOKEN DISCOVERY
---------------------------- */
async function fetchTokens(address, chainId) {
  if (!tokensEl) return;

  tokensEl.innerHTML = "Fetching tokens...";

  try {
    const res = await fetch(
      `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=ckey_demo`
    );

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

      return `
        <div>
          <strong>${t.contract_ticker_symbol || "TOKEN"}</strong>
          : ${amount}
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Token fetch failed:", err);
    tokensEl.innerHTML = "Token scan failed.";
  }
}
