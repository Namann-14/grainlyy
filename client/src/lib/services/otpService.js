/**
 * OTP Service for Delivery Verification
 * Handles OTP generation, verification, and management
 */

const API_BASE_URL = '/api/otp';

class OTPService {
  /**
   * Generate OTP for delivery verification
   * @param {Object} params - OTP generation parameters
   * @param {string} params.pickupId - Unique pickup ID
   * @param {string} params.deliveryAgentAddress - Delivery agent's wallet address
   * @param {string} params.shopkeeperAddress - Shopkeeper's wallet address
   * @param {string} params.deliveryLocation - Delivery location (optional)
   * @param {number} params.rationAmount - Amount of ration (optional)
   * @param {string} params.category - Category of ration (optional)
   * @returns {Promise<Object>} API response
   */
  static async generateOTP({
    pickupId,
    deliveryAgentAddress,
    shopkeeperAddress,
    deliveryLocation = null,
    rationAmount = null,
    category = null
  }) {
    try {
      console.log(`🔐 Generating OTP for Pickup #${pickupId}`);
      console.log(`📍 Agent: ${deliveryAgentAddress.slice(0, 8)}...${deliveryAgentAddress.slice(-6)}`);
      console.log(`🏪 Shop: ${shopkeeperAddress.slice(0, 8)}...${shopkeeperAddress.slice(-6)}`);

      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickupId,
          deliveryAgentAddress,
          shopkeeperAddress,
          deliveryLocation,
          rationAmount,
          category
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate OTP');
      }

      console.log(`✅ OTP Generated: ${data.data.otpCode}`);
      console.log(`⏰ Expires at: ${data.data.expiresAt}`);
      console.log(`🕒 Valid for: ${data.data.remainingTime} seconds`);

      return {
        success: true,
        data: data.data,
        message: data.message
      };

    } catch (error) {
      console.error('❌ OTP Generation Error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate OTP'
      };
    }
  }

  /**
   * Verify OTP for delivery confirmation
   * @param {Object} params - OTP verification parameters
   * @param {string} params.pickupId - Unique pickup ID
   * @param {string} params.shopkeeperAddress - Shopkeeper's wallet address
   * @param {string} params.otpCode - 6-digit OTP code
   * @returns {Promise<Object>} API response
   */
  static async verifyOTP({ pickupId, shopkeeperAddress, otpCode }) {
    try {
      console.log(`🔍 Verifying OTP: ${otpCode} for Pickup #${pickupId}`);
      console.log(`🏪 Shopkeeper: ${shopkeeperAddress.slice(0, 8)}...${shopkeeperAddress.slice(-6)}`);

      const response = await fetch(`${API_BASE_URL}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickupId,
          shopkeeperAddress,
          otpCode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log(`❌ OTP Verification Failed: ${data.message}`);
        throw new Error(data.message || 'Failed to verify OTP');
      }

      console.log(`✅ OTP Verified Successfully!`);
      console.log(`📍 Agent: ${data.data.deliveryAgentAddress.slice(0, 8)}...${data.data.deliveryAgentAddress.slice(-6)}`);
      console.log(`⏰ Verified at: ${data.data.verifiedAt}`);

      return {
        success: true,
        data: data.data,
        message: data.message
      };

    } catch (error) {
      console.error('❌ OTP Verification Error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to verify OTP'
      };
    }
  }

  /**
   * Get OTP details for a pickup (without the actual OTP code)
   * @param {string} pickupId - Unique pickup ID
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<Object>} API response
   */
  static async getOTPDetails(pickupId, userAddress) {
    try {
      console.log(`📋 Fetching OTP details for Pickup #${pickupId}`);

      const response = await fetch(
        `${API_BASE_URL}/generate?pickupId=${pickupId}&userAddress=${userAddress}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch OTP details');
      }

      return {
        success: true,
        data: data.data,
        message: data.message
      };

    } catch (error) {
      console.error('❌ Error fetching OTP details:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch OTP details'
      };
    }
  }

  /**
   * Format time remaining for display
   * @param {number} remainingSeconds - Seconds remaining
   * @returns {string} Formatted time string
   */
  static formatTimeRemaining(remainingSeconds) {
    if (remainingSeconds <= 0) return 'Expired';
    
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if OTP is expired
   * @param {string|Date} expiresAt - Expiration timestamp
   * @returns {boolean} True if expired
   */
  static isOTPExpired(expiresAt) {
    return new Date(expiresAt) <= new Date();
  }

  /**
   * Get remaining time in seconds
   * @param {string|Date} expiresAt - Expiration timestamp
   * @returns {number} Remaining seconds (0 if expired)
   */
  static getRemainingTime(expiresAt) {
    const remaining = Math.floor((new Date(expiresAt) - new Date()) / 1000);
    return Math.max(0, remaining);
  }

  /**
   * Validate OTP format
   * @param {string} otpCode - OTP code to validate
   * @returns {boolean} True if valid format
   */
  static validateOTPFormat(otpCode) {
    return /^\d{6}$/.test(otpCode);
  }
}

export default OTPService;