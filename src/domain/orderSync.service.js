const aquilineService = require('../services/aquiline.service');
const logger = require('../utils/logger');

/**
 * Checks if the profile exists in Aquiline and creates it (with the same
 * profileId supplied by the caller) if it does not.
 */
async function ensureProfile(payload) {
  const { profileId, accountOrigin, label, marketplaceHost, retailer, storeAddress, amazonAccountEmail } = payload;

  logger.info('ensureProfile: checking profile', { profileId });
  const existingProfile = await aquilineService.getProfile(profileId);

  if (existingProfile) {
    logger.info('ensureProfile: profile already exists, reusing', { profileId });
    return { created: false };
  }

  logger.info('ensureProfile: profile not found, creating', { profileId, accountOrigin });
  await aquilineService.createProfile({
    accountOrigin,
    profileId,
    label,
    marketplaceHost,
    retailer,
    storeAddress,
    amazonAccountEmail,
  });
  return { created: true };
}

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
  const { profileId, orders } = payload;

  const { created: profileCreated } = await ensureProfile(payload);

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

module.exports = { ensureProfile, syncOrder };
