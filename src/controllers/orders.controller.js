const orderSyncService = require('../domain/orderSync.service');

async function syncOrder(req, res, next) {
  try {
    const result = await orderSyncService.syncOrder(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { syncOrder };
