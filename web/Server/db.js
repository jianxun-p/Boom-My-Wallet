
let _db_requires = {};
if (process.env.DB_TYPE === 'mongo') {
    _db_requires = require('./db/mongo');
} else if (process.env.DB_TYPE === 'firestore') {
    _db_requires = require('./db/firestore');
} else {
    throw new Error('Unsupported DB_TYPE: ' + process.env.DB_TYPE);
}

let _database = null;

function database() {
    if (!_database) {
        throw new Error('Database not initialized');
    }
    return _database;
}

async function _init(args) {
    console.log(`Initializing database (DB_TYPE: ${process.env.DB_TYPE}) ...`);
    _database = await _db_requires.init(args);
    console.log('Database initialized');
}

let _db_required = Object.assign({}, _db_requires);
module.exports = Object.assign(_db_required, {
    database,
    init: _init,
});
