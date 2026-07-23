#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { planLegacyApprovalMigration } from '../src/approval-model.js';

const input = process.argv[2];
if (!input) {
  console.error('Usage: npm run migration:plan -- sharepoint-requests.json');
  process.exit(2);
}

const parsed = JSON.parse(await readFile(input, 'utf8'));
const requests = Array.isArray(parsed) ? parsed : parsed.items || parsed.value || [];
const plans = requests.map(planLegacyApprovalMigration);
process.stdout.write(`${JSON.stringify({ generatedAt: new Date().toISOString(), plans }, null, 2)}\n`);
