import type { Request } from 'express';
import type { OauthCallbackQuery, OauthRequestContext } from '@/types/controller.d.ts';

type RequestLike<ReqQuery> = {
  ip?: string;
  headers: Request['headers'];
  query: ReqQuery;
  session: Request['session'];
};

export function oauthContextFromRequest<ReqQuery>(req: RequestLike<ReqQuery>): OauthRequestContext {
  const query = req.query as Partial<OauthCallbackQuery>;
  return {
    code: query.code,
    state: query.state,
    ip: req.ip ?? '',
    userAgent: req.headers['user-agent'] ?? '',
    origin: req.headers.origin,
    referer: req.headers.referer,
    sessionUser: req.session.user,
  };
}
