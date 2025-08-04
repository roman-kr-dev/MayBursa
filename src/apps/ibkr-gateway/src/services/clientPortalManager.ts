import { spawn, ChildProcess, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { config } from '../config/environment';
import { defaultLogger as logger } from '@monorepo/shared-utils';

export class ClientPortalManager {
  private gatewayProcess: ChildProcess | null = null;
  private pidFilePath = path.join(__dirname, '../../gateway.pid');

  async checkJavaInstallation(): Promise<boolean> {
    try {
      execSync('java -version', { stdio: 'ignore' });
      logger.info('Java installation verified');
      return true;
    } catch (error) {
      logger.error('Java is not installed or not in PATH');
      return false;
    }
  }

  async killExistingGateway(): Promise<void> {
    try {
      // Kill any existing Java processes related to IBKR
      if (process.platform === 'darwin' || process.platform === 'linux') {
        try {
          execSync("pkill -f 'clientportal.gw' || true", { stdio: 'ignore' });
          execSync("pkill -f 'vertx' || true", { stdio: 'ignore' });
        } catch (error) {
          // Ignore errors as process might not exist
        }
      } else if (process.platform === 'win32') {
        try {
          execSync('taskkill /F /IM java.exe /T', { stdio: 'ignore' });
        } catch (error) {
          // Ignore errors as process might not exist
        }
      }

      // Clean up PID file
      if (fs.existsSync(this.pidFilePath)) {
        fs.unlinkSync(this.pidFilePath);
      }

      logger.info('Killed any existing gateway processes');
      
      // Wait a bit for processes to fully terminate
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      logger.error('Error killing existing gateway:', error);
    }
  }

  async startGateway(): Promise<void> {
    const javaInstalled = await this.checkJavaInstallation();
    if (!javaInstalled) {
      throw new Error('Java is not installed. Please install Java 1.8+ to run the gateway.');
    }

    // Kill any existing processes first
    await this.killExistingGateway();

    const gatewayPath = path.resolve(config.IBKR_CLIENTPORTAL_PATH);
    const runScript = path.join(gatewayPath, 'bin', 'run.sh');
    // Config path should be relative to the gateway/bin directory because run.sh prepends ../
    const configPath = 'root/conf.yaml';

    if (!fs.existsSync(runScript)) {
      throw new Error(`Gateway run script not found at ${runScript}. Please ensure clientportal.gw is installed.`);
    }

    // Check if the actual config file exists
    const actualConfigPath = path.join(gatewayPath, 'root', 'conf.yaml');
    if (!fs.existsSync(actualConfigPath)) {
      throw new Error(`Config file not found at ${actualConfigPath}`);
    }

    logger.info(`Starting gateway from ${gatewayPath}`);
    logger.info(`Using config: ${actualConfigPath}`);

    // Make sure the script is executable
    if (process.platform !== 'win32') {
      try {
        execSync(`chmod +x "${runScript}"`, { stdio: 'ignore' });
      } catch (error) {
        logger.warn('Could not set execute permission on run script');
      }
    }

    // Start the gateway process
    this.gatewayProcess = spawn(runScript, [configPath], {
      cwd: gatewayPath,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        JAVA_OPTS: '-Xmx512m'
      }
    });

    if (!this.gatewayProcess.pid) {
      throw new Error('Failed to start gateway process');
    }

    // Save PID for later reference
    fs.writeFileSync(this.pidFilePath, this.gatewayProcess.pid.toString());

    // Handle stdout
    this.gatewayProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      logger.info(`Gateway: ${output.trim()}`);
    });

    // Handle stderr
    this.gatewayProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      logger.error(`Gateway Error: ${output.trim()}`);
    });

    // Handle process exit
    this.gatewayProcess.on('exit', (code, signal) => {
      logger.info(`Gateway process exited with code ${code} and signal ${signal}`);
      this.gatewayProcess = null;
      if (fs.existsSync(this.pidFilePath)) {
        fs.unlinkSync(this.pidFilePath);
      }
    });

    // Unref the process so our Node app can exit independently
    this.gatewayProcess.unref();

    logger.info(`Gateway started with PID: ${this.gatewayProcess.pid}`);
  }

  async stopGateway(): Promise<void> {
    if (this.gatewayProcess && this.gatewayProcess.pid) {
      logger.info(`Stopping gateway process ${this.gatewayProcess.pid}`);
      
      try {
        process.kill(this.gatewayProcess.pid, 'SIGTERM');
        
        // Give it time to shutdown gracefully
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Force kill if still running
        if (this.isRunning()) {
          process.kill(this.gatewayProcess.pid, 'SIGKILL');
        }
      } catch (error) {
        logger.error('Error stopping gateway:', error);
      }
    }

    // Clean up any remaining processes
    await this.killExistingGateway();
    
    this.gatewayProcess = null;
    logger.info('Gateway stopped');
  }

  isRunning(): boolean {
    if (this.gatewayProcess && this.gatewayProcess.pid) {
      try {
        process.kill(this.gatewayProcess.pid, 0);
        return true;
      } catch {
        return false;
      }
    }

    // Check if there's a PID file
    if (fs.existsSync(this.pidFilePath)) {
      try {
        const pid = parseInt(fs.readFileSync(this.pidFilePath, 'utf8'));
        process.kill(pid, 0);
        return true;
      } catch {
        // Process doesn't exist, clean up PID file
        fs.unlinkSync(this.pidFilePath);
      }
    }

    return false;
  }

  getProcessId(): number | null {
    if (this.gatewayProcess && this.gatewayProcess.pid) {
      return this.gatewayProcess.pid;
    }

    // Check PID file
    if (fs.existsSync(this.pidFilePath)) {
      try {
        const pid = parseInt(fs.readFileSync(this.pidFilePath, 'utf8'));
        // Verify process is still running
        process.kill(pid, 0);
        return pid;
      } catch {
        // Process doesn't exist
        fs.unlinkSync(this.pidFilePath);
      }
    }

    return null;
  }
}

export const clientPortalManager = new ClientPortalManager();