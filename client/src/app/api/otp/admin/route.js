import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import OTP from '@/lib/db/models/OTP';

export async function DELETE(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('adminKey');

    // Simple admin authentication (in production, use proper auth)
    if (adminKey !== process.env.ADMIN_CLEANUP_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized access',
        error: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // Clean expired OTPs
    const cleanupResult = await OTP.cleanExpiredOTPs();

    console.log(`🧹 Cleaned up ${cleanupResult.deletedCount} expired OTPs`);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanupResult.deletedCount} expired OTPs`,
      data: {
        deletedCount: cleanupResult.deletedCount
      }
    });

  } catch (error) {
    console.error('❌ Error cleaning up OTPs:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to cleanup expired OTPs',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('adminKey');

    // Simple admin authentication (in production, use proper auth)
    if (adminKey !== process.env.ADMIN_CLEANUP_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized access',
        error: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // Get OTP statistics
    const totalOTPs = await OTP.countDocuments();
    const activeOTPs = await OTP.countDocuments({ isUsed: false });
    const usedOTPs = await OTP.countDocuments({ isUsed: true });
    const expiredOTPs = await OTP.countDocuments({
      generatedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) },
      isUsed: false
    });

    // Get recent OTPs (last 24 hours, without sensitive data)
    const recentOTPs = await OTP.find({
      generatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
    .select('-otpCode') // Don't return actual OTP codes
    .sort({ generatedAt: -1 })
    .limit(50);

    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          total: totalOTPs,
          active: activeOTPs,
          used: usedOTPs,
          expired: expiredOTPs
        },
        recentOTPs: recentOTPs
      }
    });

  } catch (error) {
    console.error('❌ Error fetching OTP stats:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch OTP statistics',
      error: error.message
    }, { status: 500 });
  }
}