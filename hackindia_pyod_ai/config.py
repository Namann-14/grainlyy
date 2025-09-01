import os

# Blockchain credentials
RPC_URL = os.getenv("NEXT_PUBLIC_RPC_URL", "https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOK")
CONTRACT_ADDRESS = os.getenv("DCVTOKEN_ADDRESS", "0xf0905E91c81888E921AD14C1e1393d44112912dc")
PRIVATE_KEY = os.getenv("ADMIN_PRIVATE_KEY", "cc7a9fa8676452af481a0fd486b9e2f500143bc63893171770f4d76e7ead33ec")
