import React from 'react';
import './StatCard.css';

function StatCard({ icon, title, value }) {
  return (
    <div className="stat-card glow">
      <i className={icon}></i>
      <div className="stat-info">
        <h3>{title}</h3>
        <p>{value}</p>
      </div>
    </div>
  );
}

export default StatCard;
