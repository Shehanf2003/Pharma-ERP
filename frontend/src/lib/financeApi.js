import axiosInstance from './axios';

export const getFinancialStats = async (startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const response = await axiosInstance.get('/finance/stats', { params });
  return response.data;
};

export const getFinancialReport = async (type, startDate, endDate) => {
  const response = await axiosInstance.get('/finance/reports', {
    params: { type, startDate, endDate }
  });
  return response.data;
};

export const getExpenses = async () => {
  const response = await axiosInstance.get('/finance/expenses');
  return response.data;
};

export const addExpense = async (data) => {
  const response = await axiosInstance.post('/finance/expenses', data);
  return response.data;
};

// Payables
export const getPayables = async () => {
    const response = await axiosInstance.get('/inventory/payables');
    return response.data;
};

export const recordPayment = async (data) => {
    const response = await axiosInstance.post('/inventory/payments', data);
    return response.data;
};

export const getSupplierPayments = async (supplierId) => {
    const params = {};
    if (supplierId) params.supplierId = supplierId;
    const response = await axiosInstance.get('/inventory/payments', { params });
    return response.data;
};

// Shifts
export const getCurrentShift = async () => {
    const response = await axiosInstance.get('/shifts/current');
    return response.data;
};

export const startShift = async (openingBalance) => {
    const response = await axiosInstance.post('/shifts/start', { openingBalance });
    return response.data;
};

export const endShift = async (data) => {
    const response = await axiosInstance.post('/shifts/end', data);
    return response.data;
};

// Payments
export const initiatePayment = async (data) => {
    const response = await axiosInstance.post('/payments/initiate', data);
    return response.data;
};
