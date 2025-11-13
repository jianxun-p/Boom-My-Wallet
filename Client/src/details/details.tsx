import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useEffect } from 'react';
import { deleteRow, updateValues } from '../google-drive';
import { rangeA1 } from '../google-drive';
import { type Spreadsheet } from '../google-drive';
import '/style.css';
import './details.css';

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

function newEmptyTransaction(row?: number): Transaction {
    return { row: row ?? -1, time: new Date(), amount: '0', category: '', name: '', merchant: '', paymentMethod: '', location: '', position: '', description: '', };
}

function cloneTransaction(transaction: Transaction | null): Transaction {
    if (!transaction) return newEmptyTransaction();
    return {
        row: transaction.row,
        time: transaction.time,
        amount: transaction.amount,
        category: transaction.category,
        name: transaction.name,
        merchant: transaction.merchant,
        paymentMethod: transaction.paymentMethod,
        location: transaction.location,
        position: transaction.position,
        description: transaction.description,
    };
}

function HeaderRow() {
    return <div className='transaction-header-row'>
        <div className='transaction-item-time'>Time</div>
        <div className='transaction-item-merchant'>Merchant</div>
        <div className='transaction-item-category'>Category</div>
        <div className='transaction-item-amount text-right'>Amount</div>
    </div>;
}

function Entry({transaction, transactionDetail}: {transaction: Transaction, transactionDetail: State<Transaction | null>}) {
    const t = transaction.time;
    const timeStr = `${t.getFullYear()}-${(t.getMonth()+1).toString().padStart(2, "0")}-${t.getDate().toString().padStart(2, "0")}   ${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}:${t.getSeconds().toString().padStart(2, "0")}`;
    return <div className='transaction-item' onClick={() => transactionDetail.set(transaction)}>
        <div className='transaction-item-time'>{timeStr}</div>
        <div className='transaction-item-merchant'>{transaction.merchant}</div>
        <div className='transaction-item-category'>{transaction.category}</div>
        <div className='transaction-item-amount text-right'>{formatMoney(transaction.amount)}</div>
    </div>;
}

interface Displayable {
    toString: () => string,
}

interface State<T> {
    get: T,
    set: Dispatch<SetStateAction<T>>
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function DropDownList(props: { list: Displayable[], val: State<string>, dropdownRef: React.RefObject<HTMLDivElement[]>, noInput: boolean, allowChoose: boolean }) {
    const [open, setOpen] = useState(false);
    const className = `dropdown-container`;
    return <div className={className}>
        <input className='dropdown' value={props.val.get} readOnly={props.noInput} onChange={(e) => props.val.set(e.target.value)} onClick={() => setOpen(prev => !prev)}/>
        <div className={open && props.allowChoose ? 'dropdown-list' : 'dropdown-list hidden'} ref={e => { if (e) props.dropdownRef.current.push(e)}}>
            {props.list.map(i => {return <div className='dropdown-list-item' onClick={()=>{props.val.set(i.toString());setOpen(false);}}>{i.toString()}</div>;})}
        </div>
    </div>
}


function DatetimeSelector(props: { date: State<Date | null>, dropdownRef: React.RefObject<HTMLDivElement[]>, noInput: boolean, allowChoose: boolean }) {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear().toString().padStart(2,'0'));
    const [month, setMonth] = useState(MONTHS[now.getMonth()].padStart(2,'0'));
    const [day, setDay] = useState(now.getDate().toString().padStart(2,'0'));
    const [hour, setHour] = useState(now.getHours().toString().padStart(2,'0'));
    const [minute, setMinute] = useState(now.getMinutes().toString().padStart(2,'0'));
    const [second, setSecond] = useState(now.getSeconds().toString().padStart(2,'0'));
    const filteredSetNum = function (setFunc: Dispatch<SetStateAction<string>>) {
        return (n: SetStateAction<string>) => {
            if (typeof(n) === 'string')
                return setFunc(n.replace(/[^0-9]/g, '').replace(/^0+/g, '')); // numbers does not start in 0s
            const newF = (prev: string) => n(prev).replace(/[^0-9]/g, '').replace(/^0+/g, '');
            return setFunc(newF);
        };
    };
    const setDate: Dispatch<SetStateAction<Date | null>> = props.date.set;
    useEffect(() => {
        try { setDate(new Date(`${month} ${day} ${year} ${hour}:${minute}:${second}`)); } finally {;}
    }, [year, month, day, hour, minute, second, setDate]);
    return <div className='date-selector-container'>
        <div className='w-[17%] text-center'><DropDownList list={[2025, 2024, 2023]} val={{get: year, set: filteredSetNum(setYear)}} dropdownRef={props.dropdownRef} noInput={props.noInput} allowChoose={props.allowChoose} /></div>
        <b className=' mx-1'>-</b><div className='w-[15%] text-center'><DropDownList list={MONTHS} val={{get: month, set: setMonth}} dropdownRef={props.dropdownRef} noInput={props.noInput} allowChoose={props.allowChoose} /></div>
        <b className=' mx-1'>-</b><div className='w-[13%] text-center'><DropDownList list={[...Array(31).keys()].map(i=>i+1).map(i=>i.toString().padStart(2,'0'))} val={{get: day, set: filteredSetNum(setDay)}} dropdownRef={props.dropdownRef} noInput={props.noInput} allowChoose={props.allowChoose} /></div>
        <div className='mx-auto'></div>
        <div className='w-[13%] text-center'><DropDownList list={[...Array(24).keys()].map(i=>i.toString().padStart(2,'0'))} val={{get: hour, set: filteredSetNum(setHour)}} dropdownRef={props.dropdownRef} noInput={props.noInput} allowChoose={props.allowChoose} /></div>
        <b className=' mx-1'>:</b><div className='w-[13%] text-center'><DropDownList list={[...Array(60).keys()].map(i=>i.toString().padStart(2,'0'))} val={{get: minute, set: filteredSetNum(setMinute)}} dropdownRef={props.dropdownRef} noInput={props.noInput} allowChoose={props.allowChoose} /></div>
        <b className=' mx-1'>:</b><div className='w-[13%] text-center'><DropDownList list={[...Array(60).keys()].map(i=>i.toString().padStart(2,'0'))} val={{get: second, set: filteredSetNum(setSecond)}} dropdownRef={props.dropdownRef} noInput={props.noInput} allowChoose={props.allowChoose} /></div>
    </div>;
}

