import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  const canAccess = (module) => {
    if (user.role === 'admin') return true;
    return user.allowedModules && user.allowedModules.includes(module);
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

      {/* Admin Actions Section */}
      {user.role === 'admin' && (
        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#475569' }}>Admin Actions</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <Link to="/register-user" style={{ ...styles.link, backgroundColor: '#4f46e5' }}>Register New User</Link>
                <Link to="/admin/users" style={{ ...styles.link, backgroundColor: '#0f172a' }}>Manage Employees</Link>
            </div>
        </div>
      )}

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
  container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
  heading: { marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' },
  card: { padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center', backgroundColor: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  cardTitle: { marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' },
  link: { padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px', display: 'inline-block', fontWeight: '500' },
  locked: { color: '#94a3b8', fontStyle: 'italic' }
};

export default Dashboard;
