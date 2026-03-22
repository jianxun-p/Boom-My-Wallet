import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import '/style.css';
import './settings.css';
import { Footer } from '../footer';


interface State<T> {
    get: T,
    set: Dispatch<SetStateAction<T>>
}

function getSettings(settings: State<{name: string, value: string}[]>) {
    fetch('/api/v1/account', { method: 'GET' })
    .then(res => res.json())
    .then(data => Object.entries(data).map(pair => {
        return { name: pair[0].toString(), value: pair[1]?.toString() ?? '' };
    }))
    .then(lst => settings.set(lst));
}

function HeaderRow() {
    return <div className='settings-header-row'>
        <div className='settings-item-name'>Name</div>
        <div className='settings-item-value'>Value</div>
    </div>;
}

function Entry({name, value}: {name: string, value: string}) {
    return <div className='settings-item'>
        <div className='settings-item-name'>{name}</div>
        <div className='settings-item-value'>{value}</div>
    </div>;
}

export function Settings() {
    const [settings, setSettings] = useState<{name: string, value: string}[]>([]);
    useEffect(() => {
        getSettings({get: settings, set: setSettings});
    }, []);
    return <div className='settings-wrapper'>
        <h1 className='settings-header'>Settings</h1>
        <section>
        <h2 className='settings-header'>Accounts</h2>
        <div className='settings-content'>
            <HeaderRow />
            {settings.map(setting => <Entry name={setting.name} value={setting.value} />)}
        </div>
        </section>
        <Footer />
    </div>;
}
