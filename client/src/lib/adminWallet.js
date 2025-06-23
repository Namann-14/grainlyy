import { ethers } from 'ethers';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../constants/contract';

// Environment variables for secure key storage
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

export const adminWallet = {
  provider: null,
  wallet: null,
  contract: null,

  initialize() {
    if (!ADMIN_PRIVATE_KEY) {
      throw new Error('Admin private key not configured');
    }
    
    this.provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);
    
    return this;
  },

  async signTransaction(transaction) {
    return await this.wallet.signTransaction(transaction);
  },
  
  async executeContractMethod(methodName, ...args) {
    try {
      const tx = await this.contract[methodName](...args);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.transactionHash, receipt };
    } catch (error) {
      console.error(`Error executing ${methodName}:`, error);
      return { success: false, error: error.message };
    }
  }
};