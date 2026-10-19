/** fetch wrapper for the admin API: sends JSON, throws Error(message) on failure, bounces to login on 401. */
export async function api<T>(url: string, init: { method?: string; json?: unknown; body?: BodyInit } = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? (init.json !== undefined || init.body ? "POST" : "GET"),
    headers: init.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = `/admin/login?next=${encodeURIComponent(location.pathname)}`;
  }
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`);
  return data as T;
}

export type Uploaded = { name: string; url: string };

export async function uploadFiles(files: File[]): Promise<Uploaded[]> {
  const form = new FormData();
  for (const f of files) form.append("file", f);
  const { files: uploaded } = await api<{ files: Uploaded[] }>("/api/admin/uploads", { body: form });
  return uploaded;
}

export const MEDIA_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|mov|mp3|pdf)$/i;
export const MARKDOWN_EXT = /\.(md|markdown|mdx|txt)$/i;

/** Markdown snippet to embed an uploaded file. */
export function embedFor({ name, url }: Uploaded): string {
  if (/\.(mp4|webm|mov)$/i.test(url)) return `<video src="${url}" controls playsinline></video>`;
  if (/\.(mp3)$/i.test(url)) return `<audio src="${url}" controls></audio>`;
  if (/\.pdf$/i.test(url)) return `[${name}](${url})`;
  return `![](${url})`;
}

export const localToday = () => new Date().toLocaleDateString("en-CA");

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
