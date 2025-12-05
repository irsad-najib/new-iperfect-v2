import axios from "axios";
import { getApiKey, removeApiKey } from "./auth";
import { message } from "antd";

const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const api = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const apiKey = getApiKey();
    if (apiKey) {
      config.headers["api-key"] = apiKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeApiKey();

      message.error("Session expired. Please login again.");

      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;
