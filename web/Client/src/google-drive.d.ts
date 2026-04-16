

export declare class Transaction {
    row: number = -1;
    time: Date = new Date();
    category: string = '';
    amount: string = '';
    currency: string = '';
    name: string = '';
    merchant: string = '';
    paymentMethod: string = '';
    location: string = '';
    position: string = '';
    description: string = '';
    imageUrl: string | null = null;

    constructor(rowData: [], rowIndex: number);
}

