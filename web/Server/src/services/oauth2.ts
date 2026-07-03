import jwt, { type JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { UnAuthError } from '@/model/apperror.js';
import type { OauthCallbackResult, OauthRequestContext } from '@/types/controller.d.ts';

export const REDIRECT_PATH = '/oauth/callback';

export interface StatePayload {
  ts: number; // Time when this payload was generated
  ip: string; // IP address of request
  ua: string; // User-Agent of request
  redirectUri: string;
  provider: string;
}

/** @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.2 */
interface ErrorResponse {
  error:
    | 'invalid_request'
    | 'invalid_client'
    | 'invalid_grant'
    | 'unauthorized_client'
    | 'unsupported_grant_type'
    | 'invalid_scope';
  error_description?: string;
  error_uri?: string;
}

/** @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.1 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

type Oauth2ProviderHandler = (
  // eslint-disable-next-line no-unused-vars
  ..._: [StatePayload, TokenResponse, OauthRequestContext]
) => Promise<OauthCallbackResult>;

export type Oauth2Provider = {
  clientId: string;
  authenticationReqBaseUrl: string;
  authorizationReqBaseUrl: string;
  handler: Oauth2ProviderHandler;
  clientSecret?: string;
};

const OAUTH2_PROVIDER_INFO: Record<string, Oauth2Provider> = {};

export async function handleOauthCallback(
  context: OauthRequestContext,
): Promise<OauthCallbackResult> {
  let oauthState = null;
  try {
    oauthState = verifyOauthState(context) as StatePayload;
  } catch {
    throw new UnAuthError('Authentication failed');
  }
  if (!oauthState) {
    throw new UnAuthError('Authentication failed');
  }
  const oauthProvider = OAUTH2_PROVIDER_INFO[oauthState.provider];
  if (!oauthProvider) {
    throw new UnAuthError('Authentication failed');
  }

  const body = new URLSearchParams({
    code: context.code ?? '',
    client_id: oauthProvider.clientId,
    grant_type: 'authorization_code',
    redirect_uri: oauthState.redirectUri,
  });
  if (oauthProvider.clientSecret) {
    body.set('client_secret', oauthProvider.clientSecret);
  }

  const authRes = (await fetch(oauthProvider.authorizationReqBaseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
    .then((res) => res.json())
    .catch((e) => {
      console.warn(`Authorization with ${oauthState.provider} failed:`, e);
      return null;
    })) as Record<string, unknown>;
  if (authRes['error']) {
    const errRes = authRes as unknown as ErrorResponse;
    console.warn(
      `(${oauthState.provider}) Authorization failed (${errRes.error}, ${errRes.error_uri}): ${errRes.error_description}`,
    );
    throw new UnAuthError('Authorization failed');
  }
  return await oauthProvider.handler(oauthState, authRes as unknown as TokenResponse, context);
}

export function registerOauth2Provider(name: string, provider: Oauth2Provider) {
  Object.assign(OAUTH2_PROVIDER_INFO, {
    [name]: provider,
  });
  console.log(`Registered Oauth2.0 provider: "${name}"`);
}

export function getRedirectUrl(
  oauth2ProviderName: string,
  scope: string,
  context: OauthRequestContext,
  extraQueryParams: Record<string, unknown> = {},
  extraStatePayload: Record<string, unknown> = {},
) {
  const oauth2Provider = OAUTH2_PROVIDER_INFO[oauth2ProviderName];
  if (!oauth2Provider) {
    throw new Error();
  }
  const origin = context.origin ?? new URL(context.referer ?? '').origin;
  const redirectUri = origin + REDIRECT_PATH;

  const queryParams = new URLSearchParams({
    ...extraQueryParams,
    client_id: oauth2Provider.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    state: generateOauthState(context, oauth2ProviderName, redirectUri, extraStatePayload),
  });
  return oauth2Provider.authenticationReqBaseUrl + '?' + queryParams.toString();
}

const PAYLOAD_TTL = 2 * 60; // OAuth state payload expires in 2 minutes

const PAYLOAD_SIGN_KEY_ROTATION_INTERVAL = 5 * 60 * 1000; // rotate every 5 minutes
const PAYLOAD_SIGN_ALGORITHM = 'HS512';
const PAYLOAD_SIGN_KEY_TYPE = 'hmac';
const PAYLOAD_SIGN_KEY_LEN = 512;
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

function generateOauthState(
  context: OauthRequestContext,
  provider: string,
  redirectUri: string,
  extraParams: Record<string, unknown> = {},
) {
  const statePayload = {
    ts: Date.now(),
    ip: context.ip,
    ua: context.userAgent,
    redirectUri,
    provider,
    ...extraParams,
  } as StatePayload;
  return jwt.sign(statePayload, payloadSignKeys[payloadSignKeys.length - 1] as crypto.KeyObject, {
    algorithm: PAYLOAD_SIGN_ALGORITHM,
    expiresIn: PAYLOAD_TTL,
  });
}

function verifyOauthState(context: OauthRequestContext): StatePayload {
  const reqState = context.state ?? '';
  const initVal = {};
  const statePayload = payloadSignKeys.reduceRight((acc, key) => {
    if (acc !== initVal) {
      return acc;
    }
    try {
      return jwt.verify(reqState, key, {
        algorithms: [PAYLOAD_SIGN_ALGORITHM],
        maxAge: PAYLOAD_TTL,
      }) as JwtPayload;
    } catch {
      return acc;
    }
  }, initVal) as StatePayload;
  if (
    statePayload === null ||
    statePayload.ip !== context.ip ||
    statePayload.ua !== context.userAgent
  ) {
    console.warn('Bad state payload for oauth:', statePayload, context.ip, context.userAgent);
    throw new UnAuthError();
  }
  return statePayload;
}
