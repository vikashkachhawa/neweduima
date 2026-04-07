#!/usr/bin/env node
import MonitoringService from './services/MonitoringService.js';

(async () => {
  try {
    await MonitoringService.runDailyMonitoring();
    console.log('✓ Monitoring run complete');
    process.exit(0);
  } catch (e) {
    console.error('✗ Monitoring run failed:', e.message);
    process.exit(1);
  }
})();
