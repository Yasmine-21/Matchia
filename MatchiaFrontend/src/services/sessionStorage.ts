export const ACCESS_TOKEN_KEY = 'matchia_token';
export const USER_STORAGE_KEY = 'matchia_user';
export const BANK_STORAGE_KEY = 'matchia_bank';

export const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const setStoredAccessToken = (token: string | null | undefined) => {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};

export const clearStoredSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(BANK_STORAGE_KEY);
};

export const notifyAuthSessionCleared = () => {
  clearStoredSession();
  window.dispatchEvent(new Event('matchia-auth-cleared'));
};
