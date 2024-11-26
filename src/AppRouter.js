import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import App from './App';
import Login from '../src/components/Login';
import Sidebar from './components/Sidebar';

const RedirectToExternal = ({ url }) => {
  React.useEffect(() => {
    window.location.href = url; // Redirect to the external URL
  }, [url]);

  return null; // Render nothing while redirecting
};

const AppRouter = () => (
  <Router>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/Sidebar" element={<Sidebar />} />
      <Route path="/Admin" element={<RedirectToExternal url="http://127.0.0.1:5502/index.html" />} />
    </Routes>
  </Router>
);

export default AppRouter;
