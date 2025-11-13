const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const path = require('path');
const config = require(path.join(__dirname, '..', 'boommywallet-config.json'));

let client = null;
const cache = new Map();

function initProduction() {
    client = new SecretManagerServiceClient();
}

function initDevelopment() {
    
}

async function init() {
    if (process.env.NODE_ENV === 'production') {
        initProduction(...arguments);
    } else {
        initDevelopment(...arguments);
    }
    console.log('Initialized secrets');
}

async function get(secretName) {
    const cachedVal = cache.get(secretName);
    if (cachedVal)  return cachedVal;

    if (process.env.NODE_ENV !== 'production') {
        const val = require(path.join(__dirname, '..', 'secrets', secretName + '.json'));
        cache.set(secretName, val);
        return val;
    }
    const [accessResponse] = await client.accessSecretVersion({
        name: `projects/${config.gcp.projectName}/secrets/${secretName}/versions/latest`,
    });
    const val = accessResponse.payload.data.toString('utf8');
    cache.set(secretName, val);
    return val;
}

async function clearCache() {
    cache.clear();
}

module.exports = { 
    init,
    clearCache,
    get
};
