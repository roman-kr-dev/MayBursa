import { config } from './config/environment';
import { createServer } from './server';
import { defaultLogger as logger } from '@monorepo/shared-utils';

async function main() {
  try {
    logger.info('Starting IBKR Gateway Manager...');
    
    const server = await createServer();
    const port = config.IBKR_CONTROL_PANEL_PORT;
    
    server.listen(port, () => {
      logger.info(`IBKR Gateway Manager running on http://localhost:${port}`);
      logger.info('Control Panel UI available at root path /');
    });
  } catch (error) {
    logger.error('Failed to start IBKR Gateway Manager:', error);
    process.exit(1);
  }
}

main();