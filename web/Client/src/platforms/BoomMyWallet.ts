import type { User } from "../types/user";

const API_BASE_URL = import.meta.env.VITE_API_BASE ?? "";

export const UserAPI = {
    ListApiKeys: { method: "GET", path: "/apikeys/list" },
    CreateApiKey: { method: "POST", path: "/apikeys" },
    GetApiKey: { method: "GET", path: "/apikeys/{name}" },
    DeleteApiKey: { method: "DELETE", path: "/apikeys/{name}" },

    PostTransaction: { method: "POST", path: "/transaction" },

    UpdateGoogleSheetsInfo: { method: "PUT", path: "/google_sheets" },
} as const;

export type UserAPI = typeof UserAPI[keyof typeof UserAPI];

export async function getUser(): Promise<{ uid: string }> {
    const url = `${API_BASE_URL}/oauth/user`;
    return await fetch(url,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        }
    )
    .then(res => {
        if (res.ok)
            return res.json();
        throw Error(`${res.status} ${res.statusText}: ${res.body}`);
    })
    .then(data => {
        if (data.error) {
            throw Error("Unauthorized");
        } else {
            return data;
        }
    })
}

export async function getGoogleAccessToken(): Promise<string> {
    const url = `${API_BASE_URL}/oauth/google/access_token`;
    return await fetch(url,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        }
    )
    .then(res => {
        if (res.ok)
            return res.json();
        throw Error(`${res.status} ${res.statusText}: ${res.body}`);
    })
    .then(data => {
        if (data.error) {
            throw Error("Unauthorized");
        } else {
            return data.access_token;
        }
    })
}

export async function requestUserApi(
    user: User, 
    api: UserAPI, 
    params?: Record<string, unknown>, 
    query?: Record<string, string>
): Promise<Record<string, unknown>> {
    const apiPath = Object.entries(params ?? {}).reduce(
        (acc, [key, val]) => {
            return acc.replaceAll(`{${key}}`, String(val))
        },
        String(api.path)
    )
    const urlSearchParams = new URLSearchParams(query ?? {})
    const url = `${API_BASE_URL}/api/v1/users/${encodeURIComponent(user.uid)}${apiPath}?${urlSearchParams}`;
    return await fetch(url,
        {
            method: api.method,
            body: params ? JSON.stringify(params) : undefined,
            headers: {
                "Content-Type": "application/json",
                "Token": user.token, 
            }
        }
    )
    .then(res => {
        if (res.ok)
            return res.json();
        throw Error(`${res.status} ${res.statusText}: ${res.body}`);
    })
    .then(data => {
        if (data.error) {
            throw Error(data.error);
        } else {
            return data;
        }
    })
}
