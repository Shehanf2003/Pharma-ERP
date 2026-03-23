const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001';

export const getFmcgAnalysis = async (req, res) => {
    try {
        const days = req.query.days || 90;
        const response = await fetch(`${ML_SERVICE_URL}/api/ml/fmcg-clustering?days=${days}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ message: errorData.detail || 'Error from ML Service' });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('ML Service Error (FMCG):', error.message);
        res.status(500).json({ message: 'Failed to retrieve FMCG analysis from ML Service. Is the service running?' });
    }
};

export const getDemandForecast = async (req, res) => {
    try {
        const { id } = req.params;
        const days = req.query.days || 30;
        const response = await fetch(`${ML_SERVICE_URL}/api/ml/forecast/${id}?days_to_predict=${days}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({ message: errorData.detail || 'Error from ML Service' });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
         console.error('ML Service Error (Forecast):', error.message);
         res.status(500).json({ message: 'Failed to retrieve Demand Forecast from ML Service. Is the service running?' });
    }
};