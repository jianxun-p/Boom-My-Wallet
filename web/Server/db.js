
if (process.env.DB_TYPE === 'mongo') {
    module.exports = require('./db/mongo');
} else if (process.env.DB_TYPE === 'firestore') {
    module.exports = require('./db/firestore');
} else {
    throw new Error('Unsupported DB_TYPE: ' + process.env.DB_TYPE);
}
