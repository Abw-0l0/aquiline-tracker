const aquilineService = require('../services/aquiline.service');
const { ensureProfile } = require('./orderSync.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const STEPS = ['ensure_profile', 'upsert_order', 'assign_tracking', 'upload_html'];

/**
 * Builds the assign body per the Aquiline spec: retailer / marketplaceHost are
 * Amazon-only; non-Amazon assigns carry a carrier + tracking number instead.
 */
function buildAssignBody(payload, trackingUrl) {
  const { accountOrigin, order, amazonCustomerId } = payload;
  const tracking = payload.tracking || {};
  const isAmazon = accountOrigin === 'amazon';

  const body = {
    trackingUrl,
    carrier: tracking.carrier,
    sourceTracking: tracking.sourceTracking || order.sourceTracking || (isAmazon ? undefined : trackingUrl),
    shippingAddress: tracking.shippingAddress || order.shippingAddress,
    amazonCustomerId: tracking.amazonCustomerId || amazonCustomerId,
  };
  if (isAmazon) {
    body.retailer = tracking.retailer || payload.retailer;
    body.marketplaceHost = tracking.marketplaceHost || payload.marketplaceHost;
  }
  return body;
}

/**
 * Full single-order pipeline:
 *   1. ensure_profile  - check profile, create if missing
 *   2. upsert_order    - upsert the order
 *   3. assign_tracking - skipped if no tracking number or already assigned
 *                        (never charges the plan twice on retries)
 *   4. upload_html     - Amazon only, skipped if no html or no Aquiline number
 *
 * Stops at the first failed step; later steps are reported as `not_run`.
 * Never throws for step failures — returns { statusCode, body } with a
 * per-step report so the caller can see what already succeeded.
 */
async function syncFull(payload) {
  const { profileId, accountOrigin, order, html } = payload;
  const orderId = order.marketplaceOrderId;
  const trackingUrl = payload.tracking?.trackingUrl || order.trackingUrl;

  const steps = Object.fromEntries(STEPS.map((name) => [name, { status: 'not_run' }]));
  let aquilineNumber = null;

  const handlers = {
    ensure_profile: async () => {
      const { created } = await ensureProfile(payload);
      return { status: 'done', created };
    },

    upsert_order: async () => {
      const result = await aquilineService.upsertOrders(profileId, [order]);
      return { status: 'done', suggestAmazonEmailFetch: result.suggestAmazonEmailFetch ?? false };
    },

    assign_tracking: async () => {
      if (!trackingUrl) return { status: 'skipped', reason: 'no_tracking' };

      const existing = await aquilineService.getOrder(profileId, orderId);
      if (existing?.aquilineNumber) {
        aquilineNumber = existing.aquilineNumber;
        return { status: 'skipped', reason: 'already_assigned', aquilineNumber };
      }

      const data = await aquilineService.assignTracking(profileId, orderId, buildAssignBody(payload, trackingUrl));
      aquilineNumber = data.aquiline || null;
      return {
        status: 'done',
        aquilineNumber,
        chargedCents: data.chargedCents,
        planRemaining: data.planRemaining,
      };
    },

    upload_html: async () => {
      if (accountOrigin !== 'amazon') return { status: 'skipped', reason: 'not_amazon' };
      if (!html) return { status: 'skipped', reason: 'no_html' };
      if (!aquilineNumber) return { status: 'skipped', reason: 'not_assigned' };

      const data = await aquilineService.uploadTrackingHtml(profileId, orderId, {
        trackingUrl,
        html,
        amazonCustomerId: payload.tracking?.amazonCustomerId || payload.amazonCustomerId,
      });
      // outcome "accepted" does not mean "applied" — passed through as-is.
      return {
        status: 'done',
        outcome: data.outcome,
        trackingUpdateStatus: data.trackingUpdateStatus,
        message: data.message,
      };
    },
  };

  for (const name of STEPS) {
    try {
      steps[name] = await handlers[name]();
      logger.info(`syncFull: ${name} ${steps[name].status}`, { profileId, orderId, reason: steps[name].reason });
    } catch (err) {
      const isAppError = err instanceof AppError;
      steps[name] = {
        status: 'failed',
        stage: isAppError ? err.stage : 'unknown',
        error: err.message || 'Internal server error',
        details: isAppError ? err.details : undefined,
      };
      logger.error(`syncFull: ${name} failed`, { profileId, orderId, ...steps[name], stack: err.stack });

      return {
        statusCode: isAppError ? err.statusCode : 500,
        body: { success: false, profileId, orderId, failedStep: name, steps },
      };
    }
  }

  return {
    statusCode: 200,
    body: { success: true, profileId, orderId, failedStep: null, steps },
  };
}

module.exports = { syncFull };
