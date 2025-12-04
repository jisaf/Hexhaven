#!/usr/bin/env node

/**
 * Seed Runner
 * Runs the seed script in both development (TypeScript) and production (compiled JS)
 */

const fs = require('fs');
const path = require('path');

// Check if compiled version exists (production)
const compiledSeedPath = path.join(__dirname, '../dist/backend/prisma/seed.js');
const tsSeedPath = path.join(__dirname, 'seed.ts');

if (fs.existsSync(compiledSeedPath)) {
  // Production: run compiled JavaScript
  console.log('Running compiled seed script...');
  require(compiledSeedPath);
} else if (fs.existsSync(tsSeedPath)) {
  // Development: use ts-node to run TypeScript
  console.log('Running TypeScript seed script with ts-node...');
  require('ts-node/register');
  require(tsSeedPath);
} else {
  console.error('ERROR: Seed script not found!');
  console.error(`Looked for:`);
  console.error(`  - ${compiledSeedPath} (compiled)`);
  console.error(`  - ${tsSeedPath} (source)`);
  process.exit(1);
}
