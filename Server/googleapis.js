
/**
 * @param {number} column (zero based indexing)
 * @param {number | null} row (zero based indexing)
 * @returns e.g. "A2" (column: 0, row: 1), "C" (column: 2, row: null)
 */
function cellA1(column, row) {
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
 * @param {string} worksheetName 
 * @param {[number, number | null]} startCell [column, row] (zero based indexing)
 * @param {[number, number | null]} endCell 
 * @returns Range in A1 Notation
 */
function rangeA1(worksheetName, startCell, endCell) {
    return `'${worksheetName}'!${cellA1(...startCell)}:${cellA1(...endCell)}`;
}

/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/ValueInputOption
 * @param {string} accessToken 
 * @param {string} spreadsheetId 
 * @param {string} worksheetName 
 * @param {string[]} row 
 * @returns 
 */
async function addRow(accessToken, spreadsheetId, worksheetName, row) {
    const range = rangeA1(worksheetName, [0, null], [row.length - 1, null]);
    return await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW`, {
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

module.exports = {
    addRow
}
