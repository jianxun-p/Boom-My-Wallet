
export interface Worksheet {
    id: number,
    name: string,
    columns: string[],
    values: string[][],
};

export interface Spreadsheet {
    id: string,
    name: string,
    sheets: Worksheet[],
};

const SPREADSHEET_SCHEMA = {
    "transactions": ["Time", "Amount", "Category", "Name", "Merchant", "PaymentMethod", "Location", "Latitude", "Longitude", "Description"],
    "budgets": ["Time", "Amount", "Category", "Name", "Merchant", "PaymentMethod", "Location", "Latitude", "Longitude", "Description"],
    "general": ["Key", "Value"]
};

/**
 * @see https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
 * @param accessToken 
 * @param parentId 
 * @returns 
 */
export async function listFiles(accessToken: string, parentId: string | null = null) {
    /** @see https://developers.google.com/workspace/drive/api/guides/search-files#examples */
    const q = encodeURIComponent('trashed=false' + (parentId !== null ? ` and '${parentId}' in parents` : ''));
    return await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` }
    })
    .then(res => res.json());
}

/**
 * @see https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
 * @param accessToken 
 * @param folderName 
 * @returns 
 */
export async function createFolder(accessToken: string, folderName: string = "Boom My Wallet") {
    return await fetch('https://www.googleapis.com/drive/v3/files', {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify({
            name: folderName,
            /** @see https://developers.google.com/workspace/drive/api/guides/mime-types */
            mimeType: "application/vnd.google-apps.folder"
        })
    })
    .then(res => res.json());
}

/**
 * @see https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
 * @param accessToken 
 * @param parentFolderId 
 * @param spreadsheetName 
 * @returns 
 */
export async function createSpreadsheetFile(accessToken: string, parentFolderId: string | null = null, spreadsheetName: string = "Boom My Wallet") {
    const body: {name: string, mimeType: string, parents?: string[]} = {
        name: spreadsheetName,
        /** @see https://developers.google.com/workspace/drive/api/guides/mime-types */
        mimeType: "application/vnd.google-apps.spreadsheet"
    };
    if (parentFolderId) body.parents = [parentFolderId];
    return await fetch('https://www.googleapis.com/drive/v3/files', {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify(body)
    })
    .then(res => res.json());
}

/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#addsheetrequest
 * @param accessToken 
 * @param spreadsheetId 
 * @param worksheetNames 
 * @returns 
 */
export async function addWorksheets(accessToken: string, spreadsheetId: string, worksheetNames: string[]) {
    return await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify({
            requests: worksheetNames.map(name => { return { addSheet: { properties: { "title": name } } }; })
        })
    })
    .then(res => res.json());
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
export async function addRow(accessToken: string, spreadsheetId: string, worksheetName: string, row: string[]) {
    const range = rangeA1(worksheetName, [0, 0], [row.length - 1, 0]);
    return await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify({
            "range": range,
            "majorDimension": "ROWS",
            "values": [ row ],
        })
    })
    .then(res => res.json());
}

/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get
 * @param accessToken 
 * @param spreadsheetId 
 * @returns @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets
 */
export async function getSpreadsheet(accessToken: string, spreadsheetId: string) {
    return await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` }
    })
    .then(res => res.json());
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


export async function initSpreadsheet(accessToken: string): Promise<Spreadsheet | null> {
    const files = await listFiles(accessToken);
    if (!files.files) {
        console.error("Failed fetching files:", files.error);
        return null;
    }
    let folder = files.files.filter((f: null | {mimeType:string}) => f?.mimeType === "application/vnd.google-apps.folder")[0];
    if (!folder) folder = await createFolder(accessToken);
    if (!folder?.id) {
        console.error("Failed creating folder:", folder.error);
        return null;
    }
    const folderChildren = await listFiles(accessToken, folder.id);
    let existingSpreadsheet = folderChildren.files.filter((f: null | {mimeType:string}) => f?.mimeType === "application/vnd.google-apps.spreadsheet")[0];
    if (!existingSpreadsheet) existingSpreadsheet = await createSpreadsheetFile(accessToken, folder.id);
    if (!existingSpreadsheet?.id) {
        console.error("Failed creating spreadsheet:", existingSpreadsheet.error);
        return null;
    }
    const spreadsheet = await getSpreadsheet(accessToken, existingSpreadsheet.id);
    if (!spreadsheet?.sheets) {
        console.error("Failed reading spreadsheet:", spreadsheet.error);
        return null;
    }
    const worksheets: Worksheet[] = [];
    const promises = [];
    const worksheetIdMap = new Map<string, number>();
    for (const [sheetname, columns] of Object.entries(SPREADSHEET_SCHEMA)) {
        const sheet = (spreadsheet.sheets ?? []).filter((s: null | {properties?:{title?:string}}) => s?.properties?.title === sheetname)[0];
        if (sheet?.properties?.title) { // worksheet exists
            const range = rangeA1(sheetname, [0, 1], [columns.length, null]);
            promises.push(
                getValues(accessToken, spreadsheet.spreadsheetId, range)
                .then((res) => {
                    if (!res?.range) {
                        console.error(`Failed fetching data of worksheet "${sheetname}":`, res.error);
                        return null;
                    }
                    worksheetIdMap.set(sheetname, sheet.properties.sheetId);
                    worksheets.push({
                        id: sheet.properties.sheetId, name: sheetname, columns: columns, values: res.values ?? []
                    });
                })
            );
            continue;
        }
        promises.push(
            addWorksheets(accessToken, spreadsheet.spreadsheetId, [sheetname])
            .then(async (res) => {
                if (!(res?.replies ?? [])[0]?.addSheet?.properties?.title) {
                    console.error(`Failed creating worksheet "${sheetname}":`, res.error);
                    return null;
                }
                const worksheetId: number = res.replies[0]?.addSheet?.properties?.sheetId;
                worksheetIdMap.set(sheetname, worksheetId);
                return await addRow(accessToken, spreadsheet.spreadsheetId, sheetname, columns);
            })
            .then(async (res) => {
                if (!res?.updates?.updatedCells) {
                    console.error(`Failed creating first row of worksheet "${sheetname}":`, res.error);
                    return null;
                }
                const range = rangeA1(sheetname, [1, null], [columns.length, null]);
                return await getValues(accessToken, spreadsheet.spreadsheetId, range);
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
        name: spreadsheet.properties.title,
        sheets: worksheets
    };
}
