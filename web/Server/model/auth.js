/**
 * This module defines the Auth class and its subclasses for handling authentication with different providers (e.g., Google).
 * It also provides a factory function to create Auth instances based on the authentication source.
 * The GoogleAuth class implements methods for revoking tokens, refreshing access tokens, and updating authentication data.
 * The module uses AES-256-GCM for encrypting refresh tokens before storing them in the database, and decrypts them when needed.
 * It also interacts with Google's OAuth2 endpoints to manage tokens.
 */

const secret = require('../secrets');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const googleapis = require('../googleapis');

const TRANSACTIONS_WORKSHEET_NAME = 'transactions';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCODING = 'base64';

const GOOGLE_OAUTH_REDIRECT_PATH = "/oauth/google/callback";

const gauthHmacKey = [
    crypto.generateKeySync('hmac', {length: 512}), 
    crypto.generateKeySync('hmac', {length: 512})
];
setInterval(
    async () => { 
        crypto.generateKey('hmac', {length: 512}, (err, key) => { 
            if (err) {
                console.error(`[${new Date().toUTCString()}] Failed generating HMAC keys for Google OAuth2.0 state:`, err); 
                return;
            }
            [gauthHmacKey[0], gauthHmacKey[1]] = [gauthHmacKey[1], key];
        }); 
    }, 
    600000   // every 10 minutes
);     


function verifyOauthState(req) {
    const reqState = req.query.state;
    const statePayload = gauthHmacKey.reduceRight((acc, key) => {
        try {
            return jwt.verify(reqState, key, { algorithm: 'HS512', maxAge: 2 * 60 })
        } catch (e) {
            return acc;
        }
    }, null);
    if (statePayload === null || statePayload.ip !== req.ip || statePayload.ua !== req.headers['user-agent']) {
        console.warn('bad state payload for oauth', statePayload);
        return null;
    }
    return statePayload.redirect_uri;
}

function aesEncrypt(plaintext, key) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let cipherText = cipher.update(plaintext, 'utf8', ENCODING);
    cipherText += cipher.final(ENCODING);
    return { iv: iv.toString(ENCODING), cipherText: cipherText, authTag: cipher.getAuthTag().toString(ENCODING) };
}

function aesDecrypt(cipherText, key, iv, authTag) {
    try {
        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let plaintext = decipher.update(cipherText, ENCODING, 'utf8');
        plaintext += decipher.final('utf8');
        return plaintext;
    } catch (e) {
        return null;
    }
}

class Auth {
    constructor(authSource) {
        this.authSource = authSource;
    }

    // async revokeToken(token) {}
    async getNewAccessToken(refreshToken) {}
    updateAuthData(oldAuthData) {}

    static get requiredScopes() { return []; }

    async notifyEvent(event) {
        switch (event.type) {
            case 'transaction.add':
                return await this.addRow(event.data);
            // case 'transaction.get':
            //     return await this.getRow(event.rowId);
            // case 'transaction.update':
            //     return await this.updateRow(event.rowId, event.data);
            // case 'transaction.delete':
            //     return await this.deleteRow(event.rowId);
        }
    }
    // async updateRow(id, data) {}
    // async deleteRow(id) {}
    // async getRow(id) {}
    // async getAllRows() {}
    async addRow(data) {}

}

class GoogleAuth extends Auth {
    constructor() {
        super('google');
    }

    static async new(authData) {
        let auth = new GoogleAuth();
        auth.authData = authData ?? {};
        auth.refreshTokenEncKey = (await secret.get('secrets')).refresh_token_encryption_key;
        return auth;
    }

    static requiredScopes() {
        const scopes = [
            'openid', 
            'https://www.googleapis.com/auth/userinfo.email', 
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/drive.file'
        ];
        return scopes;
    }

