const express = require('express');
const crypto = require('crypto');
const path = require('path');
const admin = require("firebase-admin");
const { ApplicationsClient } = require('@google-cloud/appengine-admin').v1;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const config = require(path.join(__dirname, '..', 'boommywallet-config.json'));
const secret = require('./secrets');
const {addRow} = require('./googleapis');

const app = express();
app.use(function(req, _res, next){ console.log(`[${new Date().toISOString()} ${req.ip} ${req.originalUrl.split('?')[0]}]`); next(); });     // logs
app.use(express.static(path.join(__dirname, '..', 'Client', 'static')));
app.use(bodyParser.json());
app.use(cookieParser());

let HOST = {
    PROTOCOL: 'http',
    HOSTNAME: 'localhost',
    PORT: process.env.PORT ?? 5000,
    ADDRESS: `localhost:${process.env.PORT ?? 5000}`
};

const PRDOUCTION = process.env.NODE_ENV === 'production';


const appengineClient = new ApplicationsClient();
async function getHostname() {
    
    if (!PRDOUCTION) {    // https://docs.cloud.google.com/appengine/docs/standard/nodejs/runtime
        console.log('Host:', HOST);
        return;
    }
    // https://cloud.google.com/appengine/docs/admin-api/reference/rest/v1beta/apps/get
    const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? config.gcp.projectId;
    const [response] = await appengineClient.getApplication({
        name: `apps/${projectId}`
    });
    console.log('app engine client response', response);
    if (response.servingStatus === 'SERVING') {
        HOST.PROTOCOL = 'https';
        HOST.HOSTNAME = response.defaultHostname;
        HOST.ADDRESS = HOST.HOSTNAME;
    }
    console.log('Host:', HOST);
}


/**
 * revokes access_token or refresh_token
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke
 * @param {string} token 
 * @returns {boolean} true on success
 */
async function revokeToken(token) {
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


const gauthHmacKey = [];
crypto.generateKey('hmac', {length: 512}, (err, key) => { if (err) throw err; gauthHmacKey.push(key); })
crypto.generateKey('hmac', {length: 512}, (err, key) => { if (err) throw err; gauthHmacKey.push(key); });
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
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let cipherText = cipher.update(plaintext, 'utf8', 'hex');
    cipherText += cipher.final('hex');
    return { iv: iv.toString('hex'), cipherText: cipherText, authTag: cipher.getAuthTag().toString('hex') };
}

function aesDecrypt(cipherText, key, iv, authTag) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let plaintext = decipher.update(cipherText, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
}

const GOOGLE_OAUTH_REDIRECT_PATH = config.google_oauth.redirect_url;
app.get(GOOGLE_OAUTH_REDIRECT_PATH, async (req, res) => {
    if (req.query.error)
        res.redirect(307, '/login?' + (new URLSearchParams(req.query)).toString());
    const reqState = req.query.state;
    const statePayload = gauthHmacKey.reduceRight((acc, key) => {
        try {
            return jwt.verify(reqState, key, { algorithm: 'HS512', maxAge: 3 * 60 })
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
        redirect_uri: `${HOST.PROTOCOL}://${HOST.ADDRESS}${GOOGLE_OAUTH_REDIRECT_PATH}`
    });
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    }).then(res => res.json());
    const email = jwt.decode(response?.id_token ?? "").email;
    if (!email) {
        console.log('bad response (missing email in payload of response.id_token):', response);
        return res.sendStatus(401);
    }
    if (!response.refresh_token) {
        console.log('bad response (missing refresh_token in response):', response);
        return res.sendStatus(401);
    }
    
    // store refresh_token in db
    const docRef = database.collection('users').doc(email);
    const now = Date.now();
    const refreshTokenEncKey = (await secret.get('secrets')).refresh_token_encryption_key;
    const update = (data) => {
        if (response.refresh_token) {
            const {iv, cipherText, authTag} = aesEncrypt(response.refresh_token, Buffer.from(refreshTokenEncKey, 'hex'));
            data.auth.refresh_token = cipherText;
            data.auth.refresh_token_iv = iv;
            data.auth.refresh_token_auth_tag = authTag;
            data.auth.refresh_token_t = now;
        }
        return data;
    };
    docRef.get().then(async doc => {
        let data = {        // default for new registered users
            auth: { access_tokens: [], }, 
            register_time: now, 
            version: '1'
        };
        if (doc.exists) {
            data = doc.data();
            await revokeToken(data.auth.refresh_token);
        }
        return await docRef.set(update(data));
    });

    const cookiesOption = { maxAge: 1000 * (response.expires_in - 10), httpOnly: true, sameSite: 'strict', secure: PRDOUCTION };
    res.cookie('access_token', response.access_token, cookiesOption);
    res.cookie('id_token', response.id_token, cookiesOption);
    res.redirect(307, '/index.html');
});

