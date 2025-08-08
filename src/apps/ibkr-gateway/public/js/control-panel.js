// Global state
let refreshInterval = null;
let isProcessing = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeControlPanel();
});

function initializeControlPanel() {
    // Initial status fetch
    fetchAllStatuses();
    
    // Set up auto-refresh every 10 seconds
    refreshInterval = setInterval(fetchAllStatuses, 10000);
    
    // Update refresh time
    updateRefreshTime();
}

async function fetchAllStatuses() {
    if (isProcessing) return; // Skip if an operation is in progress
    
    try {
        // Fetch consolidated status from single endpoint
        await fetchProcessStatus();
        updateRefreshTime();
    } catch (error) {
        logActivity('Error fetching status: ' + error.message, 'error');
    }
}

async function fetchProcessStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        // Update all statuses from the consolidated response
        updateProcessStatus(data);
        
        // Update auth status from the same response
        if (data.authentication) {
            updateAuthStatus({
                success: true,
                authenticated: data.authentication.authenticated,
                connected: data.connection ? data.connection.isApiAvailable : data.authentication.connected,
                competing: data.authentication.competing,
                tradingMode: data.mode
            });
        }
        
        // Update mode from the same response
        if (data.mode) {
            updateModeIndicator({ mode: data.mode, warning: data.warning });
        }
    } catch (error) {
        updateProcessStatus({ success: false, error: error.message });
    }
}

async function fetchLoginStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        updateAuthStatus(data);
    } catch (error) {
        updateAuthStatus({ success: false, error: error.message });
    }
}

async function fetchMonitorStatus() {
    try {
        const response = await fetch('/api/gateway/monitor');
        const data = await response.json();
        
        updateMonitorStatus(data);
    } catch (error) {
        updateMonitorStatus({ success: false, error: error.message });
    }
}

async function fetchTradingMode() {
    try {
        const response = await fetch('/api/config/mode');
        const data = await response.json();
        
        updateModeIndicator(data);
    } catch (error) {
        console.error('Error fetching trading mode:', error);
    }
}

function updateProcessStatus(data) {
    const statusLight = document.getElementById('process-status-light');
    const statusText = document.getElementById('process-status-text');
    const pidValue = document.getElementById('pid-value');
    const latency = document.getElementById('api-latency');
    const processCard = document.getElementById('process-card');
    
    if (data.success && data.process) {
        const isRunning = data.process.isRunning;
        
        statusLight.className = 'status-light ' + (isRunning ? 'status-running' : 'status-stopped');
        statusText.textContent = isRunning ? 'Running' : 'Not Running';
        pidValue.textContent = data.process.pid || 'Not Running';
        
        if (isRunning) {
            processCard.classList.add('running');
            processCard.classList.remove('stopped');
        } else {
            processCard.classList.add('stopped');
            processCard.classList.remove('running');
        }
        
        if (data.connection && data.connection.latency) {
            latency.textContent = `${data.connection.latency}ms`;
        }
        
        // Update mode if included in status
        if (data.mode) {
            updateModeIndicator({ mode: data.mode, warning: data.warning });
        }
        
        updateButtonStates(isRunning);
    } else {
        statusLight.className = 'status-light status-error';
        statusText.textContent = 'Error';
        pidValue.textContent = '-';
        processCard.classList.remove('running', 'stopped');
    }
}

function updateAuthStatus(data) {
    const statusLight = document.getElementById('auth-status-light');
    const statusText = document.getElementById('auth-status-text');
    const authAuthenticated = document.getElementById('auth-authenticated');
    const apiAvailable = document.getElementById('api-available');
    const tradingModeStatus = document.getElementById('trading-mode-status');
    const authCard = document.getElementById('auth-card');
    
    if (data.success) {
        const isAuthenticated = data.authenticated && data.connected && !data.competing;
        
        statusLight.className = 'status-light ' + (isAuthenticated ? 'status-authenticated' : 'status-unauthenticated');
        statusText.textContent = isAuthenticated ? 'Authenticated' : 'Not Authenticated';
        
        authAuthenticated.textContent = data.authenticated ? 'Yes' : 'No';
        authAuthenticated.className = data.authenticated ? 'text-success' : 'text-danger';
        
        apiAvailable.textContent = data.connected ? 'Yes' : 'No';
        apiAvailable.className = data.connected ? 'text-success' : 'text-danger';
        
        // Update trading mode display
        if (data.tradingMode) {
            tradingModeStatus.textContent = data.tradingMode.toUpperCase();
            tradingModeStatus.className = 'fw-bold ' + (data.tradingMode === 'production' ? 'text-danger' : 'text-success');
        }
        
        if (isAuthenticated) {
            authCard.classList.add('authenticated');
            authCard.classList.remove('unauthenticated');
        } else {
            authCard.classList.add('unauthenticated');
            authCard.classList.remove('authenticated');
        }
        
        if (data.competing) {
            statusText.textContent += ' (Competing Session)';
        }
    } else {
        statusLight.className = 'status-light status-error';
        statusText.textContent = 'Error';
        authAuthenticated.textContent = '-';
        apiAvailable.textContent = '-';
        tradingModeStatus.textContent = '-';
        authCard.classList.remove('authenticated', 'unauthenticated');
    }
}

