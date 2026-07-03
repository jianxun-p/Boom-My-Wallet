export interface TransactionData {
  time: number;
  amount: number;
  currency: string;
  category: string;
  merchant: string;
  paymentMethod: string;
  location: string;
  latitude: string;
  longitude: string;
  deleted: boolean;
  description: string;
  imageUrl: string;
}

type TransactionDataKey = keyof TransactionData;

export type TransactionId = string;

export interface Transaction extends TransactionData {
  id: TransactionId;
}

export type TransactionServiceProvider = 'googleSheets';

export type TransactionServiceInfoPartial = {
  provider: TransactionServiceProvider;
  info: Record<string, unknown>;
};

export type TransactionServiceInfo = TransactionServiceInfoPartial & {
  transactionServiceId: string;
};

export interface ITransactionService {
  provider: TransactionServiceProvider;
  toTransactionServiceInfoPartial(): TransactionServiceInfoPartial;
  getTransactions(): Promise<Transaction[]>;
  appendTransactions(transactions: TransactionData[]): Promise<void>;
  updateTransactions(transactions: Transaction[]): Promise<void>;
  deleteTransactions(transactionIds: TransactionId[]): Promise<void>;
}
