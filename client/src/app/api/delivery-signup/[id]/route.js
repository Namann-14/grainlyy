import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DeliverySignupRequest from '@/models/DeliverySignupRequest';

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const { action, adminNote = '', adminId } = body;

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Find the signup request
    const signupRequest = await DeliverySignupRequest.findById(id);
    
    if (!signupRequest) {
      return NextResponse.json(
        { error: 'Signup request not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (signupRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Signup request has already been processed' },
        { status: 400 }
      );
    }

    // Update the request
    signupRequest.status = action === 'approve' ? 'approved' : 'rejected';
    signupRequest.adminNote = adminNote;
    signupRequest.reviewedAt = new Date();
    signupRequest.reviewedBy = adminId || 'Admin';

    await signupRequest.save();

    // Here you could add additional logic like:
    // - Creating actual user account if approved
    // - Sending notification SMS/email
    // - Triggering other services

    if (action === 'approve') {
      // TODO: Create actual delivery partner account
      console.log('Creating delivery partner account for:', signupRequest.name);
    }

    return NextResponse.json({
      message: `Signup request ${action}d successfully`,
      request: {
        id: signupRequest._id,
        name: signupRequest.name,
        status: signupRequest.status,
        reviewedAt: signupRequest.reviewedAt,
        reviewedBy: signupRequest.reviewedBy
      }
    });

  } catch (error) {
    console.error('Error updating delivery signup request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    const signupRequest = await DeliverySignupRequest.findById(id).select('-pin');
    
    if (!signupRequest) {
      return NextResponse.json(
        { error: 'Signup request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ request: signupRequest });

  } catch (error) {
    console.error('Error fetching delivery signup request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}