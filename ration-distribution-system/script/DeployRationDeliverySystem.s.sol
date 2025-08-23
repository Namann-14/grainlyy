// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/facets/RationDeliverySystem.sol";

contract DeployRationDeliverySystem is Script {
    function run() external returns (address deployedAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deploying RationDeliverySystem...");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        vm.startBroadcast(deployerPrivateKey);
        RationDeliverySystem rationDeliverySystem = new RationDeliverySystem();
        deployedAddress = address(rationDeliverySystem);
        console.log("RationDeliverySystem deployed at:", deployedAddress);
        vm.stopBroadcast();
        return deployedAddress;
    }
}
