
let _db_requires = {};
if (process.env.DB_TYPE === 'mongo') {
    _db_requires = await import('./mongo.js');
} else if (process.env.DB_TYPE === 'firestore') {
    _db_requires = await import('./firestore.js');
} else {
    throw new Error('Unsupported DB_TYPE: ' + process.env.DB_TYPE);
}

let _database = null;

export function database() {
    if (!_database) {
        throw new Error('Database not initialized');
    }
    return _database;
}

export async function init(args) {
    console.log(`Initializing database (DB_TYPE: ${process.env.DB_TYPE}) ...`);
    _database = await _db_requires.init(args);
    console.log('Database initialized');
}

