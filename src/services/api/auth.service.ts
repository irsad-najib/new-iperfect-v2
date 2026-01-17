/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import api from "@/utils/axios";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginApiResponse {
  status_code: number;
  message: string;
  api_key: string;
  access: string;
}

/**
 * Login user with credentials
 * @param credentials - Username and password
 * @returns Login response with API key and access token
 */
export async function login(
  credentials: LoginCredentials,
): Promise<LoginApiResponse> {
  const response = await api.post<LoginApiResponse>("/login", {
    username: credentials.username,
    password: credentials.password,
  });

  return response.data;
}

/**
 * Get current authenticated user
 * @returns Current user data
 */
export async function getCurrentUser() {
  const response = await api.get("/current_user");
  return response.data;
}

/**
 * Logout user (if backend supports it)
 */
export async function logout() {
  // Implement if backend has logout endpoint
  // const response = await api.post("/logout");
  // return response.data;
}
