import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";

const projectId = "962425907914a3e80a7d8e7288b23f62";

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
    name: "Local WalletConnect Test",
    description: "Testing WalletConnect modal locally",
    url: window.location.origin,
    icons: []
  },
  themeMode: "dark",
  features: {
    analytics: false
  }
});

const btn = document.getElementById("connectBtn");
const status = document.getElementById("status");

btn.addEventListener("click", async () => {
  try {
    await appKit.open();
  } catch (err) {
    console.error("MODAL FAILED:", err);
    status.textContent = "Wallet modal failed to open";
  }
});

appKit.subscribeState((state) => {
  if (state.isConnected) {
    status.textContent = "Wallet connected successfully";
  }
});
