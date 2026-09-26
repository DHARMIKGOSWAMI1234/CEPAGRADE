#!/usr/bin/env node

/**
 * ============================================================
 * CEPA GRADE — Global Command Line Interface (CLI)
 * AI-Based Onion Quality Inspection & Automated Grading System
 * SMART ONION GRADING FOR A BETTER TOMORROW
 * Team: THE DEBUGGERS
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync, spawn } = require('child_process');

// Determine real project repository root regardless of current working directory
function resolveProjectRoot() {
  // First attempt: Dereference any symlinks (e.g. from global npm link)
  try {
    const realBinPath = fs.realpathSync(__filename);
    const candidateFromReal = path.resolve(path.dirname(realBinPath), '..');
    if (isProjectRoot(candidateFromReal)) {
      return candidateFromReal;
    }
  } catch {}

  // Primary resolution: location of this script is <PROJECT_ROOT>/bin/cepagrade.js
  const candidate = path.resolve(__dirname, '..');
  if (isProjectRoot(candidate)) {
    return candidate;
  }

  // Secondary resolution: environment variables if set
  if (process.env.CEPAGRADE_HOME && isProjectRoot(process.env.CEPAGRADE_HOME)) {
    return path.resolve(process.env.CEPAGRADE_HOME);
  }
  if (process.env.CEPAGRADE_PATH && isProjectRoot(process.env.CEPAGRADE_PATH)) {
    return path.resolve(process.env.CEPAGRADE_PATH);
  }

  // Tertiary resolution: check if cwd or any parent of cwd is the project root
  let current = process.cwd();
  while (current && current !== path.dirname(current)) {
    if (isProjectRoot(current)) {
      return current;
    }
    current = path.dirname(current);
  }

  return candidate;
}

function isProjectRoot(dir) {
  try {
    return (
      fs.existsSync(path.join(dir, 'run_onionvision.bat')) &&
      fs.existsSync(path.join(dir, 'backend')) &&
      fs.existsSync(path.join(dir, 'frontend'))
    );
  } catch {
    return false;
  }
}

const PROJECT_ROOT = resolveProjectRoot();

// Helper to check HTTP endpoint response
function checkUrl(urlStr, timeoutMs = 2000) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'GET',
          timeout: timeoutMs,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            resolve({ online: res.statusCode >= 200 && res.statusCode < 400, statusCode: res.statusCode, body: data });
          });
        }
      );
      req.on('error', () => resolve({ online: false }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ online: false });
      });
      req.end();
    } catch {
      resolve({ online: false });
    }
  });
}

// Sleep utility
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Header banner
function printHeader() {
  console.log('============================================================');
  console.log('      CEPA GRADE -- AI Onion Quality Inspection System');
  console.log('        SMART ONION GRADING FOR A BETTER TOMORROW');
  console.log('                   Team: THE DEBUGGERS');
  console.log('============================================================');
}

// Help output
function showHelp() {
  printHeader();
  console.log(`
Usage:
  cepagrade [command]

Available Commands:
  cepagrade              Start both frontend and backend services
  cepagrade start        Start both frontend and backend services
  cepagrade frontend     Start Vite frontend server only (port 5173)
  cepagrade backend      Start FastAPI backend server only (port 8000)
  cepagrade stop         Stop all running CEPA GRADE services
  cepagrade status       Check running status of frontend and backend
  cepagrade help         Display this help information

Options:
  --help, -h             Display this help information
  --version, -v          Show CEPA GRADE CLI version

Detected Project Directory:
  ${PROJECT_ROOT}
`);
}

// Health check and environment verification
function verifyEnvironment(target = 'all') {
  if (!fs.existsSync(PROJECT_ROOT)) {
    console.error(`[ERROR] Project root directory not found at: ${PROJECT_ROOT}`);
    process.exit(1);
  }

  const backendDir = path.join(PROJECT_ROOT, 'backend');
  const frontendDir = path.join(PROJECT_ROOT, 'frontend');

  if (target === 'all' || target === 'backend') {
    if (!fs.existsSync(backendDir)) {
      console.error(`[ERROR] Backend directory not found at: ${backendDir}`);
      process.exit(1);
    }
    const pythonExe = process.platform === 'win32'
      ? path.join(backendDir, '.venv', 'Scripts', 'python.exe')
      : path.join(backendDir, '.venv', 'bin', 'python');

    if (!fs.existsSync(pythonExe)) {
      console.error(`[ERROR] Python virtual environment not found at:`);
      console.error(`        ${pythonExe}`);
      console.error(`[FIX]   Initialize the virtual environment:`);
      console.error(`        cd "${backendDir}" && python -m venv .venv && pip install -r requirements.txt`);
      process.exit(1);
    }

    const segModel = path.join(PROJECT_ROOT, 'ml', 'models', 'onion_segmentation_yolov8n.pt');
    const clsModel = path.join(PROJECT_ROOT, 'ml', 'models', 'onion_health_mobilenetv3_small.pth');
    if (!fs.existsSync(segModel) || !fs.existsSync(clsModel)) {
      console.warn(`[WARNING] One or more ML model weights are missing in ml/models/`);
    }
  }

  if (target === 'all' || target === 'frontend') {
    if (!fs.existsSync(frontendDir)) {
      console.error(`[ERROR] Frontend directory not found at: ${frontendDir}`);
      process.exit(1);
    }
    const packageJson = path.join(frontendDir, 'package.json');
    if (!fs.existsSync(packageJson)) {
      console.error(`[ERROR] frontend/package.json not found at: ${packageJson}`);
      process.exit(1);
    }
  }
}

// Start full stack (frontend + backend) using existing reliable launcher
async function startAll() {
  printHeader();
  verifyEnvironment('all');

  const runBat = path.join(PROJECT_ROOT, 'run_onionvision.bat');
  if (fs.existsSync(runBat)) {
    console.log(`[INFO] Launching CEPA GRADE from: ${PROJECT_ROOT}`);
    return new Promise((resolve) => {
      try {
        const child = spawn('cmd.exe', ['/c', runBat], {
          cwd: PROJECT_ROOT,
          stdio: 'inherit',
        });
        child.on('close', (code) => {
          if (code === 0) resolve();
          else process.exit(code || 1);
        });
        child.on('error', (err) => {
          console.error(`[ERROR] Failed to start services: ${err.message}`);
          process.exit(1);
        });
      } catch (err) {
        console.error(`[ERROR] Execution failed: ${err.message}`);
        process.exit(1);
      }
    });
  } else {
    console.error(`[ERROR] run_onionvision.bat not found at ${runBat}`);
    process.exit(1);
  }
}

// Start backend only
async function startBackend() {
  printHeader();
  verifyEnvironment('backend');

  console.log('[1/3] Checking if backend is already running on port 8000...');
  const health = await checkUrl('http://127.0.0.1:8000/api/health', 1500);
  if (health.online) {
    console.log('[INFO] FastAPI backend is ALREADY running on http://127.0.0.1:8000');
    console.log('       Swagger UI: http://127.0.0.1:8000/docs');
    return;
  }

  const backendDir = path.join(PROJECT_ROOT, 'backend');
  const pythonExe = process.platform === 'win32'
    ? path.join(backendDir, '.venv', 'Scripts', 'python.exe')
    : path.join(backendDir, '.venv', 'bin', 'python');

  console.log('[2/3] Starting FastAPI backend on http://127.0.0.1:8000 ...');
  if (process.platform === 'win32') {
    const cmd = `start "ONIONVISION Backend (FastAPI)" cmd /c ""${pythonExe}" -m uvicorn app.main:app --app-dir "${backendDir}" --host 127.0.0.1 --port 8000"`;
    const child = spawn(cmd, {
      cwd: PROJECT_ROOT,
      shell: true,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } else {
    spawn(pythonExe, ['-m', 'uvicorn', 'app.main:app', '--app-dir', backendDir, '--host', '127.0.0.1', '--port', '8000'], {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: 'ignore',
    }).unref();
  }

  console.log('[3/3] Waiting for backend to initialize...');
  let online = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const check = await checkUrl('http://127.0.0.1:8000/api/health', 1000);
    if (check.online) {
      online = true;
      break;
    }
  }

  if (online) {
    console.log('\n============================================================');
    console.log('[SUCCESS] CEPA GRADE FastAPI Backend is ONLINE!');
    console.log('API Base URL:  http://127.0.0.1:8000');
    console.log('Documentation: http://127.0.0.1:8000/docs');
    console.log('Health Status: http://127.0.0.1:8000/api/health');
    console.log('============================================================');
  } else {
    console.warn('\n[WARNING] Backend process launched but health check timed out.');
    console.warn('Check terminal window or port 8000 logs for details.');
  }
}

// Start frontend only
async function startFrontend() {
  printHeader();
  verifyEnvironment('frontend');

  console.log('[1/3] Checking if frontend is already running on port 5173...');
  const health = await checkUrl('http://localhost:5173', 1500);
  if (health.online) {
    console.log('[INFO] Vite frontend is ALREADY running on http://localhost:5173');
    if (process.platform === 'win32') {
      const child = spawn('cmd.exe /c start http://localhost:5173', { shell: true, detached: true, stdio: 'ignore' });
      child.unref();
    }
    return;
  }

  const frontendDir = path.join(PROJECT_ROOT, 'frontend');
  console.log('[2/3] Starting Vite frontend on http://localhost:5173 ...');

  if (process.platform === 'win32') {
    const cmd = `start "ONIONVISION Frontend (Vite)" cmd /c "cd /d "${frontendDir}" && npm run dev"`;
    const child = spawn(cmd, {
      cwd: PROJECT_ROOT,
      shell: true,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } else {
    spawn('npm', ['run', 'dev'], {
      cwd: frontendDir,
      detached: true,
      stdio: 'ignore',
    }).unref();
  }

  console.log('[3/3] Waiting for frontend to initialize...');
  let online = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const check = await checkUrl('http://localhost:5173', 1000);
    if (check.online) {
      online = true;
      break;
    }
  }

  if (online) {
    console.log('\n============================================================');
    console.log('[SUCCESS] CEPA GRADE Frontend is ONLINE!');
    console.log('Frontend URL: http://localhost:5173');
    console.log('============================================================');
    console.log('Opening browser...');
    if (process.platform === 'win32') {
      execSync('start http://localhost:5173');
    }
  } else {
    console.warn('\n[WARNING] Frontend process launched. Attempting to open browser...');
    if (process.platform === 'win32') {
      execSync('start http://localhost:5173');
    }
  }
}

// Stop all services using stop_onionvision.bat
async function stopAll() {
  printHeader();
  console.log(`[INFO] Terminating CEPA GRADE services from: ${PROJECT_ROOT}`);

  const stopBat = path.join(PROJECT_ROOT, 'stop_onionvision.bat');
  if (fs.existsSync(stopBat)) {
    try {
      execSync(`cmd.exe /c "${stopBat}"`, {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
      });
    } catch (err) {
      console.warn(`[WARNING] Shutdown script returned non-zero code: ${err.message}`);
    }
  } else {
    // Fallback: taskkill directly on port 8000 and 5173
    console.log('[INFO] Executing fallback port termination...');
    if (process.platform === 'win32') {
      try {
        execSync('taskkill /FI "WINDOWTITLE eq ONIONVISION Backend (FastAPI)*" /T /F >nul 2>&1');
        execSync('taskkill /FI "WINDOWTITLE eq ONIONVISION Frontend (Vite)*" /T /F >nul 2>&1');
      } catch {}
    }
  }

  // Verification with fallback cleanup
  await sleep(1000);
  let backendCheck = await checkUrl('http://127.0.0.1:8000/api/health', 1000);
  let frontendCheck = await checkUrl('http://localhost:5173', 1000);

  if (process.platform === 'win32' && (backendCheck.online || frontendCheck.online)) {
    try {
      if (backendCheck.online) {
        execSync('cmd.exe /c "for /f \\"tokens=5\\" %a in (\'netstat -aon ^| findstr \":8000\" ^| findstr \"LISTENING\"\') do taskkill /PID %a /F /T >nul 2>&1"');
      }
      if (frontendCheck.online) {
        execSync('cmd.exe /c "for /f \\"tokens=5\\" %a in (\'netstat -aon ^| findstr \":5173\" ^| findstr \"LISTENING\"\') do taskkill /PID %a /F /T >nul 2>&1"');
      }
      await sleep(1000);
      backendCheck = await checkUrl('http://127.0.0.1:8000/api/health', 1000);
      frontendCheck = await checkUrl('http://localhost:5173', 1000);
    } catch {}
  }

  console.log('\n============================================================');
  if (!backendCheck.online && !frontendCheck.online) {
    console.log('[SUCCESS] All CEPA GRADE services have been STOPPED.');
  } else {
    if (backendCheck.online) console.warn('[WARNING] Backend port 8000 appears to still be active.');
    if (frontendCheck.online) console.warn('[WARNING] Frontend port 5173 appears to still be active.');
  }
  console.log('============================================================');
}

// Status check
async function checkStatus() {
  printHeader();
  console.log(`[PROJECT ROOT] ${PROJECT_ROOT}\n`);
  console.log('Inspecting CEPA GRADE service states...\n');

  const backend = await checkUrl('http://127.0.0.1:8000/api/health', 1500);
  let backendDetails = 'OFFLINE (Port 8000 not responding)';
  if (backend.online) {
    try {
      const data = JSON.parse(backend.body);
      backendDetails = `ONLINE (Models Ready: ${data.models_ready ? 'YES' : 'NO'}, Status: ${data.status})`;
    } catch {
      backendDetails = 'ONLINE (Port 8000 responding)';
    }
  }

  const frontend = await checkUrl('http://localhost:5173', 1500);
  const frontendDetails = frontend.online
    ? 'ONLINE (Port 5173 responding)'
    : 'OFFLINE (Port 5173 not responding)';

  console.log(`  FastAPI Backend (port 8000):  ${backend.online ? '[ONLINE] ' : '[OFFLINE]'} ${backendDetails}`);
  console.log(`  Vite Frontend   (port 5173):  ${frontend.online ? '[ONLINE] ' : '[OFFLINE]'} ${frontendDetails}`);
  console.log('');

  if (backend.online && frontend.online) {
    console.log('[STATUS] Full CEPA GRADE stack is active and ready.');
    console.log('         App URL: http://localhost:5173');
    console.log('         API URL: http://127.0.0.1:8000/docs');
  } else if (backend.online && !frontend.online) {
    console.log('[STATUS] Backend is running, but Frontend is stopped.');
    console.log('         Start frontend with: cepagrade frontend');
  } else if (!backend.online && frontend.online) {
    console.log('[STATUS] Frontend is running, but Backend is stopped.');
    console.log('         Start backend with: cepagrade backend');
  } else {
    console.log('[STATUS] All CEPA GRADE services are currently STOPPED.');
    console.log('         Start all services with: cepagrade');
  }
  console.log('============================================================');
}

// Main CLI Router
async function main() {
  const args = process.argv.slice(2);
  const command = (args[0] || 'start').toLowerCase();

  switch (command) {
    case 'start':
      await startAll();
      break;
    case 'frontend':
      await startFrontend();
      break;
    case 'backend':
      await startBackend();
      break;
    case 'stop':
      await stopAll();
      break;
    case 'status':
      await checkStatus();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    case '--version':
    case '-v':
      console.log('CEPA GRADE CLI v1.0.0');
      break;
    default:
      console.error(`[ERROR] Unknown command: "${args[0]}"\n`);
      showHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('[FATAL] CLI error:', err);
  process.exit(1);
});
