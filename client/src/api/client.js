// Thin fetch wrapper. All calls are same-origin (Vite proxies /api, /auth, /uploads to Express),
// so the Auth.js httpOnly session cookie is sent automatically.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: "include",
      headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }
  const data = await res.json().catch(() => ({}));
  // a session that expired while the page was open: let the auth context send the person back to login
  if (res.status === 401 && path !== "/api/me") window.dispatchEvent(new Event("auth:expired"));
  if (!res.ok) throw new ApiError(data.message || `Request failed (${res.status})`, res.status);
  return data;
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b),
  put: (p, b) => request("PUT", p, b),
  patch: (p, b) => request("PATCH", p, b),
  del: (p) => request("DELETE", p),
};

/** multipart upload with a progress callback (fetch cannot report upload progress). */
export function upload(method, path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, path);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data.message || `Upload failed (${xhr.status})`, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("Cannot reach the server. Is the backend running?", 0));
    xhr.send(formData);
  });
}
