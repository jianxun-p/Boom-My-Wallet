import type {
  GoogleAddWorksheetsResponse,
  GoogleApiErrorResponse,
  GoogleAppendValuesResponse,
  GoogleBatchUpdateValuesResponse,
  GoogleDriveFileResponse,
  GoogleDriveListedFile,
  GoogleDriveListFilesResponse,
  GoogleSheetCellValue,
  GoogleSheetProperties,
  GoogleSpreadsheetBatchUpdateResponse,
  GoogleSpreadsheetResponse,
  GoogleUpdateValuesResponse,
  GoogleValueRangeResponse,
} from '@/types/googleApis.d.ts';

export const GoogleAPI = {
  OAuth: {
    /** @see https://developers.google.com/identity/protocols/oauth2/web-server?#offline */
    Token: { method: 'POST', url: 'https://oauth2.googleapis.com/token' },
  },

  Drive: {
    /** @see https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list */
    ListFiles: { method: 'GET', url: 'https://www.googleapis.com/drive/v3/files' },

    /**  @see https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create */
    CreateFile: { method: 'POST', url: 'https://www.googleapis.com/drive/v3/files' },

    /**  @see https://developers.google.com/workspace/drive/api/guides/manage-uploads?#http_1 */
    UploadFile: { method: 'POST', url: 'https://www.googleapis.com/upload/drive/v3/files' },
  },

  Spreadsheet: {
    /**
     * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get
     * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets
     */
    GetSpreadsheet: {
      method: 'GET',
      url: 'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}',
    },

    /**
     * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
     * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#addsheetrequest
     */
    AddWorksheets: {
      method: 'POST',
      url: 'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}:batchUpdate',
    },

    /**
     * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
     * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/ValueInputOption
     */
    AppendRow: {
      method: 'POST',
      url: 'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}:append',
    },

    /**
     * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
     * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values
     */
    GetRows: {
      method: 'GET',
      url: 'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{rangeA1Notation}',
    },

    /** @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values#resource:-valuerange */
    UpdateRows: {
      method: 'PUT',
      url: 'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{rangeA1Notation}',
    },

    /** @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate */
    BatchUpdateRows: {
      method: 'POST',
      url: 'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values:batchUpdate',
    },

    /** @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request */
    BatchUpdate: {
      method: 'POST',
      url: 'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}:batchUpdate',
    },
  },
} as const;

interface GoogleApi {
  method: string;
  url: string;
}

/**
 * @see https://developers.google.com/workspace/drive/api/guides/handle-errors
 * @param accessToken
 * @param api
 * @param params
 * @param query
 * @returns
 */
export async function requestGoogleApi<TResponse = Record<string, unknown>>(
  accessToken: string | null,
  api: GoogleApi,
  body?: Record<string, unknown>,
  query?: Record<string, string>,
  params?: Record<string, string>,
): Promise<TResponse> {
  const url =
    Object.entries(params ?? {}).reduce((acc, [key, val]) => {
      return acc.replaceAll(`{${key}}`, String(val));
    }, String(api.url)) + `?${new URLSearchParams(query ?? {})}`;

  const hasBody = api.method !== 'GET' && api.method !== 'HEAD' && body;
  return await fetch(url, {
    method: api.method,
    body: hasBody ? JSON.stringify(body) : undefined,
    headers: accessToken === null ? {} : { Authorization: `Bearer ${accessToken}` },
  })
    .then((res) => {
      if (res.ok) return res.json() as Promise<TResponse & GoogleApiErrorResponse>;
      return Promise.reject(Error(`${res.status} ${res.statusText}: ${res.body}`));
    })
    .then((res) => {
      if (res.error)
        return Promise.reject(Error(`${res.error.code} ${res.error.message}: ${res.error.errors}`));
      return Promise.resolve(res as TResponse);
    });
}

