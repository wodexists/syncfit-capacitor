/**
 * Production server entry point
 * This file is used to start the server in production mode
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Find the server file by checking possible build paths
function findServerFile() {
  const possiblePaths = [
    'dist/server/index.js',  // ESBuild with server directory
    'dist/index.js',         // ESBuild without server directory
    'server/index.js'        // Direct server file
  ];
  
  for (const serverPath of possiblePaths) {
    if (fs.existsSync(path.resolve(serverPath))) {
      return serverPath;
    }
  }
  
  throw new Error('Could not find server entry file. Make sure the build process completed successfully.');
}

// Execute the server file
try {
  // Print the Node.js version for debugging
  console.log(`Node.js ${process.version}`);
  console.log('Starting server in production mode...');
  
  // Find and execute the compiled TypeScript server file
  const serverFile = findServerFile();
  console.log(`Found server file at: ${serverFile}`);
  
  // Set NODE_ENV to production
  process.env.NODE_ENV = 'production';
  
  // Execute the server file
  execSync(`node ${serverFile}`, { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}