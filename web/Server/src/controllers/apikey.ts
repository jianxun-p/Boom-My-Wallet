import { Router, type RequestHandler } from 'express';
import { createApiKey, deleteApiKey, getApiKey, listApiKeys } from '@/services/apikey.js';
import type { User } from '@/types/user.d.ts';
import type {
  ApiKeyNameParams,
  CreateApiKeyBody,
  CreateApiKeyResponse,
  EmptyBody,
  EmptyQuery,
  ErrorResponse,
  GetApiKeyResponse,
  ListApiKeysResponse,
  MessageResponse,
  UserParams,
} from '@/types/controller.d.ts';

type UserLocals = {
  user: User;
};

export const router = Router({ mergeParams: true });

const listApiKeysHandler: RequestHandler<
  UserParams,
  ListApiKeysResponse | ErrorResponse,
  EmptyBody,
  EmptyQuery,
  UserLocals
> = (_req, res, next) => {
  try {
    res.status(200).json({ data: listApiKeys(res.locals.user) });
  } catch (e) {
    next(e);
  }
};

const getApiKeyHandler: RequestHandler<
  ApiKeyNameParams,
  GetApiKeyResponse | ErrorResponse,
  EmptyBody,
  EmptyQuery,
  UserLocals
> = (req, res, next) => {
  try {
    res.status(200).json({ data: { apikey: getApiKey(res.locals.user, req.params.name) } });
  } catch (e) {
    next(e);
  }
};

const createApiKeyHandler: RequestHandler<
  UserParams,
  CreateApiKeyResponse | ErrorResponse,
  CreateApiKeyBody,
  EmptyQuery,
  UserLocals
> = async (req, res, next) => {
  try {
    const user = res.locals.user;
    const data = await createApiKey(user, req.body.name ?? '');
    res.locals.user = user;
    res.status(200).json({ data, message: 'API key created' });
  } catch (e) {
    next(e);
  }
};

const deleteApiKeyHandler: RequestHandler<
  ApiKeyNameParams,
  MessageResponse | ErrorResponse,
  EmptyBody,
  EmptyQuery,
  UserLocals
> = async (req, res, next) => {
  try {
    const user = res.locals.user;
    await deleteApiKey(user, req.params.name);
    res.locals.user = user;
    res.status(200).json({ data: {}, message: 'API key deleted' });
  } catch (e) {
    next(e);
  }
};

router.get('/', listApiKeysHandler);
router.get('/:name', getApiKeyHandler);
router.post('/', createApiKeyHandler);
router.delete('/:name', deleteApiKeyHandler);
