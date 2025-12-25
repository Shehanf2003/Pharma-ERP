import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ModulePage = ({ name, endpoint }) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(endpoint);
        setMessage(res.data.message);
      } catch (err) {
        setError(err.response?.data?.message || 'Access Denied');
      }
    };
    fetchData();
  }, [endpoint]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{name}</h1>
      {message && <div style={{ padding: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px' }}>{message}</div>}
      {error && <div style={{ padding: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>{error}</div>}
    </div>
  );
};

export default ModulePage;
