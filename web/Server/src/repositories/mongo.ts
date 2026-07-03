import {
  MongoClient,
  ObjectId as MongoObjectId,
  type Db as MongoDb,
  type Collection as MongoCollection,
  type Document as MongoDocument,
  type Condition as MongoCondition,
} from 'mongodb';
import { DatabaseError } from './db.js';
import type { ICollection, IDbInitArgs, IDocData, IDocDb, IDocRef } from '@/types/db.d.ts';

export class DocRef implements IDocRef {
  collection: MongoCollection<MongoDocument>;
  id?: MongoCondition<MongoObjectId>;

  constructor(collection: MongoCollection<MongoDocument>, id?: string) {
    this.collection = collection;
    this.id = id === undefined ? undefined : new MongoObjectId(id);
  }

  async data() {
    if (this.id === undefined) return null;
    return await this.collection.findOne({ _id: this.id });
  }

  async set(data: IDocData) {
    if (this.id === undefined) throw new DatabaseError('Document does not exists');
    await this.collection.replaceOne({ _id: this.id }, data, { upsert: true });
  }

  async update(data: IDocData) {
    if (this.id === undefined) throw new DatabaseError('Document does not exists');
    await this.collection.updateOne({ _id: this.id }, { $set: data }, { upsert: true });
  }

  async delete() {
    if (this.id === undefined) throw new DatabaseError('Document does not exists');
    await this.collection.deleteOne({ _id: this.id });
  }

  async exists() {
    if (this.id === undefined) return false;
    return 0 < (await this.collection.countDocuments({ _id: this.id }, { limit: 1 }));
  }
}

export class Collection implements ICollection {
  collection: MongoCollection<MongoDocument>;

  constructor(collection: MongoCollection<MongoDocument>) {
    this.collection = collection;
  }

  async doc(key: string) {
    return new DocRef(this.collection, key);
  }

  async docByField(field: string, value: unknown) {
    return new DocRef(
      this.collection,
      await this.collection
        .findOne({ [field]: value })
        .then((a) => a?._id?.toString() ?? undefined),
    );
  }
}

export class Database implements IDocDb {
  db: MongoDb;

  constructor(db: MongoDb) {
    this.db = db;
  }

  collection(name: string) {
    return new Collection(this.db.collection(name));
  }
}

let _mongo_client = null;

export async function init(args: IDbInitArgs) {
  const name = args!.mongoDb!.mongoName;
  const password = args!.mongoDb!.mongoPassword;
  const host = args!.mongoDb!.mongoHost;
  const databaseName = args!.mongoDb!.mongoDbName;

  _mongo_client = new MongoClient(`mongodb://${name}:${password}@${host}`);
  await _mongo_client.connect();
  await _mongo_client
    .db('admin')
    .command({ ping: 1 })
    .then(() => console.log('MongoDB connection successful'));
  return new Database(_mongo_client.db(databaseName));
}
