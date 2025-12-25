import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  const canAccess = (module) => {
    if (user.role === 'admin') return true;
    return user.allowedModules.includes(module);
  };

  const modules = [
    { name: 'Inventory', id: 'INVENTORY', path: '/inventory', color: '#17a2b8' },
    { name: 'POS', id: 'POS', path: '/pos', color: '#28a745' },
    { name: 'Finance', id: 'FINANCE', path: '/finance', color: '#ffc107' },
    { name: 'Reporting', id: 'REPORTING', path: '/reporting', color: '#6c757d' },
  ];

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Welcome, {user.name}</h2>
      <div style={styles.grid}>
        {modules.map((mod) => (
          <div key={mod.id} style={{ ...styles.card, opacity: canAccess(mod.id) ? 1 : 0.5 }}>
            <h3 style={styles.cardTitle}>{mod.name}</h3>
            {canAccess(mod.id) ? (
              <Link to={mod.path} style={styles.link}>Access Module</Link>
            ) : (
              <span style={styles.locked}>Locked</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '2rem' },
  heading: { marginBottom: '2rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' },
  card: { padding: '2rem', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  cardTitle: { marginBottom: '1rem' },
  link: { padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px', display: 'inline-block' },
  locked: { color: '#666', fontStyle: 'italic' }
};

export default Dashboard;
