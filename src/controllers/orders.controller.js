const orderSyncService = require('../domain/orderSync.service');
const syncFullService = require('../domain/syncFull.service');

async function syncOrder(req, res, next) {
  try {
    const result = await orderSyncService.syncOrder(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function syncFull(req, res, next) {
  try {
    const { statusCode, body } = await syncFullService.syncFull(req.body);
    res.status(statusCode).json(body);
  } catch (err) {
    next(err);
  }
}

module.exports = { syncOrder, syncFull };
