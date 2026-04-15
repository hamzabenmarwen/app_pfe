/**
 * Health Routes — aggregated health status of all microservices.
 * GET /api/health/services  → returns status of every backend service
 */
import { Router, Request, Response } from 'express';
import http from 'http';
import { getPerformanceStats } from '../middleware/performance.middleware';

const router = Router();

interface ServiceHealth {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  details?: Record<string, unknown>;
}

function checkService(name: string, url: string): Promise<ServiceHealth> {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get(url, { timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const elapsed = Date.now() - start;
        try {
          const json = JSON.parse(body);
          resolve({
            name,
            url,
            status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
            responseTime: elapsed,
            details: json,
          });
        } catch {
          resolve({ name, url, status: 'healthy', responseTime: elapsed });
        }
      });
    });

    req.on('error', () => {
      resolve({ name, url, status: 'unhealthy', responseTime: Date.now() - start });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ name, url, status: 'unhealthy', responseTime: 3000 });
    });
  });
}

router.get('/services', async (_req: Request, res: Response) => {
  const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  const catalogUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3002';
  const orderUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';
  const eventUrl = process.env.EVENT_SERVICE_URL || 'http://localhost:3004';
  const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  const checks = await Promise.all([
    checkService('API Gateway', 'http://localhost:' + (process.env.PORT || 3000) + '/health'),
    checkService('Auth Service', authUrl + '/health'),
    checkService('Catalog Service', catalogUrl + '/health'),
    checkService('Order Service', orderUrl + '/health'),
    checkService('Event Service', eventUrl + '/health'),
    checkService('AI Service', aiUrl + '/health'),
  ]);

  const allHealthy = checks.every((c) => c.status === 'healthy');

  res.json({
    success: true,
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: checks,
  });
});

router.get('/performance', (_req: Request, res: Response) => {
  const stats = getPerformanceStats();
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: stats,
  });
});

export default router;
