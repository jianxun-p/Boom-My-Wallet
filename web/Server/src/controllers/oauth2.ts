import { Router, type RequestHandler } from 'express';
import { handleOauthCallback } from '@/services/oauth2.js';
import { oauthContextFromRequest } from '@/controllers/oauthContext.js';
import type {
  EmptyBody,
  EmptyParams,
  ErrorResponse,
  OauthCallbackQuery,
} from '@/types/controller.d.ts';

export const router = Router({});

const callbackHandler: RequestHandler<
  EmptyParams,
  ErrorResponse,
  EmptyBody,
  OauthCallbackQuery
> = async (req, res, next) => {
  try {
    const result = await handleOauthCallback(oauthContextFromRequest(req));
    if (result.sessionUser) {
      req.session.user = result.sessionUser;
    }
    res.redirect(307, result.redirectUrl);
  } catch (e) {
    next(e);
  }
};

router.get('/callback', callbackHandler);
