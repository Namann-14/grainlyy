import { NextResponse } from "next/server";
import DeliveryShopkeeperAllocation from "@/models/delivery-shopkeeper-allocation";
import connectMongoDB from "@/lib/mongodb";

export async function POST(request) {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    const { shopkeeper, deliveryRider } = body;
    
    if (!shopkeeper?.name || !shopkeeper?.shopkeeperAddress) {
      return NextResponse.json(
        { error: "Shopkeeper name and shopkeeperAddress are required" },
        { status: 400 }
      );
    }
    
    if (!deliveryRider?.name || !deliveryRider?.agentAddress) {
      return NextResponse.json(
        { error: "Delivery rider name and agentAddress are required" },
        { status: 400 }
      );
    }

    // Create new allocation with address-based structure
    const allocation = new DeliveryShopkeeperAllocation({
      shopkeeper: {
        name: shopkeeper.name,
        address: shopkeeper.shopkeeperAddress,
      },
      deliveryRider: {
        name: deliveryRider.name,
        address: deliveryRider.agentAddress,
      },
      status: body.status || "active",
    });

    // Save to database
    const savedAllocation = await allocation.save();

    return NextResponse.json(
      {
        success: true,
        message: "Delivery-Shopkeeper allocation created successfully",
        data: savedAllocation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating allocation:", error);
    
    // Handle MongoDB validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const shopkeeperName = searchParams.get("shopkeeper");
    const riderName = searchParams.get("rider");

    // Build query
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (shopkeeperName) {
      query["shopkeeper.name"] = new RegExp(shopkeeperName, "i");
    }
    
    if (riderName) {
      query["deliveryRider.name"] = new RegExp(riderName, "i");
    }

    // Fetch allocations
    const allocations = await DeliveryShopkeeperAllocation.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        count: allocations.length,
        data: allocations,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching allocations:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Parse the request body
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Allocation ID is required" },
        { status: 400 }
      );
    }

    // Update allocation
    const updatedAllocation = await DeliveryShopkeeperAllocation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedAllocation) {
      return NextResponse.json(
        { error: "Allocation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Allocation updated successfully",
        data: updatedAllocation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating allocation:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Get allocation ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Allocation ID is required" },
        { status: 400 }
      );
    }

    // Delete allocation
    const deletedAllocation = await DeliveryShopkeeperAllocation.findByIdAndDelete(id);

    if (!deletedAllocation) {
      return NextResponse.json(
        { error: "Allocation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Allocation deleted successfully",
        data: deletedAllocation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting allocation:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
