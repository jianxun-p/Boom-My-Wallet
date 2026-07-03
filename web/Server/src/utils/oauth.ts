import type { Request } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { UnAuthError } from '@/model/apperror.js';
const { sign, verify } = jwt;

const PAYLOAD_TTL = 2 * 60; // OAuth2.0 state payload expires in 2 minutes

const PAYLOAD_SIGN_KEY_ROTATION_INTERVAL = 5 * 60 * 1000; // rotate every 5 minutes
const PAYLOAD_SIGN_ALGORITHM = 'HS512';
const PAYLOAD_SIGN_KEY_TYPE = 'hmac';
const PAYLOAD_SIGN_KEY_LEN = 64;
const PAYLOAD_SIGN_KEY_NUM = 2; // have 2 keys

const payloadSignKeys = [
  ...Array(PAYLOAD_SIGN_KEY_NUM)
    .keys()
    .map(() => crypto.generateKeySync(PAYLOAD_SIGN_KEY_TYPE, { length: PAYLOAD_SIGN_KEY_LEN })),
];
function rotateKeys() {
  const newKey = crypto.generateKeySync(PAYLOAD_SIGN_KEY_TYPE, { length: PAYLOAD_SIGN_KEY_LEN });
  Array(PAYLOAD_SIGN_KEY_NUM).forEach((_, i) => {
    const isLast = i + 1 === PAYLOAD_SIGN_KEY_NUM;
    payloadSignKeys[i] = isLast ? newKey : (payloadSignKeys[i + 1] as crypto.KeyObject);
  });
}
setInterval(rotateKeys, PAYLOAD_SIGN_KEY_ROTATION_INTERVAL);

export interface StatePayload {
  ts: number; // Time when this payload was generated
  ip: string; // IP address of request
  ua: string; // User-Agent of request
  callbackUri: string; // Whice service to redirect user to
  authorizationReqBaseUrl: string; // Base URL for OAuth2.0 authorization
}

export function generateOauthState(
  req: Request,
  callbackUri: string,
  extraParams: Record<string, unknown> = {},
) {
  const statePayload = {
    ts: Date.now(),
    ip: req.ip ?? '',
    ua: req.headers['user-agent'] ?? '',
    callbackUri,
    ...extraParams,
  } as StatePayload;
  return sign(statePayload, payloadSignKeys[payloadSignKeys.length - 1] as crypto.KeyObject, {
    algorithm: PAYLOAD_SIGN_ALGORITHM,
    expiresIn: PAYLOAD_TTL,
  });
}

export function verifyOauthState(req: Request): StatePayload {
  const reqState = req.query['state'] as string;
  const initVal = {};
  const statePayload = payloadSignKeys.reduceRight((acc, key) => {
    if (acc !== initVal) {
      return acc;
    }
    try {
      return verify(reqState, key, {
        algorithms: [PAYLOAD_SIGN_ALGORITHM],
        maxAge: PAYLOAD_TTL,
      }) as JwtPayload;
    } catch {
      return acc;
    }
  }, initVal) as StatePayload;
  if (
    statePayload === null ||
    statePayload.ip !== req.ip ||
    statePayload.ua !== req.headers['user-agent']
  ) {
    console.warn('Bad state payload for OAuth2.0:', req.ip, req.headers['user-agent']);
    throw new UnAuthError('Authorization failed');
  }
  return statePayload;
}
