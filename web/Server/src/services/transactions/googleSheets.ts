import { AppError, UnAuthError } from '@/model/apperror.js';
import { get as getSecret } from '@/repositories/secrets.js';
import crypto from 'crypto';
import type {
  ITransactionService,
  Transaction,
  TransactionData,
  TransactionId,
  TransactionServiceInfoPartial,
  TransactionServiceProvider,
} from '@/types/transaction.d.js';
import { OAUTH_SUCCESS_REDIRECT_URL } from '../transactions.js';
import {
  addTransactionServiceInfo,
  getTransactionServiceInfo,
  updateTransactionServiceInfo,
} from '@/repositories/transactionServices.js';
import {
  GoogleAPI,
  requestGoogleApi,
  addRow,
  addRows,
  addWorksheets,
  createFolder,
  createSpreadsheetFile,
  getSpreadsheet,
  getValues,
  listFiles,
  rangeA1,
  updateValues,
} from '@/utils/GoogleApis.js';
import {
  registerOauth2Provider,
  type TokenResponse as BaseTokenResponse,
  type StatePayload as BaseOauthStatePayload,
  getRedirectUrl,
} from '../oauth2.js';
import type { OauthCallbackResult, OauthRequestContext } from '@/types/controller.d.ts';

export const GOOGLE_SHEETS_SERVICE: TransactionServiceProvider = 'googleSheets';

type RefreshToken = {
  token: string; // encrypted token
  iv: string;
  authTag: string;
  obtainedOn: number;
  scopes: string[];
  expireOn: number | null; // ms since Epoch
};

type AccessToken = {
  token: string;
  expireOn: number; // ms since Epoch
};

type GoogleSheetsOauthData = {
  // the concrete acutal structure for TransactionServiceInfo.info
  spreadsheetId: string;
  refreshToken: RefreshToken;
  accessToken?: AccessToken; // should not be stored in database
};

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCODING = 'base64'; // refresh token storage encoding
const KEY_ENCODING = 'base64'; // refresh token key encoding

const REQUIRED_SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const FOLDER_NAME = 'Boom My Wallet';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const SPREADSHEET_NAME = 'Boom My Wallet';
const SPREADSHEET_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';
const WORKSHEET_NAMES = ['Transaction'];

const WORKSHEETS_SCHEMA = {
  Transaction: [
    {
      key: 'Time',
      get: (transaction: TransactionData) => transaction.time,
      to: (time: RowValTy) => Object({ time: String(time) }) as Partial<TransactionData>,
    },
    {
      key: 'Amount',
      get: (transaction: TransactionData) => transaction.amount,
      to: (amount: RowValTy) => Object({ amount: Number(amount) }) as Partial<TransactionData>,
    },
    {
      key: 'Currency',
      get: (transaction: TransactionData) => transaction.currency,
      to: (currency: RowValTy) =>
        Object({ currency: String(currency) }) as Partial<TransactionData>,
    },
    {
      key: 'Category',
      get: (transaction: TransactionData) => transaction.category,
      to: (category: RowValTy) =>
        Object({ category: String(category) }) as Partial<TransactionData>,
    },
    {
      key: 'Merchant',
      get: (transaction: TransactionData) => transaction.merchant,
      to: (merchant: RowValTy) =>
        Object({ merchant: String(merchant) }) as Partial<TransactionData>,
    },
    {
      key: 'Payment Method',
      get: (transaction: TransactionData) => transaction.paymentMethod,
      to: (paymentMethod: RowValTy) =>
        Object({ paymentMethod: String(paymentMethod) }) as Partial<TransactionData>,
    },
    {
      key: 'Location',
      get: (transaction: TransactionData) => transaction.location,
      to: (location: RowValTy) =>
        Object({ location: String(location) }) as Partial<TransactionData>,
    },
    {
      key: 'Latitude',
      get: (transaction: TransactionData) => transaction.latitude,
      to: (latitude: RowValTy) =>
        Object({ latitude: String(latitude) }) as Partial<TransactionData>,
    },
    {
      key: 'Longitude',
      get: (transaction: TransactionData) => transaction.longitude,
      to: (longitude: RowValTy) =>
        Object({ longitude: String(longitude) }) as Partial<TransactionData>,
    },
    {
      key: 'Deleted',
      get: (transaction: TransactionData) => transaction.deleted,
      to: (deleted: RowValTy) =>
        Object({
          deleted: deleted === true || String(deleted).toLowerCase() === 'true',
        }) as Partial<TransactionData>,
    },
    {
      key: 'Description',
      get: (transaction: TransactionData) => transaction.description,
      to: (description: RowValTy) =>
        Object({ description: String(description) }) as Partial<TransactionData>,
    },
    {
      key: 'Image URL',
      get: (transaction: TransactionData) => transaction.imageUrl,
      to: (imageUrl: RowValTy) =>
        Object({ imageUrl: String(imageUrl) }) as Partial<TransactionData>,
    },
  ],
};

