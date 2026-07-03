import { init as initAuth } from './auth.js';
import { init as initTransactions } from './transactions.js';

export async function init() {
  await Promise.all([initAuth(), initTransactions()]);
  console.log('Initialized all services');
}
