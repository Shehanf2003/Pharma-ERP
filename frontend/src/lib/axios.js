import axios from "axios";
import { savePendingAction } from "./offlineDb";

const axiosInstance = axios.create({
	baseURL: import.meta.mode === "development" ? "http://localhost:5001/api" : "/api",
	withCredentials: true, // send cookies to the server
});

axiosInstance.interceptors.response.use(
	(response) => response,
	async (error) => {
		// Check if the error is due to a network failure (device is offline)
		if (!error.response && (error.message === 'Network Error' || error.code === 'ERR_NETWORK')) {
			const { config } = error;
			
			// Only queue mutating requests like POST, PUT, or PATCH
			if (config.method !== 'get') {
				await savePendingAction({
					action: `OFFLINE_${config.method.toUpperCase()}`,
					endpoint: config.url,
					payload: config.data ? JSON.parse(config.data) : {},
				});
				
				// Return a specific rejection so the UI knows the action was saved offline
				return Promise.reject({ isOffline: true, message: 'Action saved offline. Will sync when reconnected.' });
			}
		}
		return Promise.reject(error);
	}
);

export default axiosInstance;