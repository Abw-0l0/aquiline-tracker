const Joi = require('joi');

const addressSchema = Joi.object({
  address_line1: Joi.string().allow('').optional(),
  address_line2: Joi.string().allow('').optional(),
  city: Joi.string().allow('').optional(),
  state: Joi.string().allow('').optional(),
  zip_code: Joi.string().allow('').optional(),
  country: Joi.string().allow('').optional(),
  first_name: Joi.string().allow('').optional(),
  last_name: Joi.string().allow('').optional(),
  phone_number: Joi.string().allow('').optional(),
});

module.exports = { addressSchema };
