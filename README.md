# Aquiline Order Sync Service

A stateless Node.js/Express microservice that syncs marketplace orders into the
[Aquiline Customer Integration API](https://aquiline-tracking.com). It ensures an
Aquiline profile exists for a marketplace source, upserts orders into it, and
(on demand) uploads Amazon tracking HTML and looks up Aquiline tracking numbers.

No database. No caching layer. Every request talks to Aquiline directly and
returns a clean success/failure response.

## Features

- **Order sync** — check if a profile exists in Aquiline, create it if missing
  (reusing the same `profileId`), then upsert the order(s).
- **Tracking HTML upload** (on demand) — push a fresh Amazon tracking-page HTML
  snapshot so Aquiline can refresh carrier signals.
- **Tracking lookup** (on demand) — fetch the Aquiline tracking number/status
  for a given order.
- **Tracking assign** — register a carrier tracking number (AliExpress/Walmart)
  or Amazon tracking URL with Aquiline.
- Centralized request validation (Joi), structured logging (Winston), and a
  single error-handling middleware that reports which stage failed.

## Requirements

- Node.js 18+
- An Aquiline integration API token (`Dashboard → Integration API` in the
  Aquiline app), split into `AQUILINE_TOKEN_ID` and `AQUILINE_TOKEN_SECRET`.

## Setup

```bash
cp .env.example .env
# fill in AQUILINE_TOKEN_ID / AQUILINE_TOKEN_SECRET
npm install
```

## Run

```bash
npm run dev     # nodemon, auto-reload
npm start       # production
```

## Docker

```bash
docker build -t aquiline-sync-service .
docker run --env-file .env -p 3000:3000 aquiline-sync-service
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | no (default 3000) | HTTP port |
| `NODE_ENV` | no | `development` / `production` |
| `AQUILINE_BASE_URL` | yes | Aquiline API base URL |
| `AQUILINE_TOKEN_ID` | yes | Integration token id |
| `AQUILINE_TOKEN_SECRET` | yes | Integration token secret |
| `AQUILINE_TIMEOUT_MS` | no (default 15000) | Outbound request timeout |
| `LOG_LEVEL` | no (default info) | Winston log level |

## API

### `GET /api/healthz`
Liveness check. `{ "success": true, "status": "ok" }`

### `POST /api/orders/sync`
Main flow: ensure the profile exists in Aquiline, then upsert the order(s).

**Request**
```jsonc
{
  "profileId": "amazon-us-main",
  "accountOrigin": "amazon",           // amazon | aliexpress | walmart
  "label": "Amazon US",
  "marketplaceHost": "www.amazon.com", // amazon profiles only
  "storeAddress": {
    "address_line1": "100 Example St",
    "city": "Example City",
    "state": "CA",
    "zip_code": "90001",
    "country": "US"
  },
  "orders": [
    {
      "marketplaceOrderId": "113-5870630-5330667",
      "shipToName": "Greg Carmouche",
      "productTitle": "Example Amazon product",
      "productId": "B0B1TZ4BJ2",
      "trackingUrl": "https://www.amazon.com/gp/your-account/ship-track?orderId=113-5870630-5330667",
      "sourceTracking": "Amazon",
      "status": "Shipping"
    }
  ]
}
```

**Response**
```jsonc
{ "success": true, "profileId": "amazon-us-main", "profileCreated": false, "ordersUpserted": 1 }
```

**Failure**
```jsonc
{ "success": false, "stage": "upsert_order", "error": "..." }
```

### `POST /api/tracking/upload-html`  *(on demand, Amazon only)*
```jsonc
{
  "profileId": "amazon-us-main",
  "orderId": "113-5870630-5330667",
  "trackingUrl": "https://www.amazon.com/gp/your-account/ship-track?orderId=113-5870630-5330667",
  "html": "<html>...authenticated Amazon tracking page...</html>"
}
```
Returns `{ success, outcome, trackingUpdateStatus, message }`. `outcome` is
`accepted` (stored, still processing) or `applied` — `success:true` alone does
**not** mean the update was applied.

### `POST /api/tracking/assign`
Registers carrier tracking with Aquiline (Amazon tracking URL, or AliExpress /
Walmart with a `carrier` + tracking number). See the Aquiline OpenAPI spec for
the full `carrier` enum and per-marketplace payload shape.

### `GET /api/tracking/:profileId/:orderId`  *(on demand)*
Returns `{ success, aquilineNumber, status, trackingUrl, order }`.

## Error Handling

- Joi validation runs before any Aquiline call — bad input returns `400` with
  `stage: "validation"` and never reaches Aquiline.
- Every Aquiline call is wrapped and re-thrown as an `AppError` tagged with the
  stage it failed at (`check_profile`, `create_profile`, `upsert_order`,
  `upload_html`, `get_tracking`, `assign_tracking`).
- All errors are logged (Winston) with context and returned as
  `{ success: false, stage, error, details? }`.
- No retry queue — failures are surfaced immediately; the caller decides
  whether to retry.

## Project Structure

```
src/
├── config/env.js              # env loading & validation
├── services/aquiline.service.js   # Aquiline HTTP API wrapper
├── domain/orderSync.service.js    # core check -> create -> upsert logic
├── controllers/                   # request handlers
├── routes/                        # express routers
├── middlewares/                   # validate.js, errorHandler.js
├── validation/                    # Joi schemas
├── utils/                         # logger.js, AppError.js
└── app.js                         # express app assembly
server.js                          # entrypoint, graceful shutdown
```

## Roadmap / Not Yet Wired Up

- The upstream streaming/automation job source (endpoint, format, push vs
  pull) is not yet defined — this service is decoupled from it and is called
  directly for now with the payload shape shown above.
