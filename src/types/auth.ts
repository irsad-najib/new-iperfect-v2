// Use type-only import if possible, but React namespace is used
import type { Dispatch, SetStateAction } from "react";
import { User } from "./user";

export interface LoginResponse {
  api_key: string;
  access: string;
}

export interface DecodedAccess {
  external_data?: boolean;
  cleansing?: boolean;
  tiein?: boolean;
  global_config?: boolean;
  [key: string]: unknown;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
}
