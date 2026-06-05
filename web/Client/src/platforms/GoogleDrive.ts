import type { User } from "@/types/user";
import { requestUserApi, UserAPI } from "./BoomMyWallet";
import { GoogleAPI, requestGoogleApi } from "./GoogleApis";

export interface Worksheet {
    id: number,
    name: string,
    columns: string[],
    values: string[][],
};

const SPREADSHEET_SCHEMA = {
    "transactions": ["Time", "Amount", "Currency", "Category", "Name", "Merchant", "PaymentMethod", "Location", "Latitude", "Longitude", "Description", "Image"],
    "budgets": ["Time", "Amount", "Category", "Name", "Merchant", "PaymentMethod", "Location", "Latitude", "Longitude", "Description"],
    "general": ["Key", "Value"]
};

// fields in the Transaction class (ordering need to match SPREADSHEET_SCHEMA)
const TRANSACTION_KEYS: (keyof Transaction)[] = [
    'time', 'amount', 'currency', 'category', 
    'name', 'merchant', 'paymentMethod', 
    'location', 'latitude', 'longitude',
    'description', 'imageUrl'
];

export class Transaction {
    
    time: Date = new Date()
    row: number = -1
    category: string = ''
    amount: string = ''
    currency: string = ''
    name: string = ''
    merchant: string = ''
    paymentMethod: string = ''
    location: string = ''
    latitude: string = ''
    longitude: string = ''
    description: string = ''
    imageUrl: string = ''

    set position(pos: string) {
        [this.latitude, this.longitude] = pos.split(',');
    }
    get position(): string {
        return this.latitude + ',' + this.longitude;
    }

    constructor(rowData?: string[], rowIndex?: number) {
        this.row = rowIndex ?? -1;
        if (!rowData)
            return;
        
        SPREADSHEET_SCHEMA['transactions'].forEach((_, i) => {
            const key: keyof Transaction = TRANSACTION_KEYS[i];
            if (rowData[i])
                (this as Record<keyof Transaction, unknown>)[key] = fromString(rowData[i], this[key]);
        })
              
    }
};

export function transactionToRow(transaction: Transaction): string[] {
    return TRANSACTION_KEYS.map(k => transaction[k]?.toString() ?? "");
}

type fromStringAble = string | number | Date | boolean | bigint;
export function fromString(val: string, t: fromStringAble) {
    switch (typeof t) {
        case 'bigint':
            return BigInt(val);
        case 'boolean':
            return Boolean(val);
        case 'number':
            return Number(val);
        case 'string':
            return val;
        case 'object':
            if (t instanceof Date) {
                return new Date(val);
            }
            throw Error("unknown type for object:", t);
        default:
            throw Error("unknown type for object:", t);
    }
}


export interface Spreadsheet {
    id: string,
    name: string,
    sheets: Worksheet[],
};


export async function listFiles(user: User, parentId?: string) {
    return await requestGoogleApi(user, GoogleAPI.Drive.ListFiles, undefined, {
        /** @see https://developers.google.com/workspace/drive/api/guides/search-files#examples */
        q: 'trashed=false' + (parentId ? ` and '${parentId}' in parents` : '')
    }) as {
        error: unknown,
        files?: {
            error?: unknown,
            kind?: string,
            mimeType?: string,
            id?: string,
            name?: string,
        }[],
    };
}
// export async function listFiles(user: User, parentId?: string) {
//     /** @see https://developers.google.com/workspace/drive/api/guides/search-files#examples */
//     const q = encodeURIComponent('trashed=false' + (parentId ? ` and '${parentId}' in parents` : ''));
//     return await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
//         method: "GET",
//         headers: { "Authorization": `Bearer ${user.google?.accessToken}` }
//     })
//     .then(res => res.json());
// }

export async function createFolder(user: User, folderName: string = "Boom My Wallet") {
    return await requestGoogleApi(user, GoogleAPI.Drive.CreateFile, {
        name: folderName,
        /** @see https://developers.google.com/workspace/drive/api/guides/mime-types */
        mimeType: "application/vnd.google-apps.folder"
    }) as {
        error?: unknown,
        id?: string,
    };
}


export async function createSpreadsheetFile(user: User, parentFolderId: string | null = null, spreadsheetName: string = "Boom My Wallet") {
    return await requestGoogleApi(user, GoogleAPI.Drive.CreateFile, {
        name: spreadsheetName,
        /** @see https://developers.google.com/workspace/drive/api/guides/mime-types */
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: parentFolderId ? [parentFolderId] : undefined,
    }) as {
        error?: unknown,
        id?: string,
    };
}

