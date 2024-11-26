import React from 'react';
import StatCard from './StatCard';
import ChartCard from './ChartCard';
import TableCard from './TableCard';
import './Dashboard.css';

function Dashboard() {
  const stats = [
    { icon: 'fas fa-users', title: 'Total Users', value: '15,687' },
    { icon: 'fas fa-shopping-bag', title: 'Total Sales', value: '$124,563' },
    { icon: 'fas fa-chart-line', title: 'Revenue', value: '$67,895' },
    { icon: 'fas fa-percent', title: 'Growth', value: '+24.5%' },
  ];

  return (
    <div>
      <h1>Dashboard Overview</h1>
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <StatCard key={index} icon={stat.icon} title={stat.title} value={stat.value} />
        ))}
      </div>
      <div className="charts-container">
        <ChartCard title="Sales Analytics" />
        <ChartCard title="User Growth" />
      </div>
      <div className="data-tables">
        <TableCard title="Recent Orders" />
        <TableCard title="Top Selling Products" />
      </div>
    </div>
  );
}

export default Dashboard;
