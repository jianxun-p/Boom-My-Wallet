const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const path = require('path');
const config = require(path.join(__dirname, '..', 'boommywallet-config.json'));

let client = null;
const cache = new Map();

async function init() {
    if (process.env.GCP_CREDENTIALS_JSON) {
        const credentials = JSON.parse(process.env.GCP_CREDENTIALS_JSON);
        client = new SecretManagerServiceClient({credentials});
    } else {
        client = new SecretManagerServiceClient();
    }
    console.log('Initialized secrets');
}

async function get(secretName) {
    const cachedVal = cache.get(secretName);
    if (cachedVal)  return cachedVal;

    if (client === null) {
        const val = require(path.join(__dirname, '..', 'secrets', secretName + '.json'));
        cache.set(secretName, val);
        return val;
    }
    const [accessResponse] = await client.accessSecretVersion({
        name: `projects/${config.gcp.projectId}/secrets/${secretName}/versions/latest`,
    });
    const val = JSON.parse(accessResponse.payload.data.toString('utf8'));
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