/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#addsheetrequest
 */
export async function addWorksheets(user: User, spreadsheetId: string, worksheetNames: string[]) {
    return await requestGoogleApi(user, GoogleAPI.Spreadsheet.AddWorksheets, {
        request: worksheetNames.map(name => { return { addSheet: { properties: { "title": name } } }; }),
        spreadsheetId: spreadsheetId,
    }) as {
        replies?: {
            addSheet?: {
                properties?: {
                    sheetId: number
                    title: string
                }
            }
        }[],
        error?: unknown
    };
}

/**
 * 
 * @param column (zero based indexing)
 * @param row (zero based indexing)
 * @returns e.g. "A2" (column: 0, row: 1), "C" (column: 2, row: null)
 */
function cellA1(column: number, row: number | null): string {
    let columnA1 = '';
    const A = 0x41;
    do {
        columnA1 = String.fromCharCode(A + column % 26) + columnA1;
        column = Math.round(column / 26);
    } while (column != 0);
    return columnA1 + (row !== null ? (row + 1).toString() : '');
}

/**
 * @see https://developers.google.com/workspace/sheets/api/guides/concepts
 * @param worksheetName 
 * @param startCell [column, row] (zero based indexing)
 * @param endCell 
 * @returns Range in A1 Notation
 */
export function rangeA1(worksheetName: string, startCell: [number, number | null], endCell: [number, number | null]): string {
    return `'${worksheetName}'!${cellA1(...startCell)}:${cellA1(...endCell)}`;
}

/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/ValueInputOption
 * @param accessToken 
 * @param spreadsheetId 
 * @param worksheetName 
 * @param row 
 * @returns 
 */
export async function addRow(user: User, spreadsheetId: string, worksheetName: string, row: string[]) {
    const range = rangeA1(worksheetName, [0, 0], [row.length - 1, 0]);
    return await requestGoogleApi(user, GoogleAPI.Spreadsheet.AppendRow, {
            "range": range,
            "majorDimension": "ROWS",
            "values": [ row ],
            spreadsheetId,
        }, {
            valueInputOption: 'USER_ENTERED'
        }
    ) as {
        error: unknown
        updates?: {
            spreadsheetId?: string
            updatedRange?: string
            updatedRows?: number
            updatedColumns?: number
            updatedCells?: number
        }
    };
    // return await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?`, {
    //     method: "POST",
    //     headers: { "Authorization": `Bearer ${accessToken}` },
    //     body: JSON.stringify({
    //         "range": range,
    //         "majorDimension": "ROWS",
    //         "values": [ row ],
    //     })
    // })
    // .then(res => res.json());
}

/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get
 * @returns @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets
 */
export async function getSpreadsheet(user: User, spreadsheetId: string) {
    return await requestGoogleApi(user, GoogleAPI.Spreadsheet.GetSpreadsheet, {
        spreadsheetId
    }) as {
        error?: unknown,
        spreadsheetId?: string,
        properties?: {
            title: string,
        },
        sheets?: {
            properties: {
                sheetId: number,
                title: string,
            }
        }[],
    };
}

/**
 * 
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
 * @param accessToken 
 * @param spreadsheetId 
 * @param worksheetName 
 * @returns @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values
 */
export async function getValues(accessToken: string, spreadsheetId: string, rangeA1Notation: string) {
    return await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeA1Notation}?valueRenderOption=UNFORMATTED_VALUE`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` }
    })
    .then(res => res.json());
}

/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values#resource:-valuerange
 * @param accessToken 
 * @param spreadsheetId 
 * @param rangeA1Notation 
 * @param values 
 * @returns 
 */
