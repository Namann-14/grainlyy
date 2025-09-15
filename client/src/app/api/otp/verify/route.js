import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import OTP from '@/lib/db/models/OTP';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { pickupId, shopkeeperAddress, otpCode } = body;

    // Validate required fields
    if (!pickupId || !shopkeeperAddress || !otpCode) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: pickupId, shopkeeperAddress, otpCode',
        error: 'MISSING_REQUIRED_FIELDS'
      }, { status: 400 });
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otpCode)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid OTP format. OTP must be 6 digits.',
        error: 'INVALID_OTP_FORMAT'
      }, { status: 400 });
    }

    console.log(`🔍 Verifying OTP: ${otpCode} for Pickup #${pickupId}`);
    console.log(`🏪 Shopkeeper: ${shopkeeperAddress.slice(0, 8)}...${shopkeeperAddress.slice(-6)}`);

    // Verify OTP using the model method
    const verificationResult = await OTP.verifyOTP(pickupId, shopkeeperAddress, otpCode);

    if (!verificationResult.success) {
      console.log(`❌ OTP Verification Failed: ${verificationResult.message}`);
      return NextResponse.json({
        success: false,
        message: verificationResult.message,
        error: verificationResult.error
      }, { status: 400 });
    }

    console.log(`✅ OTP Verified Successfully for Pickup #${pickupId}`);
    console.log(`📍 Agent: ${verificationResult.otpDoc.deliveryAgentAddress.slice(0, 8)}...${verificationResult.otpDoc.deliveryAgentAddress.slice(-6)}`);
    console.log(`🏪 Shop: ${verificationResult.otpDoc.shopkeeperAddress.slice(0, 8)}...${verificationResult.otpDoc.shopkeeperAddress.slice(-6)}`);
    console.log(`⏰ Used at: ${verificationResult.otpDoc.usedAt}`);

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully. Transaction approved.',
      data: {
        pickupId: verificationResult.otpDoc.pickupId,
        deliveryAgentAddress: verificationResult.otpDoc.deliveryAgentAddress,
        shopkeeperAddress: verificationResult.otpDoc.shopkeeperAddress,
        verifiedAt: verificationResult.otpDoc.usedAt,
        deliveryDetails: {
          location: verificationResult.otpDoc.deliveryLocation,
          rationAmount: verificationResult.otpDoc.rationAmount,
          category: verificationResult.otpDoc.category
        }
      }
    });

  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    }, { status: 500 });
  }
}