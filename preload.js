const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld("pulseMonitor", {
    getSystemStats: () => {
        return ipcRenderer.invoke("system:get-stats");
    }
});