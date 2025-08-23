import connectDB from "@/lib/mongodb";
import Shopkeeper from "@/models/Shopkeeper";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { shopkeeperRequests } = body;

    const shopkeepers = shopkeeperRequests.map((request) => ({
      shopkeeperAddress: request.walletAddress,
      name: request.name || "Unknown",
      area: request.area || "Unknown",
      mobile: request.mobile || "Not provided",
      registrationTime: Math.floor(
        new Date(request.updatedAt).getTime() / 1000
      ),
      totalConsumersAssigned: 0,
      totalTokensIssued: 0,
      totalDeliveries: 0,
      isActive: true,
      dataSource: "database",
    }));

    await Shopkeeper.insertMany(shopkeepers);

    return new Response(
      JSON.stringify({ success: true, message: "Shopkeepers inserted!" }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error inserting shopkeepers:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
