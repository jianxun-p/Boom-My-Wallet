import { Router, type RequestHandler } from 'express';
import { getAuthenticatedSessionUser } from '@/services/auth.js';
import { router as GoogleRouter } from '@/controllers/auth/google.js';
import type {
  AuthUserResponse,
  EmptyBody,
  EmptyParams,
  EmptyQuery,
  ErrorResponse,
} from '@/types/controller.d.ts';

export const router = Router({});

const corsHandler: RequestHandler = (req, res, next) => {
  res.header(
    'Access-Control-Allow-Origin',
    process.env['AUTH_ENDPOINT_CORS_ALLOW_ORIGIN'] ?? req.headers.origin ?? '*',
  );
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
};

const userHandler: RequestHandler<
  EmptyParams,
  AuthUserResponse | ErrorResponse,
  EmptyBody,
  EmptyQuery
> = (req, res, next) => {
  try {
    res.status(200).json({ data: getAuthenticatedSessionUser(req.session.user) });
  } catch (e) {
    next(e);
  }
};

router.use('/*oauthPath', corsHandler);
router.get('/user', userHandler);
router.use('/google', GoogleRouter);
