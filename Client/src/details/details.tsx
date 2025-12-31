import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useEffect } from 'react';
import { deleteRow, updateValues } from '../google-drive';
import { rangeA1 } from '../google-drive';
import { type Spreadsheet } from '../google-drive';
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
type TransactionStringField = 'amount' | 'category' | 'name' | 'merchant' | 'paymentMethod' | 'location' | 'position' | 'description';

function newEmptyTransaction(row?: number): Transaction {
    return { row: row ?? -1, time: new Date(), amount: '0', category: '', name: '', merchant: '', paymentMethod: '', location: '', position: '', description: '', };
}

function cloneTransaction(transaction: Transaction | null): Transaction {
    if (!transaction) return newEmptyTransaction();
    return Object.assign({}, transaction);
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
const THIS_YEAR = new Date().getFullYear();
const START_YEAR = 2000;
const YEARS = [...Array(THIS_YEAR - START_YEAR).keys()].map(i => THIS_YEAR - i);

type ClickHander = (event: React.MouseEvent<Node>) => void;

function DropDownList(
    props: { 
        list: Displayable[], 
        val: State<string>, 
        noInput: boolean, 
        allowChoose: boolean, 
        closeHandler: React.RefObject<ClickHander>, 
    }
) {
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    props.closeHandler.current = (event: React.MouseEvent<Node>) => {
        if (inputRef.current && !inputRef.current.contains(event.target as Node))
            return setOpen(false);
        setOpen(prev => !prev);
    };
    return <div className='dropdown-container'>
        <input className='dropdown' value={props.val.get} readOnly={props.noInput} onChange={(e) => props.val.set(e.target.value)} ref={inputRef} />
        <div className={open && props.allowChoose ? 'dropdown-list h-52' : 'dropdown-list h-0'}>
            {props.list.map(i => {return <div className='dropdown-list-item' onClick={()=>{props.val.set(i.toString());setOpen(false);}}>{i.toString()}</div>;})}
        </div>
    </div>
}

function DatetimeSelector(
    props: { 
        date: State<Date>, 
        noInput: boolean, 
        allowChoose: boolean, 
        closeHandler: React.RefObject<ClickHander>, 
    }
) {
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');
    const [hour, setHour] = useState('');
    const [minute, setMinute] = useState('');
    const [second, setSecond] = useState('');
    useEffect(() => {
        setYear(props.date.get.getFullYear().toString().padStart(2,'0'));
        setMonth(MONTHS[props.date.get.getMonth()].padStart(2,'0'));
        setDay(props.date.get.getDate().toString().padStart(2,'0'));
        setHour(props.date.get.getHours().toString().padStart(2,'0'));
        setMinute(props.date.get.getMinutes().toString().padStart(2,'0'));
        setSecond(props.date.get.getSeconds().toString().padStart(2,'0'));
    }, [props.date.get]);
    const filteredSetNum = function (setFunc: Dispatch<SetStateAction<string>>) {
        return (n: SetStateAction<string>) => {
            if (typeof(n) === 'string')
                return setFunc(n.replace(/[^0-9]/g, '').replace(/^0+/g, '')); // numbers does not start in 0s
            const newF = (prev: string) => n(prev).replace(/[^0-9]/g, '').replace(/^0+/g, '');
            return setFunc(newF);
        };
    };
    const setDate: Dispatch<SetStateAction<Date>> = props.date.set;
    useEffect(() => {
        try { setDate(prev => prev !== null ? new Date(`${month} ${day} ${year} ${hour}:${minute}:${second}`) : prev); } finally {;}
    }, [year, month, day, hour, minute, second, setDate]);
    const emptyEventHandler = () => {};
    const dropDowns = [useRef<ClickHander>(emptyEventHandler), useRef<ClickHander>(emptyEventHandler), useRef<ClickHander>(emptyEventHandler), 
        useRef<ClickHander>(emptyEventHandler), useRef<ClickHander>(emptyEventHandler), useRef<ClickHander>(emptyEventHandler)];
    props.closeHandler.current = (event) => dropDowns.forEach(d => d.current(event));
    return <div className='datetime-selector-container'>
        <div className='date-selector-container'>
            <div className='w-[40%] min-w-[54px] text-center'><DropDownList list={YEARS} val={{get: year, set: filteredSetNum(setYear)}} closeHandler={dropDowns[0]} noInput={props.noInput} allowChoose={props.allowChoose} /></div>
            <b className='mx-1'>-</b><div className='w-[30%] min-w-[50px] text-center'><DropDownList list={MONTHS} val={{get: month, set: setMonth}} closeHandler={dropDowns[1]} noInput={props.noInput} allowChoose={props.allowChoose} /></div>
            <b className='mx-1'>-</b><div className='w-[20%] min-w-10 text-center'><DropDownList list={[...Array(31).keys()].map(i=>i+1).map(i=>i.toString().padStart(2,'0'))} val={{get: day, set: filteredSetNum(setDay)}} closeHandler={dropDowns[2]} noInput={props.noInput} allowChoose={props.allowChoose} /></div>
        </div>
        <div className='time-selector-container'>
            <div className='w-[30%] min-w-10 text-center'><DropDownList list={[...Array(24).keys()].map(i=>i.toString().padStart(2,'0'))} val={{get: hour, set: filteredSetNum(setHour)}} closeHandler={dropDowns[3]} noInput={props.noInput} allowChoose={props.allowChoose} /></div>
            <b className='mx-1'>:</b><div className='w-[30%] min-w-10 text-center'><DropDownList list={[...Array(60).keys()].map(i=>i.toString().padStart(2,'0'))} val={{get: minute, set: filteredSetNum(setMinute)}} closeHandler={dropDowns[4]} noInput={props.noInput} allowChoose={props.allowChoose} /></div>
            <b className='mx-1'>:</b><div className='w-[30%] min-w-10 text-center'><DropDownList list={[...Array(60).keys()].map(i=>i.toString().padStart(2,'0'))} val={{get: second, set: filteredSetNum(setSecond)}} closeHandler={dropDowns[5]} noInput={props.noInput} allowChoose={props.allowChoose} /></div>
        </div>
    </div>;
}

function formatMoney(amount: string): string {
    const splitted = amount.split('.');
    const [n, f] = [splitted[0].replace(/[^0-9-]/g, ''), (splitted[1] ?? '').replace(/[^0-9]/g, '')];
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    });
    const formattedAmount = formatter.format(BigInt(n)) + '.' + (f.substring(0, Math.min(2, f.length)) ?? '').padEnd(2, '0');
    return formattedAmount;
}


