import { StrictMode, useEffect, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import "/style.css";
import * as googleDrive from "./google-drive";
import type { Spreadsheet } from './google-drive';
import Details from './details/details';

export function MenuBarItem({ logo, text, onClick }: {logo: string | ReactNode, text: string | ReactNode, onClick?: {(): void} }) {
    return (
        <div className='menu-bar-item-wrapper' onClick={onClick}>
            <div className='menu-bar-item'>
                <div className='menu-bar-item-logo'>{logo}</div>
                <div className='menu-bar-item-text'>{text}</div>
            </div>
        </div>
    );
}


export function MenuBar({setPage}: {setPage: Dispatch<SetStateAction<string>>}) {
    return (
        <div className='menu-bar'>
            <div className='menu-bar-section-1'>
                <MenuBarItem logo="🏠" text="Home" onClick={() => setPage('Home')} />
                <MenuBarItem logo="📃" text="Transactions" onClick={() => setPage('Transactions')} />
                <MenuBarItem logo="📅" text="Plan" onClick={() => setPage('Plan')} />
            </div>
            <div className='menu-bar-section-2'>
                <MenuBarItem logo="⚙️" text="Settings" onClick={() => setPage('Settings')} />
            </div>
        </div>
    );
}

interface State<T> {
    get: T,
    set: Dispatch<SetStateAction<T>>
}

export function Content({page, spreadsheet, accessToken}: {page: string, spreadsheet: State<Spreadsheet>, accessToken: string}) {
    if (page === 'Transactions') {
        return (
            <div className='content-wrapper'>
                <Details spreadsheet={spreadsheet} accessToken={accessToken} />
            </div>
        );
    } else {
        return <></>;
    }
}

export function App() {
    const [page, setPage] = useState('Home');
    const [spreadsheet, setSpreadsheet] = useState<Spreadsheet>({id: "", name: "", sheets: []});
    const [accessToken, setAccessToken] = useState<string>("");
    useEffect(() => {
        fetch('/oauth/google/access_token')
        .then(res => res.json())
        .then(data => {
            if (data.error) 
                window.location.href = '/login.html';
            setAccessToken(data.access_token); 
            return data.access_token;
        })
        .then(accessToken => googleDrive.initSpreadsheet(accessToken))
        .then(spreadsheet => { 
            if (spreadsheet) setSpreadsheet(spreadsheet); else alert('Failed initializing spreadsheet, please contact me.'); 
        });
    }, []);
    return <>
        <MenuBar setPage={setPage} />
        <Content page={page} spreadsheet={{get: spreadsheet, set: setSpreadsheet}} accessToken={accessToken} />
    </>;
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
