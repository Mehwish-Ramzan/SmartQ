// client/src/api.js
export const API_URL = "http://localhost:5000";

export const authFetch = (token, url, options = {}) => {
  return fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};
