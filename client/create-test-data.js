const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Define schemas
const DeliverySignupRequestSchema = new mongoose.Schema({
    name: String,
    phoneNumber: String,
    walletAddress: String,
    vehicleType: String,
    status: { type: String, default: 'approved' },
    blockchainTxHash: String,
    createdAt: { type: Date, default: Date.now }
});

const ShopkeeperSchema = new mongoose.Schema({
    name: String,
    walletAddress: String,
    shopName: String,
    area: String,
    status: { type: String, default: 'approved' },
    createdAt: { type: Date, default: Date.now }
});

// Create models
const DeliverySignupRequest = mongoose.model('DeliverySignupRequest', DeliverySignupRequestSchema);
const Shopkeeper = mongoose.model('Shopkeeper', ShopkeeperSchema);

async function createTestData() {
    try {
        await connectDB();

        console.log('🧪 Creating test data for login testing...');

        // Test wallet addresses
        const testWallets = [
            '0x1234567890123456789012345678901234567890',
            '0x9876543210987654321098765432109876543210',
            '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'
        ];

        // Create test delivery agents
        const deliveryAgents = [
            {
                name: 'Test Delivery Agent 1',
                phoneNumber: '+91-9876543210',
                phone: '+91-9876543210', // Add both fields
                walletAddress: testWallets[0].toLowerCase(),
                vehicleType: 'Motorcycle',
                status: 'approved',
                blockchainTxHash: '0xtestdelivery1'
            },
            {
                name: 'Test Delivery Agent 2', 
                phoneNumber: '+91-9876543211',
                phone: '+91-9876543211', // Add both fields
                walletAddress: testWallets[1].toLowerCase(),
                vehicleType: 'Bicycle',
                status: 'approved',
                blockchainTxHash: '0xtestdelivery2'
            }
        ];

        // Create test shopkeepers
        const shopkeepers = [
            {
                name: 'Test Shopkeeper 1',
                walletAddress: testWallets[0].toLowerCase(),
                shopName: 'Test Ration Shop 1',
                area: 'Test Area 1',
                status: 'approved'
            },
            {
                name: 'Test Shopkeeper 2',
                walletAddress: testWallets[2].toLowerCase(),
                shopName: 'Test Ration Shop 2', 
                area: 'Test Area 2',
                status: 'approved'
            }
        ];

        // Clear existing test data
        await DeliverySignupRequest.deleteMany({ 
            walletAddress: { $in: testWallets.map(w => w.toLowerCase()) }
        });
        await Shopkeeper.deleteMany({ 
            walletAddress: { $in: testWallets.map(w => w.toLowerCase()) }
        });

        // Insert new test data
        await DeliverySignupRequest.insertMany(deliveryAgents);
        console.log('✅ Created test delivery agents');

        await Shopkeeper.insertMany(shopkeepers);
        console.log('✅ Created test shopkeepers');

        console.log('🎉 Test data created successfully!');
        console.log('📝 Test wallet addresses:');
        testWallets.forEach((wallet, index) => {
            console.log(`  ${index + 1}. ${wallet}`);
        });

        console.log('💡 You can now test login with these wallet addresses:');
        console.log(`   - ${testWallets[0]} (both delivery agent and shopkeeper)`);
        console.log(`   - ${testWallets[1]} (delivery agent only)`);
        console.log(`   - ${testWallets[2]} (shopkeeper only)`);

    } catch (error) {
        console.error('❌ Error creating test data:', error);
    } finally {
        mongoose.connection.close();
    }
}

createTestData();