function formatMoney(amount: string): string {
    const splitted = amount.split('.');
    const [n, f] = [splitted[0].replace(/[^0-9-]/g, ''), (splitted[1] ?? '').replace(/[^0-9]/g, '')];
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    });
    const formattedAmount = formatter.format(BigInt(n)) + '.' + (f.substring(0, Math.min(2, f.length)) ?? '').padStart(2, '0');
    return formattedAmount;
}




function DetailModal(props: {transaction: State<Transaction | null>, spreadsheet: State<Spreadsheet>, accessToken: string}) {

    const modalContentRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement[]>([]);
    const amountRef = useRef<HTMLInputElement>(null);
    const [date, setDate] = useState<Date | null>(null);
    const [amount, setAmount] = useState<string>(formatMoney(props.transaction.get?.amount ?? "0"));
    const [editMode, setEditMode] = useState(false);
    useEffect(() => { setAmount(formatMoney(props.transaction.get?.amount ?? "0")) }, [props.transaction]);
    const transactionSheet = useMemo(
        () => props.spreadsheet.get.sheets.filter(sheet => sheet.name === TRANSACTION_SHEET_NAME)[0] ?? {name: TRANSACTION_SHEET_NAME, columns: [], values: []}, 
        [props.spreadsheet.get.sheets]
    );

    function closeWhenClickOutside(e: React.MouseEvent) {
        if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node))
            props.transaction.set(null);   // clicked outside of contentRef.current, close modal
    }
    function closeDropdownClickOutside(refs: React.RefObject<HTMLDivElement[]>) {
        return (e: React.MouseEvent) => {
            refs.current.forEach((ele: HTMLDivElement) => {
                if (!ele.contains(e.target as Node))
                    ele.classList.add('hidden');
            });
        };
    }
    
    
    function restrictMoneyInput(amount: string): string {
        const arr = amount.replace(/[^0-9.-]/g, '').split('.');
        const [i, f] = [arr[0], arr[1] ?? ''];
        const n = BigInt(i);
        return n + '.' + f.substring(0, Math.min(2, f.length)).padStart(2, '0');
    }
    function formatMoneyClickOutside(e: React.MouseEvent) {
        if (amountRef.current && !(amountRef.current as Node).contains(e.target as Node)) {
            props.transaction.set((prev: Transaction | null) => {
                if (prev === null) return null;
                const newTran = cloneTransaction(prev);
                try {
                    newTran.amount = restrictMoneyInput((amountRef.current as HTMLInputElement).value);
                } catch {
                    return prev;
                }
                return newTran;
            });
        }
    }
    function chainMouseEventFuncCals(funcs: ((e: React.MouseEvent) => void)[]) {
        return (e: React.MouseEvent) => { funcs.forEach(f => f(e)); };
    }
    

    useEffect(()=>{ setAmount(editMode ? restrictMoneyInput : formatMoney); }, [editMode]);
    const setAmountHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmount((prev: string) => {
            try {
                const newAmount = e.target.value.replace(/[^0-9.-]/g, '').replace('$', '');
                return newAmount
            } catch {
                return prev;
            }
        });
    };
    const setCategoryHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        props.transaction.set((prev: Transaction | null) => {
            const newTran = cloneTransaction(prev);
            newTran.category = e.target.value;
            return newTran;
        });
    };
    const setMerchantHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        props.transaction.set((prev: Transaction | null) => {
            const newTran = cloneTransaction(prev);
            newTran.merchant = e.target.value;
            return newTran;
        });
    };
    const setPaymentMethodHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        props.transaction.set((prev: Transaction | null) => {
            const newTran = cloneTransaction(prev);
            newTran.paymentMethod = e.target.value;
            return newTran;
        });
    };
    const setLocationHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        props.transaction.set((prev: Transaction | null) => {
            const newTran = cloneTransaction(prev);
            newTran.location = e.target.value;
            return newTran;
        });
    };
    const setPositionHandler = (e: React.ChangeEvent< HTMLInputElement>) => {
        props.transaction.set((prev: Transaction | null) => {
            const newTran = cloneTransaction(prev);
            newTran.position = e.target.value;
            return newTran;
        });
    };
    const setDescriptionHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        props.transaction.set((prev: Transaction | null) => {
            const newTran = cloneTransaction(prev);
            newTran.description = e.target.value;
            return newTran;
        });
    };
    function saveTransactionDetail(v: Transaction | null) {
        if (v === null) return null;
        const position = v.position.split(',');
        const row = [(date ?? new Date()).toString(), restrictMoneyInput(amount), v.category, v.name, v.merchant, v.paymentMethod, v.location, position[0].trim(), (position[1]??'').trim(), v.description];
        props.spreadsheet.set((spread) => {
            const sheetIndex = spread.sheets.findIndex(sheet => sheet.name === TRANSACTION_SHEET_NAME);
            if (sheetIndex < 0) {
                console.error(`Cannot update sheet "${TRANSACTION_SHEET_NAME}"`);
                return spread;
            }
            spread.sheets[sheetIndex].values[(v as Transaction).row] = row;
            return {
                id: spread.id,
                name: spread.name,
                sheets: spread.sheets,
            };
        });
        updateValues(props.accessToken, props.spreadsheet.get.id, rangeA1(TRANSACTION_SHEET_NAME, [0, v.row+1], [row.length-1,v.row+1]), [row]);
        return v;
    }
    function deleteTransaction(v: Transaction | null) {
        if (v === null) return null;
        props.spreadsheet.set((spread) => {
            const sheetIndex = spread.sheets.findIndex(sheet => sheet.name === TRANSACTION_SHEET_NAME);
            if (sheetIndex < 0) {
                console.error(`Cannot update sheet "${TRANSACTION_SHEET_NAME}"`);
                return spread;
            }
            spread.sheets[sheetIndex].values = spread.sheets[sheetIndex].values.filter((_, i) => i !== (v as Transaction).row);
            return {
                id: spread.id,
                name: spread.name,
                sheets: spread.sheets,
            };
        });
        deleteRow(props.accessToken, props.spreadsheet.get.id, transactionSheet.id, (v.row ?? 0) + 1)
        return v;
    }
    return <div className='modal' {...(props.transaction.get !== null && {open: props.transaction.get !== null})} onClick={chainMouseEventFuncCals([formatMoneyClickOutside, closeWhenClickOutside, closeDropdownClickOutside(dropdownRef)])}>
        <div className='modal-content' ref={modalContentRef}>
            <div className='flex flex-row justify-between items-center'>
                <h1>Details</h1>
                <button className='bg-blue-200 hover:bg-blue-300 w-auto' onClick={() => setEditMode(prev=>!prev)}>{editMode ? 'Done' : 'Edit'}</button>
            </div>
            <div className='grid grid-cols-4 items-center gap-y-1'>
                <strong>Datetime</strong>
                <div className='col-span-3'><DatetimeSelector date={{get: date, set: setDate}} dropdownRef={dropdownRef} noInput={!editMode} allowChoose={editMode} /></div>
                <strong>Amount</strong>
                <div className='col-span-3'><input readOnly={!editMode} value={amount} onChange={setAmountHandler} ref={amountRef} /></div>
                <strong>Category</strong>
                <div className='col-span-3'><input readOnly={!editMode} value={props.transaction.get?.category ?? ''} onChange={setCategoryHandler} /></div>
                <strong>Merchant</strong>
                <div className='col-span-3'><input readOnly={!editMode} value={props.transaction.get?.merchant ?? ''} onChange={setMerchantHandler} /></div>
                <strong>Payment Method</strong>
                <div className='col-span-3'><input readOnly={!editMode} value={props.transaction.get?.paymentMethod ?? ''} onChange={setPaymentMethodHandler} /></div>
                <strong>Location</strong>
                <div className='col-span-3'><input readOnly={!editMode} value={props.transaction.get?.location ?? ''} onChange={setLocationHandler} /></div>
                <strong>Position</strong>
                <div className='col-span-3'><input readOnly={!editMode} value={props.transaction.get?.position ?? ''} onChange={setPositionHandler} /></div>
                <strong className='col-span-4'>Description</strong>
                <div className='col-span-4 **self-start**'><textarea readOnly={!editMode} value={props.transaction.get?.description ?? ''} onChange={setDescriptionHandler} className='h-60 resize-none'/></div>
            </div>
            <div className='left-0 bottom-0 absolute w-full p-6 flex justify-between'>
            <div className='flex justify-start'>
                <button onClick={()=>{deleteTransaction(props.transaction.get);props.transaction.set(null);}} className='w-auto mx-2 bg-red-400 hover:bg-red-500'>Delete</button>
            </div>
            <div className='flex justify-end'>
                <button onClick={()=>{saveTransactionDetail(props.transaction.get);props.transaction.set(null);}} className='w-auto mx-2 bg-green-300 hover:bg-green-400'>Save</button>
                <button onClick={()=>props.transaction.set(null)} className='w-auto mx-2 bg-green-100 hover:bg-green-200'>Cancel</button>
            </div>
            </div>
        </div>
    </div>;
}

