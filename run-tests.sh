#!/bin/bash

# Set environment to test
export NODE_ENV=test

# Run Jest with ESM support
node --experimental-vm-modules node_modules/jest/bin/jest.js --config=jest.config.js "$@"