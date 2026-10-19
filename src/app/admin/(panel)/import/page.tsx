import { ImportPanel } from "@/components/admin/import-panel";

export default function ImportPage() {
  return (
    <>
      <h1 className="font-serif text-[28px] leading-tight text-stone-700 dark:text-zinc-200">导入 Markdown</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-zinc-500">
        拖入一个或多个 .md 文件，会自动识别语言、标题、日期和 slug，确认后保存。文章里用到的图片可以一起拖进来，图片地址会自动替换。
      </p>
      <ImportPanel />
    </>
  );
}
