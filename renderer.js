//CPU elements
const cpuUsage = document.getElementById("cpu-usage");
const cpuBar = document.getElementById("cpu-bar");
const cpuName = document.getElementById("cpu-name");
const cpuCores = document.getElementById("cpu-cores");

//Memory elements
const memoryUsage = document.getElementById("memory-usage");
const memoryBar = document.getElementById("memory-bar");
const memoryDetails = document.getElementById("memory-details");
const memoryAvailable = document.getElementById("memory-available");

// Battery elements
const batteryUsage = document.getElementById('battery-usage');
const batteryBar = document.getElementById('battery-bar');
const batteryStatus = document.getElementById('battery-status');
const batteryDetails = document.getElementById('battery-details');

// System elements
const deviceModel = document.getElementById('device-model');
const osVersion = document.getElementById('os-version');
const systemArchitecture = document.getElementById('system-architecture');
const systemUptime = document.getElementById('system-uptime');

const systemStatus = document.getElementById("system-status");
const lastUpdated = document.getElementById("last-updated");
const refreshButton = document.getElementById("refresh-button");
const refreshTimer = document.getElementById("refresh-timer");
const refreshInterval = 500;

let updateInProgress = false;
let refreshTimeout;

function formatGB(bytes){
    return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
}

function updateBar(element, percentage){
    const value = Math.max(0, Math.min(100, percentage));

    element.style.width = `${value}%`;
}

function formatUptime(seconds){
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return[
        days ? `${days}d` : null,
        hours ? `${hours}h` : null,
        minutes ? `${minutes}m` : null
    ].filter(Boolean).join(' ') || 'Less than a minute';
}

// Retrieve and display system information
async function updateDashboard() {
    if (updateInProgress) {
        return;
    }

    updateInProgress = true;
    refreshButton.disabled = true;

    try {

        const stats = await window.pulseMonitor.getSystemStats();

        // CPU information
        if (!Number.isFinite(stats.cpu.usage)) {
            cpuUsage.textContent = 'Sampling...';
        } else {
            cpuUsage.textContent = `${stats.cpu.usage.toFixed(1)}%`;

            updateBar(cpuBar, stats.cpu.usage);
        }

        cpuName.textContent = stats.cpu.brand || 'Unknown processor';

        cpuCores.textContent =
            `${stats.cpu.cores} logical cores | ${stats.cpu.physicalCores} physical cores`;

        // Memory information
        memoryUsage.textContent = `${stats.memory.usage.toFixed(1)}%`;

        updateBar(memoryBar, stats.memory.usage);

        memoryDetails.textContent =
            `${formatGB(stats.memory.used)} used / ${formatGB(stats.memory.total)} total`;

        memoryAvailable.textContent =
            `${formatGB(stats.memory.available)} available`;

        // Application status
        systemStatus.textContent = 'LIVE';

        lastUpdated.textContent =
            `Last updated: ${new Date().toLocaleTimeString()}`;

        if (!stats.battery || !stats.battery.hasBattery) {

            batteryUsage.textContent = 'N/A';

            batteryBar.style.width = '0%';

            batteryStatus.textContent = 'No battery detected';

            batteryDetails.textContent = 'Battery information unavailable';

        } else {

            const percentage = stats.battery.percent;

            if (Number.isFinite(percentage)) {

                batteryUsage.textContent = `${percentage.toFixed(0)}%`;

                updateBar(batteryBar, percentage);

            } else {

                batteryUsage.textContent = '--%';

                batteryBar.style.width = '0%';

            }

            if (stats.battery.isCharging) {

                batteryStatus.textContent = 'Charging';

            } else if (stats.battery.acConnected) {

                batteryStatus.textContent = 'Plugged in';

            } else {

                batteryStatus.textContent = 'On battery';

            }

            batteryDetails.textContent = stats.battery.acConnected
                ? 'Power adapter connected'
                : 'Running on battery';

        }

        // SYSTEM INFORMATION

        deviceModel.textContent =
            `${stats.system.manufacturer || 'Unknown'} ${stats.system.model || ''}`.trim();

        osVersion.textContent =
            `${stats.operatingSystem.distro} ${stats.operatingSystem.release}`;

        systemArchitecture.textContent =
            `${stats.operatingSystem.arch} architecture`;

        systemUptime.textContent =
            `System uptime: ${formatUptime(stats.uptime)}`;

    } catch (error) {

        console.error('Dashboard update failed:', error);

        systemStatus.textContent = 'ERROR';

        lastUpdated.textContent = 'Unable to retrieve system information';
    } finally {
        updateInProgress = false;
        refreshButton.disabled = false;
        refreshTimer.textContent = 'Next update in 2 sec';
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(updateDashboard, refreshInterval);
    }
}

refreshButton.addEventListener('click', () => {
    clearTimeout(refreshTimeout);
    refreshTimer.textContent = 'Updating...';
    updateDashboard();
});

updateDashboard();