import { useEffect, useState, type Dispatch, type SetStateAction, type MouseEvent, useRef } from 'react';
import '/style.css';
import './settings.css';
import { Footer } from '../footer';


interface State<T> {
    get: T,
    set: Dispatch<SetStateAction<T>>
}

function getSettings(settings: State<{name: string, value: string}[]>) {
    fetch('/oauth/user', { method: 'GET' })
    .then(res => res.json())
    .then(data => Object.entries(data).map(pair => {
        return { name: pair[0].toString(), value: pair[1]?.toString() ?? '' };
    }))
    .then(lst => settings.set(lst));
}

function getApiKeys(uid: string, apiKeys: State<{name: string, createdOn: Date}[]>) {
    fetch(`/api/v1/users/${encodeURIComponent(uid)}/apikey/list`, { method: 'GET' })
    .then(res => res.json())
    .then(data => data.apikeys.map((k: { name: string | null; createdOn: number; }) => {
        return { name: k.name ?? "", createdOn: new Date(k.createdOn) };
    }))
    .then(lst => apiKeys.set(lst));
}

function HeaderRow({keyTitle, valueTitle}: {keyTitle: string, valueTitle: string}) {
    return <div className='settings-header-row'>
        <div className='settings-item-name'>{keyTitle}</div>
        <div className='settings-item-value'>{valueTitle}</div>
    </div>;
}

function Entry({name, value}: {name: string, value: string}) {
    return <div className='settings-item'>
        <div className='settings-item-name'>{name}</div>
        <div className='settings-item-value'>{value}</div>
    </div>;
}

export function Settings({uid}: {uid: string}) {
    const [settings, setSettings] = useState<{name: string, value: string}[]>([]);
    const [apiKeys, setApiKeys] = useState<{name: string, createdOn: Date}[]>([]);
    const [error, setError] = useState<string>('');
    const [lastCreatedKey, setLastCreatedKey] = useState<string>('');
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, name: string} | null>(null);
    const fetchedData = useRef<boolean>(false);

    const refreshApiKeys = () => getApiKeys(uid, {get: apiKeys, set: setApiKeys});

    async function createApiKey() {
        setError('');
        setLastCreatedKey('');
        const name = window.prompt('Enter API key name');
        if (name === null) {
            return;
        }
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('API key name is required');
            return;
        }

        const response = await fetch(`/api/v1/users/${encodeURIComponent(uid)}/apikey`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trimmedName }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            setError(data?.error?.message ?? 'Failed creating API key');
            return;
        }

        setLastCreatedKey(data?.apikey?.key ?? '');
        refreshApiKeys();
    }

    async function deleteApiKey(name: string) {
        setError('');
        setContextMenu(null);
        if (!window.confirm("Do yo really want to delete the following API Key:\n" + name))
            return
        const response = await fetch(`/api/v1/users/${encodeURIComponent(uid)}/apikey/${encodeURIComponent(name)}`, {
            method: 'DELETE',
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            setError(data?.error?.message ?? 'Failed deleting API key');
            return;
        }
        refreshApiKeys();
    }

    function onApiKeyRightClick(event: MouseEvent<HTMLDivElement>, name: string) {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, name });
    }

    useEffect(() => {
        if (fetchedData.current)
            return;
        getSettings({get: settings, set: setSettings});
        refreshApiKeys();
        fetchedData.current = true;
    }, []);

    return <div className='settings-wrapper'>
        <h1 className='settings-header'>Settings</h1>
        <section>
        <h2 className='settings-header'>Accounts</h2>
        <div className='settings-content'>
            <HeaderRow keyTitle="Name" valueTitle='Value' />
            {settings.map(setting => <Entry name={setting.name} value={setting.value} />)}
        </div>
        </section>
        <section>
        <div className='settings-section-header'>
            <h2 className='settings-header'>API Keys</h2>
            <button className='settings-add-button' onClick={createApiKey}>Add</button>
        </div>
        {lastCreatedKey ? <div className='settings-feedback'>
            New API key (copy now): {lastCreatedKey}
        </div> : null}
        {error ? <div className='settings-error'>{error}</div> : null}
        <div className='settings-content'>
            <HeaderRow keyTitle="Name" valueTitle='Created On' />
            {apiKeys.map(k => (
                <div key={`${k.name}-${k.createdOn.getTime()}`} onContextMenu={event => onApiKeyRightClick(event, k.name)}>
                    <Entry name={k.name} value={k.createdOn.toString()} />
                </div>
            ))}
        </div>
        </section>
        {contextMenu ? <div
            className='settings-context-menu'
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onMouseLeave={() => setContextMenu(null)}
        >
            <button className='settings-context-menu-delete' onClick={() => deleteApiKey(contextMenu.name)}>
                Delete {contextMenu.name}
            </button>
        </div> : null}
        {contextMenu ? <div className='settings-context-menu-backdrop' onClick={() => setContextMenu(null)} /> : null}
        <Footer />
    </div>;
}
