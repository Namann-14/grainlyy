// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/facets/RationDeliverySystem.sol";

contract RationDeliverySystemTest is Test {
    RationDeliverySystem public rationDeliverySystem;
    address public admin;
    address public shopkeeper;
    address public deliveryPerson;
    string public rationDetails = "Rice: 10kg, Wheat: 5kg";

    function setUp() public {
        admin = address(this); // Test contract is admin
        shopkeeper = address(0x1);
        deliveryPerson = address(0x2);
        rationDeliverySystem = new RationDeliverySystem();
    }

    function testAssignDelivery() public {
        rationDeliverySystem.assignDelivery(shopkeeper, deliveryPerson, rationDetails);
        (uint256 deliveryId, address s, address d, string memory details, bool isCompleted) = rationDeliverySystem.deliveries(1);
        assertEq(deliveryId, 1);
        assertEq(s, shopkeeper);
        assertEq(d, deliveryPerson);
        assertEq(details, rationDetails);
        assertEq(isCompleted, false);
    }

    function testGetDeliveriesForDeliveryPerson() public {
        rationDeliverySystem.assignDelivery(shopkeeper, deliveryPerson, rationDetails);
        RationDeliverySystem.Delivery[] memory deliveries = rationDeliverySystem.getDeliveriesForDeliveryPerson(deliveryPerson);
        assertEq(deliveries.length, 1);
        assertEq(deliveries[0].deliveryPerson, deliveryPerson);
    }

    function testGetUpcomingDeliveriesForShopkeeper() public {
        rationDeliverySystem.assignDelivery(shopkeeper, deliveryPerson, rationDetails);
        RationDeliverySystem.Delivery[] memory deliveries = rationDeliverySystem.getUpcomingDeliveriesForShopkeeper(shopkeeper);
        assertEq(deliveries.length, 1);
        assertEq(deliveries[0].shopkeeper, shopkeeper);
        assertEq(deliveries[0].isCompleted, false);
    }

    function testCompleteDelivery() public {
        rationDeliverySystem.assignDelivery(shopkeeper, deliveryPerson, rationDetails);
        rationDeliverySystem.completeDelivery(1);
        (,,,, bool isCompleted) = rationDeliverySystem.deliveries(1);
        assertEq(isCompleted, true);
    }
}
