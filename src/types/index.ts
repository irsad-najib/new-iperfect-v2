// User Types
export interface User {
  username: string;
  profile_picture?: string;
  email?: string;
  role?: string;
}

// Auth Types
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

// Menu Types
export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: MenuItem[];
  disabled?: boolean;
}

// External Data Types
export interface ExternalData {
  key: number;
  profile_id: string;
  profile_name: string;
  completed: number;
  version: string;
}

// Context Types
export interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
