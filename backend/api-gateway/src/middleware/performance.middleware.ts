import { Request, Response, NextFunction } from 'express';

interface RequestSample {
  path: string;
  method: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
}

const MAX_SAMPLES = 1000;
const samples: RequestSample[] = [];

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const endedAt = process.hrtime.bigint();
    const durationMs = Number(endedAt - startedAt) / 1_000_000;

    samples.push({
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      durationMs,
      timestamp: Date.now(),
    });

    if (samples.length > MAX_SAMPLES) {
      samples.splice(0, samples.length - MAX_SAMPLES);
    }
  });

  next();
}

export function getPerformanceStats() {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  const fiveMinutesAgo = now - 5 * 60_000;

  const lastMinute = samples.filter((sample) => sample.timestamp >= oneMinuteAgo);
  const lastFiveMinutes = samples.filter((sample) => sample.timestamp >= fiveMinutesAgo);

  const durations = lastFiveMinutes.map((sample) => sample.durationMs);
  const errorCount = lastFiveMinutes.filter((sample) => sample.statusCode >= 500).length;

  const avg = durations.length > 0 ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;

  return {
    window: '5m',
    totalRequests: lastFiveMinutes.length,
    requestsLastMinute: lastMinute.length,
    errorCount,
    errorRate: lastFiveMinutes.length > 0 ? Number(((errorCount / lastFiveMinutes.length) * 100).toFixed(2)) : 0,
    avgResponseTimeMs: Number(avg.toFixed(2)),
    p95ResponseTimeMs: Number(percentile(durations, 95).toFixed(2)),
    p99ResponseTimeMs: Number(percentile(durations, 99).toFixed(2)),
    thresholdLt2s: durations.length > 0 ? Number(((durations.filter((d) => d < 2000).length / durations.length) * 100).toFixed(2)) : 100,
  };
}