export default function Details({spreadsheet, accessToken}: {spreadsheet: State<Spreadsheet>, accessToken: string}) {
    const [transactionsByMonth, setTransactionsByMonth] = useState<Transaction[][]>([]);
    const transactionSheet = useMemo(
        () => spreadsheet.get.sheets.filter(sheet => sheet.name === TRANSACTION_SHEET_NAME)[0] ?? {name: TRANSACTION_SHEET_NAME, columns: [], values: []}, 
        [spreadsheet.get.sheets]
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
        const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
        const tByMonth = [];
        for (let i = 0; i < t.length; ) {
            const j = t[i].time;
            const monthlyTransactions = [];
            for (; i < t.length && isSameMonth(t[i].time, j); ++i)
                monthlyTransactions.push(t[i]);
            tByMonth.push(monthlyTransactions);
        }
        setTransactionsByMonth(tByMonth);
    }, [spreadsheet.get, setTransactionsByMonth, transactionSheet]);

    const [transactionDetail, setTransactionDetail] = useState<Transaction | null>(null);

    return <>
    <DetailModal transaction={{get: transactionDetail, set: setTransactionDetail}} spreadsheet={spreadsheet} accessToken={accessToken} />
    <div className='add-transaction-btn' onClick={() => setTransactionDetail(newEmptyTransaction(transactionSheet.values.length))}>➕</div>
    <div className='transaction-wrapper'>
        <h1 className='transaction-header text-center pb-0 pt-8'>Details</h1>
        {transactionsByMonth.map(monthlyTransactions => {
            const month = `${monthlyTransactions[0].time.getFullYear()} ${MONTHS[monthlyTransactions[0].time.getMonth()]}`;
            return <section>
            <h2 className='transaction-header'>{month}</h2>
                <div className='transaction-content'>
                    <HeaderRow />
                    {monthlyTransactions.map(transaction => <Entry transaction={transaction} transactionDetail={{get: transactionDetail, set: setTransactionDetail}} />)}
                </div>
            </section>;
        })}
    </div>
    </>;
}
