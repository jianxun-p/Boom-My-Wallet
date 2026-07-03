export type GoogleOAuthTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
};

export type GoogleApiErrorResponse = {
  error?: {
    errors: Record<string, unknown>;
    code: number;
    message: string;
  };
};

export type GoogleDriveFileResponse = {
  id: string;
  kind?: string;
  mimeType?: string;
  name?: string;
};

export type GoogleDriveListedFile = GoogleDriveFileResponse & {
  kind: string;
  mimeType: string;
  name: string;
};

export type GoogleDriveListFilesResponse = {
  files: GoogleDriveListedFile[];
  nextPageToken?: string;
  kind?: string;
  incompleteSearch?: boolean;
};

export type GoogleSheetCellValue = boolean | number | string | null;

export type GoogleSheetDimension = 'ROWS' | 'COLUMNS';

export type GoogleValueRangeResponse = {
  range?: string;
  majorDimension?: GoogleSheetDimension;
  values?: GoogleSheetCellValue[][];
};

export type GoogleUpdateValuesResponse = {
  spreadsheetId?: string;
  updatedRange?: string;
  updatedRows?: number;
  updatedColumns?: number;
  updatedCells?: number;
  updatedData?: GoogleValueRangeResponse;
};

export type GoogleAppendValuesResponse = {
  spreadsheetId?: string;
  tableRange?: string;
  updates?: GoogleUpdateValuesResponse;
};

export type GoogleBatchUpdateValuesResponse = {
  spreadsheetId?: string;
  totalUpdatedRows?: number;
  totalUpdatedColumns?: number;
  totalUpdatedCells?: number;
  totalUpdatedSheets?: number;
  responses?: GoogleUpdateValuesResponse[];
};

export type GoogleSheetProperties = {
  sheetId: number;
  title: string;
};

export type GoogleSpreadsheetResponse = {
  spreadsheetId: string;
  properties: {
    title: string;
  };
  sheets: {
    properties: GoogleSheetProperties;
  }[];
};

export type GoogleAddSheetReply = {
  addSheet: {
    properties: GoogleSheetProperties;
  };
};

export type GoogleAddWorksheetsResponse = {
  spreadsheetId?: string;
  replies: GoogleAddSheetReply[];
  updatedSpreadsheet?: GoogleSpreadsheetResponse;
};

export type GoogleSpreadsheetBatchUpdateResponse = {
  spreadsheetId?: string;
  replies?: (GoogleAddSheetReply | Record<string, never>)[];
  updatedSpreadsheet?: GoogleSpreadsheetResponse;
};
