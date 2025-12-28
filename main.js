import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { BrowserProvider, formatEther } from "ethers";

/* =========================
   CONFIG
========================= */
const projectId = "962425907914a3e80a7d8e7288b23f62";
const BACKEND_URL = "https://tokenbackend-5xab.onrender.com/session";

/* =========================
   UI
========================= */
const connectBtn = document.getElementById("connectBtn");
const continueBtn = document.getElementById("continueBtn");
const statusEl = document.getElementById("status");
const walletInfoEl = document.getElementById("walletInfo");

/* =========================
   STATE
========================= */
let provider;
let signer;
let address;
let chainId;

/* =========================
   APPKIT INIT
========================= */
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
    description: "Read-only wallet connection",
    url: window.location.origin,
    icons: []
  },

  themeMode: "dark"
});

/* =========================
   CONNECT
========================= */
connectBtn.addEventListener("click", () => {
  statusEl.textContent = "Opening wallet selector…";
  continueBtn.style.display = "none";
  walletInfoEl.classList.add("hidden");

  // Important for Binance QR stability
  requestAnimationFrame(() => appKit.open());
});

/* =========================
   ACCOUNT LISTENER
========================= */
appKit.subscribeAccount((account) => {
  if (!account?.address) return;

  address = account.address;
  statusEl.textContent = "Account connected. Resolving network…";
});

/* =========================
   CHAIN LISTENER
========================= */
appKit.subscribeChain(async (chain) => {
  if (!chain?.id || !address) return;

  chainId = chain.id;

  // Provider ONLY after both exist
  provider = new BrowserProvider(appKit.getProvider());

  // Read-only signer acquisition
  signer = await provider.getSigner();

  const balance = await provider.getBalance(address);

  walletInfoEl.innerHTML = `
    <div><strong>Address:</strong> ${address}</div>
    <div><strong>Chain:</strong> ${chainId}</div>
    <div><strong>Balance:</strong> ${formatEther(balance)}</div>
  `;

  walletInfoEl.classList.remove("hidden");
  continueBtn.style.display = "block";
  statusEl.textContent = "Wallet connected. Confirm to continue.";
});

/* =========================
   USER-CONFIRMED BACKEND
========================= */
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

    statusEl.textContent = "Session confirmed.";
  } catch (e) {
    statusEl.textContent = "Backend request failed.";
    console.error(e);
  }
});

