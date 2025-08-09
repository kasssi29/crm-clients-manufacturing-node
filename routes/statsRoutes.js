import express from 'express';
import Client from '../models/Client.js';
import User from '../models/User.js';
import { authMiddleware, roleAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

//*For Supervisors: main statistics

/** * GET /api/stats/total-clients
 * Access: Supervisor only
 * Description: Get total number of clients
 * Returns: { total: number }
*/
router.get('/total-clients', authMiddleware, roleAccess(['supervisor']), async (req, res) => {
  try {
    const total = await Client.countDocuments();
    res.json({ total });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/** 
 * GET /api/stats/expiring
 * Access: Supervisor only
 * Description: Get number of clients with serviceDue expiring this month (excluding completed), and how many were notified
 * Returns: { expiringThisMonth: number, notifiedThisMonth: number }
 */
router.get('/expiring', authMiddleware, roleAccess(['supervisor']), async (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Number of clients with serviceDue expiring this month (excluding completed)
  
  try {
  const expiringThisMonth = await Client.countDocuments({
    equipment: {
      $elemMatch: {
        serviceDueDate: { $gte: start, $lte: end },
        serviceStatus: { $ne: 'completed' }
      }
    }
  });

  // Number of clients notified this month
  const notifiedThisMonth = await Client.countDocuments({
    equipment: {
      $elemMatch: {
        serviceDueDate: { $gte: start, $lte: end },
        serviceStatus: 'notified'
      }
    }
  });
  res.json({ expiringThisMonth, notifiedThisMonth });
}
  catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});


/** * GET /api/stats/total-managers
 * Access: Supervisor only
 * Description: Get total number of managers
 * Returns: { totalManagers: number }
*/
router.get('/total-managers', authMiddleware, roleAccess(['supervisor']), async (req, res) => {
  try{
  const totalManagers = await User.countDocuments({ role: 'manager' });
  res.json({ totalManagers });}
  catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

/** * GET /api/stats/clients-summary-per-manager
 * Access: Supervisor only
  * Description: Get summary of clients per manager
  * Returns: Array of objects with managerId, name, email, totalClients, notificationsSentLastMonth, servicesDoneLastMonth, expectedDueNextMonth
*/
router.get('/clients-summary-per-manager', authMiddleware, roleAccess(['supervisor']), async (req, res) => {
  try {
    const managers = await User.find({ role: 'manager' });

    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const summary = await Promise.all(managers.map(async (manager) => {
      const clients = await Client.find({ managerId: manager._id });

      let notificationsSentLastMonth = 0;
      let servicesDoneLastMonth = 0;
      let expectedDueNextMonth = 0;

      clients.forEach(client => {
        client.equipment.forEach(eq => {
          if (eq.lastServiceNotified && eq.lastServiceNotified >= startOfLastMonth && eq.lastServiceNotified <= endOfLastMonth) {
            if (eq.serviceStatus === 'notified') notificationsSentLastMonth++;
            if (eq.serviceStatus === 'completed') servicesDoneLastMonth++;
          }
          if (eq.serviceDueDate >= startOfNextMonth && eq.serviceDueDate <= endOfNextMonth) {
            expectedDueNextMonth++;
          }
        });
      });

      return {
        managerId: manager._id,
        name: manager.name,
        email: manager.email,
        totalClients: clients.length,
        notificationsSentLastMonth,
        servicesDoneLastMonth,
        expectedDueNextMonth
      };
    }));

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/** * GET /api/stats/manager/:id/details
 * Access: Supervisor only
 * Description: Get detailed statistics for a specific manager
 * Parameters: id (manager ID), optional query parameters from and to for date range
 * - Defaults to last 30 days if not provided
 * Returns: { managerId, name, period: { from, to }, notificationsSent, servicesCompleted, expectedDue, clients: [{ clientId, contactPerson, company, equipment: [{ model, serial, serviceStatus, lastServiceNotified, serviceDueDate }] }] }
*/
router.get('/manager/:id/details', authMiddleware, roleAccess(['supervisor']), async (req, res) => {
  const { id } = req.params;
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  try {
    const manager = await User.findById(id);
    if (!manager || manager.role !== 'manager') return res.status(404).json({ message: 'Manager not found' });

    const clients = await Client.find({ managerId: id });

    let notificationsSent = 0;
    let servicesDoneLastMonth = 0;
    let expectedDue = 0;

    const filteredClients = [];

    clients.forEach(client => {
      const matchingEquipment = client.equipment.filter(eq => {
        const notifiedInRange = eq.lastServiceNotified && eq.lastServiceNotified >= from && eq.lastServiceNotified <= to;
        const dueInRange = eq.serviceDueDate && eq.serviceDueDate >= from && eq.serviceDueDate <= to;

        if (notifiedInRange) {
          if (eq.serviceStatus === 'notified') notificationsSent++;
          if (eq.serviceStatus === 'completed') servicesDoneLastMonth++;
        }
        if (dueInRange) expectedDue++;

        return notifiedInRange || dueInRange;
      });

      if (matchingEquipment.length > 0) {
        filteredClients.push({
          clientId: client._id,
          contactPerson: client.clientContactPerson,
          company: client.companyName,
          equipment: matchingEquipment.map(eq => ({
            model: eq.model,
            serial: eq.serial,
            serviceStatus: eq.serviceStatus,
            lastServiceNotified: eq.lastServiceNotified,
            serviceDueDate: eq.serviceDueDate
          }))
        });
      }
    });

    res.json({
      managerId: manager._id,
      name: manager.name,
      period: { from, to },
      notificationsSent,
      servicesDoneLastMonth,
      expectedDue,
      clients: filteredClients
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


export default router;
