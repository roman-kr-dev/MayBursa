import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { config, getTradingMode } from '../config/environment';
import { logger } from '@monorepo/shared-utils';

interface LoginAutomationOptions {
  keepOpen?: boolean;
}

export class LoginAutomationService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private screenshotDir = path.join(__dirname, '../../screenshots');
  private keepOpen: boolean = false;

  constructor(options: LoginAutomationOptions) {
    this.keepOpen = options.keepOpen || false;

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
      await this.acceptCertificate();

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

      if (this.keepOpen) {
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

      if (!this.keepOpen) {
        await this.closeBrowser();
      }
      return false;
    }
  }

  private async launchBrowser(): Promise<void> {
    const headlessMode = this.keepOpen ? false : true;
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

  private async acceptCertificate(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.debug('Checking for certificate warning...');

    // Check if we're on a certificate warning page
    try {
      // Chrome/Chromium certificate warning
      const advancedButton = await this.page.$('#details-button');
      if (advancedButton) {
        logger.warn('🔒 Certificate warning detected!');
        logger.debug('Clicking "Advanced" button...');
        await advancedButton.click();
        // Wait for the proceed link to appear
        await this.page.waitForSelector('#proceed-link', { timeout: 5000 });
        logger.debug('✅ Clicked "Advanced" button');

        const proceedLink = await this.page.$('#proceed-link');
        if (proceedLink) {
          logger.debug('Clicking "Proceed" link...');
          // Click and wait for navigation concurrently
          await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {
              // Navigation might not happen, that's okay
            }),
            proceedLink.click()
          ]);
          logger.debug('✅ Certificate accepted');
          await this.captureScreenshot('after-certificate-accept');
        } else {
          logger.debug('Could not find "Proceed" link');
        }
      } else {
        logger.debug('No certificate warning found (certificate may already be accepted)');
      }
    } catch (error) {
      // Certificate might already be accepted or not needed
      logger.debug('No certificate warning to bypass');
      logger.debug(`Certificate handling error: ${error}`);
    }
  }

  private async selectTradingMode(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const tradingMode = getTradingMode();
    logger.debug(`🔍 Checking trading mode selection (config: ${tradingMode.toUpperCase()})...`);

    try {
      // Wait a bit for the mode toggle to appear
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if we're already in the correct mode
      const currentModeSelectors = [
        '.selected-mode',
        '.active-mode',
        'input[type="radio"]:checked'
      ];

      for (const selector of currentModeSelectors) {
        const currentMode = await this.page.$(selector);
        if (currentMode) {
          const modeText = await currentMode.evaluate(el => el.textContent || (el as HTMLInputElement).value);
          logger.debug(`Current mode detected: ${modeText}`);

          if (modeText && modeText.toLowerCase().includes(tradingMode)) {
            logger.debug(`✅ Already in ${tradingMode.toUpperCase()} mode`);
            return;
          }
        }
      }

      // Try to find and click the appropriate mode selector
      if (tradingMode === 'paper') {
        logger.debug('🔄 Switching to PAPER mode...');

        // First, try to find the Paper radio button by looking for the label
        try {
          // Method 1: Click on the label containing "Paper"
          const labels = await this.page.$$('label');
          for (const label of labels) {
            const text = await label.evaluate(el => el.textContent);
            if (text && text.trim() === 'Paper') {
              logger.debug('Found Paper label, clicking it');
              await label.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
              logger.debug('✅ Clicked Paper mode label');
              await this.captureScreenshot('paper-mode-selected');
              return;
            }
          }

          // Method 2: Try to find and click the radio input directly
          const paperRadio = await this.page.$('input[type="radio"][value="paper" i]');
          if (paperRadio) {
            await paperRadio.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            logger.debug('✅ Clicked Paper mode radio button');
            await this.captureScreenshot('paper-mode-selected');
            return;
          }

          // Method 3: Try evaluate to find and click
          const clicked = await this.page.evaluate(() => {
            const labels = document.querySelectorAll('label');
            for (const label of labels) {
              if (label.textContent && label.textContent.trim() === 'Paper') {
                label.click();
                return true;
              }
            }
            return false;
          });

          if (clicked) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            logger.debug('✅ Clicked Paper mode via evaluate');
            await this.captureScreenshot('paper-mode-selected');
            return;
          }
        } catch (error) {
          logger.debug(`Paper mode selection failed: ${error}`);
        }

        // If we can't find a paper mode selector, log warning but continue
        logger.warn('⚠️ Could not find Paper mode selector, continuing with default mode');

      } else if (tradingMode === 'production') {
        logger.debug('🔄 Switching to LIVE mode...');

        // Try different selectors for Live mode
        const liveSelectors = [
          'input[type="radio"][value="live"]',
          'label:contains("Live")',
          'button:contains("Live")',
          '[data-mode="live"]',
          'text="Live"'
        ];

        for (const selector of liveSelectors) {
          try {
            const liveElement = await this.page.$(selector);
            if (liveElement) {
              logger.debug(`Found Live mode selector: ${selector}`);
              await liveElement.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
              logger.debug('✅ Clicked Live mode selector');
              await this.captureScreenshot('live-mode-selected');
              return;
            }
          } catch (error) {
            logger.debug(`Failed to click selector ${selector}: ${error}`);
          }
        }

        // If we can't find a live mode selector, log warning but continue
        logger.warn('⚠️ Could not find Live mode selector, continuing with default mode');
      }

    } catch (error) {
      logger.debug(`Trading mode selection error: ${error}`);
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

    // Submit the form
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button', // Will check text content separately
    ];

    let submitted = false;
    logger.debug('🔍 Looking for submit button...');

    // Try standard submit buttons first
    for (const selector of submitSelectors.slice(0, 2)) {
      try {
        console.debug(`Trying selector: ${selector}`, 'debug');

        await this.page.click(selector);
        logger.info(`Clicked submit button with selector: ${selector}`);
        logger.debug(`✅ Clicked submit button with selector: ${selector}`);
        submitted = true;
        break;
      } catch {
        // Try next selector
      }
    }

    // If not submitted, look for buttons by text
    if (!submitted) {
      const buttons = await this.page.$$('button');
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent?.trim().toLowerCase());
        if (text && ['log in', 'login', 'submit', 'sign in'].includes(text)) {
          logger.info(`Clicking button with text: ${text}`);
          logger.debug(`✅ Clicking button with text: ${text}`);
          // Click and wait for potential navigation
          await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {
              logger.debug('No navigation after button click');
              logger.debug('No navigation after button click');
            }),
            button.click()
          ]);
          submitted = true;
          break;
        }
      }
    }

    if (!submitted) {
      logger.info('No submit button found, trying Enter key');
      logger.debug('No submit button found, pressing Enter key...');
      // Try pressing Enter and wait for navigation
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {
          logger.debug('No navigation after Enter key');
          logger.debug('No navigation after Enter key');
        }),
        this.page.keyboard.press('Enter')
      ]);
      logger.debug('✅ Pressed Enter key');
    }

    logger.debug('⏳ Waiting for login response...');
    await this.captureScreenshot('after-login-submit');

    // Handle potential 2FA
    await this.handle2FA();
  }

  private async handle2FA(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const tradingMode = getTradingMode();
    logger.debug(`Checking for 2FA in ${tradingMode.toUpperCase()} mode...`);

    if (tradingMode === 'production') {
      try {
        // Check for 2FA prompts
        const twoFASelectors = [
          'input[name="code"]',
          'input[name="token"]',
          'input[name="otp"]',
          'input[placeholder*="code"]',
          'input[placeholder*="token"]'
        ];

        logger.debug('🔍 Looking for 2FA input fields...');

        for (const selector of twoFASelectors) {
          logger.debug(`Checking selector: ${selector}`);
          const twoFAField = await this.page.$(selector);
          if (twoFAField) {
            logger.warn('2FA detected in PRODUCTION mode - waiting for manual intervention');
            logger.warn('🔐 2FA DETECTED in PRODUCTION mode!');
            logger.warn('⏳ Waiting for manual 2FA intervention (120 seconds)...');
            await this.captureScreenshot(`2fa-required-${tradingMode}`);

            // Wait up to 120 seconds for user to complete 2FA in production mode
            logger.info('Waiting for user to complete 2FA...');
            try {
              await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 });
              logger.info('2FA completed, navigation detected');
              logger.debug('✅ 2FA completed, navigation detected');
            } catch (error) {
              logger.warn('2FA timeout reached or navigation not detected');
              logger.warn('2FA timeout reached or navigation not detected');
            }
            break;
          }
        }

        logger.debug('No 2FA prompt detected');
      } catch (error) {
        // No 2FA required
        logger.debug('No 2FA prompt detected');
      }
    } else {
      // Paper mode: Skip 2FA wait
      logger.info('Paper mode: Checking for immediate navigation');
      // Wait briefly for any navigation
      try {
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 3000 });
      } catch {
        // No navigation detected, continue
      }
    }
  }

  private async verifyAuthentication(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      // Wait for any redirects or page changes
      try {
        await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 3000 });
      } catch {
        // No navigation, check current page state
      }

      // Check for successful authentication indicators
      const successIndicators = [
        '.logged-in',
        '#dashboard',
        'a[href*="logout"]',
        'button[aria-label*="logout"]',
        'button[aria-label*="sign out"]'
      ];

      // Check CSS selectors first
      for (const indicator of successIndicators) {
        try {
          await this.page.waitForSelector(indicator, { timeout: 5000 });
          return true;
        } catch {
          // Try next indicator
        }
      }

      // Check for text content
      const textIndicators = ['Logout', 'Sign Out', 'Dashboard', 'Welcome'];
      for (const text of textIndicators) {
        const element = await this.page.$(`text/${text}`);
        if (element) {
          return true;
        }
      }

      // Check URL for success patterns
      const currentUrl = this.page.url();
      if (currentUrl.includes('dashboard') ||
        currentUrl.includes('home') ||
        currentUrl.includes('portal')) {
        return true;
      }

      // Check for error messages
      const errorSelectors = [
        '.error',
        '.alert-danger',
        '[role="alert"]',
        '.error-message',
        '.login-error'
      ];

      logger.debug('🔍 Checking for error messages...');

      for (const selector of errorSelectors) {
        const errorElement = await this.page.$(selector);
        if (errorElement) {
          const errorText = await errorElement.evaluate(el => el.textContent);
          logger.error(`Authentication error: ${errorText}`);
          logger.error(`Authentication error found: ${errorText}`);
          return false;
        }
      }

      // Check for error text
      const errorTexts = ['Invalid', 'Failed', 'Error', 'Incorrect'];
      for (const text of errorTexts) {
        const element = await this.page.$(`text/${text}`);
        if (element) {
          const fullText = await element.evaluate(el => el.textContent);
          logger.error(`Authentication error detected: ${fullText}`);
          logger.error(`Authentication error detected: ${fullText}`);
          return false;
        }
      }

      // If we can't determine, assume failure
      logger.warn('Could not determine authentication status');
      return false;

    } catch (error) {
      logger.error('Error verifying authentication:', error);
      logger.error(`Error verifying authentication: ${error}`);
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