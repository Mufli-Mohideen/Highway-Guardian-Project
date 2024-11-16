import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from './components/Loader';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      navigate('/login');
    }, 7000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="app-container">
      {isLoading ? <Loader /> : null}
    </div>
  );
};

export default App;
