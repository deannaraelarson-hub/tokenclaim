import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { BrowserProvider, formatEther } from "ethers";

/* ----------------------------------
   CONFIG
----------------------------------- */
const projectId = "962425907914a3e80a7d8e7288b23f62";
const BACKEND_URL = "https://tokenbackend-5xab.onrender.com/session";

/* ----------------------------------
   UI ELEMENTS
----------------------------------- */
const connectBtn = document.getElementById("connectBtn");
const continueBtn = document.getElementById("continueBtn");
const statusEl = document.getElementById("status");
const walletInfoEl = document.getElementById("walletInfo");

/* ----------------------------------
   INTERNAL STATE
----------------------------------- */
let provider = null;
let signer = null;
let accountAddress = null;
let chainId = null;

/* ----------------------------------
   APPKIT INITIALIZATION
----------------------------------- */
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

/* ----------------------------------
   CONNECT WALLET
----------------------------------- */
connectBtn.addEventListener("click", async () => {
  statusEl.textContent = "Opening wallet selector...";
  walletInfoEl.innerHTML = "";
  continueBtn.style.display = "none";

  // IMPORTANT:
  // ❌ DO NOT disconnect here
  // ❌ DO NOT trigger backend here
  await appKit.open();
});

/* ----------------------------------
   STATE SUBSCRIPTION
----------------------------------- */
appKit.subscribeState(async (state) => {
  if (!state.isConnected) return;

  const account = appKit.account;
  const chain = appKit.chain;

  // Wait for full hydration
  if (!account?.address || !chain?.id) return;

  accountAddress = account.address;
  chainId = chain.id;

  statusEl.textContent = "Wallet connected. Awaiting confirmation…";

  // Proper provider acquisition
  provider = new BrowserProvider(appKit.getProvider());
  signer = await provider.getSigner();

  const balance = await provider.getBalance(accountAddress);

  walletInfoEl.innerHTML = `
    <div><strong>Address:</strong> ${accountAddress}</div>
    <div><strong>Chain ID:</strong> ${chainId}</div>
    <div><strong>Native Balance:</strong> ${formatEther(balance)}</div>
  `;

  // Explicit user confirmation step
  continueBtn.style.display = "block";
});

/* ----------------------------------
   CONTINUE BUTTON (EXPLICIT ACTION)
----------------------------------- */
continueBtn.addEventListener("click", async () => {
  statusEl.textContent = "Session confirmed. Sending to backend…";

  try {
    await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: accountAddress,
        chainId
      })
    });

    statusEl.textContent = "Backend notified successfully.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Backend request failed.";
  }
});
