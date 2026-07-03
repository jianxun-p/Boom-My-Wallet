export interface User {
  loaded?: boolean;
  uid: string;
  transactions?: ApiTransaction[];
  apikeys?: ApiKey[];
}

export interface ApiTransaction {
  id?: string | number;
  time?: string | number | Date;
  amount?: string | number;
  currency?: string;
  category?: string;
  merchant?: string;
  paymentMethod?: string;
  location?: string;
  latitude?: string | number;
  longitude?: string | number;
  deleted?: boolean;
  description?: string;
  imageUrl?: string;
}

export interface ApiKey {
  name: string;
  createdOn: Date;
}

// export interface GeoCoordinates {
//   longitude: number;
//   latitude: number;
//   altitude?: number;
// }

// export interface Transaction {
//   row: number;
//   time: Date;
//   category: string;
//   amount: string;
//   currency: string;
//   name: string;
//   merchant: string;
//   paymentMethod: string;
//   location: string;
//   position: GeoCoordinates;
//   description: string;
//   imageUrl?: string;
// }
