// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibDiamond.sol";

/**
 * @title RationPickupFacet
 * @dev Handles ration pickup assignments from central warehouse to shopkeepers
 */
contract RationPickupFacet {
    
    // ============ EVENTS ============
    event RationPickupAssigned(
        uint256 indexed pickupId, 
        address indexed deliveryAgent, 
        address indexed shopkeeper,
        uint256 rationAmount,
        string category
    );
    event RationPickedUp(uint256 indexed pickupId, address indexed deliveryAgent, uint256 timestamp);
    event RationDeliveredToShop(uint256 indexed pickupId, address indexed shopkeeper, uint256 timestamp);
    event RationReceiptConfirmed(uint256 indexed pickupId, address indexed shopkeeper);
    event PickupStatusUpdated(uint256 indexed pickupId, LibAppStorage.PickupStatus status);
    
    // ============ MODIFIERS ============
    modifier onlyAdmin() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(msg.sender == LibDiamond.contractOwner() || s.admins[msg.sender], "Only admin");
        _;
    }
    
    modifier onlyDeliveryAgent() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.deliveryAgents_[msg.sender], "Only delivery agent");
        _;
    }
    
    modifier onlyShopkeeper() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[msg.sender], "Only shopkeeper");
        _;
    }
    
    modifier validPickup(uint256 pickupId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.rationPickups[pickupId].pickupId != 0, "Pickup does not exist");
        _;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Admin assigns delivery agent to pick up rations and deliver to shopkeeper
     */
    function assignRationPickup(
        address deliveryAgent,
        address shopkeeper,
        uint256 rationAmount,
        string memory category,
        string memory pickupLocation,
        string memory deliveryInstructions
    ) external onlyAdmin returns (uint256 pickupId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.deliveryAgents_[deliveryAgent], "Invalid delivery agent");
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        require(s.deliveryAgents[deliveryAgent].isActive, "Agent not active");
        require(s.shopkeepers[shopkeeper].isActive, "Shopkeeper not active");
        require(rationAmount > 0, "Ration amount must be positive");
        require(bytes(category).length > 0, "Category required");
        
        pickupId = ++s.nextPickupId;
        
        s.rationPickups[pickupId] = LibAppStorage.RationPickup({
            pickupId: pickupId,
            deliveryAgent: deliveryAgent,
            shopkeeper: shopkeeper,
            rationAmount: rationAmount,
            category: category,
            status: LibAppStorage.PickupStatus.ASSIGNED,
            assignedTime: block.timestamp,
            pickedUpTime: 0,
            deliveredTime: 0,
            confirmedTime: 0,
            pickupLocation: pickupLocation,
            deliveryInstructions: deliveryInstructions,
            isCompleted: false
        });
        
        // Add to agent and shopkeeper mappings
        s.agentPickups[deliveryAgent].push(pickupId);
        s.shopkeeperPickups[shopkeeper].push(pickupId);
        
        // Update metrics
        s.deliveryAgents[deliveryAgent].totalPickupsAssigned++;
        
        _logActivity("RATION_PICKUP_ASSIGNED", 0, pickupId, 
            string(abi.encodePacked("Pickup assigned: ", _toString(rationAmount), "g ", category)));
        
        emit RationPickupAssigned(pickupId, deliveryAgent, shopkeeper, rationAmount, category);
        return pickupId;
    }
    
    /**
     * @dev Bulk assign multiple pickups
     */
    function bulkAssignRationPickups(
        address[] memory deliveryAgents,
        address[] memory shopkeepers,
        uint256[] memory rationAmounts,
        string[] memory categories,
        string memory pickupLocation
    ) external onlyAdmin returns (uint256[] memory pickupIds) {
        require(deliveryAgents.length == shopkeepers.length, "Array length mismatch");
        require(deliveryAgents.length == rationAmounts.length, "Array length mismatch");
        require(deliveryAgents.length == categories.length, "Array length mismatch");
        require(deliveryAgents.length > 0, "Empty arrays");
        
        pickupIds = new uint256[](deliveryAgents.length);
        
        for (uint256 i = 0; i < deliveryAgents.length; i++) {
            pickupIds[i] = this.assignRationPickup(
                deliveryAgents[i],
                shopkeepers[i],
                rationAmounts[i],
                categories[i],
                pickupLocation,
                "Bulk assignment"
            );
        }
        
        _logActivity("BULK_PICKUP_ASSIGNED", 0, 0, 
            string(abi.encodePacked("Bulk assigned ", _toString(deliveryAgents.length), " pickups")));
        
        return pickupIds;
    }
    
    // ============ DELIVERY AGENT FUNCTIONS ============
    
    /**
     * @dev Delivery agent marks ration as picked up from warehouse
     */
    function markRationPickedUp(uint256 pickupId) external onlyDeliveryAgent validPickup(pickupId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        LibAppStorage.RationPickup storage pickup = s.rationPickups[pickupId];
        
        require(pickup.deliveryAgent == msg.sender, "Not assigned to you");
        require(pickup.status == LibAppStorage.PickupStatus.ASSIGNED, "Invalid status for pickup");
        
        pickup.status = LibAppStorage.PickupStatus.PICKED_UP;
        pickup.pickedUpTime = block.timestamp;
        
        _logActivity("RATION_PICKED_UP", 0, pickupId, "Ration picked up from warehouse");
        
        emit RationPickedUp(pickupId, msg.sender, block.timestamp);
        emit PickupStatusUpdated(pickupId, LibAppStorage.PickupStatus.PICKED_UP);
    }
    
    /**
     * @dev Delivery agent marks ration as delivered to shopkeeper
     */
    function markRationDeliveredToShop(uint256 pickupId) external onlyDeliveryAgent validPickup(pickupId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        LibAppStorage.RationPickup storage pickup = s.rationPickups[pickupId];
        
        require(pickup.deliveryAgent == msg.sender, "Not assigned to you");
        require(pickup.status == LibAppStorage.PickupStatus.PICKED_UP, "Must pick up first");
        
        pickup.status = LibAppStorage.PickupStatus.DELIVERED_TO_SHOP;
        pickup.deliveredTime = block.timestamp;
        
        // Update agent metrics
        s.deliveryAgents[msg.sender].totalDeliveries++;
        
        _logActivity("RATION_DELIVERED_TO_SHOP", 0, pickupId, "Ration delivered to shopkeeper");
        
        emit RationDeliveredToShop(pickupId, pickup.shopkeeper, block.timestamp);
        emit PickupStatusUpdated(pickupId, LibAppStorage.PickupStatus.DELIVERED_TO_SHOP);
    }
    
    /**
     * @dev Get all pickups assigned to delivery agent
     */
    function getMyPickups() external view returns (LibAppStorage.RationPickup[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.deliveryAgents_[msg.sender], "Not a delivery agent");
        
        uint256[] memory pickupIds = s.agentPickups[msg.sender];
        LibAppStorage.RationPickup[] memory pickups = new LibAppStorage.RationPickup[](pickupIds.length);
        
        for (uint256 i = 0; i < pickupIds.length; i++) {
            pickups[i] = s.rationPickups[pickupIds[i]];
        }
        
        return pickups;
    }
    
    /**
     * @dev Get pending pickups for delivery agent
     */
    function getMyPendingPickups() external view returns (LibAppStorage.RationPickup[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.deliveryAgents_[msg.sender], "Not a delivery agent");
        
        uint256[] memory allPickupIds = s.agentPickups[msg.sender];
        uint256 pendingCount = 0;
        
        // Count pending pickups
        for (uint256 i = 0; i < allPickupIds.length; i++) {
            LibAppStorage.RationPickup memory pickup = s.rationPickups[allPickupIds[i]];
            if (pickup.status != LibAppStorage.PickupStatus.CONFIRMED && !pickup.isCompleted) {
                pendingCount++;
            }
        }
        
        // Create array of pending pickups
        LibAppStorage.RationPickup[] memory pendingPickups = new LibAppStorage.RationPickup[](pendingCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allPickupIds.length; i++) {
            LibAppStorage.RationPickup memory pickup = s.rationPickups[allPickupIds[i]];
            if (pickup.status != LibAppStorage.PickupStatus.CONFIRMED && !pickup.isCompleted) {
                pendingPickups[index] = pickup;
                index++;
            }
        }
        
        return pendingPickups;
    }
    
    // ============ SHOPKEEPER FUNCTIONS ============
    
    /**
     * @dev Shopkeeper confirms receipt of ration delivery
     */
    function confirmRationReceipt(uint256 pickupId) external onlyShopkeeper validPickup(pickupId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        LibAppStorage.RationPickup storage pickup = s.rationPickups[pickupId];
        
        require(pickup.shopkeeper == msg.sender, "Not your delivery");
        require(pickup.status == LibAppStorage.PickupStatus.DELIVERED_TO_SHOP, "Not delivered yet");
        
        pickup.status = LibAppStorage.PickupStatus.CONFIRMED;
        pickup.confirmedTime = block.timestamp;
        pickup.isCompleted = true;
        
        // Update shopkeeper metrics
        s.shopkeepers[msg.sender].totalDeliveries++;
        
        _logActivity("RATION_RECEIPT_CONFIRMED", 0, pickupId, "Shopkeeper confirmed ration receipt");
        
        emit RationReceiptConfirmed(pickupId, msg.sender);
        emit PickupStatusUpdated(pickupId, LibAppStorage.PickupStatus.CONFIRMED);
    }
    
    /**
     * @dev Get all pickups for shopkeeper
     */
    function getMyShopPickups() external view returns (LibAppStorage.RationPickup[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[msg.sender], "Not a shopkeeper");
        
        uint256[] memory pickupIds = s.shopkeeperPickups[msg.sender];
        LibAppStorage.RationPickup[] memory pickups = new LibAppStorage.RationPickup[](pickupIds.length);
        
        for (uint256 i = 0; i < pickupIds.length; i++) {
            pickups[i] = s.rationPickups[pickupIds[i]];
        }
        
        return pickups;
    }
    
    /**
     * @dev Get pending deliveries for shopkeeper
     */
    function getMyPendingDeliveries() external view returns (LibAppStorage.RationPickup[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[msg.sender], "Not a shopkeeper");
        
        uint256[] memory allPickupIds = s.shopkeeperPickups[msg.sender];
        uint256 pendingCount = 0;
        
        // Count pending deliveries
        for (uint256 i = 0; i < allPickupIds.length; i++) {
            LibAppStorage.RationPickup memory pickup = s.rationPickups[allPickupIds[i]];
            if (pickup.status == LibAppStorage.PickupStatus.ASSIGNED || 
                pickup.status == LibAppStorage.PickupStatus.PICKED_UP ||
                pickup.status == LibAppStorage.PickupStatus.DELIVERED_TO_SHOP) {
                pendingCount++;
            }
        }
        
        // Create array of pending deliveries
        LibAppStorage.RationPickup[] memory pendingDeliveries = new LibAppStorage.RationPickup[](pendingCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allPickupIds.length; i++) {
            LibAppStorage.RationPickup memory pickup = s.rationPickups[allPickupIds[i]];
            if (pickup.status == LibAppStorage.PickupStatus.ASSIGNED || 
                pickup.status == LibAppStorage.PickupStatus.PICKED_UP ||
                pickup.status == LibAppStorage.PickupStatus.DELIVERED_TO_SHOP) {
                pendingDeliveries[index] = pickup;
                index++;
            }
        }
        
        return pendingDeliveries;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get pickup details by ID
     */
    function getPickupDetails(uint256 pickupId) external view validPickup(pickupId) returns (LibAppStorage.RationPickup memory) {
        return LibAppStorage.appStorage().rationPickups[pickupId];
    }
    
    /**
     * @dev Get all registered delivery agents (for dropdown)
     */
    function getAllDeliveryAgents() external view returns (
        address[] memory agents,
        string[] memory names,
        bool[] memory activeStatus
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        agents = s.allDeliveryAgents;
        names = new string[](agents.length);
        activeStatus = new bool[](agents.length);
        
        for (uint256 i = 0; i < agents.length; i++) {
            names[i] = s.deliveryAgents[agents[i]].name;
            activeStatus[i] = s.deliveryAgents[agents[i]].isActive;
        }
    }
    
    /**
     * @dev Get all registered shopkeepers (for dropdown)
     */
    function getAllShopkeepers() external view returns (
        address[] memory shopkeepers,
        string[] memory names,
        string[] memory areas,
        bool[] memory activeStatus
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        shopkeepers = s.allShopkeepers;
        names = new string[](shopkeepers.length);
        areas = new string[](shopkeepers.length);
        activeStatus = new bool[](shopkeepers.length);
        
        for (uint256 i = 0; i < shopkeepers.length; i++) {
            names[i] = s.shopkeepers[shopkeepers[i]].name;
            areas[i] = s.shopkeepers[shopkeepers[i]].area;
            activeStatus[i] = s.shopkeepers[shopkeepers[i]].isActive;
        }
    }
    
    /**
     * @dev Get active delivery agents only
     */
    function getActiveDeliveryAgents() external view returns (
        address[] memory agents,
        string[] memory names
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 activeCount = 0;
        for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
            if (s.deliveryAgents[s.allDeliveryAgents[i]].isActive) {
                activeCount++;
            }
        }
        
        agents = new address[](activeCount);
        names = new string[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
            address agent = s.allDeliveryAgents[i];
            if (s.deliveryAgents[agent].isActive) {
                agents[index] = agent;
                names[index] = s.deliveryAgents[agent].name;
                index++;
            }
        }
    }
    
    /**
     * @dev Get active shopkeepers only
     */
    function getActiveShopkeepers() external view returns (
        address[] memory shopkeepers,
        string[] memory names,
        string[] memory areas
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 activeCount = 0;
        for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
            if (s.shopkeepers[s.allShopkeepers[i]].isActive) {
                activeCount++;
            }
        }
        
        shopkeepers = new address[](activeCount);
        names = new string[](activeCount);
        areas = new string[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
            address shopkeeper = s.allShopkeepers[i];
            if (s.shopkeepers[shopkeeper].isActive) {
                shopkeepers[index] = shopkeeper;
                names[index] = s.shopkeepers[shopkeeper].name;
                areas[index] = s.shopkeepers[shopkeeper].area;
                index++;
            }
        }
    }
    
    /**
     * @dev Get pickup statistics
     */
    function getPickupStatistics() external view returns (
        uint256 totalPickups,
        uint256 pendingPickups,
        uint256 completedPickups,
        uint256 activeAgents,
        uint256 activeShopkeepers
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        totalPickups = s.nextPickupId;
        pendingPickups = 0;
        completedPickups = 0;
        
        for (uint256 i = 1; i <= s.nextPickupId; i++) {
            if (s.rationPickups[i].isCompleted) {
                completedPickups++;
            } else {
                pendingPickups++;
            }
        }
        
        activeAgents = 0;
        for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
            if (s.deliveryAgents[s.allDeliveryAgents[i]].isActive) {
                activeAgents++;
            }
        }
        
        activeShopkeepers = 0;
        for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
            if (s.shopkeepers[s.allShopkeepers[i]].isActive) {
                activeShopkeepers++;
            }
        }
    }
    
    // ============ UTILITY FUNCTIONS ============
    
    function _logActivity(string memory action, uint256 aadhaar, uint256 tokenId, string memory details) internal {
        LibAppStorage.appStorage().activityLogs.push(LibAppStorage.ActivityLog({
            timestamp: block.timestamp,
            actor: msg.sender,
            action: action,
            aadhaar: aadhaar,
            tokenId: tokenId,
            details: details
        }));
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}