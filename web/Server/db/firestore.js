class DocRef {
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

}

class Collection {
    constructor(collection) {
        this.collection = collection;
    }

    async doc(key) {
        return new DocRef(await this.collection.doc(key));
    }

}

class Database {
    constructor(db) {
        this.db = db;
    }

    collection(name) {
        return new Collection(this.db.collection(name));
    }
}

async function init(args = null) {
    return new Database(args.firebase_admin.firestore());
}

module.exports = {
    init,
    Database,
    Collection,
    DocRef,
};

