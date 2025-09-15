// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Diamond.sol";
import "../src/DiamondInit.sol";
import "../src/DCVToken.sol";
import "../src/facets/DiamondCutFacet.sol";
import "../src/facets/RegistrationFacet.sol";
import "../src/facets/RationPickupFacet.sol";
import "../src/interfaces/IDiamondCut.sol";
import "../src/libraries/LibAppStorage.sol";

contract RationPickupTest is Test {
    Diamond diamond;
    DCVToken dcvToken;
    DiamondInit diamondInit;
    
    address admin = address(0x1);
    address deliveryAgent = address(0x2);
    address shopkeeper = address(0x3);
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy contracts
        diamondInit = new DiamondInit();
        dcvToken = new DCVToken("Digital Card Voucher", "DCV", "https://api.test.com/{id}.json");
        
        // Deploy facets
        DiamondCutFacet diamondCutFacet = new DiamondCutFacet();
        RegistrationFacet registrationFacet = new RegistrationFacet();
        RationPickupFacet rationPickupFacet = new RationPickupFacet();
        
        // Deploy Diamond
        diamond = new Diamond(admin, address(diamondCutFacet));
        
        // Add facets
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](2);
        
        // Registration facet
        bytes4[] memory registrationSelectors = new bytes4[](3);
        registrationSelectors[0] = RegistrationFacet.registerShopkeeper.selector;
        registrationSelectors[1] = RegistrationFacet.registerDeliveryAgent.selector;
        registrationSelectors[2] = RegistrationFacet.setDCVTokenAddress.selector;
        
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(registrationFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: registrationSelectors
        });
        
        // Pickup facet - Add all required selectors
        bytes4[] memory pickupSelectors = new bytes4[](7);
        pickupSelectors[0] = RationPickupFacet.assignRationPickup.selector;
        pickupSelectors[1] = RationPickupFacet.markRationPickedUp.selector;
        pickupSelectors[2] = RationPickupFacet.markRationDeliveredToShop.selector;
        pickupSelectors[3] = RationPickupFacet.confirmRationReceipt.selector;
        pickupSelectors[4] = RationPickupFacet.getActiveDeliveryAgents.selector;
        pickupSelectors[5] = RationPickupFacet.getActiveShopkeepers.selector;
        pickupSelectors[6] = RationPickupFacet.getPickupDetails.selector;
        
        cuts[1] = IDiamondCut.FacetCut({
            facetAddress: address(rationPickupFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: pickupSelectors
        });
        
        // Initialize
        bytes memory initCalldata = abi.encodeWithSelector(DiamondInit.init.selector);
        IDiamondCut(address(diamond)).diamondCut(cuts, address(diamondInit), initCalldata);
        
        // Set DCVToken address
        RegistrationFacet(address(diamond)).setDCVTokenAddress(address(dcvToken));
        
        // Register users
        RegistrationFacet(address(diamond)).registerShopkeeper(shopkeeper, "Test Shop", "Test Area");
        RegistrationFacet(address(diamond)).registerDeliveryAgent(deliveryAgent, "Test Agent", "1234567890");
        
        vm.stopPrank();
    }
    
    function testAssignRationPickup() public {
        vm.prank(admin);
        uint256 pickupId = RationPickupFacet(address(diamond)).assignRationPickup(
            deliveryAgent,
            shopkeeper,
            50000, // 50kg
            "BPL",
            "Central Warehouse",
            "Handle with care"
        );
        
        assertEq(pickupId, 1);
        
        LibAppStorage.RationPickup memory pickup = RationPickupFacet(address(diamond)).getPickupDetails(pickupId);
        assertEq(pickup.deliveryAgent, deliveryAgent);
        assertEq(pickup.shopkeeper, shopkeeper);
        assertEq(pickup.rationAmount, 50000);
        assertEq(pickup.category, "BPL");
        assertTrue(pickup.status == LibAppStorage.PickupStatus.ASSIGNED);
    }
    
    function testCompletePickupWorkflow() public {
        // Admin assigns pickup
        vm.prank(admin);
        uint256 pickupId = RationPickupFacet(address(diamond)).assignRationPickup(
            deliveryAgent,
            shopkeeper,
            50000,
            "BPL",
            "Central Warehouse",
            "Handle with care"
        );
        
        // Delivery agent picks up
        vm.prank(deliveryAgent);
        RationPickupFacet(address(diamond)).markRationPickedUp(pickupId);
        
        LibAppStorage.RationPickup memory pickup = RationPickupFacet(address(diamond)).getPickupDetails(pickupId);
        assertTrue(pickup.status == LibAppStorage.PickupStatus.PICKED_UP);
        
        // Delivery agent delivers to shop
        vm.prank(deliveryAgent);
        RationPickupFacet(address(diamond)).markRationDeliveredToShop(pickupId);
        
        pickup = RationPickupFacet(address(diamond)).getPickupDetails(pickupId);
        assertTrue(pickup.status == LibAppStorage.PickupStatus.DELIVERED_TO_SHOP);
        
        // Shopkeeper confirms receipt
        vm.prank(shopkeeper);
        RationPickupFacet(address(diamond)).confirmRationReceipt(pickupId);
        
        pickup = RationPickupFacet(address(diamond)).getPickupDetails(pickupId);
        assertTrue(pickup.status == LibAppStorage.PickupStatus.CONFIRMED);
        assertTrue(pickup.isCompleted);
    }
    
    function testGetActiveUsers() public {
        (address[] memory agents, string[] memory agentNames) = RationPickupFacet(address(diamond)).getActiveDeliveryAgents();
        assertEq(agents.length, 1);
        assertEq(agents[0], deliveryAgent);
        assertEq(agentNames[0], "Test Agent");
        
        (address[] memory shopkeepers, string[] memory shopNames, string[] memory areas) = RationPickupFacet(address(diamond)).getActiveShopkeepers();
        assertEq(shopkeepers.length, 1);
        assertEq(shopkeepers[0], shopkeeper);
        assertEq(shopNames[0], "Test Shop");
        assertEq(areas[0], "Test Area");
    }
}