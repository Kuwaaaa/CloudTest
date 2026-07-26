const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EXE_PATH = process.env.EXE_PATH;
const EXE_ARGS = process.env.EXE_ARGS || "";

const isValidProcessName = (processName) => /^[\w .-]+\.exe$/i.test(processName);

const parseArgs = (args) => {
    const result = [];
    const pattern = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
    let match;

    while ((match = pattern.exec(args)) !== null) {
        result.push(match[1] ?? match[2] ?? match[3]);
    }

    return result;
};

const getProcessName = () => {
    const fallbackName = EXE_PATH ? path.basename(EXE_PATH) : "";
    const configuredName = (process.env.TARGET_PROCESS || fallbackName).trim();

    if (!isValidProcessName(configuredName)) {
        throw new Error(`Invalid process name: ${configuredName}`);
    }

    return configuredName;
};

const killProcess = (processName) => {
    try {
        execFileSync('taskkill', ['/F', '/IM', processName], { stdio: 'ignore' });
    } catch {
        // Process is not running.
    }
};

if (!EXE_PATH) {
    console.error("No EXE_PATH provided.");
    setInterval(() => {}, 60000);
} else if (!fs.existsSync(EXE_PATH) || path.extname(EXE_PATH).toLowerCase() !== ".exe") {
    console.error(`Invalid EXE_PATH: ${EXE_PATH}`);
    setInterval(() => {}, 60000);
} else {
    let processName;

    try {
        processName = getProcessName();
    } catch (error) {
        console.error(`[Wrapper ERROR] ${error.message}`);
        setInterval(() => {}, 60000);
        return;
    }

    console.log(`[Wrapper] Cleaning up old process: ${processName}...`);
    killProcess(processName);

    console.log(`[Wrapper] Launching: ${EXE_PATH}`);
    const child = spawn(EXE_PATH, parseArgs(EXE_ARGS), {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(EXE_PATH),
        windowsHide: false,
    });
    child.unref();

    child.on('error', (err) => {
        console.error(`[Wrapper ERROR] Spawn failed: ${err.message}`);
    });

    setInterval(() => {
        console.log(`[Wrapper] Service is running. Target: ${processName}`);
    }, 60000);

    process.on('SIGINT', () => {
        console.log('[Wrapper] Stopping...');
        killProcess(processName);
        process.exit();
    });
}
