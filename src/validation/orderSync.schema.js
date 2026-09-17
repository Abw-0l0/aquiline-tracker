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

const orderSyncSchema = Joi.object({
  profileId: Joi.string().required(),
  accountOrigin: Joi.string().valid('amazon', 'aliexpress', 'walmart').required(),
  label: Joi.string().optional(),
  marketplaceHost: Joi.string().when('accountOrigin', {
    is: 'amazon',
    then: Joi.string().optional(),
    otherwise: Joi.string().optional(),
  }),
  retailer: Joi.string().optional(),
  amazonAccountEmail: Joi.string().email().optional(),
  storeAddress: addressSchema.optional(),
  orders: Joi.array().items(orderItemSchema).min(1).required(),
});

module.exports = { orderSyncSchema };
