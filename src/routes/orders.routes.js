const express = require('express');
const validate = require('../middlewares/validate');
const { orderSyncSchema, syncFullSchema } = require('../validation/orderSync.schema');
const ordersController = require('../controllers/orders.controller');

const router = express.Router();

// POST /api/orders/sync
// Core flow: check profile -> create if missing -> upsert order(s).
router.post('/sync', validate(orderSyncSchema), ordersController.syncOrder);

// POST /api/orders/sync-full
// Single order: sync -> assign tracking (if not already assigned) -> upload tracking HTML (Amazon).
router.post('/sync-full', validate(syncFullSchema), ordersController.syncFull);

module.exports = router;
