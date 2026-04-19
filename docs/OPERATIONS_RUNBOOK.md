# Operations Runbook

## 1. Start/Restart Procedures

### Full stack start
- Command: `./start-all.ps1`

### Restart a single service
- Stop process bound to the service port.
- Restart in service folder:
  - API Gateway (3000): `npm run dev`
  - Auth (3001): `npm run dev`
  - Catalog (3002): `npm run dev`
  - Order (3003): `npm run dev`
  - Event (3004): `npm run dev`
  - Frontend (5174): `npm run dev`

## 2. Health and Route Validation

### Automated health checks
- Command: `npm run ops:health`
- Optional admin token:
  - `powershell -Command "$env:AdminToken='YOUR_TOKEN'; npm run ops:health"`

### Regression route checks
- Command: `npm run test:regression`
- Optional base URL/token:
  - `REGRESSION_BASE_URL=http://localhost:3000`
  - `REGRESSION_ADMIN_TOKEN=<JWT_ADMIN>`

## 3. High-Risk Flows

### Event invoice payment flow
1. Client accepts quote.
2. Invoice is created (event-service).
3. Client initiates Flouci payment from dashboard invoices.
4. On callback return, frontend calls refresh verification endpoint.
5. On successful verification:
   - Event invoice status -> `PAID`
   - Event invoice payment status -> `COMPLETED`
   - Event status transitions from `QUOTE_ACCEPTED` to `CONFIRMED`.

### Ingredient reservation flow (order-service -> catalog-service)
1. Order creation requests stock reservation with reference = order number.
2. Catalog decrements ingredient quantities from recipe requirements.
3. If order creation fails, reservation is released.
4. On order cancellation, reservation is released.
5. On order delivered, reservation is consumed.

## 4. Troubleshooting

### `404` on `/api/event-invoices`
- Verify event-service process is current and restarted.
- Verify gateway forwards `/api/event-invoices` to event-service.
- Run `npm run ops:health` and confirm route is mounted (status not 404).

### Event invoice payment not updating to paid
- Verify `FLOUCI_APP_TOKEN` and `FLOUCI_APP_SECRET` are configured in event-service.
- Confirm frontend callback includes `eventInvoiceId` query param.
- Trigger manual refresh from invoices page.

### Stock reservation failures on order creation
- Ensure plat recipe lines are defined (`/api/plats/:id/recipe`).
- Ensure ingredient quantities are sufficient.
- If operating in non-strict mode, inspect order-service logs for reservation warnings.

## 5. Environment Variables Checklist

### Catalog service
- `INTERNAL_SERVICE_TOKEN` (recommended for internal reservation endpoints)

### Order service
- `ORDER_ENFORCE_INGREDIENT_STOCK` (`true` recommended in production)
- `INTERNAL_SERVICE_TOKEN` (must match catalog token when enabled)

### Event service
- `FLOUCI_APP_TOKEN`
- `FLOUCI_APP_SECRET`
- `FRONTEND_URL`
- `EVENT_INVOICE_DUE_DAYS`