export async function updateValues(accessToken: string, spreadsheetId: string, rangeA1Notation: string, values: (boolean | number | string | null)[][]) {
    return await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeA1Notation}?valueInputOption=RAW`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify({
            range: rangeA1Notation,
            values: values
        })
    })
    .then(res => res.json());
}

/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request?#cutpasterequest
 * @param accessToken 
 * @param spreadsheetId 
 * @param row 
 * @returns 
 */
export async function deleteRow(accessToken: string, spreadsheetId: string, worksheetId: number, row: number) {
    return await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify({
            requests: [
                {
                    cutPaste: {
                        source: {
                            sheetId: worksheetId,
                            startRowIndex: row + 1,
                            startColumnIndex: 0,
                        },
                        destination: {
                            sheetId: worksheetId,
                            rowIndex: row,
                            columnIndex: 0
                        },
                        pasteType: 'PASTE_NO_BORDERS'
                    }
                }
            ]
        })
    })
    .then(res => res.json());
}

// async function updateGoogleSheetsInfo(uid: string, spreadsheetId: string, folderId?: string) {
//     const q = new URLSearchParams({
//         'spreadsheetId': spreadsheetId,
//     });
//     if (folderId) {
//         q.set('folderId', folderId);
//     }
//     return await fetch(`/api/v1/users/${encodeURIComponent(uid)}/google_sheets?${q.toString()}`, {
//         method: 'PUT',
//     });
// }

export async function initSpreadsheet(user: User): Promise<Spreadsheet | null> {

    const accessToken = user.google?.accessToken;
    if (!accessToken) {
        throw Error("Unauthorized");
    }

    const files = await listFiles(user);
    if (!files?.files) {
        console.error("Failed fetching files:", files?.error);
        return null;
    }
    // let folder = files.files.filter((f: null | {mimeType:string}) => f?.mimeType === "application/vnd.google-apps.folder")[0];
    // if (!folder) folder = await createFolder(accessToken);
    // if (!folder?.id) {
    //     console.error("Failed creating folder:", folder.error);
    //     return null;
    // }
    // const folderChildren = await listFiles(accessToken);

    let existingSpreadsheet = files?.files?.filter(f => f?.mimeType === "application/vnd.google-apps.spreadsheet")[0];
    if (!existingSpreadsheet) existingSpreadsheet = await createSpreadsheetFile(user);
    if (!existingSpreadsheet?.id) {
        console.error("Failed creating spreadsheet:", existingSpreadsheet?.error);
        return null;
    }
    const spreadsheet = await getSpreadsheet(user, existingSpreadsheet.id);
    if (!spreadsheet?.sheets || !spreadsheet.spreadsheetId) {
        console.error("Failed reading spreadsheet:", spreadsheet.error);
        return null;
    }
    const worksheets: Worksheet[] = [];
    const promises = [];
    promises.push(
        requestUserApi(user, UserAPI.UpdateGoogleSheetsInfo, undefined, {
            spreadsheetId: spreadsheet?.spreadsheetId ?? '',
        })
    );
    const worksheetIdMap = new Map<string, number>();
    for (const [sheetname, columns] of Object.entries(SPREADSHEET_SCHEMA)) {
        const sheet = (spreadsheet?.sheets ?? []).filter((s: null | {properties?:{title?:string}}) => s?.properties?.title === sheetname)[0];
        if (spreadsheet?.spreadsheetId && sheet?.properties?.title) { // worksheet exists
            const range = rangeA1(sheetname, [0, 1], [columns.length, null]);
            promises.push(
                getValues(accessToken, spreadsheet.spreadsheetId, range)
                .then((res) => {
                    if (!res?.range) {
                        console.error(`Failed fetching data of worksheet "${sheetname}":`, res.error);
                        return null;
                    }
                    worksheetIdMap.set(sheetname, sheet?.properties?.sheetId);
                    worksheets.push({
                        id: sheet?.properties?.sheetId ?? '', name: sheetname, columns: columns, values: res.values ?? []
                    });
                })
            );
            continue;
        }
        
        promises.push(
            addWorksheets(user, spreadsheet.spreadsheetId, [sheetname])
            .then(async (res) => {
                if (!(res.replies ?? [])[0]?.addSheet?.properties?.title) {
                    console.error(`Failed creating worksheet "${sheetname}":`, res.error);
                    return null;
                }
                const worksheetId: number = (res.replies?? [])[0]?.addSheet?.properties?.sheetId ?? -1;
                worksheetIdMap.set(sheetname, worksheetId);
                return await addRow(user, spreadsheet.spreadsheetId ?? "", sheetname, columns);
            })
            .then(async (res) => {
                if (!res?.updates?.updatedCells) {
                    console.error(`Failed creating first row of worksheet "${sheetname}":`, res?.error);
                    return null;
                }
                const range = rangeA1(sheetname, [1, null], [columns.length, null]);
                return await getValues(accessToken, spreadsheet.spreadsheetId ?? "", range);
            })
            .then((res) => {
                if (!res?.range) {
                    console.error(`Failed fetching data of worksheet "${sheetname}":`, res.error);
                    return null;
                }
                worksheets.push({
                    id: worksheetIdMap.get(sheetname) as number,
                    name: sheetname,
                    columns: columns,
                    values: res.values ?? []
                });
            })
        );
    }
    await Promise.all(promises);
    return {
        id: spreadsheet.spreadsheetId,
        name: spreadsheet.properties?.title ?? "",
        sheets: worksheets
    };
}
