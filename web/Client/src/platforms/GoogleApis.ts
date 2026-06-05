import type { User } from "../types/user";

export const GoogleAPI = {

    Drive: {

        baseUrl: '',

        /** @see https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list */ 
        ListFiles: { method: "GET", url: "https://www.googleapis.com/drive/v3/files" },
        /**  @see https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create */
        CreateFile: { method: "POST", url: "https://www.googleapis.com/drive/v3/files" },
    },

    Spreadsheet: {
        /**
         * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
         * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#addsheetrequest
         */
        AddWorksheets: { method: "POST", url: "https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}:batchUpdate" },

        /**
         * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
         * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/ValueInputOption
         */
        AppendRow: { method: "POST", url: "https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}:append" },

        /**
         * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/get
         * @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets
         */
        GetSpreadsheet: { method: "GET", url: "https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}" },
    },

    

} as const;

interface GoogleApi {
    method: string
    url: string
}


export async function requestGoogleApi(
    user: User, 
    api: GoogleApi,
    params?: Record<string, unknown>, 
    query?: Record<string, string>,
): Promise<Record<string, unknown>> {
    if (!user.google?.accessToken) {
        throw Error("Unauthorized");
    }

    const url = Object.entries(params ?? {}).reduce(
        (acc, [key, val]) => {
            return acc.replaceAll(`{${key}}`, String(val))
        },
        String(api.url)
    ) +`?${new URLSearchParams(query ?? {})}`;

    const hasBody = api.method !== 'GET' && api.method !== 'HEAD' && params;
    return await fetch(
        url,
        {
            method: api.method,
            body: hasBody ? JSON.stringify(params) : undefined,
            headers: {
                "Authorization": `Bearer ${user.google.accessToken}`,
            }
        }
    )
    .then(res => {
        if (res.ok)
            return res.json();
        throw Error(`${res.status} ${res.statusText}: ${res.body}`);
    })
}
