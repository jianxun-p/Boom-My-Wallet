import { AppError, UnAuthError } from './apperror.js';
import * as database from '../repositories/db.js';
import { ApiKey } from '../model/apikey.js';
import * as jwt from 'jsonwebtoken';

import { getAuthInstances } from '../utils/auth.js';

const COLLETCTION = 'users';

export class User {
    init(uid, auth, docRef) {
        this.uid = uid;
        this.auth = auth;
        this.docRef = docRef;
    }

    static async register(authSource, authId) {
        const data = {
            uid: crypto.randomUUID(),
            apikeys: [],
            auth: {
                [authSource]: {
                    authId: authId,
                }
            },
            register_time: Date.now(),
            version: '1'
        };
        const auth = await getAuthInstances(data.auth);
        const docRef = await database().collection(COLLETCTION).doc(data.uid);
        await docRef.set(data).then(() => {
            console.log("User registered with uid:", data.uid);
        }).catch(e => {
            console.error("Failed registering user:", e);
            throw new AppError("Failed to register user.");
        });
        const user = new User();
        user.init(data.uid, auth, docRef);
        return user;
    }

    static async getByUid(uid) {
        const docRef = await database().collection(COLLETCTION).doc(uid);
        if (!docRef) {
            throw new UnAuthError();
        }
        const docData = await docRef.data();
        const auth = await getAuthInstances(docData.auth ?? {});
        const user = new User();
        user.init(docData.uid, auth, docRef);
        user.apikeys = docData.apikeys || [];
        return user;
    }

    static async login(authSource, authId) {
        const docRef = await database().collection(COLLETCTION).docByField('auth.google.authId', authId);
        if (!docRef) {
            return await this.register(authSource, authId);
        }
        const docData = await docRef.data();
        const auth = await getAuthInstances(docData.auth ?? {});
        const user = new User();
        user.init(docData.uid, auth, docRef);
        user.apikeys = docData.apikeys || [];
        return user;
    }

    static async apiCall(uid, req, sessionSecret) {
        const docRef = await database().collection(COLLETCTION).doc(uid);
        if (!docRef) {
            throw new UnAuthError();
        }
        const docData = await docRef.data();
        if (!docData) {
            throw new UnAuthError();
        }
        let verified = false;

        try {
            const tokenPayload = jwt.verify(req.headers['token'] ?? '', sessionSecret ?? Buffer.empty);
            verified = tokenPayload?.uid === uid;
        } catch { }
        if (Boolean(req.headers['token']) && !verified) {
            throw new UnAuthError("Bad Boy ~ Don't try to hack us ~");
        }

        if (!verified) {
            const apikey = req.headers['authorization']?.replace(/^Bearer /g, '');
            const apiKeyObj = ApiKey.findApiKeys(apikey, docData.apikeys);
            if (!apiKeyObj) {
                throw new UnAuthError();
            }
        }
        const auth = await getAuthInstances(docData.auth ?? {});
        const user = new User();
        user.init(docData.uid, auth, docRef);
        return user;
    }

    async updateAuth(authData, authSource = null) {
        const docRef = await database().collection(COLLETCTION).doc(this.uid);
        const docData = await docRef.data();
        
        this.data = Object.assign({        // default for new registered users
            apikeys: [],
            auth: { },
            register_time: Date.now(), 
            version: '1'
        }, docData);

        if (authSource) {
            this.data.auth[authSource] = this.auth[authSource].updateAuthData(authData);
        } else {
            for (const authSource in this.auth) {
                this.data.auth[authSource] = this.auth[authSource].updateAuthData(authData);
            }
        }
        await docRef.set(this.data).catch(e => {
            console.error("Failed updating user auth data:", e);
            throw new AppError("Failed updating user authentication information.");
        });
    }

}
