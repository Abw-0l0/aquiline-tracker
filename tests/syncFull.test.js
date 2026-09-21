const nock = require('nock');
const { syncFull } = require('../src/domain/syncFull.service');
const { syncFullSchema } = require('../src/validation/orderSync.schema');

const BASE = 'https://aquiline.test';
const PREFIX = '/api/integration/v1/profiles';
const PROFILE_ID = 'amazon-us-main';
const ORDER_ID = '113-5870630-5330667';
const TRACKING_URL = `https://www.amazon.com/gp/your-account/ship-track?orderId=${ORDER_ID}`;
const ORDER_PATH = `${PREFIX}/${PROFILE_ID}/orders/${ORDER_ID}`;

function amazonPayload(overrides = {}) {
  return {
    profileId: PROFILE_ID,
    accountOrigin: 'amazon',
    marketplaceHost: 'www.amazon.com',
    order: { marketplaceOrderId: ORDER_ID, trackingUrl: TRACKING_URL, sourceTracking: 'Amazon' },
    html: '<html>tracking</html>',
    ...overrides,
  };
}

const aquiline = () => nock(BASE);

beforeAll(() => nock.disableNetConnect());
afterEach(() => nock.cleanAll());
afterAll(() => nock.enableNetConnect());

describe('syncFull', () => {
  test('amazon happy path with existing profile runs every step', async () => {
    const scope = aquiline()
      .get(`${PREFIX}/${PROFILE_ID}`).reply(200, { success: true, profile: { profileId: PROFILE_ID } })
      .post(`${PREFIX}/${PROFILE_ID}/orders/upsert`, (body) => body.orders.length === 1).reply(200, { success: true, count: 1 })
      .get(ORDER_PATH).reply(200, { success: true, order: { orderId: ORDER_ID } })
      .post(`${ORDER_PATH}/assign`, (body) => body.trackingUrl === TRACKING_URL && body.marketplaceHost === 'www.amazon.com')
      .reply(200, { success: true, aquiline: 'AQUA123', chargedCents: 0, planRemaining: 287 })
      .post(`${ORDER_PATH}/tracking-html`, (body) => body.html === '<html>tracking</html>')
      .reply(200, { success: true, outcome: 'accepted', trackingUpdateStatus: 'processing', message: 'Processing' });

    const { statusCode, body } = await syncFull(amazonPayload());

    expect(statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.failedStep).toBeNull();
    expect(body.steps.ensure_profile).toEqual({ status: 'done', created: false });
    expect(body.steps.upsert_order.status).toBe('done');
    expect(body.steps.assign_tracking).toMatchObject({ status: 'done', aquilineNumber: 'AQUA123', planRemaining: 287 });
    expect(body.steps.upload_html).toMatchObject({ status: 'done', outcome: 'accepted', trackingUpdateStatus: 'processing' });
    expect(scope.isDone()).toBe(true);
  });

  test('creates the profile when it does not exist', async () => {
    const scope = aquiline()
      .get(`${PREFIX}/${PROFILE_ID}`).reply(404, { success: false })
      .post(PREFIX, (body) => body.profileId === PROFILE_ID && body.accountOrigin === 'amazon').reply(200, { success: true })
      .post(`${PREFIX}/${PROFILE_ID}/orders/upsert`).reply(200, { success: true, count: 1 });

    const { statusCode, body } = await syncFull(amazonPayload({ order: { marketplaceOrderId: ORDER_ID } }));

    expect(statusCode).toBe(200);
    expect(body.steps.ensure_profile).toEqual({ status: 'done', created: true });
    expect(scope.isDone()).toBe(true);
  });

  test('skips assign when order already has an aquiline number, still uploads html', async () => {
    const scope = aquiline()
      .get(`${PREFIX}/${PROFILE_ID}`).reply(200, { success: true, profile: {} })
      .post(`${PREFIX}/${PROFILE_ID}/orders/upsert`).reply(200, { success: true, count: 1 })
      .get(ORDER_PATH).reply(200, { success: true, order: { aquilineNumber: 'AQUA999' } })
      .post(`${ORDER_PATH}/tracking-html`).reply(200, { success: true, outcome: 'applied' });

    const { body } = await syncFull(amazonPayload());

    expect(body.steps.assign_tracking).toEqual({ status: 'skipped', reason: 'already_assigned', aquilineNumber: 'AQUA999' });
    expect(body.steps.upload_html).toMatchObject({ status: 'done', outcome: 'applied' });
    // No /assign interceptor registered + net connect disabled => an assign call would have failed the step.
    expect(scope.isDone()).toBe(true);
  });

  test('skips assign and html when there is no tracking number', async () => {
    const scope = aquiline()
      .get(`${PREFIX}/${PROFILE_ID}`).reply(200, { success: true, profile: {} })
      .post(`${PREFIX}/${PROFILE_ID}/orders/upsert`).reply(200, { success: true, count: 1 });

    const { statusCode, body } = await syncFull(amazonPayload({ order: { marketplaceOrderId: ORDER_ID } }));

    expect(statusCode).toBe(200);
    expect(body.steps.assign_tracking).toEqual({ status: 'skipped', reason: 'no_tracking' });
    expect(body.steps.upload_html).toEqual({ status: 'skipped', reason: 'not_assigned' });
    expect(scope.isDone()).toBe(true);
  });

  test('stops at assign failure (402) and reports later steps as not_run', async () => {
    aquiline()
      .get(`${PREFIX}/${PROFILE_ID}`).reply(200, { success: true, profile: {} })
      .post(`${PREFIX}/${PROFILE_ID}/orders/upsert`).reply(200, { success: true, count: 1 })
      .get(ORDER_PATH).reply(404, {})
      .post(`${ORDER_PATH}/assign`).reply(402, { success: false, error: 'Paid plan required' });

    const { statusCode, body } = await syncFull(amazonPayload());

    expect(statusCode).toBe(402);
    expect(body.success).toBe(false);
    expect(body.failedStep).toBe('assign_tracking');
    expect(body.steps.upsert_order.status).toBe('done');
    expect(body.steps.assign_tracking).toMatchObject({ status: 'failed', stage: 'assign_tracking', error: 'Paid plan required' });
    expect(body.steps.upload_html).toEqual({ status: 'not_run' });
  });

  test('reports html upload failure after earlier steps succeeded', async () => {
    aquiline()
      .get(`${PREFIX}/${PROFILE_ID}`).reply(200, { success: true, profile: {} })
      .post(`${PREFIX}/${PROFILE_ID}/orders/upsert`).reply(200, { success: true, count: 1 })
      .get(ORDER_PATH).reply(200, { success: true, order: { aquilineNumber: 'AQUA999' } })
      .post(`${ORDER_PATH}/tracking-html`)
      .reply(400, { success: false, problemCode: 'amazon_session_expired', message: 'Session expired' });

    const { statusCode, body } = await syncFull(amazonPayload());

    expect(statusCode).toBe(502);
    expect(body.failedStep).toBe('upload_html');
    expect(body.steps.ensure_profile.status).toBe('done');
    expect(body.steps.upsert_order.status).toBe('done');
    expect(body.steps.assign_tracking.status).toBe('skipped');
    expect(body.steps.upload_html).toMatchObject({
      status: 'failed',
      stage: 'upload_html',
      details: { problemCode: 'amazon_session_expired' },
    });
  });

  test('walmart assign omits retailer and marketplaceHost, skips html', async () => {
    const scope = aquiline()
      .get(`${PREFIX}/walmart-main`).reply(200, { success: true, profile: {} })
      .post(`${PREFIX}/walmart-main/orders/upsert`).reply(200, { success: true, count: 1 })
      .get(`${PREFIX}/walmart-main/orders/W1`).reply(404, {})
      .post(`${PREFIX}/walmart-main/orders/W1/assign`, (body) =>
        body.carrier === 'FEDEX' && body.sourceTracking === '794612345678' && !('retailer' in body) && !('marketplaceHost' in body))
      .reply(200, { success: true, aquiline: 'AQUAW1' });

    const { statusCode, body } = await syncFull({
      profileId: 'walmart-main',
      accountOrigin: 'walmart',
      retailer: 'walmart',
      order: { marketplaceOrderId: 'W1' },
      tracking: { trackingUrl: '794612345678', carrier: 'FEDEX' },
    });

    expect(statusCode).toBe(200);
    expect(body.steps.assign_tracking.aquilineNumber).toBe('AQUAW1');
    expect(body.steps.upload_html).toEqual({ status: 'skipped', reason: 'not_amazon' });
    expect(scope.isDone()).toBe(true);
  });
});

describe('syncFullSchema', () => {
  const validate = (body) => syncFullSchema.validate(body, { abortEarly: false, stripUnknown: true });

  test('accepts a valid amazon payload', () => {
    expect(validate(amazonPayload()).error).toBeUndefined();
  });

  test('rejects html for non-amazon profiles', () => {
    const { error } = validate({
      profileId: 'walmart-main',
      accountOrigin: 'walmart',
      order: { marketplaceOrderId: 'W1' },
      html: '<html></html>',
    });
    expect(error.message).toMatch(/only allowed for amazon/);
  });

  test('rejects non-amazon tracking number without a carrier', () => {
    const { error } = validate({
      profileId: 'aliexpress-main',
      accountOrigin: 'aliexpress',
      order: { marketplaceOrderId: 'A1', trackingUrl: 'JJD0000000000000000' },
    });
    expect(error.message).toMatch(/tracking.carrier/);
  });
});
