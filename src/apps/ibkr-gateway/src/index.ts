import { config } from './config/environment';
import { createServer, killExistingServer } from './server';
import { logger } from '@monorepo/shared-utils';

async function main() {
  try {
    logger.info('Starting IBKR Gateway Manager...');

    await killExistingServer();

    const server = await createServer();
    const port = config.IBKR_GATEWAY_SERVER_POST;

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