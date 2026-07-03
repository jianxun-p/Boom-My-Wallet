import {
  registerOauth2Provider,
  type TokenResponse as BaseTokenResponse,
  type StatePayload as OauthStatePayload,
  getRedirectUrl,
} from '../oauth2.js';
import { AUTH_SUCCESS_REDIRECT_URL } from '../auth.js';
import { AppError, UnAuthError } from '@/model/apperror.js';
import { get as getSecret } from '@/repositories/secrets.js';
import { decode as JwtDecode } from 'jsonwebtoken';
import { newUser, userFromUserData, getUserData } from '@/model/user.js';
import { findUserByAuthField, saveUserToDatabase } from '@/repositories/user.js';
import type { AuthServiceInfo, AuthServiceProvider, IAuthService } from '@/types/auth.d.ts';
import type { User } from '@/types/user.d.ts';
import type { OauthCallbackResult, OauthRequestContext } from '@/types/controller.d.ts';

const GOOGLE_AUTH_SERVICE_PROVIDER: AuthServiceProvider = 'google';

/** @see https://developers.google.com/identity/openid-connect/reference?#id_token_claims */
interface IdToken {
  iss: string; // The Issuer Identifier for the Issuer of the response
  sub: string; // An identifier for the user
  aud: string; // The audience for which the ID Token is intended
  iat: number; // The time the ID Token was issued. Represented in Unix epoch time (integer seconds).
  exp: number; // Expiration time on or after which the ID Token must not be accepted. Represented in Unix epoch time (integer seconds).
  email?: string;
  name?: string;
  picture?: string; // The URL of the user's profile picture. Might be provided when the request scope included the string profile or the ID token is returned from a token refresh.
}

/** @see https://developers.google.com/identity/openid-connect/reference?#response_body_2 */
type TokenResponse = BaseTokenResponse & {
  id_token?: string; // A JSON Web Token (JWT) that contains identity information about the user. This token is returned during the initial Authorization Code exchange and can also be returned during a Refresh Token request if the openid scope was granted.

  /** inherited from BaseTokenResponse */
  // access_token: string	    // The Access Token that can be sent to a Google API.
  // expires_in: number	    // The lifetime of the Access Token in seconds, relative to the time the token was issued.
  // id_token: string	        // A JSON Web Token (JWT) that contains identity information about the user. This token is returned during the initial Authorization Code exchange and can also be returned during a Refresh Token request if the openid scope was granted.
  // scope: string            // The scopes of access granted by the access_token expressed as a list of space-delimited, case-sensitive strings.
  // refresh_token?: string   // A token that can be used to obtain new Access Tokens. This field is only returned in the initial exchange of an Authorization Code if access_type=offline was requested.
  // token_type: string       // The type of token returned. Always Bearer.
};

type AuthData = {
  sub: string;
  email?: string;
};

function updateAuthServiceInfo(
  authServiceInfo: AuthServiceInfo,
  authData: AuthData,
): AuthServiceInfo {
  return Object.assign(authServiceInfo, {
    [GOOGLE_AUTH_SERVICE_PROVIDER]: authData,
  });
}

async function register(authData: AuthData): Promise<User> {
  const user = newUser({
    [GOOGLE_AUTH_SERVICE_PROVIDER]: authData,
  });
  await GoogleAuth.initAccount(user)
    .then(() => saveUserToDatabase(getUserData(user)))
    .catch((e) => {
      console.error('Failed to register user:', e);
      throw new AppError('Failed to register user');
    });
  return user;
}

async function login(authData: AuthData): Promise<User> {
  return await findUserByAuthField(GOOGLE_AUTH_SERVICE_PROVIDER + '.sub', authData.sub)
    .then(async (user) => {
      if (user === null) {
        return await register(authData);
      }
      user.auth = updateAuthServiceInfo(user.auth, authData);
      return user;
    })
    .then(userFromUserData);
}

const GoogleAuth: IAuthService = {
  provider: GOOGLE_AUTH_SERVICE_PROVIDER,
  async initAccount() {},
  async deleteAccount() {},
};

const REQUIRED_SCOPES = ['openid'];

async function OuthCallback(
  _: OauthStatePayload,
  tokenResponse: TokenResponse,
): Promise<OauthCallbackResult> {
  if (!tokenResponse.id_token) {
    console.warn('Missing id_token in TokenResponse');
    throw new UnAuthError('Failed to authenticate with Google');
  }
  try {
    const idToken = JwtDecode(tokenResponse.id_token) as IdToken;
    const user = await login({ sub: idToken.sub });
    return {
      redirectUrl: AUTH_SUCCESS_REDIRECT_URL,
      sessionUser: getUserData(user),
    };
  } catch (e) {
    console.log('Failed to authenticate with Google:', e);
    throw new UnAuthError('Failed to authenticate with Google');
  }
}

const OAUTH2_PROVIDER_NAME = 'Google';

async function gcpClientSecret(): Promise<string> {
  return (await getSecret('secrets')).google_oauth.web.client_secret;
}

async function gcpClientId(): Promise<string> {
  return (await getSecret('secrets')).google_oauth.web.client_id;
}

export async function init() {
  registerOauth2Provider(OAUTH2_PROVIDER_NAME, {
    clientId: await gcpClientId(),
    authenticationReqBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    authorizationReqBaseUrl: 'https://oauth2.googleapis.com/token',
    handler: OuthCallback,
    clientSecret: await gcpClientSecret(),
  });
}

export function getGoogleAuthRedirectUrl(context: OauthRequestContext): string {
  return getRedirectUrl(OAUTH2_PROVIDER_NAME, REQUIRED_SCOPES.join(' '), context);
}
