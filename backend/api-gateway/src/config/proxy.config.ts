import { Express } from 'express';
import { createProxyMiddleware, fixRequestBody, Options } from 'http-proxy-middleware';

interface ServiceConfig {
  path: string;
  target: string;
  pathRewrite?: { [key: string]: string };
}

function getServices(): ServiceConfig[] {
  const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  const catalogUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3002';
  const orderUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';
  const eventUrl = process.env.EVENT_SERVICE_URL || 'http://localhost:3004';
  const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  return [
    { path: '/api/auth', target: authUrl, pathRewrite: { '^/api/auth': '/api' } },
    { path: '/api/users', target: authUrl },
    { path: '/api/addresses', target: authUrl },
    { path: '/api/contact', target: authUrl },
    { path: '/api/plats', target: catalogUrl },
    { path: '/api/ingredients', target: catalogUrl },
    { path: '/api/categories', target: catalogUrl },
    { path: '/api/allergens', target: catalogUrl },
    { path: '/api/upload', target: catalogUrl },
    { path: '/api/orders', target: orderUrl },
    { path: '/api/invoices', target: orderUrl },
    { path: '/api/payments', target: orderUrl },
    { path: '/api/events', target: eventUrl },
    { path: '/api/quotes', target: eventUrl },
    { path: '/api/event-invoices', target: eventUrl },
    { path: '/api/templates', target: eventUrl },
    { path: '/api/chat', target: aiUrl },
    { path: '/api/recommendations', target: aiUrl },
    { path: '/api/forecast', target: aiUrl },
    { path: '/api/chef', target: aiUrl },
    { path: '/api/kitchen', target: aiUrl },
    { path: '/api/optimizer', target: aiUrl },
  ];
}

export function setupProxies(app: Express): void {
  const services = getServices();
  services.forEach((service) => {
    const proxyOptions: Options = {
      target: service.target,
      changeOrigin: true,
      pathRewrite: service.pathRewrite,
      onError: (err, req, res) => {
        console.error(`Proxy error for ${service.path}:`, err.message);
        (res as any).status(503).json({
          error: 'Service temporarily unavailable',
          service: service.path,
        });
      },
      onProxyReq: (proxyReq, req) => {
        // Forward original IP
        proxyReq.setHeader('X-Forwarded-For', req.ip || '');
        proxyReq.setHeader('X-Real-IP', req.ip || '');

        // Re-send parsed request body when express.json() runs before proxy.
        fixRequestBody(proxyReq, req as any);
      },
    };

    app.use(service.path, createProxyMiddleware(proxyOptions));
    console.log(`  → ${service.path} → ${service.target}`);
  });
}
