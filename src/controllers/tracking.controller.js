const aquilineService = require('../services/aquiline.service');
const AppError = require('../utils/AppError');

/**
 * Task 2: push a fresh Amazon tracking-page HTML snapshot to Aquiline.
 * success:true from Aquiline means "accepted", not necessarily "applied" —
 * we pass the raw outcome/trackingUpdateStatus straight through to the caller.
 */
async function uploadTrackingHtml(req, res, next) {
  try {
    const { profileId, orderId, trackingUrl, html, amazonCustomerId } = req.body;
    const data = await aquilineService.uploadTrackingHtml(profileId, orderId, {
      trackingUrl,
      html,
      amazonCustomerId,
    });
    res.status(200).json({
      success: true,
      outcome: data.outcome,
      trackingUpdateStatus: data.trackingUpdateStatus,
      message: data.message,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Task 3: fetch the Aquiline tracking number / status for an order.
 */
async function getTracking(req, res, next) {
  try {
    const { profileId, orderId } = req.params;
    const order = await aquilineService.getOrder(profileId, orderId);
    if (!order) {
      return next(
        new AppError('Order not found in Aquiline', {
          stage: 'get_tracking',
          statusCode: 404,
        })
      );
    }
    res.status(200).json({
      success: true,
      aquilineNumber: order.aquilineNumber || null,
      status: order.status,
      trackingUrl: order.trackingUrl,
      order,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Registers Aquiline tracking for an order (assign step) — used once we have
 * a real carrier tracking number (or Amazon tracking page URL) to hand off.
 */
async function assignTracking(req, res, next) {
  try {
    const { profileId, orderId, ...body } = req.body;
    const data = await aquilineService.assignTracking(profileId, orderId, body);
    res.status(200).json({
      success: true,
      aquiline: data.aquiline,
      chargedCents: data.chargedCents,
      planRemaining: data.planRemaining,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadTrackingHtml, getTracking, assignTracking };
