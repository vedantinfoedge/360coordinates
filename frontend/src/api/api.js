import axios from "axios";
import { API_BASE_URL } from "../config/api.config";

// Create axios instance
const API = axios.create({
  baseURL: API_BASE_URL,
});

// Auto attach token for every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("authToken");

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

export default API;
