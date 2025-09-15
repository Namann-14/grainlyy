# OTP Verification System for Delivery Confirmation

## Overview

This system implements a secure OTP (One-Time Password) verification mechanism for confirming ration deliveries between delivery agents and shopkeepers. The OTP is stored in MongoDB with a 5-minute TTL (Time To Live) for enhanced security.

## Architecture

### Backend Components

1. **MongoDB OTP Model** (`/src/lib/db/models/OTP.js`)
   - Stores OTP data with 5-minute TTL
   - Tracks pickup ID, agent address, shopkeeper address
   - Automatic cleanup of expired OTPs

2. **API Routes** (`/src/app/api/otp/`)
   - `POST /api/otp/generate` - Generate new OTP
   - `POST /api/otp/verify` - Verify OTP
   - `GET /api/otp/admin` - Admin statistics
   - `DELETE /api/otp/admin` - Clean expired OTPs

3. **OTP Service** (`/src/lib/services/otpService.js`)
   - Frontend utility for OTP operations
   - Handles API communication
   - Provides validation and formatting utilities

## Workflow

### 1. OTP Generation (Delivery Agent)

1. Agent completes location verification
2. Agent clicks "Generate OTP" button
3. System creates 6-digit OTP in MongoDB
4. OTP expires after 5 minutes
5. Agent shares OTP with shopkeeper

### 2. OTP Verification (Shopkeeper)

1. Shopkeeper receives delivery
2. Agent provides 6-digit OTP
3. Shopkeeper enters OTP in verification modal
4. System validates OTP against MongoDB
5. If valid, delivery is confirmed and OTP is marked as used

## API Endpoints

### Generate OTP
```http
POST /api/otp/generate
Content-Type: application/json

{
  "pickupId": "123",
  "deliveryAgentAddress": "0x1234...",
  "shopkeeperAddress": "0x5678...",
  "deliveryLocation": "Warehouse A",
  "rationAmount": 50,
  "category": "Rice"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP generated successfully",
  "data": {
    "pickupId": "123",
    "otpCode": "567890",
    "expiresAt": "2025-09-15T10:05:00.000Z",
    "remainingTime": 300
  }
}
```

### Verify OTP
```http
POST /api/otp/verify
Content-Type: application/json

{
  "pickupId": "123",
  "shopkeeperAddress": "0x5678...",
  "otpCode": "567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully. Transaction approved.",
  "data": {
    "pickupId": "123",
    "deliveryAgentAddress": "0x1234...",
    "shopkeeperAddress": "0x5678...",
    "verifiedAt": "2025-09-15T10:03:45.000Z",
    "deliveryDetails": {
      "location": "Warehouse A",
      "rationAmount": 50,
      "category": "Rice"
    }
  }
}
```

## Security Features

### 1. Time-Based Expiration
- OTPs expire after exactly 5 minutes
- MongoDB TTL index automatically removes expired documents
- Manual cleanup function available for backup

### 2. One-Time Use
- Each OTP can only be used once
- Used OTPs are marked with `isUsed: true`
- Prevents replay attacks

### 3. Address Validation
- OTPs are tied to specific delivery agent and shopkeeper addresses
- Cross-verification prevents unauthorized usage
- Case-insensitive address matching

### 4. Pickup ID Binding
- Each OTP is bound to a specific pickup ID
- Prevents OTP reuse across different deliveries

## Database Schema

```javascript
{
  pickupId: String,           // Unique pickup identifier
  deliveryAgentAddress: String, // Agent's wallet address
  shopkeeperAddress: String,   // Shopkeeper's wallet address
  otpCode: String,            // 6-digit OTP
  generatedAt: Date,          // Creation timestamp
  isUsed: Boolean,            // Usage status
  usedAt: Date,              // Usage timestamp
  deliveryLocation: String,   // Optional delivery location
  rationAmount: Number,       // Optional ration amount
  category: String           // Optional ration category
}
```

## Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/grainlyy-otp
ADMIN_CLEANUP_KEY=your-admin-key-here
```

## Usage Examples

### Frontend Integration (Delivery Agent)

```javascript
import OTPService from '@/lib/services/otpService';

// Generate OTP
const result = await OTPService.generateOTP({
  pickupId: "123",
  deliveryAgentAddress: agentAddress,
  shopkeeperAddress: shopAddress,
  deliveryLocation: "Warehouse A",
  rationAmount: 50,
  category: "Rice"
});

if (result.success) {
  console.log("OTP Generated:", result.data.otpCode);
  console.log("Expires at:", result.data.expiresAt);
}
```

### Frontend Integration (Shopkeeper)

```javascript
import OTPService from '@/lib/services/otpService';

// Verify OTP
const result = await OTPService.verifyOTP({
  pickupId: "123",
  shopkeeperAddress: shopAddress,
  otpCode: "567890"
});

if (result.success) {
  console.log("OTP Verified! Transaction approved.");
  // Proceed with delivery confirmation
}
```

## Error Handling

### Common Error Codes

- `MISSING_REQUIRED_FIELDS` - Required parameters not provided
- `INVALID_OTP_FORMAT` - OTP must be 6 digits
- `OTP_INVALID_OR_EXPIRED` - OTP not found or expired
- `OTP_EXPIRED` - OTP has exceeded 5-minute limit
- `UNAUTHORIZED` - Admin access denied

### Frontend Error Handling

```javascript
try {
  const result = await OTPService.verifyOTP(params);
  if (!result.success) {
    switch (result.error) {
      case 'OTP_EXPIRED':
        showError("OTP has expired. Please request a new one.");
        break;
      case 'OTP_INVALID_OR_EXPIRED':
        showError("Invalid OTP. Please check and try again.");
        break;
      default:
        showError("Verification failed. Please try again.");
    }
  }
} catch (error) {
  showError("Network error. Please check your connection.");
}
```

## Admin Features

### Get Statistics
```http
GET /api/otp/admin?adminKey=your-admin-key
```

### Clean Expired OTPs
```http
DELETE /api/otp/admin?adminKey=your-admin-key
```

## Testing

### Test OTP Generation
1. Navigate to delivery dashboard
2. Select a delivery
3. Verify location
4. Click "Generate OTP"
5. Verify OTP is created in MongoDB

### Test OTP Verification
1. Navigate to shopkeeper dashboard
2. Find a delivered item
3. Click "Verify OTP & Confirm"
4. Enter the generated OTP
5. Verify transaction is approved

## Monitoring

- Check MongoDB logs for OTP operations
- Monitor TTL index performance
- Track OTP generation/verification rates
- Set up alerts for failed verifications

## Production Considerations

1. **Database Indexing**: Ensure proper indexes for performance
2. **Rate Limiting**: Implement rate limits on API endpoints
3. **Logging**: Add comprehensive logging for audit trails
4. **Monitoring**: Set up monitoring for system health
5. **Backup**: Regular backups of critical data
6. **Security**: Implement proper authentication for admin endpoints