function updateMonitorStatus(data) {
    const monitorDetails = document.getElementById('monitor-details');
    
    if (data.success) {
        let status = '';
        let statusClass = 'text-success';
        
        if (data.isMonitoring) {
            // Process monitoring status
            if (!data.processRunning && data.restartAttempts > 0) {
                status = `Process down, restart attempt #${data.restartAttempts}`;
                statusClass = 'text-warning';
            } else if (data.totalRestarts > 0) {
                status = `Active (${data.totalRestarts} restart${data.totalRestarts !== 1 ? 's' : ''})`;
            } else {
                status = 'Active';
            }
            
            // Authentication monitoring status
            if (data.authHasGivenUp) {
                status += ` | Auth: Given up after ${data.authMaxRetries} attempts`;
                statusClass = 'text-danger';
            } else if (data.authRetryCount > 0) {
                status += ` | Auth: Retry ${data.authRetryCount}/${data.authMaxRetries}`;
                statusClass = 'text-warning';
            }
        } else {
            status = 'Not Active';
            statusClass = 'text-muted';
        }
        
        monitorDetails.textContent = status;
        monitorDetails.className = statusClass;
    } else {
        monitorDetails.textContent = 'Unknown';
        monitorDetails.className = 'text-muted';
    }
}

function updateButtonStates(isRunning) {
    const btnStart = document.getElementById('btn-start');
    const btnKill = document.getElementById('btn-kill');
    const btnRestart = document.getElementById('btn-restart');
    
    btnStart.disabled = isRunning || isProcessing;
    btnKill.disabled = !isRunning || isProcessing;
    btnRestart.disabled = isProcessing;
}

async function startProcess() {
    if (isProcessing) return;
    
    showLoading();
    isProcessing = true;
    
    try {
        logActivity('Starting gateway process...', 'info');
        const response = await fetch('/api/gateway/start', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            logActivity(`Gateway started successfully. PID: ${data.pid}`, 'success');
        } else {
            logActivity(`Failed to start gateway: ${data.message}`, 'error');
        }
    } catch (error) {
        logActivity(`Error starting gateway: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        hideLoading();
        setTimeout(fetchAllStatuses, 1000);
    }
}

async function killProcess() {
    if (isProcessing) return;
    
    showLoading();
    isProcessing = true;
    
    try {
        logActivity('Stopping gateway process...', 'info');
        const response = await fetch('/api/gateway/stop', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            logActivity('Gateway stopped successfully', 'success');
        } else {
            logActivity(`Failed to stop gateway: ${data.message}`, 'error');
        }
    } catch (error) {
        logActivity(`Error stopping gateway: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        hideLoading();
        setTimeout(fetchAllStatuses, 1000);
    }
}

async function restartProcess() {
    if (isProcessing) return;
    
    showLoading();
    isProcessing = true;
    
    try {
        logActivity('Restarting gateway process...', 'info');
        const response = await fetch('/api/gateway/restart', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            logActivity(`Gateway restarted successfully. PID: ${data.pid}`, 'success');
        } else {
            logActivity(`Failed to restart gateway: ${data.message}`, 'error');
        }
    } catch (error) {
        logActivity(`Error restarting gateway: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        hideLoading();
        setTimeout(fetchAllStatuses, 1000);
    }
}

async function triggerLogin() {
    if (isProcessing) return;
    
    showLoading();
    isProcessing = true;
    
    try {
        logActivity('Triggering manual login...', 'info');
        const response = await fetch('/api/auth/login', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            logActivity('Authentication successful', 'success');
        } else {
            logActivity(`Authentication failed: ${data.message}`, 'error');
        }
    } catch (error) {
        logActivity(`Error during authentication: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        hideLoading();
        setTimeout(fetchAllStatuses, 1000);
    }
}

function logActivity(message, type = 'info') {
    const log = document.getElementById('activity-log');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
    
    // Add to top of log
    log.insertBefore(entry, log.firstChild);
    
    // Keep only last 50 entries
    while (log.children.length > 50) {
        log.removeChild(log.lastChild);
    }
}

function updateRefreshTime() {
    const refreshTime = document.getElementById('refresh-time');
    refreshTime.textContent = new Date().toLocaleTimeString();
}

function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function updateModeIndicator(data) {
    const modeIndicator = document.getElementById('mode-indicator');
    const modeText = document.getElementById('mode-text');
    
    if (data.mode === 'production') {
        modeIndicator.className = 'mode-indicator production';
        modeText.innerHTML = '⚠️ PRODUCTION MODE - REAL MONEY';
    } else {
        modeIndicator.className = 'mode-indicator paper';
        modeText.innerHTML = '📝 PAPER MODE - SIMULATED';
    }
}

// Add confirmation for production mode actions
function confirmProductionAction(action) {
    const modeIndicator = document.getElementById('mode-indicator');
    if (modeIndicator.classList.contains('production')) {
        return confirm(`⚠️ WARNING: You are in PRODUCTION mode with REAL MONEY.\n\nAre you sure you want to ${action}?`);
    }
    return true;
}

// Override action functions to add production mode confirmation
const originalStartProcess = startProcess;
startProcess = async function() {
    if (!confirmProductionAction('start the gateway')) return;
    return originalStartProcess();
};

const originalRestartProcess = restartProcess;
restartProcess = async function() {
    if (!confirmProductionAction('restart the gateway')) return;
    return originalRestartProcess();
};

const originalTriggerLogin = triggerLogin;
triggerLogin = async function() {
    if (!confirmProductionAction('trigger manual login')) return;
    return originalTriggerLogin();
};

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});