async function refreshTokenEncryptionKey(): Promise<Buffer> {
  return Buffer.from((await getSecret('secrets')).refresh_token_encryption_key, KEY_ENCODING);
}

async function gcpClientSecret(): Promise<string> {
  return (await getSecret('secrets')).google_oauth.web.client_secret;
}

async function gcpClientId(): Promise<string> {
  return (await getSecret('secrets')).google_oauth.web.client_id;
}

function aesEncrypt(refreshToken: string, key: Buffer): Partial<RefreshToken> {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let cipherText = cipher.update(refreshToken, 'utf8', ENCODING);
  cipherText += cipher.final(ENCODING);
  return {
    iv: iv.toString(ENCODING),
    token: cipherText,
    authTag: cipher.getAuthTag().toString(ENCODING),
  };
}

function aesDecrypt(refreshToken: RefreshToken, key: Buffer): string | null {
  const iv = Buffer.from(refreshToken.iv, ENCODING);
  if (refreshToken.expireOn && Date.now() >= refreshToken.expireOn) {
    return null;
  }
  try {
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(Buffer.from(refreshToken.authTag, ENCODING));
    let plaintext = decipher.update(refreshToken.token, ENCODING, 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
  } catch {
    return null;
  }
}

type RowValTy = boolean | number | string | null;

/** @see https://developers.google.com/identity/openid-connect/reference?#response_body_2 */
type TokenResponse = BaseTokenResponse & {
  refresh_token_expires_in?: number; // The remaining lifetime of the Refresh Token in seconds. This value is only set when the user grants time-based access.

  /** inherited from BaseTokenResponse */
  // access_token: string	    // The Access Token that can be sent to a Google API.
  // expires_in: number	    // The lifetime of the Access Token in seconds, relative to the time the token was issued.
  // id_token: string	        // A JSON Web Token (JWT) that contains identity information about the user. This token is returned during the initial Authorization Code exchange and can also be returned during a Refresh Token request if the openid scope was granted.
  // scope: string            // The scopes of access granted by the access_token expressed as a list of space-delimited, case-sensitive strings.
  // refresh_token?: string   // A token that can be used to obtain new Access Tokens. This field is only returned in the initial exchange of an Authorization Code if access_type=offline was requested.
  // token_type: string       // The type of token returned. Always Bearer.
};

type OauthStatePayload = {
  transactionServiceId?: string;
} & BaseOauthStatePayload;

async function newTransactionServiceInfo(
  refreshToken: RefreshToken,
  accessToken: AccessToken,
): Promise<TransactionServiceInfoPartial> {
  const { spreadsheet } = await listFiles(accessToken.token)
    .then(async (files) => {
      return {
        files,
        folder:
          files.find((f) => f.name === FOLDER_NAME && f.mimeType === FOLDER_MIME_TYPE) ??
          (await createFolder(accessToken.token, FOLDER_NAME)),
      };
    })
    .then(async ({ files, folder }) => {
      return {
        files,
        folder,
        spreadsheet:
          files.find((f) => f.name === SPREADSHEET_NAME && f.mimeType === SPREADSHEET_MIME_TYPE) ??
          (await createSpreadsheetFile(accessToken.token, SPREADSHEET_NAME, folder.id)),
      };
    })
    .then(async ({ files, folder, spreadsheet }) => {
      return {
        files,
        folder,
        spreadsheet: await getSpreadsheet(accessToken.token, spreadsheet.id),
      };
    })
    .then(async ({ files, folder, spreadsheet }) => {
      const needCreate = WORKSHEET_NAMES.filter(
        (wsn) => undefined === spreadsheet.sheets.find((s) => s.properties.title === wsn),
      );
      const newlyCreated = await addWorksheets(
        accessToken.token,
        spreadsheet.spreadsheetId,
        needCreate,
      );
      await Promise.all(
        Object.entries(WORKSHEETS_SCHEMA).map(([worksheetName, worksheetSchema]) =>
          addRow(
            accessToken.token,
            spreadsheet.spreadsheetId,
            worksheetName,
            worksheetSchema.map((col) => col.key),
          ),
        ),
      );
      return {
        files,
        folder,
        spreadsheet,
        worksheets: [...spreadsheet.sheets.map((s) => s.properties), ...newlyCreated],
      };
    });

  return {
    provider: GOOGLE_SHEETS_SERVICE,
    info: {
      refreshToken,
      spreadsheetId: spreadsheet.spreadsheetId,
    } as GoogleSheetsOauthData,
  };
}

export class GoogleSheetsOauth implements ITransactionService {
  private _accessToken: AccessToken;
  private _refreshToken: RefreshToken;
  private _spreadsheetId: string;

  async getAccessToken() {
    if (this._accessToken.expireOn > Date.now()) {
      return this._accessToken;
    }
    this._accessToken = await requestGoogleApi(null, GoogleAPI.OAuth.Token, {
      client_id: await gcpClientId(),
      client_secret: await gcpClientSecret(),
      grant_type: 'refresh_token',
      refresh_token: aesDecrypt(this._refreshToken, await refreshTokenEncryptionKey()),
    }).then(
      (data) =>
        Object({
          token: data['access_token'],
          expireOn: Date.now() + Number(data['expires_in']) * 1000 - 1000,
        }) as AccessToken,
    );

    return this._accessToken;
  }

  constructor(accessToken: AccessToken, refreshToken: RefreshToken, spreadsheetId: string) {
    this._accessToken = { ...accessToken };
    this._refreshToken = { ...refreshToken };
    this._spreadsheetId = spreadsheetId;
  }

  static fromTransactionServiceInfo(ts: TransactionServiceInfoPartial) {
    const oauthData = ts.info as GoogleSheetsOauthData;
    return new GoogleSheetsOauth(
      oauthData.accessToken ?? { token: '', expireOn: 0 },
      oauthData.refreshToken,
      oauthData.spreadsheetId,
    );
  }

  toTransactionServiceInfoPartial(): TransactionServiceInfoPartial {
    return {
      provider: this.provider,
      info: {
        refreshToken: this._refreshToken,
        spreadsheetId: this._spreadsheetId,
      },
    };
  }

  static async registerNewAccount(refreshToken: RefreshToken, accessToken: AccessToken) {
    const transactionServiceInfo = await newTransactionServiceInfo(refreshToken, accessToken);
    return GoogleSheetsOauth.fromTransactionServiceInfo(transactionServiceInfo);
  }

  get provider() {
    return GOOGLE_SHEETS_SERVICE;
  }

  async getTransactions() {
    const accessToken = await this.getAccessToken();
    const rows = await getValues(accessToken.token, this._spreadsheetId, `'Transaction'`);
    return rows
      .filter((_, i) => i !== 0)
      .map(
        (row, i) =>
          Object({
            ...Object.assign(
              {},
              ...WORKSHEETS_SCHEMA.Transaction.map((col, colIndex) =>
                col.to(row[colIndex] ?? null),
              ),
            ),
            id: String(i + 1),
          }) as Transaction,
      )
      .filter((t) => !t.deleted);
  }

  async appendTransactions(transactions: TransactionData[]) {
    const rows = transactions.map((transaction: TransactionData) =>
      WORKSHEETS_SCHEMA.Transaction.map((col) => String(col.get(transaction))),
    );
    await addRows((await this.getAccessToken()).token, this._spreadsheetId, 'Transaction', rows);
  }

  async updateTransactions(transactions: Transaction[]) {
    await updateValues(
      (await this.getAccessToken()).token,
      this._spreadsheetId,
      Object.fromEntries(
        transactions.map((t) => {
          const row = WORKSHEETS_SCHEMA.Transaction.map((c) => c.get(t));
          return [rangeA1('Transaction', [0, Number(t.id)], [row.length - 1, Number(t.id)]), [row]];
        }),
      ),
    );
  }

  async deleteTransactions(transactionIds: TransactionId[]) {
    const column = WORKSHEETS_SCHEMA.Transaction.findIndex((c) => c.key === 'Deleted');
    await updateValues(
      (await this.getAccessToken()).token,
      this._spreadsheetId,
      Object.fromEntries(
        transactionIds.map((tid) => {
          const row = Number(tid);
          return [rangeA1('Transaction', [column, row], [column, row]), [[true]]];
        }),
      ),
    );
  }
}

async function OuthCallback(
  oauthState: OauthStatePayload,
  tokenResponse: TokenResponse,
  context: OauthRequestContext,
): Promise<OauthCallbackResult> {
  const accessTokenExpiry = Date.now() + 1000 * tokenResponse.expires_in - 1000;
  if (!tokenResponse.refresh_token) {
    throw new UnAuthError('Missing refresh_token');
  }
  let accessToken = null;
  let refreshToken = null;
  try {
    const encKey = await refreshTokenEncryptionKey();
    accessToken = { token: tokenResponse.access_token, expireOn: accessTokenExpiry } as AccessToken;
    refreshToken = Object.assign(
      {
        obtainedOn: Date.now(),
        scopes: (tokenResponse.scope ?? '').split(' '),
        expireOn: tokenResponse.refresh_token_expires_in
          ? tokenResponse.refresh_token_expires_in * 1000
          : null,
      },
      aesEncrypt(tokenResponse.refresh_token, encKey),
    ) as RefreshToken;
  } catch (e) {
    console.warn('Failed obtain refresh token:', e);
    throw new AppError('Authorization failed');
  }

  let userData = context.sessionUser;
  if (!userData) {
    throw new UnAuthError('Authorization failed: Not signed in.');
  }
  try {
    const ts = await getTransactionServiceInfo(userData, oauthState.transactionServiceId ?? '');
    if (!ts) {
      userData = await addTransactionServiceInfo(
        userData,
        await newTransactionServiceInfo(refreshToken, accessToken),
      );
    } else {
      (ts.info as GoogleSheetsOauthData).refreshToken = refreshToken;
      await updateTransactionServiceInfo(userData, ts.transactionServiceId, ts);
    }
  } catch (e) {
    console.warn('Failed to add / update transaction service info:', e);
    throw new UnAuthError('Authorization failed');
  }

  return {
    redirectUrl: OAUTH_SUCCESS_REDIRECT_URL,
    sessionUser: userData,
  };
}

const OAUTH2_PROVIDER_NAME = 'GoogleSheets';

export async function init() {
  registerOauth2Provider(OAUTH2_PROVIDER_NAME, {
    clientId: await gcpClientId(),
    authenticationReqBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    authorizationReqBaseUrl: 'https://oauth2.googleapis.com/token',
    handler: OuthCallback,
    clientSecret: await gcpClientSecret(),
  });
}

export function getGoogleSheetsConnectRedirectUrl(
  context: OauthRequestContext,
  transactionServiceId: string | undefined,
): string {
  return getRedirectUrl(
    OAUTH2_PROVIDER_NAME,
    REQUIRED_SCOPES.join(' '),
    context,
    {
      access_type: 'offline', // also get refresh token
      prompt: 'consent',
    },
    {
      // To indicate if it is updating (reconnect) existing transaction service / connecting with new transaction service
      transactionServiceId,
    },
  );
}
