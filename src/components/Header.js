import React from 'react';

function Header() {
  return (
    <header>
      <div className="search-bar">
        <input type="text" placeholder="Search..." />
        <i className="fas fa-search"></i>
      </div>
      <div className="user-info">
        <img
          src="https://via.placeholder.com/40"
          alt="User Avatar"
          className="avatar"
        />
        <span>John Doe</span>
        <i className="fas fa-chevron-down"></i>
        <div className="dropdown-menu">
          <a href="#profile">
            <i className="fas fa-user"></i> Profile
          </a>
          <a href="#settings">
            <i className="fas fa-cog"></i> Settings
          </a>
          <a href="#logout">
            <i className="fas fa-sign-out-alt"></i> Logout
          </a>
        </div>
      </div>
    </header>
  );
}

export default Header;
