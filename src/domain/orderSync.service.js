const aquilineService = require('../services/aquiline.service');
const logger = require('../utils/logger');

/**
 * Core flow (Task 1):
 *   1. Check if the profile already exists in Aquiline.
 *   2. If not, create it (using the same profileId supplied by the caller).
 *   3. Upsert the order(s) into that profile.
 *
 * Stateless: no caching, no persistence. Every call re-checks Aquiline.
 * Fails fast — no retry loop, the caller decides whether to retry.
 */
async function syncOrder(payload) {
  const { profileId, accountOrigin, label, marketplaceHost, retailer, storeAddress, amazonAccountEmail, orders } =
    payload;

  logger.info('syncOrder: checking profile', { profileId });
  const existingProfile = await aquilineService.getProfile(profileId);

  let profileCreated = false;
  if (!existingProfile) {
    logger.info('syncOrder: profile not found, creating', { profileId, accountOrigin });
    await aquilineService.createProfile({
      accountOrigin,
      profileId,
      label,
      marketplaceHost,
      retailer,
      storeAddress,
      amazonAccountEmail,
    });
    profileCreated = true;
  } else {
    logger.info('syncOrder: profile already exists, reusing', { profileId });
  }

  logger.info('syncOrder: upserting orders', { profileId, count: orders.length });
  const upsertResult = await aquilineService.upsertOrders(profileId, orders);

  return {
    success: true,
    profileId,
    profileCreated,
    ordersUpserted: upsertResult.count ?? orders.length,
    suggestAmazonEmailFetch: upsertResult.suggestAmazonEmailFetch ?? false,
  };
}

module.exports = { syncOrder };
