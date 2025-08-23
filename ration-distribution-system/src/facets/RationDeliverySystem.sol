// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RationDeliverySystem {
    // Delivery struct
    struct Delivery {
        uint256 deliveryId;
        address shopkeeper;
        address deliveryPerson;
        string rationDetails;
        bool isCompleted;
    }

    // State variables
    address public admin;
    uint256 private nextDeliveryId;
    mapping(uint256 => Delivery) public deliveries;

    // Indexes for efficient dashboard queries
    mapping(address => uint256[]) private deliveryPersonToDeliveries;
    mapping(address => uint256[]) private shopkeeperToDeliveries;

    // Events
    event DeliveryAssigned(uint256 deliveryId, address shopkeeper, address deliveryPerson, string rationDetails);
    event DeliveryCompleted(uint256 deliveryId);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyDeliveryActor(uint256 deliveryId) {
        Delivery storage d = deliveries[deliveryId];
        require(
            msg.sender == d.deliveryPerson || msg.sender == d.shopkeeper,
            "Not authorized for this delivery"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        nextDeliveryId = 1;
    }

    // Assign Delivery (Admin only)
    function assignDelivery(address shopkeeper, address deliveryPerson, string memory rationDetails)
        external
        onlyAdmin
    {
        uint256 deliveryId = nextDeliveryId++;
        deliveries[deliveryId] = Delivery({
            deliveryId: deliveryId,
            shopkeeper: shopkeeper,
            deliveryPerson: deliveryPerson,
            rationDetails: rationDetails,
            isCompleted: false
        });

        deliveryPersonToDeliveries[deliveryPerson].push(deliveryId);
        shopkeeperToDeliveries[shopkeeper].push(deliveryId);

        emit DeliveryAssigned(deliveryId, shopkeeper, deliveryPerson, rationDetails);
    }

    // View Deliveries for Delivery Person (Dashboard)
    function getDeliveriesForDeliveryPerson(address deliveryPerson)
        external
        view
        returns (Delivery[] memory)
    {
        uint256[] storage ids = deliveryPersonToDeliveries[deliveryPerson];
        Delivery[] memory result = new Delivery[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = deliveries[ids[i]];
        }
        return result;
    }

    // View Upcoming Deliveries for Shopkeeper (Dashboard)
    function getUpcomingDeliveriesForShopkeeper(address shopkeeper)
        external
        view
        returns (Delivery[] memory)
    {
        uint256[] storage ids = shopkeeperToDeliveries[shopkeeper];
        // Count upcoming deliveries
        uint256 count = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (!deliveries[ids[i]].isCompleted) {
                count++;
            }
        }
        Delivery[] memory result = new Delivery[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (!deliveries[ids[i]].isCompleted) {
                result[idx++] = deliveries[ids[i]];
            }
        }
        return result;
    }

    // Complete Delivery
    function completeDelivery(uint256 deliveryId)
        external
        onlyDeliveryActor(deliveryId)
    {
        Delivery storage d = deliveries[deliveryId];
        require(!d.isCompleted, "Delivery already completed");
        d.isCompleted = true;
        emit DeliveryCompleted(deliveryId);
    }
}