const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
// const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const admin = require("firebase-admin");

const {User} = require('./model/user');
const auth = require('./model/auth');
const db = require('./db');
const secret = require('./secrets');
const { ApiKey } = require('./model/apikey');

const PRDOUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ?? 5000;

const app = express();
// app.use(function(req, _res, next){ console.log(`[${new Date().toISOString()} ${req.ip} ${req.originalUrl.split('?')[0]}]`); next(); });     // logs
app.use(express.static(path.join(__dirname, '..', 'Client', 'dist')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
app.set('trust proxy', 1);
app.use(session({
    secret: crypto.generateKeySync('hmac', {length: 512}),        // A strong, random string for signing the session ID cookie
    resave: false,              // Don't save session if unmodified
    saveUninitialized: false,
    rolling: true,              // Resets maxAge on each response
    cookie: { secure: PRDOUCTION, maxAge: 30 * 60000, httpOnly: true, sameSite: 'strict' } // Use secure cookies in production (requires HTTPS)
}));
app.use(function(_req, res, next){ res.header('X-Frame-Options', 'DENY'); next(); });       // reject browser embedding page in other pages

app.get('/', (_req, res) => {
    res.redirect('/index.html');
});

const GOOGLE_OAUTH_REDIRECT_PATH = "/oauth/google/callback";
app.get(GOOGLE_OAUTH_REDIRECT_PATH, async (req, res) => {
    if (req.query.error)
        return res.redirect(307, '/login?' + (new URLSearchParams(req.query)).toString());
    const redirect_uri = auth.verifyOauthState(req);
    if (!redirect_uri) {
        return res.sendStatus(401);
    }
    const body = new URLSearchParams({
        code: req.query.code,
        client_id: (await secret.get('secrets')).google_oauth.web.client_id,
        client_secret: (await secret.get('secrets')).google_oauth.web.client_secret,
        grant_type: 'authorization_code',
        redirect_uri: redirect_uri
    });
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    }).then(res => res.json());
    const id_token = jwt.decode(response?.id_token ?? "");
    const email = id_token?.email;
    const authId = id_token?.sub;
    if (!authId) {
        console.warn('bad response (missing sub in payload of response.id_token):', response);
        return res.sendStatus(401);
    }
    
    req.session.user = await User.login('google', authId).catch(e => console.error('Failed creating user instance:', e));
    await req.session.user.updateAuth({email, ...response}, 'google').catch(e => console.error('Failed updating user auth data:', e));
    res.redirect(307, '/index.html');
});

app.get('/oauth/google/access_token', (req, res) => {
    const accessToken = req.session.user?.auth?.google?.accessToken;
    const accessTokenExpiry = req.session.user?.auth?.google?.accessTokenExpiry ?? 0;
    if (!accessToken || Date.now() >= accessTokenExpiry) {
        return res.status(401).json({ error: { message: "Unauthorized" } });
    }
    return res.json({ access_token: accessToken });
});

app.get('/oauth/google/login', async (req, res) => {
    const authUri = await auth.GoogleAuth.getOauthRedirectUrl(req);
    res.redirect(307, authUri);
});

app.get('/oauth/user', async (req, res) => {
    const uid = req.session.user?.uid;
    if (!uid) {
        return res.status(401).json({ error: { message: "Unauthorized" } });
    }
    const user = {
        uid: uid,
    };
    res.json(user);
});

app.get('/api/v1/users/:uid/apikey/list', async (req, res) => {
    const uid = req.params.uid ?? req.session.user?.uid;
    if (!uid) {
        return res.status(400).json({ error: { message: "uid is required" } });
    }
   
    let docRef = null;
    try {
        docRef = (await User.apiCall(uid, req)).docRef;
    } catch (e) {
        console.error('Failed authenticating API call:', e);
        return res.sendStatus(403);
    }
    const keys = (await docRef.data()).apikeys ?? [];

    res.status(200).json({
        apikeys: keys.map(k => { return { name: k.name, createdOn: k.createdOn }; }),
    });
});

