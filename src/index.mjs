// src/index.mjs
// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT — Cron Scheduler
// Runs the LinkedIn post pipeline on a schedule (default: 8:00 AM daily).
// Change schedule via CRON_SCHEDULE in .env
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import cron from 'node-cron';
import logger from './lib/logger.mjs';
import { runPipeline } from './pipeline.mjs';

const SCHEDULE = process.env.CRON_SCHEDULE || '0 8 * * *';

logger.info('');
logger.info('╔══════════════════════════════════════════════════════════════╗');
logger.info('║   LinkedIn Post Automation — Scheduler Running              ║');
logger.info('╚══════════════════════════════════════════════════════════════╝');
logger.info({ schedule: SCHEDULE, dryRun: process.env.DRY_RUN === 'true' }, `⏰ Cron scheduled: "${SCHEDULE}"`);
logger.info('💡 Tip: Run  node src/pipeline.mjs  to trigger the pipeline immediately.');
logger.info('');

if (!cron.validate(SCHEDULE)) {
  logger.error(`Invalid CRON_SCHEDULE: "${SCHEDULE}". Exiting.`);
  process.exit(1);
}

cron.schedule(SCHEDULE, async () => {
  logger.info({ triggeredAt: new Date().toISOString() }, '⏰ Cron trigger fired — starting pipeline...');
  await runPipeline();
});

// Keep alive log
setInterval(() => {
  logger.debug({ time: new Date().toISOString() }, '💓 Scheduler heartbeat — waiting for next cron trigger');
}, 60 * 60 * 1000); // every hour
