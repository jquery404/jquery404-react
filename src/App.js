import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';

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

  return (
    <div className='App'>
      <Header />
      <div className='container-fluid'>
        <div className='row'>
          <div className='col-sm-12'>{children}</div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;