    static async getOauthRedirectUrl(req) {
        // const connectGoogleSheets = req.query.connect === 'GoogleSheets';
        // TODO: conditionally get refresh token only when user is connecting Google Sheets, but for now always request offline access to get refresh token, since it is needed for Google Sheets integration and it doesn't seem to cause issues for users who are not connecting Google Sheets (based on testing)
        const connectGoogleSheets = true;     // for now, always request offline access to get refresh token, since it is needed for Google Sheets integration  
        const AUTH_SCOPES = this.requiredScopes().join(' ');
        const origin = req.headers['origin'] ?? new URL(req.headers['referer']).origin;
        const redirect_uri = `${origin}${GOOGLE_OAUTH_REDIRECT_PATH}`;
        const statePayload = { 
            ts: Date.now(), 
            ip: req.ip, 
            ua: req.headers['user-agent'],
            redirect_uri: redirect_uri
        };
        const queryParams = new URLSearchParams({
            client_id: (await secret.get('secrets')).google_oauth.web.client_id,
            redirect_uri: redirect_uri,
            response_type: 'code',
            access_type: connectGoogleSheets ? 'offline' : 'online',     // also get refresh token
            scope: AUTH_SCOPES,
            prompt: 'consent',
            state: jwt.sign(statePayload, gauthHmacKey[gauthHmacKey.length - 1], { algorithm: 'HS512', expiresIn: 2 * 60 }),    // 2 mins
        });
        return 'https://accounts.google.com/o/oauth2/v2/auth?' + queryParams.toString();
    }
    

    get refreshToken() {
        if (!this.authData.refresh_token) {
            return null;
        }
        return aesDecrypt(
            this.authData.refresh_token, 
            Buffer.from(this.refreshTokenEncKey, ENCODING), 
            Buffer.from(this.authData.refresh_token_iv, ENCODING), 
            Buffer.from(this.authData.refresh_token_auth_tag, ENCODING)
        );
    }

    /**
     * https://developers.google.com/identity/protocols/oauth2/web-server#offline
     * @returns Object containing new access token and its expiry time, or null if failed to refresh
     */
    async getNewAccessToken() {
        const refreshToken = this.refreshToken;
        return await fetch ('https://oauth2.googleapis.com/token?' + new URLSearchParams({token: refreshToken}).toString(), {
            method: 'POST',
            headers: {
                'Content-type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: (await secret.get('secrets')).google_oauth.web.client_id,
                client_secret: (await secret.get('secrets')).google_oauth.web.client_secret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }).toString(),
        })
        .then(res => res.json());
    }

    updateAuthData(newAuthData) {

        if (newAuthData.access_token) {
            this.accessToken = newAuthData.access_token;
            this.accessTokenExpiry = Date.now() + (newAuthData.expires_in * 1000);
            this.hasAllScopes = GoogleAuth.requiredScopes().every(scope => newAuthData.scope.includes(scope));
        }

        const emails = (this.authData?.email ?? []).filter(email => email !== newAuthData.email).concat(newAuthData.email);

        this.authData = Object.assign(this.authData ?? {}, {
            emails: emails,
        });

        if (newAuthData.refresh_token) {
            const {iv, cipherText, authTag} = aesEncrypt(newAuthData.refresh_token, Buffer.from(this.refreshTokenEncKey, ENCODING));
            this.authData = Object.assign(this.authData, {
                scopes: newAuthData.scope.split(' '),
                refresh_token: cipherText,
                refresh_token_iv: iv,
                refresh_token_auth_tag: authTag,
                refresh_token_t: Date.now(),
            });
        }
        return this.authData;
    }

    // async updateRow(id, data) {}
    // async deleteRow(id) {}
    // async getRow(id) {}
    // async getAllRows() {}
    async addRow(data) {
        const accessToken = await this.getNewAccessToken();
        return await googleapis.addRow(
            accessToken.access_token, 
            this.authData.spreadsheetId, 
            TRANSACTIONS_WORKSHEET_NAME, 
            data
        ).then(res => {
            if (res.error) {
                console.error("Failed adding row to Google Sheets:", res.error);
                throw new AppError("Failed adding row to Google Sheets.");
            }
            return res;
        });
    }

}

async function getAuthInstance(authSource, authData) {
    switch (authSource) {
        case 'google':
            if (!authData['google'])
                authData['google'] = {};
            return await GoogleAuth.new(authData['google']);
        default:
            throw new Error(`Unsupported auth source: ${authSource}`);
    }
}

async function getAuthInstances(authData) {
    const auth = {};
    for (const authSource in authData) {
        try {
            auth[authSource] = await getAuthInstance(authSource, authData);
        } catch (e) {
            console.warn(`Failed creating auth instance for source ${authSource}:`, e);
        }
    }
    return auth;
}

module.exports = {
    GoogleAuth,
    getAuthInstances,
    verifyOauthState,
    gauthHmacKey,
};