function DetailModal(
    props: {
        transaction: State<Transaction | null>, 
        spreadsheet: State<Spreadsheet>, 
        accessToken: string, 
        categories: State<string[]>,
        paymentMethods: State<string[]>,
    }
) {
    const modalContentRef = useRef<HTMLDivElement>(null);
    const amountRef = useRef<HTMLInputElement>(null);
    const [date, setDate] = useState<Date>(props.transaction.get?.time ?? new Date());
    useEffect(()=>{
        setDate(props.transaction.get?.time ?? new Date());
    }, [props.transaction.get?.time, setDate]);
    const [amount, setAmount] = useState<string>(formatMoney(props.transaction.get?.amount ?? "0"));
    const [editMode, setEditMode] = useState(false);
    useEffect(() => {
        if (props.transaction.get === null) setEditMode(false);
    }, [props.transaction.get]);
    useEffect(() => { setAmount(formatMoney(props.transaction.get?.amount ?? "0")) }, [props.transaction]);
    const transactionSheet = useMemo(
        () => props.spreadsheet.get.sheets.filter(sheet => sheet.name === TRANSACTION_SHEET_NAME)[0] ?? {name: TRANSACTION_SHEET_NAME, columns: [], values: []}, 
        [props.spreadsheet.get.sheets]
    );
    useEffect(()=>{ setAmount(editMode ? restrictMoneyInput : formatMoney); }, [editMode]);
    const [category, setCategory] = useState<string>(props.transaction.get?.category ?? props.categories.get[0] ?? "");
    useEffect(()=>{
        setCategory(props.transaction.get?.category ?? props.categories.get[0] ?? "");
    }, [props.transaction.get?.category, props.categories.get]);
    useEffect(()=>{ setAmount(editMode ? restrictMoneyInput : formatMoney); }, [editMode]);
    const [paymentMethod, setpaymentMethod] = useState<string>(props.transaction.get?.paymentMethod ?? props.paymentMethods.get[0] ?? "");
    useEffect(()=>{
        setpaymentMethod(props.transaction.get?.paymentMethod ?? props.paymentMethods.get[0] ?? "");
    }, [props.transaction.get?.paymentMethod, props.paymentMethods.get]);

    
    function restrictMoneyInput(amount: string): string {
        const arr = amount.replace(/[^0-9.-]/g, '').split('.');
        const [i, f] = [arr[0], arr[1] ?? ''];
        const n = BigInt(i);
        return n + '.' + f.substring(0, Math.min(2, f.length)).padStart(2, '0');
    }
    
    const setCategoryHandler = (c: string | ((prev:string)=>string)) => {
        let newCategory = '';
        if (typeof c === 'string') {
            newCategory = c;
            setCategory(c);
        } else {
            setCategory((prev) => {newCategory = c(prev); return newCategory;});
        }
        props.transaction.set((prev: Transaction | null) => {
            const newTran = cloneTransaction(prev);
            newTran.category = newCategory;
            return newTran;
        });
        props.categories.set((prev)=>{
            if (prev.indexOf(newCategory) >= 0) return prev;
            const a = [...prev];
            a.push(newCategory);
            return a;
        });
    };
    const setPaymentMethodHandler = (c: string | ((prev:string)=>string)) => {
        let newPaymentMethod = '';
        if (typeof c === 'string') {
            newPaymentMethod = c;
            setpaymentMethod(c);
        } else {
            setpaymentMethod((prev) => {newPaymentMethod = c(prev); return newPaymentMethod;});
        }
        props.transaction.set((prev: Transaction | null) => {
            const newTran = cloneTransaction(prev);
            newTran.paymentMethod = newPaymentMethod;
            return newTran;
        });
        props.categories.set((prev)=>{
            if (prev.indexOf(newPaymentMethod) >= 0) return prev;
            const a = [...prev];
            a.push(newPaymentMethod);
            return a;
        });
    };
    const setTransactionFieldHandler = (fieldName: TransactionStringField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        props.transaction.set((prev: Transaction | null) => {
            const newTran = cloneTransaction(prev);
            newTran[fieldName] = e.target.value;
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
        updateValues(props.accessToken, props.spreadsheet.get.id, rangeA1(TRANSACTION_SHEET_NAME, [0, v.row+1], [row.length-1,v.row+1]), [row])
        .then(data => {
            console.log('updateValues', data); 
            alert(data.updatedRows === 1 ? 'Saved' : 'Error occured while saving');
        });
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
        deleteRow(props.accessToken, props.spreadsheet.get.id, transactionSheet.id, (v.row ?? 0) + 1).then(data => console.log('deleteRow', data));
        return v;
    }
    const emptyEventHandler = () => {};
    const dropDown0 = useRef<ClickHander>(emptyEventHandler);
    const dropDown1 = useRef<ClickHander>(emptyEventHandler);
    const dropDown2 = useRef<ClickHander>(emptyEventHandler);
    const clickOutsideHandler = (event: React.MouseEvent<Node>) => {
        if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) 
            return props.transaction.set(null);
        dropDown0.current(event);
        dropDown1.current(event);
        dropDown2.current(event);
    };
    return <div className='modal' {...(props.transaction.get !== null && {open: props.transaction.get !== null})} onClick={clickOutsideHandler}>
        <div className='modal-content' ref={modalContentRef}>
            <div className='flex flex-row justify-between items-center'>
                <h1>Details</h1>
                <button className='bg-blue-200 hover:bg-blue-300 w-auto' onClick={() => setEditMode(prev=>!prev)}>{editMode ? 'Done' : 'Edit'}</button>
            </div>
            <div className='modal-items'>
                <strong className='modal-item-label'>Datetime</strong>
                <div className='modal-item-value'><DatetimeSelector date={{get: date, set: setDate}} closeHandler={dropDown0} noInput={!editMode} allowChoose={editMode} /></div>
                <strong className='modal-item-label'>Amount</strong>
                <div className='modal-item-value'><input readOnly={!editMode} value={amount} onChange={setTransactionFieldHandler('amount')} ref={amountRef} /></div>
                <strong className='modal-item-label'>Category</strong>
                <div className='modal-item-value'>
                    <DropDownList allowChoose={editMode} noInput={!editMode} val={{get:category,set:setCategoryHandler}} closeHandler={dropDown1} list={props.categories.get} />
                </div>
                <strong className='modal-item-label'>Merchant</strong>
                <div className='modal-item-value'><input readOnly={!editMode} value={props.transaction.get?.merchant ?? ''} onChange={setTransactionFieldHandler('merchant')} /></div>
                <strong className='modal-item-label'>Payment Method</strong>
                <div className='modal-item-value'>
                    <DropDownList allowChoose={editMode} noInput={!editMode} val={{get:paymentMethod,set:setPaymentMethodHandler}} closeHandler={dropDown2} list={props.paymentMethods.get} />
                </div>
                <strong className='modal-item-label'>Location</strong>
                <div className='modal-item-value'><input readOnly={!editMode} value={props.transaction.get?.location ?? ''} onChange={setTransactionFieldHandler('location')} /></div>
                <strong className='modal-item-label'>Position</strong>
                <div className='modal-item-value'><input readOnly={!editMode} value={props.transaction.get?.position ?? ''} onChange={setTransactionFieldHandler('position')} /></div>
                <strong className='col-span-full'>Description</strong>
                <div className='col-span-full **self-start**'><textarea readOnly={!editMode} value={props.transaction.get?.description ?? ''} onChange={setTransactionFieldHandler('description')} className='h-auto resize-y'/></div>
            </div>
            <div className='left-0 bottom-0 w-full pt-2 px-4 flex justify-between'>
                <div className='flex justify-start'>
                    <button onClick={()=>{deleteTransaction(props.transaction.get);props.transaction.set(null);}} className='w-auto mx-2 error-colour'>Delete</button>
                </div>
                <div className='flex justify-end'>
                    <button onClick={()=>{saveTransactionDetail(props.transaction.get);props.transaction.set(null);}} className='w-auto mx-2 ok-colour'>Save</button>
                    <button onClick={()=>props.transaction.set(null)} className='w-auto mx-2 info-colour'>Cancel</button>
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
    const [categories, setCategories] = useState<string[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
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
        setCategories([...(new Set(t.map(tran => tran.category))).keys()]);
        setPaymentMethods([...(new Set(t.map(tran => tran.paymentMethod))).keys()]);
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
    <DetailModal 
        transaction={{get: transactionDetail, set: setTransactionDetail}} 
        spreadsheet={spreadsheet} 
        accessToken={accessToken} 
        categories={{get: categories, set: setCategories}}
        paymentMethods={{get: paymentMethods, set: setPaymentMethods}}
    />
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
