import '../style.css';
import { Outlet } from 'react-router';
import MenuBar from '../components/MenuBar';
import { UserContext } from '../middleware/ContextProvider';
import Footer from '../components/Footer';

export default function UserPage() {
  return (
    <UserContext>
      <div className="inline">
        <MenuBar />
        <div className="content-wrapper flex flex-col min-h-dvh">
          <div className="relative flex-1">
            <Outlet />
          </div>
          <div className="w-full mt-auto">
            <Footer />
          </div>
        </div>
      </div>
    </UserContext>
  );
}
