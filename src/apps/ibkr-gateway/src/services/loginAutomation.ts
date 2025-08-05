import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { config, getTradingMode } from '../config/environment';
import { logger } from '@monorepo/shared-utils';

export class LoginAutomationService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private screenshotDir = path.join(__dirname, '../../screenshots');

  constructor() {
    // Ensure screenshot directory exists
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      const tradingMode = getTradingMode();
      logger.info(`Starting authentication process in ${tradingMode.toUpperCase()} mode...`);
      
      await this.launchBrowser();
      await this.navigateToLogin();
      await this.acceptCertificate();
      
      await this.fillCredentials();
      
      const authenticated = await this.verifyAuthentication();
      
      if (authenticated) {
        logger.info('Authentication successful');
      } else {
        logger.error('Authentication failed');
        await this.captureScreenshot(`auth-failed-${tradingMode}`);
      }
      
      await this.closeBrowser();
      return authenticated;
      
    } catch (error) {
      logger.error('Authentication error:', error);
      const tradingMode = getTradingMode();
      await this.captureScreenshot(`auth-error-${tradingMode}`);
      
      await this.closeBrowser();
      return false;
    }
  }

  private async launchBrowser(): Promise<void> {
    logger.info('Launching browser in HEADLESS mode');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--ignore-certificate-errors'
      ],
      ignoreHTTPSErrors: true
    });

    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  }

  private async navigateToLogin(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    
    const loginUrl = `https://localhost:${config.IBKR_GATEWAY_PORT}`;
    logger.info(`Navigating to ${loginUrl}`);
    
    try {
      await this.page.goto(loginUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    } catch (error) {
      // Try with http if https fails
      const httpUrl = `http://localhost:${config.IBKR_GATEWAY_PORT}`;
      logger.info(`HTTPS failed, trying HTTP at ${httpUrl}`);
      await this.page.goto(httpUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    }
  }

  private async acceptCertificate(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    
    // Check if we're on a certificate warning page
    try {
      // Chrome/Chromium certificate warning
      const advancedButton = await this.page.$('#details-button');
      if (advancedButton) {
        await advancedButton.click();
        await this.page.waitForTimeout(500);
        
        const proceedLink = await this.page.$('#proceed-link');
        if (proceedLink) {
          await proceedLink.click();
          await this.page.waitForTimeout(2000);
        }
      }
    } catch (error) {
      // Certificate might already be accepted or not needed
      logger.debug('No certificate warning to bypass');
    }
  }

  private async fillCredentials(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    
    logger.info('Waiting for login form...');
    
    try {
      // Wait for the login form to appear
      await this.page.waitForSelector('input[name="username"], input[name="user_name"], input[type="text"]', {
        timeout: 30000
      });
      logger.info('Login form found');
    } catch (error) {
      logger.error('Failed to find login form');
      await this.captureScreenshot('no-login-form');
      throw new Error('Login form not found');
    }
    
    // Find and fill username
    const usernameSelectors = ['input[name="username"]', 'input[name="user_name"]', 'input[type="text"]'];
    let usernameFound = false;
    for (const selector of usernameSelectors) {
      const usernameField = await this.page.$(selector);
      if (usernameField) {
        logger.info(`Found username field with selector: ${selector}`);
        await usernameField.click();
        await this.page.keyboard.type(config.IBKR_USERNAME, { delay: 100 });
        usernameFound = true;
        break;
      }
    }
    
    if (!usernameFound) {
      logger.error('Could not find username field');
      await this.captureScreenshot('no-username-field');
    }
    
    // Find and fill password
    const passwordSelectors = ['input[name="password"]', 'input[type="password"]'];
    let passwordFound = false;
    for (const selector of passwordSelectors) {
      const passwordField = await this.page.$(selector);
      if (passwordField) {
        logger.info(`Found password field with selector: ${selector}`);
        await passwordField.click();
        await this.page.keyboard.type(config.IBKR_PASSWORD, { delay: 100 });
        passwordFound = true;
        break;
      }
    }
    
    if (!passwordFound) {
      logger.error('Could not find password field');
      await this.captureScreenshot('no-password-field');
    }
    
    // Submit the form
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("Log In")',
      'button:contains("Login")',
      'button:contains("Submit")'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        await this.page.click(selector);
        logger.info(`Clicked submit button with selector: ${selector}`);
        submitted = true;
        break;
      } catch {
        // Try next selector
      }
    }
    
    if (!submitted) {
      logger.info('No submit button found, trying Enter key');
      // Try pressing Enter
      await this.page.keyboard.press('Enter');
    }
    
    // Wait for navigation or response
    logger.info('Waiting for login response...');
    await this.page.waitForTimeout(5000);
    
    // Handle potential 2FA
    await this.handle2FA();
  }

  private async handle2FA(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');
    
    const tradingMode = getTradingMode();
    
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
        
        for (const selector of twoFASelectors) {
          const twoFAField = await this.page.$(selector);
          if (twoFAField) {
            logger.warn('2FA detected in PRODUCTION mode - waiting for manual intervention');
            await this.captureScreenshot(`2fa-required-${tradingMode}`);
            
            // Wait up to 120 seconds for user to complete 2FA in production mode
            await this.page.waitForTimeout(120000);
            break;
          }
        }
      } catch (error) {
        // No 2FA required
        logger.debug('No 2FA prompt detected');
      }
    } else {
      // Paper mode: Skip 2FA wait
      logger.info('Paper mode: Skipping 2FA wait');
      // Add small delay to ensure login completes
      await this.page.waitForTimeout(3000);
    }
  }

  private async verifyAuthentication(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');
    
    try {
      // Wait a bit for any redirects
      await this.page.waitForTimeout(3000);
      
      // Check for successful authentication indicators
      const successIndicators = [
        'text="Logout"',
        'text="Sign Out"',
        'text="Dashboard"',
        'text="Welcome"',
        '.logged-in',
        '#dashboard',
        'a[href*="logout"]'
      ];
      
      for (const indicator of successIndicators) {
        try {
          await this.page.waitForSelector(indicator, { timeout: 5000 });
          return true;
        } catch {
          // Try next indicator
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
        'text="Invalid"',
        'text="Failed"'
      ];
      
      for (const selector of errorSelectors) {
        const errorElement = await this.page.$(selector);
        if (errorElement) {
          const errorText = await errorElement.evaluate(el => el.textContent);
          logger.error(`Authentication error: ${errorText}`);
          return false;
        }
      }
      
      // If we can't determine, assume failure
      return false;
      
    } catch (error) {
      logger.error('Error verifying authentication:', error);
      return false;
    }
  }

  private async captureScreenshot(name: string): Promise<void> {
    if (!this.page) return;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.join(this.screenshotDir, `${name}-${timestamp}.png`);
      await this.page.screenshot({ path: filename, fullPage: true });
      logger.info(`Screenshot saved: ${filename}`);
    } catch (error) {
      logger.error('Failed to capture screenshot:', error);
    }
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

export const loginAutomation = new LoginAutomationService();