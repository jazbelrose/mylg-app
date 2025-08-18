import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';


import { useData } from '../../app/contexts/DataProvider';
import './style.css';

export const Dashboard = () => {
  const { userName, opacity } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const hasRestored = useRef(false);


  const getPageTitle = () => {
    if (location.pathname.startsWith('/dashboard/projects/')) return 'Dashboard - Project Details';
    switch (location.pathname) {
      case '/dashboard':
      return `Dashboard - Welcome, ${userName}`;
      case '/dashboard/new':
        return 'Dashboard - New Project';
      case '/dashboard/projects':
        return 'Dashboard - All Projects';
      case '/dashboard/settings':
        return 'Dashboard - Settings';
      case '/dashboard/collaborators':
        return 'Dashboard - Collaborators';
      default:
        return 'Dashboard';
    }
  };

  useEffect(() => {
    if (location.pathname.startsWith('/dashboard')) {
      try {
        localStorage.setItem('dashboardLastPath', location.pathname + location.search);
      } catch {}
    }
  }, [location]);

  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;
    if (location.pathname === '/dashboard') {
      let saved = null;
      try { saved = localStorage.getItem('dashboardLastPath'); } catch {}
        if (saved && saved !== '/dashboard') {
          const normalized = saved.replace('/dashboard/welcome', '/dashboard');
          navigate(normalized, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
    }
  }, [location, navigate]);

  const opacityClass = opacity === 1 ? 'opacity-high' : 'opacity-low';

  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <title>{getPageTitle()}</title>
        <meta name="description" content="Manage your projects efficiently with the MYLG dashboard." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className={opacityClass}>
        <Outlet />
      </div>
    </>
  );
};

export default Dashboard;
