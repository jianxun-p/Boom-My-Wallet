import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useEffect } from 'react';
import './details.css';
import Loading from '@/components/Loading';
import { useUser } from '@/middleware/Context';
import type { ApiTransaction, User } from '@/types/user';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getUserApiUrl, requestUserApi, UserAPI } from '@/platforms/BoomMyWallet';

class Transaction {
  id: string = '';
  time: Date = new Date();
  category: string = '';
  amount: string = '';
  currency: string = '';
  merchant: string = '';
  paymentMethod: string = '';
  location: string = '';
  latitude: string = '';
  longitude: string = '';
  description: string = '';
  imageUrl: string = '';

  set position(pos: string) {
    [this.latitude, this.longitude] = pos.split(',');
  }
  get position(): string {
    return this.latitude + ',' + this.longitude;
  }

  constructor(data?: ApiTransaction) {
    if (!data) {
      return;
    }
    this.id = data.id !== undefined ? String(data.id) : '';
    this.time = parseTransactionTime(data.time);
    this.amount = data.amount !== undefined ? String(data.amount) : '';
    this.currency = data.currency ?? '';
    this.category = data.category ?? '';
    this.merchant = data.merchant ?? '';
    this.paymentMethod = data.paymentMethod ?? '';
    this.location = data.location ?? '';
    this.latitude = data.latitude !== undefined ? String(data.latitude) : '';
    this.longitude = data.longitude !== undefined ? String(data.longitude) : '';
    this.description = data.description ?? '';
    this.imageUrl = data.imageUrl ?? '';
  }
}

function parseTransactionTime(time: ApiTransaction['time']): Date {
  const parsed = time instanceof Date ? time : new Date(time ?? Date.now());
  if (Number.isNaN(parsed.valueOf())) {
    return new Date();
  }
  return parsed;
}

function newEmptyTransaction(id?: string): Transaction {
  const t = new Transaction();
  t.id = id ?? '';
  return t;
}

function cloneTransaction(transaction: Transaction | null): Transaction {
  if (!transaction) {
    return newEmptyTransaction();
  }
  return Object.assign(new Transaction(), transaction);
}

function HeaderRow() {
  return (
    <div className="transaction-header-row">
      <div className="transaction-item-time">Time</div>
      <div className="transaction-item-merchant">Merchant</div>
      <div className="transaction-item-category">Category</div>
      <div className="transaction-item-amount text-right">Amount</div>
    </div>
  );
}

function Entry({
  transaction,
  transactionDetail,
}: {
  transaction: Transaction;
  transactionDetail: State<Transaction | null>;
}) {
  const t = transaction.time;
  const timeStr = `${t.getFullYear()}-${(t.getMonth() + 1).toString().padStart(2, '0')}-${t.getDate().toString().padStart(2, '0')}   ${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}`;
  return (
    <div className="transaction-item" onClick={() => transactionDetail.set(transaction)}>
      <div className="transaction-item-time">{timeStr}</div>
      <div className="transaction-item-merchant">{transaction.merchant}</div>
      <div className="transaction-item-category">{transaction.category}</div>
      <div className="transaction-item-amount text-right">{formatMoney(transaction.amount)}</div>
    </div>
  );
}

interface Displayable {
  toString: () => string;
}

