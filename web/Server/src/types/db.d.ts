export declare class DatabaseError extends Error {}
export interface IDbInitArgs {
  mongoDb?: {
    mongoName: string;
    mongoPassword: string;
    mongoHost: string;
    mongoDbName: string;
  };
  firestore?: {
    gcpServiceAcntCredentials?: Record<string, unknown>;
    gcpProjectId?: string;
  };
}
export type IDocData = Record<string, unknown>;
export interface IDocRef {
  data: () => Promise<IDocData | null>;
  set: (data: IDocData) => Promise<void>;
  update: (data: IDocData) => Promise<void>;
  delete: () => Promise<void>;
  exists: () => Promise<boolean>;
}
export interface ICollection {
  doc: (key: string) => Promise<IDocRef>;
  docByField: (field: string, value: string) => Promise<IDocRef>;
}
export interface IDocDb {
  collection: (name: string) => ICollection;
}
export declare function database(): IDocDb;
export declare function init(args: IDbInitArgs): Promise<void>;
export interface IDbLib {
  init: (args: IDbInitArgs) => Promise<IDocDb>;
}
