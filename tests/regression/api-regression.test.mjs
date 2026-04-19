import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.REGRESSION_BASE_URL || 'http://localhost:3000';
const adminToken = process.env.REGRESSION_ADMIN_TOKEN;
let gatewayReachable;

async function call(path, { method = 'GET', body, token } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    status: response.status,
    payload,
  };
}

async function ensureGatewayReachable(t) {
  if (gatewayReachable !== undefined) {
    if (!gatewayReachable) {
      t.skip('Gateway is not running on REGRESSION_BASE_URL');
      return false;
    }
    return true;
  }

  try {
    const response = await fetch(`${baseUrl}/health`);
    gatewayReachable = response.ok;
  } catch {
    gatewayReachable = false;
  }

  if (!gatewayReachable) {
    t.skip('Gateway is not running on REGRESSION_BASE_URL');
    return false;
  }

  return true;
}

test('gateway health endpoint responds', async (t) => {
  if (!(await ensureGatewayReachable(t))) return;
  const result = await call('/health');
  assert.equal(result.status, 200);
});

test('event invoice routes are mounted (must not be 404)', async (t) => {
  if (!(await ensureGatewayReachable(t))) return;
  const result = await call('/api/event-invoices?page=1&limit=5', {
    token: adminToken,
  });

  assert.notEqual(result.status, 404);
  assert.ok([200, 401, 403].includes(result.status));
});

test('event invoice my-invoices route is mounted (must not be 404)', async (t) => {
  if (!(await ensureGatewayReachable(t))) return;
  const result = await call('/api/event-invoices/my-invoices?page=1&limit=5', {
    token: adminToken,
  });

  assert.notEqual(result.status, 404);
  assert.ok([200, 401, 403].includes(result.status));
});

test('order flouci verify endpoint remains POST-only', async (t) => {
  if (!(await ensureGatewayReachable(t))) return;
  const getResult = await call('/api/payments/flouci/verify/fake-payment-id', {
    method: 'GET',
    token: adminToken,
  });
  const postResult = await call('/api/payments/flouci/verify/fake-payment-id', {
    method: 'POST',
    token: adminToken,
  });

  assert.equal(getResult.status, 404);
  assert.ok([200, 400, 401, 403].includes(postResult.status));
});

test('catalog internal reservation route exists (stock reservation integration)', async (t) => {
  if (!(await ensureGatewayReachable(t))) return;
  const result = await call('/api/ingredients/internal/reservations', {
    method: 'POST',
    body: { reference: 'regression-check', items: [] },
  });

  assert.notEqual(result.status, 404);
  assert.ok([400, 401].includes(result.status));
});
