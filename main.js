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
let provider;
let signer;
let address;
let chainId;

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
    description: "Read-only wallet connection",
    url: window.location.origin,
    icons: []
  },

  themeMode: "dark"
});

/* ---------------------------
   CONNECT BUTTON
--------------------------- */
connectBtn.addEventListener("click", async () => {
  statusEl.textContent = "Opening wallet selector…";
  continueBtn.style.display = "none";
  walletInfoEl.classList.add("hidden");

  // Let AppKit fully mount before opening (Binance fix)
  requestAnimationFrame(() => {
    appKit.open();
  });
});

/* ---------------------------
   ACCOUNT SUBSCRIPTION
--------------------------- */
appKit.subscribeAccount(async (account) => {
  if (!account?.address) return;

  address = account.address;
  statusEl.textContent = "Account connected. Waiting for network…";
});

/* ---------------------------
   CHAIN SUBSCRIPTION
--------------------------- */
appKit.subscribeChain(async (chain) => {
  if (!chain?.id || !address) return;

  chainId = chain.id;

  // Provider MUST be created after both account + chain exist
  provider = new BrowserProvider(appKit.getProvider());
  signer = await provider.getSigner();

  const balance = await provider.getBalance(address);

  walletInfoEl.innerHTML = `
    <div><strong>Address:</strong> ${address}</div>
    <div><strong>Chain ID:</strong> ${chainId}</div>
    <div><strong>Native Balance:</strong> ${formatEther(balance)}</div>
  `;

  walletInfoEl.classList.remove("hidden");
  continueBtn.style.display = "block";
  statusEl.textContent = "Wallet ready. Confirm to continue.";
});

/* ---------------------------
   CONTINUE BUTTON
--------------------------- */
continueBtn.addEventListener("click", async () => {
  statusEl.textContent = "Confirming session…";

  try {
    await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, chainId })
    });

    statusEl.textContent = "Session confirmed successfully.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Backend request failed.";
  }
});
