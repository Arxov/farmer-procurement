import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { logger } from '../../lib/logger';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: System Health and Database Connectivity Check
 *     description: Returns server uptime, status, and tests active connection to Supabase database.
 *     responses:
 *       200:
 *         description: System is healthy and operational.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 database:
 *                   type: string
 *                   example: connected
 *                 uptime:
 *                   type: number
 *                   example: 142.5
 *                 timestamp:
 *                   type: string
 *       503:
 *         description: System database connection degraded.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const startTime = Date.now();
  let dbStatus = 'connected';
  let dbLatencyMs = 0;

  try {
    const { error } = await supabase.from('commodities').select('id').limit(1);
    dbLatencyMs = Date.now() - startTime;
    if (error) {
      dbStatus = 'degraded';
      logger.warn('Health check reported degraded database query', { error: error.message });
    }
  } catch (err) {
    dbStatus = 'disconnected';
    logger.error('Database connection failed during health check', err);
  }

  const isHealthy = dbStatus === 'connected';
  const responseData = {
    status: isHealthy ? 'healthy' : 'degraded',
    database: dbStatus,
    dbLatencyMs,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  };

  if (!isHealthy) {
    return res.status(503).json(responseData);
  }

  return res.status(200).json(responseData);
}
