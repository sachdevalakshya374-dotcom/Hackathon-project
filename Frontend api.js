import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lf_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const setToken = (t) => localStorage.setItem("lf_token", t);
export const clearToken = () => localStorage.removeItem("lf_token");
export const getToken = () => localStorage.getItem("lf_token");
