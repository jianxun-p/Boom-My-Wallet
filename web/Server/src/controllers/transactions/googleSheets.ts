import { Router, type RequestHandler } from 'express';
import { getGoogleSheetsConnectRedirectUrl } from '@/services/transactions/googleSheets.js';
import { oauthContextFromRequest } from '@/controllers/oauthContext.js';
import type {
  EmptyBody,
  ErrorResponse,
  GoogleSheetsConnectQuery,
  UserParams,
} from '@/types/controller.d.ts';

export const router = Router({ mergeParams: true });

const connectHandler: RequestHandler<
  UserParams,
  ErrorResponse,
  EmptyBody,
  GoogleSheetsConnectQuery
> = (req, res, next) => {
  try {
    res.redirect(
      307,
      getGoogleSheetsConnectRedirectUrl(
        oauthContextFromRequest(req),
        req.query.transactionServiceId,
      ),
    );
  } catch (e) {
    next(e);
  }
};

router.get('/connect', connectHandler);
