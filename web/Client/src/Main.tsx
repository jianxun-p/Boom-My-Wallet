import { StrictMode, useEffect, useState, type Dispatch, type SetStateAction, type ReactNode, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import "/style.css";
import * as googleDrive from "./google-drive";
import type { Spreadsheet } from './google-drive';
import Details from './details/details';
import { Home } from './home/Home';
import { Settings } from './settings/Settings';
import { Footer } from './footer';

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
                {/* <MenuBarItem logo="📅" text="Plan" onClick={() => setPage('Plan')} /> */}
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


interface AppData {
    page: State<string>,
    accessToken: State<string>,
    spreadsheet: State<Spreadsheet | null>,
    uid: State<string>
}

export function Content(data: AppData) {
    if (data.page.get === 'Transactions') {
        return (
            <div className='content-wrapper'>
                <Details 
                    spreadsheet={data.spreadsheet} 
                    accessToken={data.accessToken.get} 
                />
            </div>
        );
    } else if (data.page.get === 'Settings') {
        return (
            <div className='content-wrapper'>
                <Settings uid={data.uid.get} />
            </div>
        );
    } else if (data.page.get === 'Home') {
        return (
            <div className='content-wrapper'>
                <Home />
            </div>
        );
    } else {
        return <div className='content-wrapper'>
            <Footer />
        </div>;
    }
}


export function App() {
    const [page, setPage] = useState('Home');
    const [spreadsheet, setSpreadsheet] = useState<Spreadsheet | null>(null);
    const [accessToken, setAccessToken] = useState<string>("");
    const [uid, setUid] = useState<string>("");
    const hasFetchedData = useRef(false);


    const fetchSpreadsheetData = (uid: string) => {
        fetch('/oauth/google/access_token')
        .then(res => res.json())
        .then(data => {
            if (data.error) 
                window.location.href = '/login.html';
            setAccessToken(data.access_token); 
            return data.access_token;
        })
        .then(accessToken => googleDrive.initSpreadsheet(uid, accessToken))
        .then(spreadsheet => { 
            if (spreadsheet) setSpreadsheet(spreadsheet);
        });
    };

    useEffect(() => {
        if (hasFetchedData.current)
            return;

        fetch('/oauth/user')
        .then(res => res.json())
        .then(data => {
            if (data.error) 
                window.location.href = '/login.html';
            setUid(data.uid.toString()); 
            return data.uid.toString();
        }).then(fetchSpreadsheetData);
        
        hasFetchedData.current = true;
    }, []);
    const data = {
        page: { get: page, set: setPage },
        accessToken: { get: accessToken, set: setAccessToken },
        spreadsheet: { get: spreadsheet, set: setSpreadsheet },
        uid: {get: uid, set: setUid }
    };
    return <>
        <MenuBar setPage={setPage} />
        <Content {...data} />
    </>;
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
