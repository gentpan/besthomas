import { ProjectsEditor } from "@/components/admin/projects-editor";
import { getProjects } from "@/lib/projects";

export default async function ProjectsAdminPage() {
  const projects = await getProjects();
  return (
    <>
      <h1 className="font-serif text-[28px] leading-tight text-stone-700 dark:text-zinc-200">项目</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-zinc-500">
        做过的网站、App、Chrome 插件等，显示在前台的项目页。前台按类型分组，组的先后跟随列表里每种类型第一次出现的位置。
      </p>
      <ProjectsEditor initial={projects} />
    </>
  );
}
