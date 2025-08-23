# Ration Pickup System Integration Guide

## Overview
The new `RationPickupFacet` enables admins to assign delivery agents to pick up rations from central warehouses and deliver them to shopkeepers. This creates a complete supply chain from warehouse → delivery agent → shopkeeper → consumer.

## Smart Contract Functions

### For Admin Dashboard

#### 1. Get Dropdown Data
```javascript
// Get all active delivery agents for dropdown
const getActiveDeliveryAgents = async () => {
  const [agents, names] = await diamond.getActiveDeliveryAgents();
  return agents.map((agent, index) => ({
    address: agent,
    name: names[index]
  }));
};

// Get all active shopkeepers for dropdown  
const getActiveShopkeepers = async () => {
  const [shopkeepers, names, areas] = await diamond.getActiveShopkeepers();
  return shopkeepers.map((shopkeeper, index) => ({
    address: shopkeeper,
    name: names[index],
    area: areas[index]
  }));
};
```

#### 2. Assign Pickup
```javascript
// Admin assigns delivery agent to pick up and deliver rations
const assignRationPickup = async (deliveryAgent, shopkeeper, rationAmount, category) => {
  const tx = await diamond.assignRationPickup(
    deliveryAgent,
    shopkeeper,
    rationAmount, // in grams (e.g., 50000 for 50kg)
    category,     // "BPL", "AAY", or "APL"
    "Central Warehouse", // pickup location
    "Handle with care"   // delivery instructions
  );
  return await tx.wait();
};

// Bulk assign multiple pickups
const bulkAssignPickups = async (assignments) => {
  const agents = assignments.map(a => a.deliveryAgent);
  const shopkeepers = assignments.map(a => a.shopkeeper);
  const amounts = assignments.map(a => a.rationAmount);
  const categories = assignments.map(a => a.category);
  
  const tx = await diamond.bulkAssignRationPickups(
    agents,
    shopkeepers, 
    amounts,
    categories,
    "Central Warehouse"
  );
  return await tx.wait();
};
```

### For Delivery Agent Dashboard

#### 1. View Assigned Pickups
```javascript
// Get all pickups assigned to logged-in delivery agent
const getMyPickups = async () => {
  return await diamond.getMyPickups();
};

// Get only pending pickups
const getMyPendingPickups = async () => {
  return await diamond.getMyPendingPickups();
};
```

#### 2. Update Pickup Status
```javascript
// Mark ration as picked up from warehouse
const markPickedUp = async (pickupId) => {
  const tx = await diamond.markRationPickedUp(pickupId);
  return await tx.wait();
};

// Mark ration as delivered to shopkeeper
const markDeliveredToShop = async (pickupId) => {
  const tx = await diamond.markRationDeliveredToShop(pickupId);
  return await tx.wait();
};
```

### For Shopkeeper Dashboard

#### 1. View Incoming Deliveries
```javascript
// Get all pickups assigned to logged-in shopkeeper
const getMyShopPickups = async () => {
  return await diamond.getMyShopPickups();
};

// Get pending deliveries
const getMyPendingDeliveries = async () => {
  return await diamond.getMyPendingDeliveries();
};
```

#### 2. Confirm Receipt
```javascript
// Confirm receipt of ration delivery
const confirmReceipt = async (pickupId) => {
  const tx = await diamond.confirmRationReceipt(pickupId);
  return await tx.wait();
};
```

## Frontend Implementation

### Admin Dashboard - Assign Pickup Form
```jsx
import React, { useState, useEffect } from 'react';

const AssignPickupForm = ({ diamond }) => {
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [formData, setFormData] = useState({
    deliveryAgent: '',
    shopkeeper: '',
    rationAmount: '',
    category: 'BPL'
  });

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const [agents, shops] = await Promise.all([
        diamond.getActiveDeliveryAgents(),
        diamond.getActiveShopkeepers()
      ]);
      
      setDeliveryAgents(agents[0].map((addr, i) => ({
        address: addr,
        name: agents[1][i]
      })));
      
      setShopkeepers(shops[0].map((addr, i) => ({
        address: addr,
        name: shops[1][i],
        area: shops[2][i]
      })));
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tx = await diamond.assignRationPickup(
        formData.deliveryAgent,
        formData.shopkeeper,
        parseInt(formData.rationAmount) * 1000, // Convert kg to grams
        formData.category,
        "Central Warehouse",
        "Standard delivery"
      );
      await tx.wait();
      alert('Pickup assigned successfully!');
      setFormData({ deliveryAgent: '', shopkeeper: '', rationAmount: '', category: 'BPL' });
    } catch (error) {
      console.error('Error assigning pickup:', error);
      alert('Failed to assign pickup');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="pickup-form">
      <h3>Assign Ration Pickup</h3>
      
      <div className="form-group">
        <label>Delivery Agent:</label>
        <select 
          value={formData.deliveryAgent}
          onChange={(e) => setFormData({...formData, deliveryAgent: e.target.value})}
          required
        >
          <option value="">Select Delivery Agent</option>
          {deliveryAgents.map(agent => (
            <option key={agent.address} value={agent.address}>
              {agent.name} ({agent.address.slice(0,6)}...)
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Shopkeeper:</label>
        <select 
          value={formData.shopkeeper}
          onChange={(e) => setFormData({...formData, shopkeeper: e.target.value})}
          required
        >
          <option value="">Select Shopkeeper</option>
          {shopkeepers.map(shop => (
            <option key={shop.address} value={shop.address}>
              {shop.name} - {shop.area} ({shop.address.slice(0,6)}...)
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Ration Amount (kg):</label>
        <input 
          type="number"
          value={formData.rationAmount}
          onChange={(e) => setFormData({...formData, rationAmount: e.target.value})}
          min="1"
          required
        />
      </div>

      <div className="form-group">
        <label>Category:</label>
        <select 
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value})}
        >
          <option value="BPL">BPL</option>
          <option value="AAY">AAY</option>
          <option value="APL">APL</option>
        </select>
      </div>

      <button type="submit">Assign Pickup</button>
    </form>
  );
};
```

