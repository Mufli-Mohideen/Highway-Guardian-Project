import React from 'react';

function Sidebar({ activePage, setActivePage }) {
  const menuItems = [
    { page: 'dashboard', icon: 'fas fa-home', label: 'Dashboard' },
    { page: 'analytics', icon: 'fas fa-chart-line', label: 'Analytics' },
    { page: 'sales', icon: 'fas fa-shopping-cart', label: 'Sales' },
    { page: 'customers', icon: 'fas fa-users', label: 'Customers' },
    { page: 'inventory', icon: 'fas fa-box', label: 'Inventory' },
    { page: 'settings', icon: 'fas fa-cog', label: 'Settings' },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <img src="https://via.placeholder.com/50" alt="Logo" className="logo" />
        <h2>Highway Guardian</h2>
      </div>
      <ul className="nav-links">
        {menuItems.map((item) => (
          <li
            key={item.page}
            className={activePage === item.page ? 'active' : ''}
            onClick={() => setActivePage(item.page)}
          >
            <a href={`#${item.page}`}>
              <i className={item.icon}></i> {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Sidebar;
