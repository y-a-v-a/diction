#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');

// Generate a secure random token
const token = crypto.randomBytes(32).toString('hex');

// Check if .env exists
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
}

// Check if CREATE_SECRET_TOKEN already exists
if (envContent.includes('CREATE_SECRET_TOKEN=')) {
  console.error('❌ CREATE_SECRET_TOKEN already exists in .env file!');
  console.error('To regenerate, manually remove the existing token from .env first.');
  process.exit(1);
}

// Append the token to .env
const tokenLine = `\n# Secret token for /create route access (PoC/demo protection)\nCREATE_SECRET_TOKEN=${token}\n`;

fs.appendFileSync(envPath, tokenLine);

console.log('✅ Token generated and saved to .env');
console.log('');
console.log('Your create URL is:');
console.log(`http://localhost:3000/create?token=${token}`);
console.log('');
console.log('💡 Tip: Run "npm run token:url" to see this URL again later');
