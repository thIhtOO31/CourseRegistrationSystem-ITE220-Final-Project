export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";
export class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// Handle requests to the backend API
export async function apiRequest(path, {
  method = "GET",
  body,
  token
} = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(
      `${API_BASE}${path}`,
      {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      }
    );
  } catch (error) {
    throw new ApiError(0, "Cannot connect to the server");
  }
  
  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      if (!response.ok) throw new ApiError(response.status, "Server returned an unreadable error response");
      throw new ApiError(response.status, "Server returned invalid JSON");
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, payload?.message || "Request failed", payload?.errors || []);
  }

  if (path === "/health") return payload;
  return payload?.data;
}