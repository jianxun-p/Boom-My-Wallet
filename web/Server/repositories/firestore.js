export class DocRef {
    constructor(docRef) {
        this.docRef = docRef;
    }

    async data() {
        return (await this.docRef.get()).data();
    }

    async set(data) {
        return await this.docRef.set(data);
    }

    async update(data) {
        return await this.docRef.update(data);
    }

    async delete() {
        return await this.docRef.delete();
    }

    async exists() {
        return (await this.docRef.get()).exists;
    }

}

export class Collection {
    constructor(collection) {
        this.collection = collection;
    }

    async doc(key) {
        return new DocRef(await this.collection.doc(key));
    }

    async docByField(field, value) {
        const snapshot = await this.collection.where(field, '==', value).limit(1).get();
        
        if (snapshot.empty) {
            return null;
        }
        return new DocRef(snapshot.docs[0].ref);
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

export async function init(args = null) {
    return new Database(args.firebase_admin.firestore());
}


