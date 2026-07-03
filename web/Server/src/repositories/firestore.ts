import {
  Firestore,
  type CollectionReference,
  type DocumentReference,
} from '@google-cloud/firestore';
import { DatabaseError } from './db.js';
import type { ICollection, IDbInitArgs, IDocData, IDocDb, IDocRef } from '@/types/db.d.ts';

export class DocRef implements IDocRef {
  docRef: DocumentReference | null;
  constructor(docRef: DocumentReference | null) {
    this.docRef = docRef;
  }

  async data() {
    return ((await this.docRef?.get()) ?? null)?.data() ?? null;
  }

  async set(data: IDocData) {
    if (this.docRef === null) throw new DatabaseError('Document does not exists');
    await this.docRef.set(data);
  }

  async update(data: IDocData) {
    if (this.docRef === null) throw new DatabaseError('Document does not exists');
    await this.docRef.update(data);
  }

  async delete() {
    if (this.docRef === null) throw new DatabaseError('Document does not exists');
    await this.docRef.delete();
  }

  async exists() {
    if (this.docRef === null) return false;
    return (await this.docRef.get()).exists;
  }
}

export class Collection implements ICollection {
  collection: CollectionReference;

  constructor(collection: CollectionReference) {
    this.collection = collection;
  }

  async doc(key: string) {
    return new DocRef(await this.collection.doc(key));
  }

  async docByField(field: string, value: unknown) {
    const snapshot = await this.collection.where(field, '==', value).limit(1).get();

    if (snapshot.empty) {
      return new DocRef(null);
    }
    return new DocRef(snapshot.docs[0]!.ref);
  }
}

export class Database implements IDocDb {
  db: Firestore;
  constructor(db: Firestore) {
    this.db = db;
  }

  collection(name: string) {
    return new Collection(this.db.collection(name));
  }
}

export async function init(args: IDbInitArgs) {
  return new Database(
    new Firestore({
      credentials: args.firestore!.gcpServiceAcntCredentials,
      projectId: args.firestore!.gcpProjectId,
    }),
  );
}
