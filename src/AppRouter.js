import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import App from './App';
import Login from '../src/components/Login';

const AppRouter = () => (
  <Router>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/Login" element={<Login />} /> 
    </Routes>
  </Router>
);

export default AppRouter;
