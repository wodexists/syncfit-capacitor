/**
 * Production server entry point
 * This file is used to start the server in production mode
 */

const { execSync } = require('child_process');

// Execute the server file
try {
  // Print the Node.js version for debugging
  console.log(`Node.js ${process.version}`);
  console.log('Starting server in production mode...');
  
  // Execute the compiled TypeScript server file
  execSync('node dist/server/index.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}