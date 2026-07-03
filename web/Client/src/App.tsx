import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './routers/routes';
import { StrictMode } from 'react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
