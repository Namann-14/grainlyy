#!/usr/bin/env python3
"""
Generate a new Ethereum private key and address
ONLY use this for test/development purposes!
"""

from web3 import Web3
import secrets

def generate_new_wallet():
    """Generate a new Ethereum wallet"""
    # Generate a random private key
    private_key = "0x" + secrets.token_hex(32)
    
    # Create account from private key
    account = Web3().eth.account.from_key(private_key)
    
    print("🔑 NEW ETHEREUM WALLET GENERATED")
    print("=" * 50)
    print(f"Private Key: {private_key}")
    print(f"Address: {account.address}")
    print("=" * 50)
    print("⚠️  SECURITY REMINDERS:")
    print("- NEVER share your private key publicly")
    print("- Store it securely (password manager, hardware wallet)")
    print("- This is for TESTNET only - don't use for mainnet funds")
    print("- Add the private key to Hugging Face Secrets only")
    
    return private_key, account.address

if __name__ == "__main__":
    generate_new_wallet()
