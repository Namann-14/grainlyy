import DeliveryRider from "../models/delivery.model.js";

export const registerDeliveryRider = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Check if required fields are provided
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Check if rider with same email or phone already exists
    const existingRider = await DeliveryRider.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingRider) {
      return res.status(409).json({
        success: false,
        message: "A rider with this email or phone already exists",
      });
    }

    // Create new rider
    const newRider = await DeliveryRider.create(req.body);

    res.status(201).json({
      success: true,
      message: "Delivery rider registered successfully",
      data: newRider,
    });
  } catch (error) {
    console.error("Error in registerDeliveryRider:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register delivery rider",
      error: error.message,
    });
  }
};

export const updateDeliveryRider = async (req, res) => {
  try {
    const { riderId } = req.query;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: "Rider ID is required",
      });
    }

    // Check if rider exists
    const rider = await DeliveryRider.findById(riderId);
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Delivery rider not found",
      });
    }

    // Update rider information
    const updatedRider = await DeliveryRider.findByIdAndUpdate(
      riderId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Delivery rider updated successfully",
      data: updatedRider,
    });
  } catch (error) {
    console.error("Error in updateDeliveryRider:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update delivery rider",
      error: error.message,
    });
  }
};

export const getDeliveryRider = async (req, res) => {
  try {
    const { riderId } = req.query;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: "Rider ID is required",
      });
    }

    // Find rider
    const rider = await DeliveryRider.findById(riderId);
    
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Delivery rider not found",
      });
    }

    res.status(200).json({
      success: true,
      data: rider,
    });
  } catch (error) {
    console.error("Error in getDeliveryRider:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery rider",
      error: error.message,
    });
  }
};

export const getAllDeliveryRiders = async (req, res) => {
  try {
    const { 
      status, 
      limit = 10, 
      page = 1, 
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = parseInt(sortOrder);

    // Fetch riders with pagination and sorting
    const riders = await DeliveryRider.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalRiders = await DeliveryRider.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        riders,
        pagination: {
          total: totalRiders,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalRiders / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error in getAllDeliveryRiders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery riders",
      error: error.message,
    });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const { riderId } = req.query;
    const { coordinates } = req.body;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: "Rider ID is required",
      });
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Valid coordinates [longitude, latitude] are required",
      });
    }

    // Update rider location
    const updatedRider = await DeliveryRider.findByIdAndUpdate(
      riderId,
      {
        currentLocation: {
          type: "Point",
          coordinates: coordinates,
        },
      },
      { new: true }
    );

    if (!updatedRider) {
      return res.status(404).json({
        success: false,
        message: "Delivery rider not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: updatedRider,
    });
  } catch (error) {
    console.error("Error in updateLocation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update rider location",
      error: error.message,
    });
  }
};