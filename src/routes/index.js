const express = require('express');
const ordersRoutes = require('./orders.routes');
const trackingRoutes = require('./tracking.routes');

const router = express.Router();

router.get('/healthz', (req, res) => res.status(200).json({ success: true, status: 'ok' }));

router.use('/orders', ordersRoutes);
router.use('/tracking', trackingRoutes);

module.exports = router;