app.get('/oauth/google/access_token', (req, res) => {
    if (req.cookies.access_token) {
        res.json({ access_token: req.cookies.access_token });
    } else {
        return res.status(401).json({ error: { message: "Unauthorized" } });
    }
})

const AUTH_SCOPES = [
    'openid', 
    'https://www.googleapis.com/auth/userinfo.email', 
    'https://www.googleapis.com/auth/userinfo.profile', 
    'https://www.googleapis.com/auth/drive.file'
].join(' ');
app.get('/oauth/google/login', async (req, res) => {
    const statePayload = { 
        ts: Date.now(), 
        ip: req.ip, 
        ua: req.headers['user-agent'] ,
    };
    const queryParams = new URLSearchParams({
        client_id: (await secret.get('secrets')).google_oauth.web.client_id,
        redirect_uri: `${HOST.PROTOCOL}://${HOST.ADDRESS}${GOOGLE_OAUTH_REDIRECT_PATH}`,
        response_type: 'code',
        access_type: 'offline',     // also get refresh token
        scope: AUTH_SCOPES,
        prompt: 'consent',
        state: jwt.sign(statePayload, gauthHmacKey[gauthHmacKey.length - 1], { algorithm: 'HS512', expiresIn: 9 * 60 }),    // 9 mins
    });
    const authUri = 'https://accounts.google.com/o/oauth2/v2/auth?' + queryParams.toString();
    res.cookie("google_oauth_uri", authUri, { maxAge: 10000, secure: PRDOUCTION, sameSite: true, path: '/login.html' }); // 10 sec (should be enough for client to pickup)
    res.header('X-Frame-Options', 'DENY');
    const redirectParams = (new URLSearchParams(req.query)).toString();
    res.redirect(307, `/login.html${redirectParams.length > 0 ? '?' : ''}${redirectParams}`);
});


app.post('/api/v1/transaction', async (req, res) => {
    const token = req.headers['authorization'];
    const email = req.body.email;
    const transaction = req.body.transaction;
    if (!email || !token || !transaction) 
        return res.sendStatus(400);
    const doc = await database.collection('users').doc(email).get();
    if (!doc.exists)
        return res.sendStatus(403);
    const data = doc.data();
    if (!data.auth.access_tokens.find(at => at.token === token))
        return res.sendStatus(403);
    if (!data.auth.refresh_token || !data.auth.refresh_token_iv)
        return res.sendStatus(403);
    const refreshTokenEncKey = (await secret.get('secrets')).refresh_token_encryption_key;
    const refreshToken = aesDecrypt(
        data.auth.refresh_token, 
        Buffer.from(refreshTokenEncKey, 'hex'), 
        Buffer.from(data.auth.refresh_token_iv, 'hex'),
        Buffer.from(data.auth.refresh_token_auth_tag, 'hex')
    );
    const response = await getNewAccessToken(refreshToken);
    if (!response.access_token)
        return res.sendStatus(401);
    const row = [
        (transaction.time ? new Date(transaction.time) : new Date()).toString(), 
        transaction.amount.replace(/[^0-9.-]/g, ''), 
        transaction.category, 
        transaction.name, 
        transaction.merchant, 
        transaction.paymentMethod, 
        transaction.location, 
        transaction.latitude, 
        transaction.longitude, 
        transaction.description
    ];
    const addRowRes = await addRow(response.access_token, req.body.spreadsheetId, 'transactions', row);
    if (addRowRes.error)
        return res.sendStatus(500);
    return res.sendStatus(200);
});

secret.init()
.then(getHostname)
.then(async () => {
    admin.initializeApp({
        credential: admin.credential.cert((await secret.get('secrets')).service_account),
    });
    database = admin.firestore();
})
.then(() => {
    app.listen(HOST.PORT, () => console.log(`Server running on ${HOST.PROTOCOL}://${HOST.ADDRESS}`))
	.on('error', e => console.error('Error starting server:', e));
});


