import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const RegisterUser = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    allowedModules: []
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const modules = ["INVENTORY", "POS", "FINANCE", "REPORTING"];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    const { allowedModules } = formData;
    if (checked) {
      setFormData({ ...formData, allowedModules: [...allowedModules, value] });
    } else {
      setFormData({
        ...formData,
        allowedModules: allowedModules.filter((mod) => mod !== value),
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await axios.post('/api/auth/register', formData);
      setMessage('User registered successfully!');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Register New User</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          {message && <div style={styles.success}>{message}</div>}
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.inputGroup}>
            <label>Name</label>
            <input name="name" type="text" value={formData.name} onChange={handleChange} style={styles.input} required />
          </div>

          <div style={styles.inputGroup}>
            <label>Email</label>
            <input name="email" type="email" value={formData.email} onChange={handleChange} style={styles.input} required />
          </div>

          <div style={styles.inputGroup}>
            <label>Password</label>
            <input name="password" type="password" value={formData.password} onChange={handleChange} style={styles.input} required />
          </div>

          <div style={styles.inputGroup}>
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange} style={styles.select}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {formData.role === 'employee' && (
            <div style={styles.inputGroup}>
              <label>Allowed Modules</label>
              <div style={styles.checkboxGroup}>
                {modules.map((mod) => (
                  <label key={mod} style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      value={mod}
                      checked={formData.allowedModules.includes(mod)}
                      onChange={handleCheckboxChange}
                    />
                    {mod}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button type="submit" style={styles.button}>Register User</button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', justifyContent: 'center', padding: '2rem', backgroundColor: '#f5f5f5', minHeight: '80vh' },
  card: { padding: '2rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '400px' },
  title: { textAlign: 'center', marginBottom: '1.5rem', color: '#333' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  input: { padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' },
  select: { padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' },
  checkboxGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' },
  button: { padding: '0.75rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  error: { color: 'red', fontSize: '0.9rem', textAlign: 'center', padding: '0.5rem', backgroundColor: '#ffe6e6', borderRadius: '4px' },
  success: { color: 'green', fontSize: '0.9rem', textAlign: 'center', padding: '0.5rem', backgroundColor: '#e6ffe6', borderRadius: '4px' }
};

export default RegisterUser;
