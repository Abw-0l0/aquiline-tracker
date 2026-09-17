const Joi = require('joi');
const { addressSchema } = require('./common.schema');

const uploadTrackingHtmlSchema = Joi.object({
  profileId: Joi.string().required(),
  orderId: Joi.string().required(),
  trackingUrl: Joi.string().required(),
  html: Joi.string().required(),
  amazonCustomerId: Joi.string().optional(),
});

const assignTrackingSchema = Joi.object({
  profileId: Joi.string().required(),
  orderId: Joi.string().required(),
  trackingUrl: Joi.string().required(),
  carrier: Joi.string().optional(),
  retailer: Joi.string().optional(),
  marketplaceHost: Joi.string().optional(),
  sourceTracking: Joi.string().optional(),
  amazonCustomerId: Joi.string().optional(),
  shippingAddress: addressSchema.optional(),
});

module.exports = { uploadTrackingHtmlSchema, assignTrackingSchema };
