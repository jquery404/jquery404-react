import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';

function App({ children }) {
  const location = useLocation();
  const [ipInfo, setIpInfo] = useState(null);
  const [error, setError] = useState(null);

  //   useEffect(() => {
  //     const fetchData = () => {
  //       const pathname = location.pathname;

  //       if (ipInfo === null) {
  //         fetch('https://ipapi.co/json/')
  //           .then((response) => {
  //             if (!response.ok) throw new Error('Failed to fetch IP information');
  //             return response.json();
  //           })
  //           .then((data) => {
  //             if (data.country_code === 'ID') {
  //               window.location.href = 'https://www.google.com';
  //             } else {
  //               data.country_population = pathname;
  //               setIpInfo(data);
  //               setError(null);
  //               //   callAwsLambdaFunction(data);
  //             }
  //           })
  //           .catch((err) => {
  //             setError(err.message);
  //           });
  //       } else {
  //         let newData = { ...ipInfo, country_population: pathname };
  //         setIpInfo(newData);
  //         // callAwsLambdaFunction(newData);
  //       }
  //     };
  //     fetchData();
  //   }, [ipInfo, location.pathname]);

  const callAwsLambdaFunction = (ipInfo) => {
    const apiUrl = 'https://adnke1sq71.execute-api.ap-southeast-2.amazonaws.com/default/jq404';

    fetch(apiUrl, {
      method: 'POST',
      body: JSON.stringify({ key1: JSON.stringify(ipInfo) }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to call AWS Lambda function');
        }
      })
      .catch((error) => {
        console.error('Error calling AWS Lambda function:', error.message);
      });
  };

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