interface State<T> {
  get: T;
  set: Dispatch<SetStateAction<T>>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const THIS_YEAR = new Date().getFullYear();
const START_YEAR = 2000;
const YEARS = [...Array(THIS_YEAR - START_YEAR).keys()].map((i) => THIS_YEAR - i);

type ClickHander = (event: React.MouseEvent<Node>) => void;

function DropDownList(props: {
  list: Displayable[];
  val: State<string>;
  noInput: boolean;
  allowChoose: boolean;
  closeHandler: React.RefObject<ClickHander>;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  props.closeHandler.current = (event: React.MouseEvent<Node>) => {
    if (inputRef.current && !inputRef.current.contains(event.target as Node)) return setOpen(false);
    setOpen((prev) => !prev);
  };
  return (
    <div className="dropdown-container">
      <Input
        className=""
        value={props.val.get}
        readOnly={props.noInput}
        onChange={(e) => props.val.set(e.target.value)}
        ref={inputRef}
      />
      <div className={open && props.allowChoose ? 'dropdown-list h-52' : 'dropdown-list h-0'}>
        {props.list.map((i) => {
          return (
            <div
              className="dropdown-list-item"
              onClick={() => {
                props.val.set(i.toString());
                setOpen(false);
              }}
            >
              {i.toString()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DatetimeSelector(props: {
  date: State<Date>;
  noInput: boolean;
  allowChoose: boolean;
  closeHandler: React.RefObject<ClickHander>;
}) {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [second, setSecond] = useState('');
  useEffect(() => {
    setYear(props.date.get.getFullYear().toString().padStart(2, '0'));
    setMonth(MONTHS[props.date.get.getMonth()].padStart(2, '0'));
    setDay(props.date.get.getDate().toString().padStart(2, '0'));
    setHour(props.date.get.getHours().toString().padStart(2, '0'));
    setMinute(props.date.get.getMinutes().toString().padStart(2, '0'));
    setSecond(props.date.get.getSeconds().toString().padStart(2, '0'));
  }, [props.date.get]);
  const filteredSetNum = function (setFunc: Dispatch<SetStateAction<string>>) {
    return (n: SetStateAction<string>) => {
      if (typeof n === 'string') return setFunc(n.replace(/[^0-9]/g, '').replace(/^0+/g, '')); // numbers does not start in 0s
      const newF = (prev: string) =>
        n(prev)
          .replace(/[^0-9]/g, '')
          .replace(/^0+/g, '');
      return setFunc(newF);
    };
  };
  const setDate: Dispatch<SetStateAction<Date>> = props.date.set;
  useEffect(() => {
    try {
      setDate((prev) =>
        prev !== null ? new Date(`${month} ${day} ${year} ${hour}:${minute}:${second}`) : prev,
      );
    } finally {
      //
    }
  }, [year, month, day, hour, minute, second, setDate]);
  const emptyEventHandler = () => {};
  const dropDowns = [
    useRef<ClickHander>(emptyEventHandler),
    useRef<ClickHander>(emptyEventHandler),
    useRef<ClickHander>(emptyEventHandler),
    useRef<ClickHander>(emptyEventHandler),
    useRef<ClickHander>(emptyEventHandler),
    useRef<ClickHander>(emptyEventHandler),
  ];
  props.closeHandler.current = (event) => dropDowns.forEach((d) => d.current(event));
  return (
    <div className="datetime-selector-container">
      <div className="date-selector-container">
        <div className="w-[40%] min-w-13.5 text-center">
          <DropDownList
            list={YEARS}
            val={{ get: year, set: filteredSetNum(setYear) }}
            closeHandler={dropDowns[0]}
            noInput={props.noInput}
            allowChoose={props.allowChoose}
          />
        </div>
        <b className="mx-1">-</b>
        <div className="w-[30%] min-w-12.5 text-center">
          <DropDownList
            list={MONTHS}
            val={{ get: month, set: setMonth }}
            closeHandler={dropDowns[1]}
            noInput={props.noInput}
            allowChoose={props.allowChoose}
          />
        </div>
        <b className="mx-1">-</b>
        <div className="w-[20%] min-w-10 text-center">
          <DropDownList
            list={[...Array(31).keys()].map((i) => i + 1).map((i) => i.toString().padStart(2, '0'))}
            val={{ get: day, set: filteredSetNum(setDay) }}
            closeHandler={dropDowns[2]}
            noInput={props.noInput}
            allowChoose={props.allowChoose}
          />
        </div>
      </div>
      <div className="time-selector-container">
        <div className="w-[30%] min-w-10 text-center">
          <DropDownList
            list={[...Array(24).keys()].map((i) => i.toString().padStart(2, '0'))}
            val={{ get: hour, set: filteredSetNum(setHour) }}
            closeHandler={dropDowns[3]}
            noInput={props.noInput}
            allowChoose={props.allowChoose}
          />
        </div>
        <b className="mx-1">:</b>
        <div className="w-[30%] min-w-10 text-center">
          <DropDownList
            list={[...Array(60).keys()].map((i) => i.toString().padStart(2, '0'))}
            val={{ get: minute, set: filteredSetNum(setMinute) }}
            closeHandler={dropDowns[4]}
            noInput={props.noInput}
            allowChoose={props.allowChoose}
          />
        </div>
        <b className="mx-1">:</b>
        <div className="w-[30%] min-w-10 text-center">
          <DropDownList
            list={[...Array(60).keys()].map((i) => i.toString().padStart(2, '0'))}
            val={{ get: second, set: filteredSetNum(setSecond) }}
            closeHandler={dropDowns[5]}
            noInput={props.noInput}
            allowChoose={props.allowChoose}
          />
        </div>
      </div>
    </div>
  );
}

function formatMoney(amount: string): string {
  const splitted = amount.split('.');
  const [n, f] = [splitted[0].replace(/[^0-9-]/g, ''), (splitted[1] ?? '').replace(/[^0-9]/g, '')];
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const formattedAmount =
    formatter.format(BigInt(n || '0')) +
    '.' +
    (f.substring(0, Math.min(2, f.length)) ?? '').padEnd(2, '0');
  return formattedAmount;
}

function toTransactionRequest(transaction: Transaction): ApiTransaction {
  return {
    time: transaction.time.toISOString(),
    amount: transaction.amount,
    currency: transaction.currency,
    category: transaction.category,
    merchant: transaction.merchant,
    paymentMethod: transaction.paymentMethod,
    location: transaction.location,
    latitude: transaction.latitude,
    longitude: transaction.longitude,
    deleted: false,
    description: transaction.description,
    imageUrl: transaction.imageUrl,
  };
}

function DetailModal(props: {
  transaction: State<Transaction | null>;
  user: User;
  categories: State<string[]>;
  paymentMethods: State<string[]>;
  onTransactionsChanged: () => Promise<void>;
}) {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState<Date>(props.transaction.get?.time ?? new Date());
  useEffect(() => {
    setDate(props.transaction.get?.time ?? new Date());
  }, [props.transaction.get?.time, setDate]);
  const [amount, setAmount] = useState<string>(formatMoney(props.transaction.get?.amount ?? '0'));
  const [editMode, setEditMode] = useState(false);
  useEffect(() => {
    if (props.transaction.get === null) {
      setEditMode(false);
    }
  }, [props.transaction.get]);
  useEffect(() => {
    setAmount(formatMoney(props.transaction.get?.amount ?? '0'));
  }, [props.transaction.get?.amount]);
  useEffect(() => {
    setAmount(editMode ? restrictMoneyInput : formatMoney);
  }, [editMode]);
  const [category, setCategory] = useState<string>(
    props.transaction.get?.category ?? props.categories.get[0] ?? '',
  );
  useEffect(() => {
    setCategory(props.transaction.get?.category ?? props.categories.get[0] ?? '');
  }, [props.transaction.get?.category, props.categories.get]);
  const [paymentMethod, setpaymentMethod] = useState<string>(
    props.transaction.get?.paymentMethod ?? props.paymentMethods.get[0] ?? '',
  );
  useEffect(() => {
    setpaymentMethod(props.transaction.get?.paymentMethod ?? props.paymentMethods.get[0] ?? '');
  }, [props.transaction.get?.paymentMethod, props.paymentMethods.get]);

  function restrictMoneyInput(amount: string): string {
    const sanitized = amount.replace(/[^0-9.-]/g, '');
    const isNegative = sanitized.startsWith('-');
    const arr = sanitized.replace(/-/g, '').split('.');
    const integer = (arr[0] ?? '').replace(/^0+(?=\d)/g, '') || '0';
    const fraction = (arr[1] ?? '').replace(/[^0-9]/g, '');
    return `${isNegative ? '-' : ''}${integer}.${fraction.substring(0, 2).padEnd(2, '0')}`;
  }

  const setCategoryHandler = (c: string | ((prev: string) => string)) => {
    let newCategory = '';
    if (typeof c === 'string') {
      newCategory = c;
      setCategory(c);
    } else {
      setCategory((prev) => {
        newCategory = c(prev);
        return newCategory;
      });
    }
    props.transaction.set((prev: Transaction | null) => {
      const newTran = cloneTransaction(prev);
      newTran.category = newCategory;
      return newTran;
    });
    props.categories.set((prev) => {
      if (prev.indexOf(newCategory) >= 0) {
        return prev;
      }
      return [...prev, newCategory];
    });
  };
  const setPaymentMethodHandler = (c: string | ((prev: string) => string)) => {
    let newPaymentMethod = '';
    if (typeof c === 'string') {
      newPaymentMethod = c;
      setpaymentMethod(c);
    } else {
      setpaymentMethod((prev) => {
        newPaymentMethod = c(prev);
        return newPaymentMethod;
      });
    }
    props.transaction.set((prev: Transaction | null) => {
      const newTran = cloneTransaction(prev);
      newTran.paymentMethod = newPaymentMethod;
      return newTran;
    });
    props.paymentMethods.set((prev) => {
      if (prev.indexOf(newPaymentMethod) >= 0) {
        return prev;
      }
      return [...prev, newPaymentMethod];
    });
  };
  type TransactionStringField = {
    [K in keyof Transaction]: Transaction[K] extends string ? K : never;
  }[keyof Transaction];
  const setTransactionFieldHandler =
    (fieldName: TransactionStringField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      props.transaction.set((prev: Transaction | null) => {
        const newTran: Transaction = cloneTransaction(prev);
        newTran[fieldName] = e.target.value;
        return newTran;
      });
    };

  const setAmountHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = editMode ? restrictMoneyInput(e.target.value) : formatMoney(e.target.value);
    setAmount(newAmount);
    props.transaction.set((prev: Transaction | null) => {
      const newTran = cloneTransaction(prev);
      newTran.amount = newAmount;
      return newTran;
    });
  };

  async function saveTransactionDetail(v: Transaction | null): Promise<boolean> {
    if (v === null) {
      return false;
    }
    const transaction = cloneTransaction(v);
    transaction.time = date;
    transaction.amount = restrictMoneyInput(amount);
    transaction.category = category;
    transaction.paymentMethod = paymentMethod;

    try {
      if (transaction.id) {
        await requestUserApi(props.user, UserAPI.UpdateTransaction, {
          tid: transaction.id,
          transaction: toTransactionRequest(transaction),
        });
      } else {
        await requestUserApi(props.user, UserAPI.PostTransaction, {
          transaction: toTransactionRequest(transaction),
        });
      }
      await props.onTransactionsChanged();
      return true;
    } catch (e) {
      console.error('Failed saving transaction:', e);
      alert('Error occurred while saving');
      return false;
    }
  }
  async function deleteTransaction(v: Transaction | null): Promise<boolean> {
    if (v === null) {
      return false;
    }
    if (!v.id) {
      return true;
    }
    try {
      await requestUserApi(props.user, UserAPI.DeleteTransaction, { tid: v.id });
      await props.onTransactionsChanged();
      return true;
    } catch (e) {
      console.error('Failed deleting transaction:', e);
      alert('Error occurred while deleting');
      return false;
    }
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
  return (
    <div
      className="modal"
      {...(props.transaction.get !== null && { open: props.transaction.get !== null })}
      onClick={clickOutsideHandler}
    >
      <div className="modal-content" ref={modalContentRef}>
        <div className="flex flex-row justify-between items-center">
          <h1>Details</h1>
          <button
            className="bg-blue-200 hover:bg-blue-300 w-auto"
            onClick={() => setEditMode((prev) => !prev)}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
        <div className="modal-items">
          <strong className="modal-item-label">Datetime</strong>
          <div className="modal-item-value">
            <DatetimeSelector
              date={{ get: date, set: setDate }}
              closeHandler={dropDown0}
              noInput={!editMode}
              allowChoose={editMode}
            />
          </div>

          {/* Amount */}
          <Label htmlFor="amount" className="sm:col-span-1">
            Amount
          </Label>
          <div className="sm:col-span-3">
            <Input
              id="amount"
              readOnly={!editMode}
              value={amount}
              onChange={setAmountHandler}
              ref={amountRef}
            />
          </div>

          {/* Category */}
          <Label className="sm:col-span-1">Category</Label>
          <div className="sm:col-span-3">
            <DropDownList
              allowChoose={editMode}
              noInput={!editMode}
              val={{ get: category, set: setCategoryHandler }}
              closeHandler={dropDown1}
              list={props.categories.get}
            />
          </div>

          {/* Merchant */}
          <Label htmlFor="merchant" className="sm:col-span-1">
            Merchant
          </Label>
          <div className="sm:col-span-3">
            <Input
              id="merchant"
              readOnly={!editMode}
              value={props.transaction.get?.merchant ?? ''}
              onChange={setTransactionFieldHandler('merchant')}
            />
          </div>

          {/* Payment Method */}
          <Label className="sm:col-span-1">Payment Method</Label>
          <div className="sm:col-span-3">
            <DropDownList
              allowChoose={editMode}
              noInput={!editMode}
              val={{ get: paymentMethod, set: setPaymentMethodHandler }}
              closeHandler={dropDown2}
              list={props.paymentMethods.get}
            />
          </div>

          {/* Location */}
          <Label htmlFor="location" className="sm:col-span-1">
            Location
          </Label>
          <div className="sm:col-span-3">
            <Input
              id="location"
              readOnly={!editMode}
              value={props.transaction.get?.location ?? ''}
              onChange={setTransactionFieldHandler('location')}
            />
          </div>

          {/* Position */}
          <Label htmlFor="position" className="sm:col-span-1">
            Position
          </Label>
          <div className="sm:col-span-3">
            <Input
              id="position"
              readOnly={!editMode}
              value={props.transaction.get?.position ?? ''}
              onChange={setTransactionFieldHandler('position')}
            />
          </div>

          {/* Description */}
          <Label htmlFor="description" className="sm:col-span-1 self-start mt-2">
            Description
          </Label>
          <div className="sm:col-span-3">
            <Textarea
              id="description"
              readOnly={!editMode}
              value={props.transaction.get?.description ?? ''}
              onChange={setTransactionFieldHandler('description')}
              className="min-h-25 resize-y"
            />
          </div>
        </div>
        <div className="left-0 bottom-0 w-full pt-2 px-4 flex justify-between">
          <div className="flex justify-start">
            <button
              onClick={async () => {
                if (await deleteTransaction(props.transaction.get)) {
                  props.transaction.set(null);
                }
              }}
              className="w-auto mx-2 error-colour"
            >
              Delete
            </button>
          </div>
          <div className="flex justify-end">
            <button
              onClick={async () => {
                if (await saveTransactionDetail(props.transaction.get)) {
                  props.transaction.set(null);
                }
              }}
              className="w-auto mx-2 ok-colour"
            >
              Save
            </button>
            <button onClick={() => props.transaction.set(null)} className="w-auto mx-2 info-colour">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectGoogleSheets({ user }: { user: User }) {
  const login = () => {
    window.location.href = getUserApiUrl(user, UserAPI.ConnectGoogleSheets);
  };
  return (
    <>
      <h1 className="transaction-header text-center pb-0 pt-8">Details</h1>
      <div className="connect-google-sheets-btn my-8" onClick={login}>
        Connect with Google Sheets
      </div>
    </>
  );
}

export default function Details() {
  const { user, setUser } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasTransactionService, setHasTransactionService] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(user.loaded));

  const loadTransactions = useCallback(async () => {
    if (!user.uid) {
      return;
    }
    setLoading(true);
    try {
      const transactions = (user.transactions ??
        (await requestUserApi(user, UserAPI.ListTransactions)).transactions ??
        []) as ApiTransaction[];
      setUser({ transactions });
      const nextTransactions = transactions
        .map((transaction) => new Transaction(transaction))
        .sort((a, b) => b.time.valueOf() - a.time.valueOf());
      setTransactions(nextTransactions);
      setCategories([...new Set(nextTransactions.map((tran) => tran.category)).keys()]);
      setPaymentMethods([...new Set(nextTransactions.map((tran) => tran.paymentMethod)).keys()]);
      setHasTransactionService(true);
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
      setTransactions([]);
      setHasTransactionService(false);
    } finally {
      setLoading(false);
    }
  }, [user, setUser]);

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || !user.uid) {
      return;
    }
    setLoading(true);
    loadTransactions().finally(() => (loaded.current = true));
  }, [user, loadTransactions]);

  const transactionsByMonth = useMemo(() => {
    const isSameMonth = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
    const tByMonth: Transaction[][] = [];
    for (let i = 0; i < transactions.length;) {
      const monthStart = transactions[i].time;
      const monthlyTransactions: Transaction[] = [];
      for (; i < transactions.length && isSameMonth(transactions[i].time, monthStart); ++i) {
        monthlyTransactions.push(transactions[i]);
      }
      tByMonth.push(monthlyTransactions);
    }
    return tByMonth;
  }, [transactions]);

  const [transactionDetail, setTransactionDetail] = useState<Transaction | null>(null);

  if (!hasTransactionService) {
    return (
      <div>
        <Loading loading={loading} />
        <ConnectGoogleSheets user={user} />
      </div>
    );
  }

  return (
    <div>
      <Loading loading={loading} />
      <DetailModal
        transaction={{ get: transactionDetail, set: setTransactionDetail }}
        user={user}
        categories={{ get: categories, set: setCategories }}
        paymentMethods={{ get: paymentMethods, set: setPaymentMethods }}
        onTransactionsChanged={loadTransactions}
      />
      <div
        className="add-transaction-btn"
        onClick={() => setTransactionDetail(newEmptyTransaction())}
      >
        ➕
      </div>
      <div className="transaction-wrapper">
        <h1 className="transaction-header text-center pb-0 pt-8">Details</h1>
        {transactionsByMonth.map((monthlyTransactions) => {
          const month = `${monthlyTransactions[0].time.getFullYear()} ${MONTHS[monthlyTransactions[0].time.getMonth()]}`;
          return (
            <section>
              <h2 className="transaction-header">{month}</h2>
              <div className="transaction-content">
                <HeaderRow />
                {monthlyTransactions.map((transaction) => (
                  <Entry
                    transaction={transaction}
                    transactionDetail={{ get: transactionDetail, set: setTransactionDetail }}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
