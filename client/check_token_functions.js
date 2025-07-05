const { keccak256, toUtf8Bytes } = require('ethers');

function getSelector(functionSignature) {
  return keccak256(toUtf8Bytes(functionSignature)).slice(0, 10);
}

// Token generation functions from the ABI
const functions = [
  'bulkGenerateTokens()',
  'generateTokenForConsumer(uint256)',
  'generateTokensForCategory(string)',
  'generateTokensForShopkeeper(address)',
  'generateMonthlyTokensForAll()'
];

console.log('🔍 Token Generation Function Selectors:');
console.log('==========================================');

functions.forEach(func => {
  const selector = getSelector(func);
  console.log(`${func.padEnd(40)} -> ${selector}`);
});

// Check against known available selectors from decode_facets.js output
const availableSelectors = [
  // Facet 1
  '0x1f931c1c',
  // Facet 2 
  '0x7a0ed627', '0xadfca15e', '0x52ef6b2c', '0xcdffacc6', '0x01ffc9a7',
  // Facet 3
  '0xe6f9e4c0', '0x3791af5a', '0x6569720f', '0xe3cb6c5d', '0x8b6ba8bd',
  '0xfa59936a', '0x907c6e23', '0xbf50f081', '0x7c420d92', '0xb6d746d9',
  '0xd6a9c8e0', '0x1d25b941', '0x1c9019e1', '0xcd51886b', '0x8456cb59', '0x3f4ba83a',
  // Facet 4 
  '0x1471053b', '0x6ff72eae', '0xf7bb3eb6', '0xbca3bec2', '0x29dc9d88',
  '0x150cac78', '0x8d06e826', '0x416782ec', '0xed44daa5', '0xe430470c',
  // Facet 5
  '0xd9708d48', '0x57fa0ba0', '0xe66e00f8', '0x84d9e06b', '0x5fe26e52', 
  '0x5f7c329c', '0x607fdd32', '0x1cc1f3df', '0xe8c639de', '0x1750c116',
  '0x79c6e00d', '0x4a58e1e7', '0xa3521b65', '0x398fdb82', '0xf9be9f38',
  '0xa93b5b5e', '0x99d5bc35', '0x6dcdb34c', '0x951a0e83', '0xe0d22a33',
  '0xddd1b67e', '0xce41607a', '0xf93336e2', '0xefd26d59', '0x55565703',
  '0x97e79936', '0xdf878de8', '0x800eab54', '0x302f38fb', '0xd2fda83d',
  '0xc1d63e00',
  // Facet 6
  '0x852032a5', '0x7fbcca62', '0x493f120c', '0xfcf3348a', '0x961795d3',
  '0x03d4ac29', '0x76000d96', '0x2886eca1', '0xd924eb19', '0x910e6bb9',
  '0xc1d446be', '0x3a23cc0a', '0x52d5a83d', '0x47fb9644', '0x5bdd4277',
  '0x1a07b9c9', '0x3f7cf2cb', '0x8fbf3b63'
];

console.log('\n🎯 Availability Check:');
console.log('========================');

functions.forEach(func => {
  const selector = getSelector(func);
  const isAvailable = availableSelectors.includes(selector);
  const status = isAvailable ? '✅ AVAILABLE' : '❌ MISSING';
  console.log(`${status} ${selector} - ${func}`);
});
