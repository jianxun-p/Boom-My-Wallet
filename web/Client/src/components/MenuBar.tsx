import type { ReactNode } from "react";
import { useNavigate } from "react-router";



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


export default function MenuBar() {
    const navigate = useNavigate();
    return (
        <div className='menu-bar'>
            <div className='menu-bar-section-1'>
                <MenuBarItem logo="🏠" text="Home" onClick={() => navigate('/home')} />
                <MenuBarItem logo="📃" text="Transactions" onClick={() => navigate('/home/details')} />
                {/* <MenuBarItem logo="📅" text="Plan" onClick={() => navigate('/home/plan')} /> */}
            </div>
            <div className='menu-bar-section-2'>
                <MenuBarItem logo="⚙️" text="Settings" onClick={() => navigate('/home/settings')} />
            </div>
        </div>
    );
}
