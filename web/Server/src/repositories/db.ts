import type { IDbLib, IDbInitArgs, IDocDb } from '@/types/db.d.ts';

import { get as getSecret } from '@/repositories/secrets.js';

let _db_requires: Promise<IDbLib>;
if (process.env['DB_TYPE'] === 'mongo') {
  _db_requires = import('./mongo.js');
} else if (process.env['DB_TYPE'] === 'firestore') {
  _db_requires = import('./firestore.js');
} else {
  throw new Error('Unsupported DB_TYPE: ' + process.env['DB_TYPE']);
}

let _database: IDocDb | null = null;

function projectIdFromCredentials(credentials: Record<string, unknown> | undefined) {
  const projectId = credentials?.['project_id'];
  return typeof projectId === 'string' ? projectId : undefined;
}

export function database() {
  if (!_database) {
    throw new Error('Database not initialized');
  }
  return _database;
}

async function _init(args: IDbInitArgs) {
  console.log(`Initializing database (DB_TYPE: ${process.env['DB_TYPE']}) ...`);
  _database = await _db_requires.then((dbLib) => dbLib.init(args));
  console.log('Database initialized');
}

export async function init() {
  const dbInitArgs = {};
  switch (process.env['DB_TYPE']) {
    case 'mongo':
      Object.assign(dbInitArgs, {
        mongoDb: {
          mongoHost: process.env['MONGO_HOST'] ?? 'admin',
          mongoDbName: process.env['MONGO_DATABASE'] ?? 'password',
          mongoName: process.env['MONGO_USERNAME'] ?? 'localhost:27017',
          mongoPassword: process.env['MONGO_PASSWORD'] ?? 'default',
        },
      });
      break;
    case 'firestore': {
      const credentials = await Promise.resolve(process.env['GCP_CREDENTIALS_JSON'])
        .then((credStr) => JSON.parse(credStr ?? '') as Record<string, unknown>)
        .catch(() =>
          getSecret('secrets').then(
            (sec: Record<string, unknown>) =>
              sec['service_account'] as Record<string, unknown> | undefined,
          ),
        );

      Object.assign(dbInitArgs, {
        firestore: {
          gcpServiceAcntCredentials: credentials,
          gcpProjectId: process.env['GCP_PROJECT_ID'] || projectIdFromCredentials(credentials),
        },
      });
      break;
    }
    default:
      throw new Error('Unsupported DB_TYPE: ' + process.env['DB_TYPE']);
  }
  await _init(dbInitArgs);
}

export class DatabaseError extends Error {}
