import { adminRoute, json } from "@/lib/api";
import { ContentError } from "@/lib/posts";
import { saveUpload } from "@/lib/uploads";

/** multipart/form-data with one or more `file` fields → [{ name, url }] */
export const POST = adminRoute(async (req) => {
  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("file") ?? []).filter((f): f is File => f instanceof File);
  if (!files.length) throw new ContentError("没有收到文件");
  const uploaded = [];
  for (const file of files) uploaded.push({ name: file.name, url: await saveUpload(file) });
  return json({ files: uploaded }, 201);
});
