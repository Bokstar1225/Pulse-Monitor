const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const si = require('systeminformation');


// ==========================================
// CACHED INFORMATION
// ==========================================

let cpuInfoCache = null;
let cpuCounterWarningShown = false;


// ==========================================
// WINDOWS CPU PERFORMANCE COUNTER
// ==========================================

function getWindowsCpuUtility() {

    return new Promise((resolve, reject) => {

        // Windows performance counter path
        const counterPath =
            '\\Processor Information(_Total)\\% Processor Utility';

        // PowerShell command
        const script = [

            "$ErrorActionPreference = 'Stop'",

            `$sample = Get-Counter -Counter '${counterPath}' -SampleInterval 1 -MaxSamples 1`,

            "$value = $sample.CounterSamples[0].CookedValue",

            "[Console]::Out.WriteLine($value.ToString([System.Globalization.CultureInfo]::InvariantCulture))"

        ].join('; ');


        // Execute PowerShell
        execFile(
            'powershell.exe',

            [
                '-NoLogo',
                '-NoProfile',
                '-NonInteractive',
                '-Command',
                script
            ],

            {
                windowsHide: true,
                timeout: 5000,
                maxBuffer: 1024 * 1024,
                encoding: 'utf8'
            },

            (error, stdout, stderr) => {

                if (error) {

                    reject(
                        new Error((stderr || error.message).trim())
                    );

                    return;

                }

                // Extract the numeric result
                const outputLines = stdout
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(Boolean);

                const usage = Number(
                    outputLines[outputLines.length - 1]
                );

                if (!Number.isFinite(usage)) {

                    reject(
                        new Error('Invalid CPU performance counter result.')
                    );

                    return;

                }

                resolve(usage);

            }

        );

    });

}


// ==========================================
// SYSTEM INFORMATION IPC HANDLER
// ==========================================

ipcMain.handle('system:get-stats', async () => {

    try {

        // Retrieve information concurrently
        const [
            cpu,
            memory,
            battery,
            operatingSystem,
            system,
            cpuUsage

        ] = await Promise.all([

            // CPU specifications
            cpuInfoCache
                ? Promise.resolve(cpuInfoCache)
                : si.cpu(),

            // Memory information
            si.mem(),

            // Battery information
            si.battery().catch(error => {

                console.warn(
                    'Battery information unavailable:',
                    error.message
                );

                return null;

            }),

            // Operating system
            si.osInfo(),

            // Hardware information
            si.system(),

            // Windows CPU utility
            getWindowsCpuUtility().catch(error => {

                if (!cpuCounterWarningShown) {

                    console.warn(
                        'Windows CPU counter unavailable:',
                        error.message
                    );

                    cpuCounterWarningShown = true;

                }

                return null;

            })

        ]);


        // Cache CPU specifications
        cpuInfoCache = cpu;


        // Return system information
        return {


            // CPU
            cpu: {

                brand: cpu.brand,

                cores: cpu.cores,

                physicalCores: cpu.physicalCores,

                usage: cpuUsage

            },


            // MEMORY
            memory: {

                total: memory.total,

                used: memory.used,

                available: memory.available,

                free: memory.free,

                usage: (memory.used / memory.total) * 100

            },


            // BATTERY
            battery: battery ? {

                hasBattery: battery.hasBattery,

                percent: battery.percent,

                isCharging: battery.isCharging,

                acConnected: battery.acConnected

            } : null,


            // OPERATING SYSTEM
            operatingSystem: {

                distro: operatingSystem.distro,

                release: operatingSystem.release,

                arch: operatingSystem.arch,

                kernel: operatingSystem.kernel

            },


            // HARDWARE
            system: {

                manufacturer: system.manufacturer,

                model: system.model,

                virtual: system.virtual

            },


            // SYSTEM UPTIME
            uptime: os.uptime()

        };

    } catch (error) {

        console.error('System information error:', error);

        throw error;

    }

});


// ==========================================
// CREATE APPLICATION WINDOW
// ==========================================

function createWindow() {

    const mainWindow = new BrowserWindow({

        width: 1100,

        height: 750,

        minWidth: 800,

        minHeight: 600,

        title: 'Pulse Monitor',

        backgroundColor: '#0b1020',

        // Custom dark title bar
        titleBarStyle: 'hidden',

        titleBarOverlay: {
            color: '#0b1020',
            symbolColor: '#f1f5f9',
            height: 38
        },

        webPreferences: {

            preload: path.join(__dirname, 'preload.js'),

            contextIsolation: true,

            nodeIntegration: false,

        }

    });

    mainWindow.loadFile(
        path.join(__dirname, 'index.html')
    );

}


// ==========================================
// APPLICATION LIFECYCLE
// ==========================================

app.whenReady().then(() => {

    createWindow();

    app.on('activate', () => {

        if (BrowserWindow.getAllWindows().length === 0) {

            createWindow();

        }

    });

});


// Close application when all windows are closed

app.on('window-all-closed', () => {

    if (process.platform !== 'darwin') {
        app.quit();
        Menu.setApplicationMenu(null);
    }

});