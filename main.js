import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { BrowserProvider, formatEther } from "ethers";

/* ==================================================
   CONFIG
================================================== */
const projectId = "962425907914a3e80a7d8e7288b23f62";
const BACKEND_URL = "https://tokenbackend-5xab.onrender.com/session";

/* ==================================================
   UI ELEMENTS
================================================== */
const connectBtn = document.getElementById("connectBtn");
const continueBtn = document.getElementById("continueBtn");
const statusEl = document.getElementById("status");
const walletInfoEl = document.getElementById("walletInfo");

/* ==================================================
   INTERNAL STATE
================================================== */
let provider = null;
let address = null;
let chainId = null;
let userInitiated = false;

/* ==================================================
   APPKIT INITIALIZATION
   (NO AUTO SESSION HIJACK)
================================================== */
const appKit = createAppKit({
  projectId,
  adapters: [new EthersAdapter()],

  networks: [
    { id: 1, name: "Ethereum" },
    { id: 56, name: "Binance Smart Chain" },
    { id: 137, name: "Polygon" },
    { id: 42161, name: "Arbitrum One" },
    { id: 10, name: "Optimism" },
    { id: 8453, name: "Base" }
  ],

  metadata: {
    name: "Wallet Connector",
    description: "Read-only wallet connection demo",
    url: window.location.origin,
    icons: []
  },

  themeMode: "dark",

  // IMPORTANT: keep AppKit passive
  enableAnalytics: false,
  enableOnramp: false
});

/* ==================================================
   CONNECT BUTTON
   (FORCES FRESH MODAL — BINANCE SAFE)
================================================== */
connectBtn.addEventListener("click", async () => {
  userInitiated = true;

  statusEl.textContent = "Opening wallet selector…";
  walletInfoEl.innerHTML = "";
  walletInfoEl.classList.add("hidden");
  continueBtn.style.display = "none";

  try {
    // Ensure no stale WC session (fixes Binance QR expiry)
    await appKit.disconnect().catch(() => {});
    await appKit.open({ view: "Connect" });
  } catch (e) {
    console.error(e);
    statusEl.textContent = "Failed to open wallet selector.";
  }
});

/* ==================================================
   ACCOUNT SUBSCRIPTION
   (IGNORES AUTO-REHYDRATION)
================================================== */
appKit.subscribeAccount((account) => {
  if (!userInitiated) return;
  if (!account?.address) return;

  address = account.address;
  statusEl.textContent = "Account connected. Resolving network…";
});

/* ==================================================
   CHAIN SUBSCRIPTION
   (FINAL READY STATE)
================================================== */
appKit.subscribeChain(async (chain) => {
  if (!userInitiated) return;
  if (!chain?.id || !address) return;

  chainId = chain.id;

  try {
    provider = new BrowserProvider(appKit.getProvider());
    const balance = await provider.getBalance(address);

    walletInfoEl.innerHTML = `
      <div><strong>Address:</strong> ${address}</div>
      <div><strong>Chain ID:</strong> ${chainId}</div>
      <div><strong>Native Balance:</strong> ${formatEther(balance)}</div>
    `;

    walletInfoEl.classList.remove("hidden");
    continueBtn.style.display = "block";
    statusEl.textContent = "Wallet connected. Confirm to continue.";
  } catch (e) {
    console.error(e);
    statusEl.textContent = "Failed to read wallet state.";
  }
});

/* ==================================================
   CONTINUE BUTTON
   (EXPLICIT USER ACTION → BACKEND)
================================================== */
continueBtn.addEventListener("click", async () => {
  statusEl.textContent = "Confirming session…";

  try {
    await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        chainId,
        timestamp: Date.now()
      })
    });

    statusEl.textContent = "Session confirmed successfully.";
  } catch (e) {
    console.error(e);
    statusEl.textContent = "Backend request failed.";
  }
});