export async function listFiles(
  accessToken: string,
  parentId?: string,
): Promise<GoogleDriveListedFile[]> {
  return await requestGoogleApi<GoogleDriveListFilesResponse>(
    accessToken,
    GoogleAPI.Drive.ListFiles,
    undefined,
    {
      /** @see https://developers.google.com/workspace/drive/api/guides/search-files#examples */
      q: 'trashed=false' + (parentId ? ` and '${parentId}' in parents` : ''),
    },
  ).then((res) => res.files);
}
export async function createFolder(
  accessToken: string,
  folderName: string = 'Boom My Wallet',
): Promise<GoogleDriveFileResponse> {
  return await requestGoogleApi<GoogleDriveFileResponse>(accessToken, GoogleAPI.Drive.CreateFile, {
    name: folderName,
    /** @see https://developers.google.com/workspace/drive/api/guides/mime-types */
    mimeType: 'application/vnd.google-apps.folder',
  });
}
/**
 * @see https://developers.google.com/workspace/drive/api/guides/manage-uploads?#multipart
 * @see https://developers.google.com/workspace/drive/api/guides/create-file?#fields-parameter
 * @param accessToken
 * @param fileName
 * @param fileData
 * @param parentFolderId
 * @param [update=false]
 */
export async function uploadFile(
  accessToken: string,
  fileName: string,
  fileData: Buffer,
  fileMimeType: string,
  parentFolderId?: string,
  update: boolean = false,
): Promise<GoogleDriveFileResponse> {
  type FileMetaData = {
    name: string;
    mimeType: string;
    parents?: string[];
  };
  const metadata: FileMetaData = {
    name: fileName,
    mimeType: fileMimeType,
  };
  if (parentFolderId !== undefined) {
    metadata.parents = [parentFolderId];
  }
  const boundary = `----DriveImageUpload${Date.now()}Boundary`;
  const metadataHeader = 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
  const metadataPart = Buffer.from(metadataHeader + JSON.stringify(metadata) + '\r\n');
  const mediaPartHeader = Buffer.from(`Content-Type: ${fileMimeType}\r\n\r\n`);
  const requestBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    metadataPart,
    Buffer.from(`--${boundary}\r\n`),
    mediaPartHeader,
    fileData,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  return await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: update ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'multipart/related; boundary=content_boundary',
      'Content-Length': requestBody.length.toString(),
      'X-Goog-FieldMask': 'files(id)',
    },
    body: requestBody,
  }).then((res) => {
    if (res.ok) return res.json() as Promise<GoogleDriveFileResponse>;
    return Promise.reject(
      Error(`Failed to upload file to Google Drive: ${res.status} ${res.statusText}: ${res.body}`),
    );
  });
}

export async function createSpreadsheetFile(
  accessToken: string,
  spreadsheetName: string = 'Boom My Wallet',
  parentFolderId?: string,
): Promise<GoogleDriveFileResponse> {
  return await requestGoogleApi<GoogleDriveFileResponse>(accessToken, GoogleAPI.Drive.CreateFile, {
    name: spreadsheetName,
    /** @see https://developers.google.com/workspace/drive/api/guides/mime-types */
    mimeType: 'application/vnd.google-apps.spreadsheet',
    parents: parentFolderId !== undefined ? [parentFolderId] : undefined,
  });
}
/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#addsheetrequest
 */
