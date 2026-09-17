const express = require('express');
const validate = require('../middlewares/validate');
const { uploadTrackingHtmlSchema, assignTrackingSchema } = require('../validation/tracking.schema');
const trackingController = require('../controllers/tracking.controller');

const router = express.Router();

// POST /api/tracking/upload-html   (Task 2 - on demand)
router.post('/upload-html', validate(uploadTrackingHtmlSchema), trackingController.uploadTrackingHtml);

// POST /api/tracking/assign        (register carrier tracking with Aquiline)
router.post('/assign', validate(assignTrackingSchema), trackingController.assignTracking);

// GET /api/tracking/:profileId/:orderId   (Task 3 - on demand)
router.get('/:profileId/:orderId', trackingController.getTracking);

module.exports = router;
