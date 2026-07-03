import { Router, type RequestHandler } from 'express';
import { getGoogleAuthRedirectUrl } from '@/services/auth/google.js';
import type { EmptyBody, EmptyParams, EmptyQuery, ErrorResponse } from '@/types/controller.d.ts';
import { oauthContextFromRequest } from '@/controllers/oauthContext.js';

export const router = Router({});

const loginHandler: RequestHandler<EmptyParams, ErrorResponse, EmptyBody, EmptyQuery> = (
  req,
  res,
  next,
) => {
  try {
    res.redirect(307, getGoogleAuthRedirectUrl(oauthContextFromRequest(req)));
  } catch (e) {
    next(e);
  }
};

router.get('/login', loginHandler);