app.post('/api/v1/users/:uid/apikey', async (req, res) => {
    const uid = req.params.uid ?? req.session.user?.uid;
    if (!uid) {
        return res.status(400).json({ error: { message: "uid is required" } });
    }
    const name = (req.body?.name ?? '').toString().trim();
    if (!name) {
        return res.status(400).json({ error: { message: "name is required" } });
    }
    let docRef = null;
    try {
        docRef = (await User.apiCall(uid, req)).docRef;
    } catch (e) {
        console.error('Failed authenticating API call:', e);
        return res.sendStatus(403);
    }
    const existingApikeys = (await docRef.data()).apikeys ?? [];
    if (existingApikeys.find(k => k.name === name)) {
        return res.status(400).json({ error: { message: "API key with the same name already exists" } });
    }
    if (req.session.user?.uid) {
        req.session.user.apikeys = existingApikeys;
    }
    const newkey = ApiKey.new(name);
    const oldApikeys = [...existingApikeys];
    existingApikeys.push(newkey.object);
    await (await db.database().collection('users').doc(uid)).update({
        apikeys: existingApikeys,
    }).then(() => {
        res.status(200).json({
            message: "API key created",
            apikey: {
                name: newkey.object.name,
                createdOn: newkey.object.createdOn,
                key: newkey.key.toString('base64'),
            },
        });
    }).catch(e => {
        console.error("Failed creating API key:", e);
        if (req.session.user?.uid) {
            req.session.user.apikeys = oldApikeys;     // rollback in session
        }
        res.status(500).json({ error: { message: "Failed creating API key: " + e.message } });
    });
});

app.delete('/api/v1/users/:uid/apikey/:name', async (req, res) => {
    const uid = req.params.uid ?? req.session.user?.uid;
    const name = (req.params.name ?? '').toString().trim();
    if (!uid) {
        return res.status(400).json({ error: { message: "uid is required" } });
    } else if (!name) {
        return res.status(400).json({ error: { message: "name is required" } });
    }

    let docRef = null;
    try {
        docRef = (await User.apiCall(uid, req)).docRef;
    } catch (e) {
        console.error('Failed authenticating API call:', e);
        return res.sendStatus(403);
    }

    const oldApikeys = (await docRef.data()).apikeys ?? [];
    const newApikeys = oldApikeys.filter(k => (k.name ?? null) !== name);
    if (newApikeys.length === oldApikeys.length) {
        return res.status(404).json({ error: { message: "API key not found" } });
    }

    await docRef.update({
        apikeys: newApikeys,
    }).then(() => {
        res.status(200).json({ message: "API key deleted" });
    }).catch(e => {
        console.error("Failed deleting API key:", e);
        req.session.user.apikeys = oldApikeys;     // rollback in session
        res.status(500).json({ error: { message: "Failed deleting API key: " + e.message } });
    });
});

app.post('/api/v1/users/:uid/transaction', async (req, res) => {
    const uid = req.params.uid ?? req.session.user?.uid;
    const transaction = req.body.transaction;
    if (!transaction) 
        return res.sendStatus(400);

    let user = null;
    try {
        user = await User.apiCall(uid, req);
    } catch (e) {
        console.error('Failed authenticating API call:', e);
        return res.sendStatus(403);
    }
    const row = [
        (transaction.time ? new Date(transaction.time) : new Date()).toString(), 
        (transaction.amount ?? "").replace(/[^0-9.-]/g, ''), 
        transaction.currency ?? "", 
        transaction.category ?? "", 
        transaction.name ?? "", 
        transaction.merchant ?? "", 
        transaction.paymentMethod ?? "", 
        transaction.location ?? "", 
        transaction.latitude ?? "", 
        transaction.longitude ?? "", 
        transaction.description ?? "",
        transaction.imageUrl ?? "",
    ];
    
    const promises = [];
    const errors = [];
    for (const auth in user.auth) {
        promises.push(user.auth[auth].addRow(row).catch(e => errors.push(e)));
    }
    await Promise.all(promises);

    if (errors.length === 0) 
        return res.sendStatus(200);
    const errorMsg = errors.map(e => e.message).join('; ');
    console.error("Errors adding row:", errorMsg);
    return res.status(500).send(errorMsg);
    
});

app.put('/api/v1/users/:uid/google_sheets', async (req, res) => {
    const uid = req.params.uid ?? req.session.user.uid;
    const spreadsheetId = req.query.spreadsheetId;
    if (!spreadsheetId) {
        return res.sendStatus(400);
    }
    let docRef = null;
    try {
        docRef = (await User.apiCall(uid, req)).docRef;
    } catch (e) {
        console.error('Failed authenticating API call:', e);
        return res.sendStatus(403);
    }
    await docRef.update({
        'auth.google.spreadsheetId': spreadsheetId,
    });
    return res.sendStatus(200);
});

secret.init()
.then(async () => {
    const serviceAcnt = (await secret.get('secrets')).service_account;
    console.log('Initializing Firebase Admin SDK...');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAcnt),
    });
    console.log('Firebase Admin SDK initialized');
})
.then(async () => {
    await db.init({ firebase_admin: admin, });
})
.then(() => {
    console.log('Starting server...');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
	.on('error', e => console.error('Error starting server:', e));
});


