import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Outlet } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav style={styles.nav}>
      <h1 style={styles.logo}>Pharma ERP</h1>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Dashboard</Link>
        {user && (
          <div style={styles.userSection}>
            <span>{user.name} ({user.role})</span>
            <button onClick={logout} style={styles.logoutBtn}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
};

const styles = {
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', backgroundColor: '#333', color: 'white' },
  logo: { margin: 0 },
  links: { display: 'flex', gap: '1.5rem', alignItems: 'center' },
  link: { color: 'white', textDecoration: 'none' },
  userSection: { display: 'flex', gap: '1rem', alignItems: 'center' },
  logoutBtn: { padding: '0.25rem 0.5rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

export default Navbar;
