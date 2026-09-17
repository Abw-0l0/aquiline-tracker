const express = require('express');
const validate = require('../middlewares/validate');
const { orderSyncSchema } = require('../validation/orderSync.schema');
const ordersController = require('../controllers/orders.controller');

const router = express.Router();

// POST /api/orders/sync
// Core flow: check profile -> create if missing -> upsert order(s).
router.post('/sync', validate(orderSyncSchema), ordersController.syncOrder);

module.exports = router;
