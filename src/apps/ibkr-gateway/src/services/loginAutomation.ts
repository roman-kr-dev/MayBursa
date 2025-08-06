import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { config, getTradingMode } from '../config/environment';
import { logger } from '@monorepo/shared-utils';

interface LoginAutomationOptions {
  headless?: boolean;
}

export class LoginAutomationService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private screenshotDir = path.join(__dirname, '../../screenshots');
  private headless: boolean = true;

  constructor(options: LoginAutomationOptions) {
    this.headless = options.headless !== undefined ? options.headless : true;

    logger.debug('🔧 Initializing LoginAutomationService...');
    logger.debug(`📁 Screenshot directory: ${this.screenshotDir}`);

    // Ensure screenshot directory exists
    if (!fs.existsSync(this.screenshotDir)) {
      logger.debug('📁 Creating screenshot directory...');
      fs.mkdirSync(this.screenshotDir, { recursive: true });
      logger.debug('✅ Screenshot directory created');
    } else {
      logger.debug('✅ Screenshot directory already exists');
    }

    // Log configuration
    logger.debug('\n📋 Configuration:');
    logger.debug(`   - Trading Mode: ${getTradingMode().toUpperCase()}`);
    logger.debug(`   - Gateway Port: ${config.IBKR_GATEWAY_PORT}`);
    logger.debug(`   - Username: ${config.IBKR_USERNAME}`);
    logger.debug(`   - Password: ${'*'.repeat(config.IBKR_PASSWORD.length)}`);
    logger.debug(`   - Auto Login: ${config.IBKR_AUTO_LOGIN}`);
  }


  async authenticate(): Promise<boolean> {
    try {
      const tradingMode = getTradingMode();
      logger.info(`Starting authentication process in ${tradingMode.toUpperCase()} mode...`);
      logger.debug('Starting IBKR Gateway authentication...');

      await this.launchBrowser();
      await this.navigateToLogin();
      await this.fillCredentials();

      const authenticated = await this.verifyAuthentication();

      if (authenticated) {
        logger.info('Authentication successful');
        logger.debug('🎉 Authentication SUCCESSFUL! 🎉');
      } else {
        logger.error('Authentication failed');
        logger.debug('Authentication FAILED');
        await this.captureScreenshot(`auth-failed-${tradingMode}`);
      }

      if (!this.headless) {
        logger.debug('Browser will remain open. Press Ctrl+C to close and exit');
        this.setupGracefulShutdown();
      } else {
        await this.closeBrowser();
      }
      return authenticated;

    } catch (error) {
      logger.error('Authentication error:', error);
      logger.debug(`Authentication failed with error: ${error}`);
      const tradingMode = getTradingMode();
      await this.captureScreenshot(`auth-error-${tradingMode}`);

      if (this.headless) {
        await this.closeBrowser();
      }
      return false;
    }
  }

  private async launchBrowser(): Promise<void> {
    const headlessMode = this.headless;
    logger.info(`Launching browser in ${headlessMode ? 'HEADLESS' : 'VISIBLE'} mode`);

    logger.debug('Launching browser...');
    logger.debug(`Browser mode: ${headlessMode ? 'HEADLESS' : 'VISIBLE (headless: false)'}`);

    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--ignore-certificate-errors'
    ];

    if (!headlessMode) {
      args.unshift('--start-maximized');
    }

    logger.debug(`Browser arguments: ${args.join(', ')}`);

    this.browser = await puppeteer.launch({
      headless: headlessMode,
      defaultViewport: headlessMode ? undefined : null,
      args: args,
      acceptInsecureCerts: true
    });

    logger.debug('✅ Browser launched successfully');

    this.page = await this.browser.newPage();
    logger.debug('✅ New page created');

    // Set viewport
    await this.page.setViewport({ width: 1280, height: 800 });
    logger.debug('✅ Viewport set to 1280x800');

    // Set user agent
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await this.page.setUserAgent(userAgent);
    logger.debug('✅ User agent set');
  }

  private async navigateToLogin(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const httpsUrl = `https://localhost:${config.IBKR_GATEWAY_PORT}`;
    const httpUrl = `http://localhost:${config.IBKR_GATEWAY_PORT}`;

    logger.info(`Navigating to ${httpsUrl}`);
    logger.debug(`Attempting to navigate to: ${httpsUrl}`);

    try {
      logger.debug('🔄 Trying HTTPS connection...');
      await this.page.goto(httpsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      logger.debug('✅ Successfully connected via HTTPS');
    } catch (error) {
      logger.info(`HTTPS failed, trying HTTP at ${httpUrl}`);
      logger.warn(`HTTPS connection failed: ${error}`);
      logger.debug(`🔄 Falling back to HTTP: ${httpUrl}`);

      try {
        await this.page.goto(httpUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        logger.debug('✅ Successfully connected via HTTP');
      } catch (httpError) {
        logger.error(`HTTP connection also failed: ${httpError}`);
        throw new Error('Failed to connect to IBKR Gateway on both HTTPS and HTTP');
      }
    }

    const currentUrl = this.page.url();
    logger.debug(`Current URL: ${currentUrl}`);
    await this.captureScreenshot('after-navigation');
  }

  private async selectTradingMode(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const tradingMode = getTradingMode();
    logger.debug(`🔍 Checking trading mode selection (config: ${tradingMode.toUpperCase()})...`);

    try {
      // Wait a bit for the mode toggle to appear
      await new Promise(resolve => setTimeout(resolve, 1000));

      // The toggle is a checkbox with id="toggle1" and class="xyz-paper-switch"
      // When checked = Paper mode, When unchecked = Live mode
      const toggleCheckbox = await this.page.$('#toggle1, .xyz-paper-switch, input[type="checkbox"][name="paperSwitch"]');

      if (!toggleCheckbox) {
        logger.warn('⚠️ Could not find paper/live mode toggle, continuing with default mode');
        return;
      }

      // Check current state
      const isChecked = await toggleCheckbox.evaluate((el) => (el as HTMLInputElement).checked);
      const currentMode = isChecked ? 'paper' : 'production';

      logger.debug(`Current mode: ${currentMode.toUpperCase()} (checkbox ${isChecked ? 'checked' : 'unchecked'})`);

      // If already in correct mode, no action needed
      if (currentMode === tradingMode) {
        logger.debug(`✅ Already in ${tradingMode.toUpperCase()} mode`);
        return;
      }

      // Need to toggle the mode
      logger.debug(`🔄 Switching from ${currentMode.toUpperCase()} to ${tradingMode.toUpperCase()} mode...`);

      // Try clicking the label instead of the checkbox directly (for styled toggles)
      try {
        // First try clicking the label
        const label = await this.page.$('label[for="toggle1"]');
        if (label) {
          await label.click();
          logger.debug('Clicked the toggle label');
        } else {
          // Fallback to clicking the checkbox directly
          await toggleCheckbox.click();
          logger.debug('Clicked the checkbox directly');
        }
      } catch (clickError) {
        // If clicking fails, try using JavaScript
        logger.debug('Direct click failed, trying JavaScript click...');
        await this.page.evaluate(() => {
          const checkbox = document.querySelector('#toggle1') as HTMLInputElement;
          if (checkbox) {
            checkbox.click();
          }
        });
      }

      // Wait for the toggle animation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify the change
      const newIsChecked = await toggleCheckbox.evaluate((el) => (el as HTMLInputElement).checked);
      const newMode = newIsChecked ? 'paper' : 'production';

      if (newMode === tradingMode) {
        logger.info(`✅ Successfully switched to ${tradingMode.toUpperCase()} mode`);
        await this.captureScreenshot(`${tradingMode}-mode-selected`);
      } else {
        logger.error(`❌ Failed to switch to ${tradingMode.toUpperCase()} mode. Current mode: ${newMode.toUpperCase()}`);
      }

    } catch (error) {
      logger.error(`Trading mode selection error: ${error}`);
      // Continue with login even if mode selection fails
    }
  }

  private async fillCredentials(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.info('Waiting for login form...');
    logger.debug('Looking for login form...');

    try {
      // Wait for the login form to appear
      logger.debug('⏳ Waiting for login form (timeout: 30s)...');
      await this.page.waitForSelector('input[name="username"], input[name="user_name"], input[type="text"]', {
        visible: true,
        timeout: 30000
      });
      logger.info('Login form found');
      logger.debug('✅ Login form found!');
      await this.captureScreenshot('login-form-found');
    } catch (error) {
      logger.error('Failed to find login form');
      logger.error('Failed to find login form');
      await this.captureScreenshot('no-login-form');
      throw new Error('Login form not found');
    }

    // Handle trading mode selection (Live vs Paper)
    await this.selectTradingMode();

    // Find and fill username
    const usernameSelectors = ['input[name="username"]', 'input[name="user_name"]', 'input[type="text"]'];
    let usernameFound = false;

    logger.debug('🔍 Looking for username field...');

    for (const selector of usernameSelectors) {
      logger.debug(`Trying selector: ${selector}`);
      const usernameField = await this.page.$(selector);
      if (usernameField) {
        logger.info(`Found username field with selector: ${selector}`);
        logger.debug(`✅ Found username field with selector: ${selector}`);
        logger.debug('Clicking username field...');
        await usernameField.click();
        logger.debug('Typing username...');
        await this.page.keyboard.type(config.IBKR_USERNAME, { delay: 100 });
        logger.debug(`✅ Username entered: ${config.IBKR_USERNAME}`);
        usernameFound = true;
        break;
      }
    }

    if (!usernameFound) {
      logger.error('Could not find username field');
      logger.error('Could not find username field');
      await this.captureScreenshot('no-username-field');
    }

    // Find and fill password
    const passwordSelectors = ['input[name="password"]', 'input[type="password"]'];
    let passwordFound = false;

    logger.debug('🔍 Looking for password field...');

    for (const selector of passwordSelectors) {
      logger.debug(`Trying selector: ${selector}`);
      const passwordField = await this.page.$(selector);
      if (passwordField) {
        logger.info(`Found password field with selector: ${selector}`);
        logger.debug(`✅ Found password field with selector: ${selector}`);
        logger.debug('Clicking password field...');
        await passwordField.click();
        logger.debug('Typing password...');
        await this.page.keyboard.type(config.IBKR_PASSWORD, { delay: 100 });
        logger.debug('✅ Password entered');
        passwordFound = true;
        break;
      }
    }

    if (!passwordFound) {
      logger.error('Could not find password field');
      logger.error('Could not find password field');
      await this.captureScreenshot('no-password-field');
    }

    await this.captureScreenshot('credentials-filled');

    // Submit the form using the specific selector
    const submitSelector = 'form.xyzform-username button[type="submit"]';
    logger.debug('🔍 Looking for submit button...');

    try {
      // Wait for the submit button to be available
      await this.page.waitForSelector(submitSelector, {
        visible: true,
        timeout: 5000
      });

      // Click the submit button
      await this.page.click(submitSelector);
      logger.info('Clicked submit button');
      logger.debug(`✅ Clicked submit button with selector: ${submitSelector}`);
    } catch (error) {
      logger.error('Failed to find or click submit button');
      logger.debug(`Submit button error: ${error}`);
      await this.captureScreenshot('no-submit-button');
      throw new Error('Submit button not found');
    }

    logger.debug('⏳ Waiting for login response...');
    await this.captureScreenshot('after-login-submit');
  }


  private async verifyAuthentication(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      const tradingMode = getTradingMode();
      const timeout = tradingMode === 'production' ? 120000 : 30000; // 120s for production, 30s for paper

      logger.info(`Waiting for authentication (${tradingMode} mode, timeout: ${timeout/1000}s)...`);

      // Wait for navigation after form submission
      await this.page.waitForNavigation({ timeout, waitUntil: 'networkidle2' });

      // Check for the success message
      const successElement = await this.page.$('pre::-p-text(Client login succeeds)');

      if (successElement) {
        logger.info('✅ Authentication successful - "Client login succeeds" message found');
        return true;
      } else {
        logger.error('Authentication failed - success message not found');
        await this.captureScreenshot(`auth-failed-${tradingMode}`);
        return false;
      }

    } catch (error) {
      logger.error(`Authentication timeout or error: ${error}`);
      await this.captureScreenshot('auth-verification-error');
      return false;
    }
  }

  private async captureScreenshot(name: string): Promise<void> {
    if (!this.page) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.join(this.screenshotDir, `${name}-${timestamp}.png`) as `${string}.png`;
      logger.debug(`📸 Taking screenshot: ${name}...`);
      await this.page.screenshot({ path: filename, fullPage: true });
      logger.info(`Screenshot saved: ${filename}`);
      logger.debug(`✅ Screenshot saved: ${filename}`);
    } catch (error) {
      logger.error('Failed to capture screenshot:', error);
      logger.error(`Failed to capture screenshot: ${error}`);
    }
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      logger.debug('🌐 Closing browser...');
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.debug('✅ Browser closed');
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      logger.debug('\n🛑 Shutting down...');

      if (this.browser) {
        await this.closeBrowser();
      }

      logger.debug('✅ Shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Keep process alive
    setInterval(() => {
      // Just keep the process running
    }, 1000);
  }
}

export const loginAutomation = new LoginAutomationService({});