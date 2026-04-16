const { database } = require('../db');
const { ApiKey } = require('./apikey');

const { getAuthInstances } = require('./auth');

const COLLETCTION = 'users';


class User {
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
            throw new Error("Failed registering user: " + e.message);
        });
        const user = new User();
        user.init(data.uid, auth, docRef);
        return user;
    }

    static async getByUid(uid) {
        const docRef = await database().collection(COLLETCTION).doc(uid);
        if (!docRef) {
            throw new Error("User not found");
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

    static async apiCall(uid, req) {
        const docRef = await database().collection(COLLETCTION).doc(uid);
        if (!docRef) {
            throw new Error("Invalid uid");
        }
        const docData = await docRef.data();
        if (!req.session.user?.uid) {
            const apikey = req.headers['authorization'].replace(/^Bearer /g, '');
            const apiKeyObj = ApiKey.findApiKeys(apikey, docData.apikeys);
            if (!apiKeyObj) {
                throw new Error("Invalid API key");
            }
        }
        const auth = await getAuthInstances(docData.auth ?? {});
        const user = new User();
        user.init(docData.uid, auth, docRef);
        return user;
    }

    async updateAuth(authData, authSource = null) {
        const docData = await this.docRef.data();
        
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
        await this.docRef.set(this.data);
    }

}

module.exports = {
    User,
};
