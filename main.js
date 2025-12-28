import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { BrowserProvider, formatEther } from "ethers";

/* ---------------------------
   CONFIG
--------------------------- */
const projectId = "962425907914a3e80a7d8e7288b23f62";
const BACKEND_URL = "https://tokenbackend-5xab.onrender.com/session";

/* ---------------------------
   UI ELEMENTS
--------------------------- */
const connectBtn = document.getElementById("connectBtn");
const continueBtn = document.getElementById("continueBtn");
const statusEl = document.getElementById("status");
const walletInfoEl = document.getElementById("walletInfo");

/* ---------------------------
   INTERNAL STATE
--------------------------- */
let provider = null;
let signer = null;
let address = null;
let chainId = null;

/* ---------------------------
   APPKIT INITIALIZATION
--------------------------- */
const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  projectId,

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
    description: "Secure wallet connection demo",
    url: window.location.origin,
    icons: []
  },

  themeMode: "dark"
});

/* ---------------------------
   CONNECT BUTTON
--------------------------- */
connectBtn.addEventListener("click", async () => {
  try {
    statusEl.textContent = "Opening wallet selector…";
    walletInfoEl.innerHTML = "";
    continueBtn.style.display = "none";

    // IMPORTANT:
    // ❌ Do NOT disconnect here
    // Disconnecting breaks Binance QR
    await appKit.open();

  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to open wallet modal";
  }
});

/* ---------------------------
   STATE SUBSCRIPTION
--------------------------- */
appKit.subscribeState(async (state) => {
  if (!state.isConnected) return;

  const account = appKit.account;
  const chain = appKit.chain;

  // Wait for full wallet approval
  if (!account?.address || !chain?.id) return;

  address = account.address;
  chainId = chain.id;

  statusEl.textContent = "Wallet connected. Awaiting confirmation…";

  // ✅ Correct provider & signer acquisition (ethers v6)
  provider = new BrowserProvider(appKit.getProvider());
  signer = await provider.getSigner();

  const balance = await provider.getBalance(address);

  walletInfoEl.innerHTML = `
    <div><strong>Address:</strong> ${address}</div>
    <div><strong>Chain ID:</strong> ${chainId}</div>
    <div><strong>Native Balance:</strong> ${formatEther(balance)}</div>
  `;

  // Explicit user action step
  continueBtn.style.display = "block";
});

/* ---------------------------
   CONTINUE BUTTON
   (EXPLICIT USER ACTION)
--------------------------- */
continueBtn.addEventListener("click", async () => {
  statusEl.textContent = "Session confirmed. Sending to backend…";

  try {
    await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        chainId
      })
    });

    statusEl.textContent = "Backend notified successfully.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Backend request failed.";
  }
});
