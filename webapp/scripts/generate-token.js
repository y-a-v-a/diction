#!/usr/bin/env node
import crypto from 'crypto';

// Generate a secure random token
const token = crypto.randomBytes(32).toString('hex');
console.log(token);
