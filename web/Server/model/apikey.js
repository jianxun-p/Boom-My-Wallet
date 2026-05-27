const crypto = require('crypto');

const WORK_FACTOR = 64;
const API_KEY_LENGTH = 64;
const ENCODING = 'base64';

class ApiKey {

    constructor(name, key) {
        this.name = name;
        this.salt = crypto.randomBytes(32);
        this.hash = crypto.scryptSync(
            crypto.hash("sha256", key),
            this.salt,
            WORK_FACTOR
        );
        this.createdOn = Date.now();
        this.key = key;
    }

    static new(name) {
        return new ApiKey(name, crypto.randomBytes(API_KEY_LENGTH));
    }

    get object() {
        return {
            name: this.name,
            hash: this.hash.toString(ENCODING),
            salt: this.salt.toString(ENCODING),
            createdOn: this.createdOn,
        };
    }

    static findApiKeys(apikey, apikeys = []) {
        const keyBuf = crypto.hash("sha256", Buffer.from(apikey ?? "", ENCODING));       // TODO: check if it is contained in data breaches
        const found = apikeys.find(at => {
            if (!at.hash || !at.salt)
                return false;
            const storedHash = Buffer.from(at.hash, ENCODING);
            const storedSalt = Buffer.from(at.salt, ENCODING);
            const hashedKey = crypto.scryptSync(keyBuf, storedSalt, WORK_FACTOR);
            return keyBuf.length == storedHash.length && crypto.timingSafeEqual(storedHash, hashedKey);
        });
        return found;
    }

}



module.exports = {
    ApiKey,
};