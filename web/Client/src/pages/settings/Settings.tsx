import { useEffect, useState, type MouseEvent, useCallback } from 'react';
import '/style.css';
import './settings.css';
import { useUser } from '../../middleware/Context';
import { requestUserApi, UserAPI } from '../../platforms/BoomMyWallet';
import type { User } from '../../types/user';
import Loading from '@/components/Loading';


const DISPLAY_ACOUNT_INFO_WHITELIST = [
    "uid",
];

function getSettings(user: User): { name: string, value: string }[] {
    return Object
    .entries(user)
    .filter(([key, ]) => DISPLAY_ACOUNT_INFO_WHITELIST.find(v => v === key))
    .map(([name, value]) => { return { name, value }; });
}

function getApiKeys(user: User): Promise<{name: string, createdOn: Date}[]> {
    interface ApiKey {
        name: string | null
        createdOn: number
    }
    return requestUserApi(user, UserAPI.ListApiKeys)
    .then(data => (data.apikeys as ApiKey[]).map((k: ApiKey) => {
        return { name: k.name ?? "", createdOn: new Date(k.createdOn) };
    }))
    .catch(e => {
        console.error("Error occured when fetching API Keys:", e);
        return [];
    });
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

export default function Settings() {
    const user = useUser();
    const [apiKeys, setApiKeys] = useState<{name: string, createdOn: Date}[]>([]);
    const [error, setError] = useState<string>('');
    const [lastCreatedKey, setLastCreatedKey] = useState<string>('');
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, name: string} | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const refreshApiKeys = useCallback(() => {
        if (user?.uid) {
            setLoading(true);
            getApiKeys(user)
            .then((keys) => setApiKeys(keys))
            .finally(() => setLoading(false));
        }
    }, [user]);

    useEffect(() => {
        refreshApiKeys();
    }, [refreshApiKeys]);

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

        setLoading(true);
        await requestUserApi(user, UserAPI.CreateApiKey, { name: trimmedName })
            .then(data => data as {apikey: {key: string}})
            .then(data => setLastCreatedKey(data.apikey.key ?? ''))
            .then(async () => getApiKeys(user))
            .catch(e => {
                setError('Failed creating API key: ' + String(e));
            })
            .finally(() => setLoading(false));
    }

    async function deleteApiKey(name: string) {
        setError('');
        setContextMenu(null);
        if (!window.confirm("Do yo really want to delete the following API Key:\n" + name))
            return
        setLoading(true);
        requestUserApi(user, UserAPI.DeleteApiKey, { name })
        .catch(e => {
            setError('Failed deleting API key: ' + String(e));
        })
        .finally(() => setLoading(false));
        refreshApiKeys();
    }

    function onApiKeyRightClick(event: MouseEvent<HTMLDivElement>, name: string) {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, name });
    }

    const settings = getSettings(user);

    const $settings = (
        <div className='settings-wrapper'>
            <h1 className='settings-header'>Settings</h1>
            <section>
            <h2 className='settings-header'>Account Info</h2>
            <div className='settings-content'>
                <HeaderRow keyTitle="Name" valueTitle='Value' />
                {settings.map(setting => <Entry key={setting.name} name={setting.name} value={setting.value} />)}
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
        </div>
    );

    return <>
        <Loading loading={loading}/>
        {$settings}
    </>;
}
