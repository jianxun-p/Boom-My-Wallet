import express, { type Response, type Request, type NextFunction } from 'express';
import session from 'express-session';
import crypto from 'crypto';

import * as db from '@/repositories/db.js';
import * as secret from '@/repositories/secrets.js';
import * as services from '@/services/index.js';

import { AppError } from '@/model/apperror.js';

import { authMiddleware as userAuthMiddleware } from '@/middlewares/auth.js';

import { router as AuthRouter } from '@/controllers/auth.js';
import { router as Oauth2Router } from '@/controllers/oauth2.js';
import { router as ApiKeyRouter } from '@/controllers/apikey.js';
import { router as TransactionsRouter } from '@/controllers/transactions.js';
import path from 'path';

const PRODUCTION = process.env['NODE_ENV'] === 'production';
const PORT = process.env['PORT'] ?? 4000;
const SESSION_MAX_AGE = 30 * 60; // 30 minutes

async function initApp() {

  const secrets = await secret.get('secrets');
  const sessionSecret = Buffer.from(secrets['session_secret'], 'base64') ?? crypto.randomBytes(64);

  const app = express();
  app.use(express.static(path.join(import.meta.dirname, 'static')));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set('trust proxy', 1);
  app.use(
    session({
      secret: sessionSecret,
      resave: false, // Don't save session if unmodified
      saveUninitialized: false,
      rolling: true, // Resets maxAge on each response
      cookie: {
        secure: PRODUCTION, // Use secure cookies in production (requires HTTPS)
        maxAge: SESSION_MAX_AGE * 1000,
        httpOnly: true,
        sameSite: 'lax',
      },
    }),
  );

  app.use('/auth', AuthRouter);

  app.use('/oauth', Oauth2Router);

  app.use('/api/v1', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, OPTIONS, DELETE');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      res.status(200).send();
      return;
    }
    next();
  });

  app.use('/api/v1/users/:uid', userAuthMiddleware);

  app.use('/api/v1/users/:uid/apikeys', ApiKeyRouter);

  app.use('/api/v1/users/:uid/transactions', TransactionsRouter);

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { message: err.message } });
      return;
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: { message: 'Internal Server Error.' } });
  });

  return app;
}

Promise.resolve()
  .then(secret.init)
  .then(db.init)
  .then(services.init)
  .then(initApp)
  .then((app) => {
    console.log('Starting server...');
    app
      .listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
      .on('error', (e) => console.error('Error starting server:', e));
  });
