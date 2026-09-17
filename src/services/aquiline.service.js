const axios = require('axios');
const { aquiline } = require('../config/env');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Thin wrapper around the Aquiline Customer Integration API.
 * Every method throws an AppError tagged with a `stage` so the caller can
 * report exactly where a failure happened, and never leaks the raw axios
 * error (which would include the Authorization header) to logs or clients.
 */
const client = axios.create({
  baseURL: aquiline.baseUrl,
  timeout: aquiline.timeoutMs,
  headers: {
    Authorization: `Bearer ${aquiline.tokenId}.${aquiline.tokenSecret}`,
    'Content-Type': 'application/json',
  },
});

function toAppError(err, stage) {
  if (err.response) {
    const { status, data } = err.response;
    logger.error('Aquiline API error response', { stage, status, data });
    return new AppError(
      data?.error || data?.message || `Aquiline request failed (${status})`,
      { stage, statusCode: status === 402 ? 402 : 502, details: data }
    );
  }
  if (err.request) {
    logger.error('Aquiline API no response', { stage, message: err.message });
    return new AppError('No response from Aquiline API', { stage, statusCode: 504 });
  }
  logger.error('Aquiline API request setup error', { stage, message: err.message });
  return new AppError(err.message, { stage, statusCode: 500 });
}

async function getProfile(profileId) {
  try {
    const { data } = await client.get(`/v1/profiles/${encodeURIComponent(profileId)}`);
    return data.profile;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw toAppError(err, 'check_profile');
  }
}

async function createProfile(payload) {
  try {
    const { data } = await client.post('/v1/profiles', payload);
    return data;
  } catch (err) {
    throw toAppError(err, 'create_profile');
  }
}

async function upsertOrders(profileId, orders) {
  try {
    const { data } = await client.post(
      `/v1/profiles/${encodeURIComponent(profileId)}/orders/upsert`,
      { orders }
    );
    return data;
  } catch (err) {
    throw toAppError(err, 'upsert_order');
  }
}

async function getOrder(profileId, orderId) {
  try {
    const { data } = await client.get(
      `/v1/profiles/${encodeURIComponent(profileId)}/orders/${encodeURIComponent(orderId)}`
    );
    return data.order;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw toAppError(err, 'get_tracking');
  }
}

async function uploadTrackingHtml(profileId, orderId, { trackingUrl, html, amazonCustomerId }) {
  try {
    const { data } = await client.post(
      `/v1/profiles/${encodeURIComponent(profileId)}/orders/${encodeURIComponent(orderId)}/tracking-html`,
      { trackingUrl, html, amazonCustomerId }
    );
    return data;
  } catch (err) {
    throw toAppError(err, 'upload_html');
  }
}

async function assignTracking(profileId, orderId, body) {
  try {
    const { data } = await client.post(
      `/v1/profiles/${encodeURIComponent(profileId)}/orders/${encodeURIComponent(orderId)}/assign`,
      body
    );
    return data;
  } catch (err) {
    throw toAppError(err, 'assign_tracking');
  }
}

module.exports = {
  getProfile,
  createProfile,
  upsertOrders,
  getOrder,
  uploadTrackingHtml,
  assignTracking,
};