### Delivery Agent Dashboard - Pickup List
```jsx
const DeliveryAgentPickups = ({ diamond, userAddress }) => {
  const [pickups, setPickups] = useState([]);

  useEffect(() => {
    loadPickups();
  }, []);

  const loadPickups = async () => {
    try {
      const myPickups = await diamond.getMyPendingPickups();
      setPickups(myPickups);
    } catch (error) {
      console.error('Error loading pickups:', error);
    }
  };

  const handleStatusUpdate = async (pickupId, action) => {
    try {
      let tx;
      if (action === 'pickup') {
        tx = await diamond.markRationPickedUp(pickupId);
      } else if (action === 'deliver') {
        tx = await diamond.markRationDeliveredToShop(pickupId);
      }
      await tx.wait();
      loadPickups(); // Refresh list
      alert('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      0: 'Assigned',
      1: 'Picked Up', 
      2: 'Delivered to Shop',
      3: 'Confirmed'
    };
    return statusMap[status] || 'Unknown';
  };

  return (
    <div className="pickup-list">
      <h3>My Pickup Assignments</h3>
      {pickups.length === 0 ? (
        <p>No pending pickups</p>
      ) : (
        pickups.map(pickup => (
          <div key={pickup.pickupId} className="pickup-card">
            <h4>Pickup #{pickup.pickupId}</h4>
            <p><strong>Amount:</strong> {pickup.rationAmount / 1000} kg {pickup.category}</p>
            <p><strong>Shopkeeper:</strong> {pickup.shopkeeper}</p>
            <p><strong>Status:</strong> {getStatusText(pickup.status)}</p>
            <p><strong>Pickup Location:</strong> {pickup.pickupLocation}</p>
            <p><strong>Instructions:</strong> {pickup.deliveryInstructions}</p>
            
            <div className="pickup-actions">
              {pickup.status === 0 && (
                <button onClick={() => handleStatusUpdate(pickup.pickupId, 'pickup')}>
                  Mark as Picked Up
                </button>
              )}
              {pickup.status === 1 && (
                <button onClick={() => handleStatusUpdate(pickup.pickupId, 'deliver')}>
                  Mark as Delivered to Shop
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
```

### Shopkeeper Dashboard - Incoming Deliveries
```jsx
const ShopkeeperDeliveries = ({ diamond }) => {
  const [deliveries, setDeliveries] = useState([]);

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    try {
      const myDeliveries = await diamond.getMyPendingDeliveries();
      setDeliveries(myDeliveries);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    }
  };

  const confirmReceipt = async (pickupId) => {
    try {
      const tx = await diamond.confirmRationReceipt(pickupId);
      await tx.wait();
      loadDeliveries(); // Refresh list
      alert('Receipt confirmed successfully!');
    } catch (error) {
      console.error('Error confirming receipt:', error);
      alert('Failed to confirm receipt');
    }
  };

  return (
    <div className="delivery-list">
      <h3>Incoming Ration Deliveries</h3>
      {deliveries.length === 0 ? (
        <p>No pending deliveries</p>
      ) : (
        deliveries.map(delivery => (
          <div key={delivery.pickupId} className="delivery-card">
            <h4>Delivery #{delivery.pickupId}</h4>
            <p><strong>Amount:</strong> {delivery.rationAmount / 1000} kg {delivery.category}</p>
            <p><strong>Delivery Agent:</strong> {delivery.deliveryAgent}</p>
            <p><strong>Status:</strong> {getStatusText(delivery.status)}</p>
            
            {delivery.status === 2 && (
              <button onClick={() => confirmReceipt(delivery.pickupId)}>
                Confirm Receipt
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};
```

## Events to Listen For

```javascript
// Listen for pickup assignment events
diamond.on('RationPickupAssigned', (pickupId, deliveryAgent, shopkeeper, rationAmount, category) => {
  console.log(`New pickup assigned: ${pickupId}`);
  // Update UI, send notifications, etc.
});

// Listen for status updates
diamond.on('PickupStatusUpdated', (pickupId, status) => {
  console.log(`Pickup ${pickupId} status updated to ${status}`);
  // Update UI in real-time
});

// Listen for receipt confirmations
diamond.on('RationReceiptConfirmed', (pickupId, shopkeeper) => {
  console.log(`Pickup ${pickupId} confirmed by shopkeeper`);
  // Mark as completed in UI
});
```

## Deployment

Add the new facet to your deployment script and redeploy:

```bash
forge script script/DeployCompletePDS.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

The `RationPickupFacet` will be automatically included in the deployment.

## Summary

This implementation provides:

1. **Admin Interface**: Dropdown selection of delivery agents and shopkeepers, bulk assignment capability
2. **Delivery Agent Dashboard**: View assigned pickups, update status (picked up, delivered)  
3. **Shopkeeper Dashboard**: View incoming deliveries, confirm receipt
4. **Real-time Updates**: Event-driven UI updates
5. **Complete Workflow**: Warehouse → Agent → Shopkeeper → Consumer

The system now supports the complete supply chain you requested, with proper role-based access control and status tracking throughout the process.