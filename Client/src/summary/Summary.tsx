import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useEffect } from 'react';
import { type Spreadsheet } from '../google-drive';
import './summary.css';

const TRANSACTION_SHEET_NAME = 'transactions';

interface Transaction {
    row: number,
    time: Date,
    amount: string,
    category: string,
    name: string,
    merchant: string,
    paymentMethod: string,
    location: string,
    position: string,
    description: string,
};
// type TransactionStringField = 'amount' | 'category' | 'name' | 'merchant' | 'paymentMethod' | 'location' | 'position' | 'description';

interface State<T> {
    get: T,
    set: Dispatch<SetStateAction<T>>
};

// interface DaySummary {
//     debit: number,
//     credit: number,
//     net: number,
//     accDebit: number,
//     accCrebit: number,
//     accNet: number,
// };

export default function Summary(props: {spreadsheet: State<Spreadsheet>, accessToken: string}) {
    const [_transactions, setTransactions] = useState<Transaction[]>([]);
    const transactionSheet = useMemo(
        () => props.spreadsheet.get.sheets.filter(sheet => sheet.name === TRANSACTION_SHEET_NAME)[0] ?? {name: TRANSACTION_SHEET_NAME, columns: [], values: []}, 
        [props.spreadsheet.get.sheets]
    );
    useEffect(() => {
        const columnIndex = new Map(transactionSheet.columns.map((column, i) => [column, i]));
        const t = transactionSheet.values.map((row, rowI) => {
            return {
                row: rowI,
                time: new Date(row[columnIndex.get('Time') ?? -1]),
                amount: (row[columnIndex.get('Amount') ?? -1] ?? '').toString(),
                category: (row[columnIndex.get('Category') ?? -1] ?? '').toString(),
                name: (row[columnIndex.get('Name') ?? -1] ?? '').toString(),
                merchant: (row[columnIndex.get('Merchant') ?? -1] ?? '').toString(),
                paymentMethod: (row[columnIndex.get('PaymentMethod') ?? -1] ?? '').toString(),
                location: (row[columnIndex.get('Location') ?? -1] ?? '').toString(),
                position: (row[columnIndex.get('Latitude') ?? -1] ?? '').toString() + ', ' + (row[columnIndex.get('Longitude') ?? -1] ?? '').toString(),
                description: (row[columnIndex.get('Description') ?? -1] ?? '').toString(),
            };
        }).sort((a, b) => b.time.valueOf() - a.time.valueOf());     // most recent to oldest
        setTransactions(t);
    }, [props.spreadsheet.get, setTransactions, transactionSheet]);
}