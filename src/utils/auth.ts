import CryptoJS from "crypto-js";

// Define types for better type safety
export interface LoginResponse {
  api_key: string;
  access: string;
}

export interface DecodedAccess {
  [key: string]: unknown; // Replace 'any' with specific fields if known
}

const COOKIE_NAME = "api_key";

// Helper to get cookie on client side
const getCookie = (name: string): string | null => {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
};

export const getApiKey = (): string | null => {
  return getCookie(COOKIE_NAME);
};

export const removeApiKey = () => {
  if (typeof window !== "undefined") {
    // Remove cookie
    document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict`;

    // Clear local/session storage
    localStorage.removeItem("api_key");
    localStorage.removeItem("access");
    sessionStorage.removeItem("access");
  }
};

export const isAuthenticated = (): boolean => {
  return !!getApiKey();
};

export const setApiKey = (apiKey: string, remember: boolean = false) => {
  if (typeof window !== "undefined") {
    if (remember) {
      localStorage.setItem("api_key", apiKey);
    }

    // Set cookie with appropriate security flags
    // Note: HttpOnly cannot be set from client-side JS.
    // For better security, consider setting cookies via Server Actions.
    const maxAge = remember ? 31536000 : ""; // 1 year in seconds
    let cookieString = `${COOKIE_NAME}=${apiKey}; path=/; SameSite=Strict`;
    if (maxAge) cookieString += `; max-age=${maxAge}`;
    if (window.location.protocol === "https:") cookieString += "; Secure";

    document.cookie = cookieString;
  }
};

export const setAccessToken = (
  loginResponse: LoginResponse,
  remember: boolean = false
) => {
  const { api_key, access } = loginResponse;

  // Store API key
  setApiKey(api_key, remember);

  // Store encrypted access token
  if (typeof window !== "undefined") {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("access", access);
  }
};

export const getDecodedAccess = (): DecodedAccess | null => {
  if (typeof window === "undefined") return null;

  const encryptedAccess =
    localStorage.getItem("access") || sessionStorage.getItem("access");
  const apiKey = getApiKey();

  if (!encryptedAccess || !apiKey) return null;

  // Validate key length
  if (apiKey.length < 32) {
    console.error("API key too short for decryption");
    return null;
  }

  // Validate base64 format
  if (!/^[A-Za-z0-9+/=]+$/.test(encryptedAccess)) {
    console.error("Invalid encrypted access format");
    return null;
  }

  try {
    // Ensure key is correct length for AES (32 chars = 256 bits if UTF8, but here it slices string)
    const key = apiKey.slice(0, 32);
    const encryptedBytes = CryptoJS.enc.Base64.parse(encryptedAccess);

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encryptedBytes } as CryptoJS.lib.CipherParams,
      CryptoJS.enc.Utf8.parse(key),
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.NoPadding,
      }
    );

    // Use Latin1 encoding to handle raw bytes
    const decryptedText = decrypted.toString(CryptoJS.enc.Latin1);
    // Remove ALL trailing spaces (not just whitespace)
    const trimmedText = decryptedText.replace(/\s+$/g, "");

    return JSON.parse(trimmedText) as DecodedAccess;
  } catch (error) {
    console.error("Decryption failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
};
