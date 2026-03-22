const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const admin = require("firebase-admin");
const { ApplicationsClient } = require('@google-cloud/appengine-admin').v1;
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const config = require(path.join(__dirname, '..', 'boommywallet-config.json'));
const secret = require('./secrets');
const {addRow} = require('./googleapis');

let HOST = {
    PORT: process.env.PORT,
};

const PRDOUCTION = process.env.NODE_ENV === 'production';

const app = express();
// app.use(function(req, _res, next){ console.log(`[${new Date().toISOString()} ${req.ip} ${req.originalUrl.split('?')[0]}]`); next(); });     // logs
app.use(express.static(path.join(__dirname, '..', 'Client', 'static')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('trust proxy', 1);
app.use(session({
    secret: crypto.generateKeySync('hmac', {length: 512}),        // A strong, random string for signing the session ID cookie
    resave: false,              // Don't save session if unmodified
    saveUninitialized: false,
    rolling: true,              // Resets maxAge on each response
    cookie: { secure: PRDOUCTION, maxAge: 30 * 60000, httpOnly: true, sameSite: 'strict' } // Use secure cookies in production (requires HTTPS)
}));
app.use(function(_req, res, next){ res.header('X-Frame-Options', 'DENY'); next(); });       // reject browser embedding page in other pages


const INSECURE_KEY = crypto.generateKeySync('hmac', {length: 32});


const appengineClient = new ApplicationsClient();
async function getHostname() {
    HOST.URL = process.env.APP_URL;
    if (HOST.URL)
        return;
    // https://cloud.google.com/appengine/docs/admin-api/reference/rest/v1beta/apps/get
    const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? config.gcp.projectId;
    const [response] = await appengineClient.getApplication({
        name: `apps/${projectId}`
    });
    if (response.servingStatus === 'SERVING') {
        HOST.URL = "https://" + HOST.HOSTNAME;
    }
}


/**
 * revokes access_token or refresh_token
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke
 * @param {string | null} token 
 * @returns {boolean} true on success
 */
async function revokeToken(token) {
    if (!token) {
        return true;
    }
    return await fetch ('https://oauth2.googleapis.com/revoke?' + new URLSearchParams({token: token}).toString(), {
        method: 'POST',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
    })
    .then(res => res.ok);
}

/**
 * https://developers.google.com/identity/protocols/oauth2/web-server#offline
 * @param {string} refreshToken 
 * @returns 
 */
async function getNewAccessToken(refreshToken) {
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


app.get('/', (_req, res) => {
    res.redirect('/index.html');
});


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

function aesEncrypt(plaintext, key) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let cipherText = cipher.update(plaintext, 'utf8', 'base64');
    cipherText += cipher.final('base64');
    return { iv: iv.toString('base64'), cipherText: cipherText, authTag: cipher.getAuthTag().toString('base64') };
}

function aesDecrypt(cipherText, key, iv, authTag) {
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        let plaintext = decipher.update(cipherText, 'base64', 'utf8');
        plaintext += decipher.final('utf8');
        return plaintext;
    } catch (e) {
        return null;
    }
}




const REQUIRED_AUTH_SCOPES = [
    'openid', 
    'https://www.googleapis.com/auth/userinfo.email', 
    'https://www.googleapis.com/auth/userinfo.profile', 
    'https://www.googleapis.com/auth/drive.file'
];
const AUTH_SCOPES = REQUIRED_AUTH_SCOPES.join(' ');
async function getOauthRedirectUrl(req) {
    const statePayload = { 
        ts: Date.now(), 
        ip: req.ip, 
        ua: req.headers['user-agent'] ,
    };
    const queryParams = new URLSearchParams({
        client_id: (await secret.get('secrets')).google_oauth.web.client_id,
        redirect_uri: `${HOST.URL}${GOOGLE_OAUTH_REDIRECT_PATH}`,
        response_type: 'code',
        access_type: 'offline',     // also get refresh token
        scope: AUTH_SCOPES,
        prompt: 'consent',
        state: jwt.sign(statePayload, gauthHmacKey[gauthHmacKey.length - 1], { algorithm: 'HS512', expiresIn: 2 * 60 }),    // 2 mins
    });
    return 'https://accounts.google.com/o/oauth2/v2/auth?' + queryParams.toString();
}


const GOOGLE_OAUTH_REDIRECT_PATH = config.google_oauth.redirect_url;
app.get(GOOGLE_OAUTH_REDIRECT_PATH, async (req, res) => {
    if (req.query.error)
        return res.redirect(307, '/login?' + (new URLSearchParams(req.query)).toString());
    const reqState = req.query.state;
    const statePayload = gauthHmacKey.reduceRight((acc, key) => {
        try {
            return jwt.verify(reqState, key, { algorithm: 'HS512', maxAge: 2 * 60 })
        } catch (e) {
            return acc;
        }
    }, null);
    if (statePayload === null || statePayload.ip !== req.ip || statePayload.ua !== req.headers['user-agent']) {
        console.warn('bad state payload for oauth', GOOGLE_OAUTH_REDIRECT_PATH, statePayload);
        return res.sendStatus(401);
    }
    const body = new URLSearchParams({
        code: req.query.code,
        client_id: (await secret.get('secrets')).google_oauth.web.client_id,
        client_secret: (await secret.get('secrets')).google_oauth.web.client_secret,
        grant_type: 'authorization_code',
        redirect_uri: `${HOST.URL}${GOOGLE_OAUTH_REDIRECT_PATH}`
    });
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    }).then(res => res.json());
    const id_token = jwt.decode(response?.id_token ?? "");
    const email = id_token.email;
    const uid = id_token.sub;
    if (!uid) {
        console.warn('bad response (missing sub in payload of response.id_token):', response);
        return res.sendStatus(401);
    }
    req.session.email = email;
    req.session.uid = uid;
    if (response.refresh_token) 
        req.session.refreshToken = response.refresh_token;
    if (response.access_token)
        req.session.accessToken = jwt.sign({accessToken: response.access_token}, INSECURE_KEY, {expiresIn: response.expires_in - 10});
    if (response.id_token)
        req.session.idToken = jwt.sign({idToken: response.id_token}, INSECURE_KEY);
    
    // store refreshToken to db
    if (response.refresh_token) {
        const docRef = await database.collection('users').doc(uid);
        const now = Date.now();
        const refreshTokenEncKey = (await secret.get('secrets')).refresh_token_encryption_key;
        const update = (data) => {
            if (response.refresh_token) {
                const {iv, cipherText, authTag} = aesEncrypt(response.refresh_token, Buffer.from(refreshTokenEncKey, 'base64'));
                data.auth = Object.assign(data.auth ?? {}, {
                    refresh_token: cipherText,
                    refresh_token_iv: iv,
                    refresh_token_auth_tag: authTag,
                    refresh_token_t: now,
                });
            }
            return data;
        };
        const docData = await docRef.data();
        let data = {        // default for new registered users
            email: email,
            auth: { access_tokens: [], }, 
            register_time: now, 
            version: '1'
        };
        if (docData !== null) {
            data = docData;
            await revokeToken(data.auth.refresh_token);
        }
        await docRef.set(update(data));
    }

    res.redirect(307, '/index.html');
});

