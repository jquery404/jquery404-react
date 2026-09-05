import React, { useState, useEffect } from 'react';
import { useLocation, Link, NavLink } from 'react-router-dom';
import Footer from './components/Footer';
import { AgentChatPanel } from './agent/AgentChatPanel';

function MiniNav() {
  return (
    <nav className='mini-nav'>
      <div className='mini-nav-inner'>
        <Link className='mini-nav-brand' to='/' aria-label='Home'>
          <img src='/assets/imgs/logo-mark.png' alt='' />
        </Link>
        <div className='mini-nav-links'>
          <NavLink to='/research'>Research</NavLink>
          <NavLink to='/project'>Projects</NavLink>
          <NavLink to='/photo'>Photo</NavLink>
          <NavLink
            to='/contact'
            className={({ isActive }) => `mini-nav-cta${isActive ? ' active' : ''}`}
          >
            Say hi <i className='fas fa-arrow-right' aria-hidden='true' />
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

function App({ children }) {
  const location = useLocation();
  const [ipInfo, setIpInfo] = useState(null);
  // Removed unused error state since it's not being used in the component

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pathname = location.pathname;

        // Only fetch if we don't have IP info yet
        if (ipInfo === null) {
          const response = await fetch('https://ipapi.co/json/');
          if (!response.ok) throw new Error('Failed to fetch IP information');

          const data = await response.json();
          if (data.country_code === 'ID') {
            window.location.href = 'https://www.google.com';
            return; // Exit if redirecting
          }

          // Set initial IP info with current path
          setIpInfo({ ...data, country_population: pathname });
        } else {
          // Update only the pathname if IP info already exists
          setIpInfo((prev) => ({ ...prev, country_population: pathname }));
        }
      } catch (err) {
        console.error('Error fetching IP info:', err);
        // Handle error if needed
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const isFullBleed = location.pathname === '/movies';
  const isV2 = location.pathname === '/v2';
  const isHome = location.pathname === '/';
  const hideChrome = isFullBleed || isV2;
  const fullWidth = hideChrome || isHome;

  useEffect(() => {
    document.body.classList.toggle('home-active', isHome);
    document.body.classList.toggle('nonav-active', true);
    document.body.classList.toggle('mininav-active', !isV2 && !isHome);
    return () => {
      document.body.classList.remove('home-active');
      document.body.classList.remove('nonav-active');
      document.body.classList.remove('mininav-active');
    };
  }, [isHome, isFullBleed, isV2]);

  return (
    <div className={`App${isFullBleed ? ' app-fullbleed' : ''}${isV2 ? ' app-v2' : ''}${isHome ? ' app-home' : ''}`}>
      {!isV2 && !isHome && <MiniNav />}
      <div className={`container-fluid${fullWidth ? ' is-fullbleed' : ''}`}>
        <div className='row'>
          <div className='col-sm-12'>
            {fullWidth ? children : <div className='page-shell'>{children}</div>}
          </div>
        </div>
      </div>
      {!hideChrome && !isHome && <Footer />}
      {!hideChrome && <AgentChatPanel />}
    </div>
  );
}

export default App;
