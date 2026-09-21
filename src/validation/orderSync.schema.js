const Joi = require('joi');
const { addressSchema } = require('./common.schema');

const orderItemSchema = Joi.object({
  marketplaceOrderId: Joi.string().required(),
  orderId: Joi.string().optional(),
  orderPlacedAt: Joi.string().optional(),
  shipToName: Joi.string().allow('').optional(),
  shippingAddress: addressSchema.optional(),
  productTitle: Joi.string().allow('').optional(),
  productId: Joi.string().allow('').optional(),
  productUrl: Joi.string().uri().allow('').optional(),
  productImageUrl: Joi.string().uri().allow('').optional(),
  orderUrl: Joi.string().uri().allow('').optional(),
  trackingUrl: Joi.string().allow('').optional(),
  sourceTracking: Joi.string().allow('').optional(),
  status: Joi.string().allow('').optional(),
}).unknown(false);

const profileFields = {
  profileId: Joi.string().required(),
  accountOrigin: Joi.string().valid('amazon', 'aliexpress', 'walmart').required(),
  label: Joi.string().optional(),
  marketplaceHost: Joi.string().optional(),
  retailer: Joi.string().optional(),
  amazonAccountEmail: Joi.string().email().optional(),
  storeAddress: addressSchema.optional(),
};

const orderSyncSchema = Joi.object({
  ...profileFields,
  orders: Joi.array().items(orderItemSchema).min(1).required(),
});

const syncFullTrackingSchema = Joi.object({
  trackingUrl: Joi.string().optional(),
  carrier: Joi.string().optional(),
  retailer: Joi.string().optional(),
  marketplaceHost: Joi.string().optional(),
  sourceTracking: Joi.string().optional(),
  amazonCustomerId: Joi.string().optional(),
  shippingAddress: addressSchema.optional(),
});

// Single-order pipeline: sync -> assign tracking -> upload tracking HTML.
const syncFullSchema = Joi.object({
  ...profileFields,
  order: orderItemSchema.required(),
  tracking: syncFullTrackingSchema.optional(),
  // Aquiline only accepts tracking HTML for Amazon profiles.
  html: Joi.string().when('accountOrigin', {
    is: 'amazon',
    then: Joi.optional(),
    otherwise: Joi.forbidden().messages({ 'any.unknown': '"html" is only allowed for amazon profiles' }),
  }),
  amazonCustomerId: Joi.string().optional(),
})
  .custom((value, helpers) => {
    // Non-Amazon assigns require a carrier alongside the tracking number.
    const trackingUrl = value.tracking?.trackingUrl || value.order.trackingUrl;
    if (value.accountOrigin !== 'amazon' && trackingUrl && !value.tracking?.carrier) {
      return helpers.message(`"tracking.carrier" is required for ${value.accountOrigin} orders with a tracking number`);
    }
    return value;
  });

module.exports = { orderSyncSchema, syncFullSchema };