app.get('/oauth/google/access_token', (req, res) => {
    try {
        const payload = jwt.verify(req.session.accessToken, INSECURE_KEY);
        return res.json({ access_token: payload.accessToken });
    } catch (_) {
        return res.status(401).json({ error: { message: "Unauthorized" } });
    }
});


app.get('/oauth/google/login', async (req, res) => {
    const authUri = await getOauthRedirectUrl(req);
    res.redirect(307, authUri);
});


app.get('/api/v1/account', async (req, res) => {
    const acnt = {
        email: req.session.email,
        uid: req.session.uid,
    };
    res.json(acnt);
});


app.post('/api/v1/transaction', async (req, res) => {
    const token = req.headers['authorization'];
    const uid = req.body.uid;
    const transaction = req.body.transaction;
    if (!uid || !token || !transaction) 
        return res.sendStatus(400);
    const doc = await database.collection('users').doc(uid);
    if (!doc.exists)
        return res.sendStatus(403);
    const data = doc.data();
    const tokenBuf = crypto.hash("sha256", Buffer.from(token, 'base64'));       // TODO: check if it is contained in data breaches
    const foundAccessToken = data.auth.access_tokens.find(at => {
        if (!at.hash || !at.salt)
            return false;
        const storedHash = Buffer.from(at.hash, 'base64');
        const storedSalt = Buffer.from(at.salt, 'base64');
        const hashedToken = crypto.scryptSync(tokenBuf, storedSalt, 64);
        return tokenBuf.length == storedHash.length && crypto.timingSafeEqual(storedHash, hashedToken);
    });
    if (!foundAccessToken)
        return res.sendStatus(403);
    if (!data.auth.refresh_token || !data.auth.refresh_token_iv || !data.auth.refresh_token_auth_tag)
        return res.sendStatus(403);
    const refreshTokenEncKey = (await secret.get('secrets')).refresh_token_encryption_key;
    const refreshToken = aesDecrypt(
        data.auth.refresh_token, 
        Buffer.from(refreshTokenEncKey, 'base64'), 
        Buffer.from(data.auth.refresh_token_iv, 'base64'),
        Buffer.from(data.auth.refresh_token_auth_tag, 'base64')
    );
    if (!refreshToken)
        return res.sendStatus(500);
    const response = await getNewAccessToken(refreshToken);
    if (!response.access_token)
        return res.sendStatus(401);
    const row = [
        (transaction.time ? new Date(transaction.time) : new Date()).toString(), 
        transaction.amount.replace(/[^0-9.-]/g, ''), 
        transaction.currency, 
        transaction.category, 
        transaction.name, 
        transaction.merchant, 
        transaction.paymentMethod, 
        transaction.location, 
        transaction.latitude, 
        transaction.longitude, 
        transaction.description
    ];
    if (!data?.googleSheets?.spreadsheetId)
        return res.sendStatus(400);
    const addRowRes = await addRow(response.access_token, data.googleSheets.spreadsheetId, 'transactions', row);
    if (addRowRes.error)
        return res.sendStatus(500);
    return res.sendStatus(200);
});

app.put('/api/v1/google_sheets', async (req, res) => {
    const uid = req.session.uid;
    const spreadsheetId = req.query.spreadsheetId;
    const folderId = req.query.folderId || null;
    if (!uid || !spreadsheetId) {
        return res.sendStatus(400);
    }
    const docRef = await database.collection('users').doc(uid);
    await docRef.update({
        'googleSheets': {
            'spreadsheetId': spreadsheetId,
            'folderId': folderId,
        }
    });
    return res.sendStatus(200);
});

secret.init()
.then(getHostname)
.then(async () => {
    admin.initializeApp({
        credential: admin.credential.cert((await secret.get('secrets')).service_account),
    });
    database = await require("./db").init({
        firebase_admin: admin,
    });
})
.then(() => {
    app.listen(HOST.PORT, () => console.log(`Server running on ${HOST.URL}`))
	.on('error', e => console.error('Error starting server:', e));
});


