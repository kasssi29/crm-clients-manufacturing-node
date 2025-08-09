import express from 'express';
import Client from '../models/Client.js';
import User from '../models/User.js';
import { authMiddleware, roleAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/clients
 * - Supervisor: all clients
 * - Manager: only their clients
 */
router.get('/', authMiddleware, roleAccess(['supervisor', 'manager']), async (req, res) => {
  try {
    const clients = req.user.role === 'supervisor'
      ? await Client.find().populate('managerId', 'name email')
      : await Client.find({ managerId: req.user.id });

    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/clients
 * Access: Manager (auto-assign to self), Supervisor (must provide managerId)
 * Description: Add a new client
 */
router.post('/', authMiddleware, roleAccess(['manager', 'supervisor']), async (req, res) => {
  try {
    const { equipment = [], managerId, ...rest } = req.body;

    // If supervisor creates the client, they must provide managerId
    if (req.user.role === 'supervisor' && !managerId) {
      return res.status(400).json({ message: 'Manager ID is required when supervisor creates client' });
    }

    // Process equipment list: assign defaults
    const processedEquipment = equipment.map(eq => {
      const purchaseDate = new Date(eq.purchaseDate);
      const defaultServiceDue = new Date(purchaseDate);
      defaultServiceDue.setFullYear(purchaseDate.getFullYear() + 1);

      return {
        ...eq,
        serviceStatus: eq.serviceStatus || 'none',
        serviceDueDate: eq.serviceDueDate || defaultServiceDue,
        lastServiceNotified: eq.lastServiceNotified || null
      };
    });

    const newClient = new Client({
      ...rest,
      managerId: req.user.role === 'manager' ? req.user.id : managerId,
      equipment: processedEquipment
    });

    await newClient.save();
    res.status(201).json(newClient);
  } catch (err) {
    res.status(400).json({ message: 'Error creating client', error: err.message });
  }
});


/**
 * GET /api/clients/soon-expiring?months=3&notified=false
 * - Managers: only their clients
 * - Filters equipment with serviceDueDate in next X months
 * - Optional filter for only not-notified items
 */
router.get('/soon-expiring', authMiddleware, roleAccess(['manager']), async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 1;
    const filterNotified = req.query.notified === 'false';

    const today = new Date();
    const endDate = new Date();
    endDate.setMonth(today.getMonth() + months);

    const clients = await Client.find({ managerId: req.user.id });

    // Filter clients based on equipment serviceDueDate
    const filteredClients = clients
      .map(client => {
        const soonExpiringEquipment = client.equipment
          .filter(eq =>
            eq.serviceDueDate >= today &&
            eq.serviceDueDate <= endDate &&
            (!filterNotified || !eq.lastServiceNotified)
          )
          .sort((a, b) => a.serviceDueDate - b.serviceDueDate); // sort by serviceDueDate

        // If there is any soon-expiring equipment, return the client

        if (soonExpiringEquipment.length > 0) {
          return {
            _id: client._id,
            companyName: client.companyName,
            managerId: client.managerId,
            equipment: soonExpiringEquipment
          };
        }

        return null;
      })
      .filter(Boolean); // Remove null values

    if (filteredClients.length === 0) {
      return res.status(404).json({ message: 'No soon-expiring equipment found' });
    }

    res.json(filteredClients);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching soon-expiring clients', error: err.message });
  }
});


/**
 * PATCH /api/clients/:id
 * - Managers: can update only their clients
 * - Supervisor: can update any client
 */
router.patch('/:id', authMiddleware, roleAccess(['supervisor', 'manager']), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    // Only owner manager or admin/supervisor can update
    if (
      req.user.role === 'manager' &&
      client.managerId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    Object.assign(client, req.body);
    await client.save();
    res.json({ message: 'Client updated', client });
  } catch (err) {
    res.status(500).json({ message: 'Error updating client' });
  }
});

/**
 * DELETE /api/clients/:id
 * - Admin only
 */
router.delete('/:id', authMiddleware, roleAccess(['admin']), async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting client' });
  }
});

/** * DELETE /api/clients/:id
 * - Supervisor: mark client as inactive
 * - Manager: not allowed
 * - Returns message confirming client is marked as inactive
 */
router.delete('/:id/soft-delete', authMiddleware, roleAccess(['supervisor']), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    client.isActive = false;
    await client.save();

    res.json({ message: 'Client marked as inactive' });
  } catch (err) {
    res.status(500).json({ message: 'Error marking client as inactive' });
  }
});


/**
 * PATCH /api/clients/:id/assign
 * - Supervisor can reassign client to another manager
 * - Body: { newManagerId: ObjectId }
 */
router.patch('/:id/assign', authMiddleware, roleAccess(['supervisor']), async (req, res) => {
  const { newManagerId } = req.body;
  const clientId = req.params.id;

  try {
    const manager = await User.findById(newManagerId);
    if (!manager || manager.role !== 'manager') {
      return res.status(400).json({ message: 'Target user is not a manager' });
    }

    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      { managerId: newManagerId },
      { new: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({
      message: 'Client reassigned successfully',
      client: updatedClient
    });
  } catch (err) {
    res.status(500).json({ message: 'Error reassigning client' });
  }
});

/** * GET /api/clients/:id
 * - Supervisor & Manager: get client details
 */
router.get('/:id', authMiddleware, roleAccess(['supervisor', 'manager']), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate('managerId', 'name email');
    if (!client) return res.status(404).json({ message: 'Client not found' });

    // Check if user has access
    if (
      req.user.role === 'manager' &&
      client.managerId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching client details' });
  } 
});


/** PATCH api/clientId/equipment/:equipmentId/service-action
 * 
 * - Supervisor & Manager: set statust and  for equipment and date of last notification
 * - Body: { action: 'notify' | 'confirm' }
 * - Action 'notify': sets serviceStatus to 'notified' and lastServiceNotified to current date
 * - Action 'confirm': sets serviceStatus to 'completed' and updates serviceDueDate to one year from last service date
 */
router.patch('/:clientId/equipment/:equipmentId/service-action', authMiddleware, roleAccess(['supervisor', 'manager']), async (req, res) => {
  try {
    const { clientId, equipmentId } = req.params;
    const { action } = req.body;

    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const equipment = client.equipment.id(equipmentId);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

    if (action === 'notify') {
      equipment.lastServiceNotified = new Date();
      equipment.serviceStatus = 'notified';
    } else if (action === 'confirm') {
      const newDueDate = new Date(equipment.serviceDueDate || new Date());
      newDueDate.setFullYear(newDueDate.getFullYear() + 1);
      equipment.serviceDueDate = newDueDate;
      equipment.serviceStatus = 'completed';
    } else {
      return res.status(400).json({ message: 'Invalid action type' });
    }

    await client.save();
    res.json({ message: `Service ${action} action completed successfully` });

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


export default router;

