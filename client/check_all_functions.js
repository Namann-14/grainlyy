const { keccak256, toUtf8Bytes } = require('ethers');

function getSelector(functionSignature) {
  return keccak256(toUtf8Bytes(functionSignature)).slice(0, 10);
}

// More token-related functions that might be needed
const functions = [
  // Token generation
  'generateTokenForConsumer(uint256)',
  'generateTokensForCategory(string)',
  'generateMonthlyTokensForAll()',
  'bulkGenerateTokens()',
  
  // Token management 
  'mintTokenToConsumer(uint256,uint256)',
  'setTokenPrice(uint256)',
  'setRationAmount(uint256)',
  
  // Access control
  'onlyOwner()',
  'onlyAdmin()',
  'owner()',
  'hasRole(bytes32,address)',
  
  // State management
  'paused()',
  'pause()',
  'unpause()',
  
  // ERC1155 functions
  'mint(address,uint256,uint256,bytes)',
  'mintBatch(address,uint256[],uint256[],bytes)',
  'balanceOf(address,uint256)',
  'setURI(string)'
];

// Available selectors from our Diamond
const availableSelectors = [
  // All the ones we know from decode_facets
  '0x1f931c1c', '0x7a0ed627', '0xadfca15e', '0x52ef6b2c', '0xcdffacc6', '0x01ffc9a7',
  '0xe6f9e4c0', '0x3791af5a', '0x6569720f', '0xe3cb6c5d', '0x8b6ba8bd',
  '0xfa59936a', '0x907c6e23', '0xbf50f081', '0x7c420d92', '0xb6d746d9',
  '0xd6a9c8e0', '0x1d25b941', '0x1c9019e1', '0xcd51886b', '0x8456cb59', '0x3f4ba83a',
  '0x1471053b', '0x6ff72eae', '0xf7bb3eb6', '0xbca3bec2', '0x29dc9d88',
  '0x150cac78', '0x8d06e826', '0x416782ec', '0xed44daa5', '0xe430470c',
  '0xd9708d48', '0x57fa0ba0', '0xe66e00f8', '0x84d9e06b', '0x5fe26e52', 
  '0x5f7c329c', '0x607fdd32', '0x1cc1f3df', '0xe8c639de', '0x1750c116',
  '0x79c6e00d', '0x4a58e1e7', '0xa3521b65', '0x398fdb82', '0xf9be9f38',
  '0xa93b5b5e', '0x99d5bc35', '0x6dcdb34c', '0x951a0e83', '0xe0d22a33',
  '0xddd1b67e', '0xce41607a', '0xf93336e2', '0xefd26d59', '0x55565703',
  '0x97e79936', '0xdf878de8', '0x800eab54', '0x302f38fb', '0xd2fda83d',
  '0xc1d63e00', '0x852032a5', '0x7fbcca62', '0x493f120c', '0xfcf3348a',
  '0x961795d3', '0x03d4ac29', '0x76000d96', '0x2886eca1', '0xd924eb19',
  '0x910e6bb9', '0xc1d446be', '0x3a23cc0a', '0x52d5a83d', '0x47fb9644',
  '0x5bdd4277', '0x1a07b9c9', '0x3f7cf2cb', '0x8fbf3b63'
];

console.log('🔍 Function Availability Analysis:');
console.log('====================================');

let availableCount = 0;
let missingCount = 0;

functions.forEach(func => {
  const selector = getSelector(func);
  const isAvailable = availableSelectors.includes(selector);
  const status = isAvailable ? '✅ AVAILABLE' : '❌ MISSING';
  console.log(`${status} ${selector} - ${func}`);
  
  if (isAvailable) {
    availableCount++;
  } else {
    missingCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`Available functions: ${availableCount}`);
console.log(`Missing functions: ${missingCount}`);
console.log(`Total checked: ${functions.length}`);

if (missingCount > 0) {
  console.log('\n🚨 Critical missing functions may be preventing token generation!');
}
