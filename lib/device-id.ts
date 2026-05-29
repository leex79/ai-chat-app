const KEY = "ai-chat:device-id:v1";

let _cached: string | null = null;

export function getDeviceId(): string {
  if (_cached) return _cached;
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    _cached = id;
    return id;
  } catch {
    return "fallback";
  }
}
