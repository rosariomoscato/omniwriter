#!/usr/bin/env node

/**
 * Temporary server startup script to verify Feature #1
 *
 * This script starts the server once without watch mode to verify
 * the database connection on startup and the health endpoint.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('=== Starting OmniWriter Server (Single Run) ===\n');

// Use node directly with tsx to run the TypeScript file
const serverProcess = spawn('node', [
  path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli-mjs', 'index.js'),
  path.join(__dirname, 'src', 'index.ts')
], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    // Disable tsx watch mode IPC
    TSX_DISABLE_CACHE: 'true'
  }
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code || 0);
});

// Keep the script running
process.on('SIGINT', () => {
  console.log('\nStopping server...');
  serverProcess.kill('SIGTERM');
});
