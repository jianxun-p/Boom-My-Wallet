import { MongoClient } from 'mongodb';


export class DocRef {
    constructor(collection, id) {
        this.collection = collection;
        this.id = id;
    }

    async data() {
        return await this.collection.findOne({ _id: this.id });
    }

    async set(data) {
        return await this.collection.replaceOne({ _id: this.id }, data, { upsert: true });
    }

    async update(data) {
        return await this.collection.updateOne({ _id: this.id }, { $set: data }, { upsert: true });
    }

    async delete() {
        return await this.collection.deleteOne({ _id: this.id });
    }

    async exists() {
        return 0 < await collection.countDocuments({ _id: this.id }, { limit: 1 });
    }

    async docByField(field, value) {
        return await this.collection.findOne({ [field]: value });
    }

}

export class Collection {
    constructor(collection) {
        this.collection = collection;
    }

    async doc(key) {
        return new DocRef(this.collection, key);
    }

}

export class Database {
    constructor(db) {
        this.db = db;
    }

    collection(name) {
        return new Collection(this.db.collection(name));
    }
}


let _mongo_client = null;

export async function init(args = null) {

    const name = args?.mongo_name ?? process.env.MONGO_USERNAME ?? 'admin';
    const password = args?.mongo_password ?? process.env.MONGO_PASSWORD ?? 'password';
    const host = args?.mongo_host ?? process.env.MONGO_HOST ?? 'localhost:27017';
    const databaseName = args?.mongo_db_name ?? process.env.MONGO_DATABASE ?? 'default';

    _mongo_client = new MongoClient(`mongodb://${name}:${password}@${host}`);
    await _mongo_client.connect();
    await _mongo_client.db('admin').command({ ping: 1 }).then(() => console.log('MongoDB connection successful'));
    return new Database(_mongo_client.db(databaseName));
}


