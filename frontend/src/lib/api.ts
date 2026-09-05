export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = API_URL ? `${API_URL}${path}` : path;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
      throw new Error(
        "Cannot connect to the backend server. Please make sure the Python server is running, or verify your network connection."
      );
    }
    throw err;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

