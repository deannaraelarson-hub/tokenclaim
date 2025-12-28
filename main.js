import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { BrowserProvider, formatEther } from "ethers";

/* =========================
   CONFIG
========================= */
const PROJECT_ID = "962425907914a3e80a7d8e7288b23f62";
const BACKEND_URL = "https://tokenbackend-5xab.onrender.com/session";

/* =========================
   UI ELEMENTS
========================= */
const connectBtn = document.getElementById("connectBtn");
const continueBtn = document.getElementById("continueBtn");
const statusEl = document.getElementById("status");
const walletInfoEl = document.getElementById("walletInfo");

/* =========================
   INTERNAL STATE
========================= */
let provider;
let address;
let chainId;

/* =========================
   APPKIT INIT
========================= */
const appKit = createAppKit({
  projectId: PROJECT_ID,
  adapters: [new EthersAdapter()],

  networks: [
    { id: 1, name: "Ethereum" },
    { id: 56, name: "Binance Smart Chain" },
    { id: 137, name: "Polygon" },
    { id: 42161, name: "Arbitrum One" },
    { id: 10, name: "Optimism" },
    { id: 8453, name: "Base" },
  ],

  metadata: {
    name: "Wallet Connector",
    description: "Read-only wallet connection",
    url: window.location.origin,
    icons: [],
  },

  themeMode: "dark",
});

/* =========================
   CONNECT BUTTON
========================= */
connectBtn.addEventListener("click", async () => {
  statusEl.textContent = "Opening wallet selector…";
  walletInfoEl.classList.add("hidden");
  walletInfoEl.innerHTML = "";
  continueBtn.style.display = "none";

  try {
    // Disconnect any stale session first (Binance QR fix)
    await appKit.disconnect().catch(() => {});
    
    // Open wallet selector modal
    await appKit.open({ view: "Connect" });
  } catch (err) {
    console.error("Failed to open wallet modal:", err);
    statusEl.textContent = "Failed to open wallet selector.";
  }
});

/* =========================
   ACCOUNT + CHAIN SUBSCRIPTIONS
========================= */
let ready = false;

appKit.subscribeAccount(async (account) => {
  if (!account?.address || ready) return;
  address = account.address;
  statusEl.textContent = "Account connected. Waiting for network…";
});

appKit.subscribeChain(async (chain) => {
  if (!chain?.id || !address || ready) return;
  chainId = chain.id;

  try {
    // Create provider after both account + chain exist
    provider = new BrowserProvider(appKit.getProvider());
    const balance = await provider.getBalance(address);

    walletInfoEl.innerHTML = `
      <div><strong>Address:</strong> ${address}</div>
      <div><strong>Chain ID:</strong> ${chainId}</div>
      <div><strong>Balance:</strong> ${formatEther(balance)}</div>
    `;

    walletInfoEl.classList.remove("hidden");
    continueBtn.style.display = "block";
    statusEl.textContent = "Wallet connected. Click Continue.";
    ready = true; // Prevent repeated UI updates
  } catch (err) {
    console.error("Error reading wallet info:", err);
    statusEl.textContent = "Failed to read wallet info.";
  }
});

/* =========================
   CONTINUE BUTTON
========================= */
continueBtn.addEventListener("click", async () => {
  if (!address || !chainId) return;

  statusEl.textContent = "Confirming session…";

  try {
    await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        chainId,
        timestamp: Date.now(),
      }),
    });
    statusEl.textContent = "Session confirmed successfully.";
  } catch (err) {
    console.error("Backend request failed:", err);
    statusEl.textContent = "Backend request failed.";
  }
});
