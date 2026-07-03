import { createBrowserRouter, redirect } from 'react-router';

import PrivacyPolicy from '../pages/PrivacyPolicy';
import TermsOfService from '../pages/TermsOfService';

import UserPage from '../pages/UserPage';
import Login from '../pages/login/Login';
import Home from '../pages/home/Home';
import Settings from '../pages/settings/Settings';
import Details from '@/pages/details/Details';

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      {
        index: true,
        loader: async () => redirect('/home'),
      },
      {
        path: 'privacy-policy',
        Component: PrivacyPolicy,
      },
      {
        path: 'terms-of-service',
        Component: TermsOfService,
      },
      {
        path: 'login',
        Component: Login,
      },
      {
        path: 'home',
        Component: UserPage,
        children: [
          {
            index: true,
            Component: Home,
          },
          {
            path: 'details',
            Component: Details,
          },
          {
            path: 'settings',
            Component: Settings,
          },
        ],
      },
    ],
  },
]);
