// We will use the App Bridge v4 authenticated fetch hook provided by Shopify Template if available.
// However, since App Bridge v4 intercepts window.fetch globally when embedded, we can often just use standard fetch.
// To be safe and framework-agnostic, we export an API service that relies on the global fetch which is intercepted.

export const api = {
  getAnnouncement: async () => {
    const res = await fetch("/api/announcement/latest");
    if (!res.ok) throw new Error("Failed to fetch announcement");
    return res.json();
  },
  saveAnnouncement: async (text) => {
    const res = await fetch("/api/announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to save announcement");
    }
    return res.json();
  },
  getHistory: async (page = 1, limit = 10, search = "") => {
    const res = await fetch(`/api/announcement/history?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
  },
  getStats: async () => {
    const res = await fetch("/api/announcement/stats");
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },
  getStatus: async () => {
    const res = await fetch("/api/announcement/status");
    if (!res.ok) throw new Error("Failed to fetch status");
    return res.json();
  },
};
