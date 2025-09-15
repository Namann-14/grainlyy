import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import OTP from '@/lib/db/models/OTP';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      pickupId,
      deliveryAgentAddress,
      shopkeeperAddress,
      deliveryLocation,
      rationAmount,
      category
    } = body;

    // Validate required fields
    if (!pickupId || !deliveryAgentAddress || !shopkeeperAddress) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: pickupId, deliveryAgentAddress, shopkeeperAddress',
        error: 'MISSING_REQUIRED_FIELDS'
      }, { status: 400 });
    }

    // Check if there's already an active OTP for this pickup
    const existingOTP = await OTP.findOne({
      pickupId: pickupId.toString(),
      deliveryAgentAddress: deliveryAgentAddress.toLowerCase(),
      shopkeeperAddress: shopkeeperAddress.toLowerCase(),
      isUsed: false
    });

    if (existingOTP) {
      // Check if existing OTP is still valid (within 5 minutes)
      const now = new Date();
      const otpAge = (now - existingOTP.generatedAt) / 1000;
      
      if (otpAge < 300) { // Still valid
        return NextResponse.json({
          success: true,
          message: 'OTP already exists and is still valid',
          data: {
            pickupId: existingOTP.pickupId,
            otpCode: existingOTP.otpCode,
            expiresAt: new Date(existingOTP.generatedAt.getTime() + 5 * 60 * 1000),
            remainingTime: Math.max(0, 300 - otpAge)
          }
        });
      }
    }

    // Generate new OTP
    const otpDoc = await OTP.generateOTP(
      pickupId,
      deliveryAgentAddress,
      shopkeeperAddress,
      {
        deliveryLocation,
        rationAmount,
        category
      }
    );

    console.log(`🔐 OTP Generated: ${otpDoc.otpCode} for Pickup #${pickupId}`);
    console.log(`📍 Agent: ${deliveryAgentAddress.slice(0, 8)}...${deliveryAgentAddress.slice(-6)}`);
    console.log(`🏪 Shop: ${shopkeeperAddress.slice(0, 8)}...${shopkeeperAddress.slice(-6)}`);
    console.log(`⏰ Expires: ${new Date(otpDoc.generatedAt.getTime() + 5 * 60 * 1000).toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'OTP generated successfully',
      data: {
        pickupId: otpDoc.pickupId,
        otpCode: otpDoc.otpCode,
        expiresAt: new Date(otpDoc.generatedAt.getTime() + 5 * 60 * 1000),
        remainingTime: 300 // 5 minutes in seconds
      }
    });

  } catch (error) {
    console.error('❌ Error generating OTP:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to generate OTP',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const pickupId = searchParams.get('pickupId');
    const userAddress = searchParams.get('userAddress');

    if (!pickupId || !userAddress) {
      return NextResponse.json({
        success: false,
        message: 'Missing required parameters: pickupId, userAddress',
        error: 'MISSING_PARAMETERS'
      }, { status: 400 });
    }

    const otpDetails = await OTP.getOTPDetails(pickupId, userAddress);

    if (!otpDetails) {
      return NextResponse.json({
        success: false,
        message: 'No OTP found for this pickup and user',
        error: 'OTP_NOT_FOUND'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        pickupId: otpDetails.pickupId,
        deliveryAgentAddress: otpDetails.deliveryAgentAddress,
        shopkeeperAddress: otpDetails.shopkeeperAddress,
        generatedAt: otpDetails.generatedAt,
        isUsed: otpDetails.isUsed,
        usedAt: otpDetails.usedAt,
        deliveryLocation: otpDetails.deliveryLocation,
        rationAmount: otpDetails.rationAmount,
        category: otpDetails.category,
        expiresAt: new Date(otpDetails.generatedAt.getTime() + 5 * 60 * 1000)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching OTP details:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch OTP details',
      error: error.message
    }, { status: 500 });
  }
}