import { ethers } from 'ethers';
import contractABI from '@/abi.json';

export const getContract = (signer) => {
  // Contract address - make sure this is correct!
  // const contractAddress = '0x8FA84E225F59A5d8451A097D78991C9e76692636';
  const contractAddress = '0x1c61F82aad05c30190C211c1E28f2dE28f1f8Ab8';
  
  
  try {
    if (!signer) {
      console.error("No signer provided to getContract");
      return null;
    }
    
    console.log("Creating contract with:", { 
      address: contractAddress, 
      signerAddress: signer.address || "Unknown" 
    });
    
    // Create contract instance with error handling
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    // Debug contract instance
    if (!contract) {
      console.error("Contract creation failed");
      return null;
    }
    
    return contract;
  } catch (error) {
    console.error("Error creating contract instance:", error);
    return null;
  }
};