export async function addWorksheets(
  accessToken: string,
  spreadsheetId: string,
  worksheetNames: string[],
): Promise<GoogleSheetProperties[]> {
  if (worksheetNames.length === 0) {
    return [];
  }
  return await requestGoogleApi<GoogleAddWorksheetsResponse>(
    accessToken,
    GoogleAPI.Spreadsheet.AddWorksheets,
    {
      requests: worksheetNames.map((name) => {
        return { addSheet: { properties: { title: name } } };
      }),
    },
    undefined,
    { spreadsheetId },
  ).then((res) => res.replies.map((r) => r.addSheet.properties));
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
    columnA1 = String.fromCharCode(A + (column % 26)) + columnA1;
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
export function rangeA1(
  worksheetName: string,
  startCell: [number, number | null],
  endCell: [number, number | null],
): string {
  return `'${worksheetName}'!${cellA1(...startCell)}:${cellA1(...endCell)}`;
}
/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/ValueInputOption
 * @param accessToken
 * @param spreadsheetId
 * @param worksheetName
 * @param rows
 * @returns
 */
export async function addRows(
  accessToken: string,
  spreadsheetId: string,
  worksheetName: string,
  rows: string[][],
): Promise<GoogleAppendValuesResponse> {
  return await requestGoogleApi<GoogleAppendValuesResponse>(
    accessToken,
    GoogleAPI.Spreadsheet.AppendRow,
    {
      range: `'${worksheetName}'`,
      majorDimension: 'ROWS',
      values: rows,
    },
    {
      valueInputOption: 'USER_ENTERED',
    },
    {
      range: `'${worksheetName}'`,
      spreadsheetId,
    },
  );
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
export async function addRow(
  accessToken: string,
  spreadsheetId: string,
  worksheetName: string,
  row: string[],
): Promise<GoogleAppendValuesResponse> {
  return await addRows(accessToken, spreadsheetId, worksheetName, [row]);
}
/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get
 * @returns @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets
 */
export async function getSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
): Promise<GoogleSpreadsheetResponse> {
  return await requestGoogleApi<GoogleSpreadsheetResponse>(
    accessToken,
    GoogleAPI.Spreadsheet.GetSpreadsheet,
    undefined,
    undefined,
    { spreadsheetId },
  );
}
/**
 *
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
 * @param accessToken
 * @param spreadsheetId
 * @param worksheetName
 * @returns @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values
 */
export async function getValues(
  accessToken: string,
  spreadsheetId: string,
  rangeA1Notation: string,
): Promise<GoogleSheetCellValue[][]> {
  return await requestGoogleApi<GoogleValueRangeResponse>(
    accessToken,
    GoogleAPI.Spreadsheet.GetRows,
    undefined,
    { valueRenderOption: 'UNFORMATTED_VALUE' },
    { spreadsheetId, rangeA1Notation },
  ).then((data) => data.values as GoogleSheetCellValue[][]);
}
/**
 *
 * @param accessToken
 * @param spreadsheetId
 * @param values
 */
export async function updateValues(
  accessToken: string,
  spreadsheetId: string,
  values: Record<string, GoogleSheetCellValue[][]>,
): Promise<GoogleBatchUpdateValuesResponse> {
  return await requestGoogleApi<GoogleBatchUpdateValuesResponse>(
    accessToken,
    GoogleAPI.Spreadsheet.BatchUpdateRows,
    {
      data: Object.entries(values).map(([rangeA1Notation, values]) => {
        return {
          range: rangeA1Notation,
          values: values,
          majorDimension: 'ROWS',
        };
      }),
      valueInputOption: 'RAW',
      includeValuesInResponse: false,
    },
    {
      spreadsheetId,
    },
  );
}
/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values#resource:-valuerange
 * @param accessToken
 * @param spreadsheetId
 * @param rangeA1Notation
 * @param values
 * @returns
 */
export async function updateRows(
  accessToken: string,
  spreadsheetId: string,
  rangeA1Notation: string,
  values: GoogleSheetCellValue[][],
): Promise<GoogleUpdateValuesResponse> {
  return await requestGoogleApi<GoogleUpdateValuesResponse>(
    accessToken,
    GoogleAPI.Spreadsheet.UpdateRows,
    {
      range: rangeA1Notation,
      values: values,
    },
    {
      spreadsheetId,
      rangeA1Notation,
      valueInputOption: 'RAW',
    },
  );
}
/**
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request?#cutpasterequest
 * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request?#deletedimensionrequest
 * @param accessToken
 * @param spreadsheetId
 * @param startRow
 * @param endRow
 * @returns
 */
export async function deleteRow(
  accessToken: string,
  spreadsheetId: string,
  worksheetId: number,
  startRow: number,
  endRow: number,
): Promise<GoogleSpreadsheetBatchUpdateResponse> {
  return await requestGoogleApi<GoogleSpreadsheetBatchUpdateResponse>(
    accessToken,
    GoogleAPI.Spreadsheet.BatchUpdate,
    {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: worksheetId,
              dimension: 'ROWS',
              startIndex: startRow,
              endIndex: endRow,
            },
          },
        },
      ],
    },
    { spreadsheetId },
  );
}
