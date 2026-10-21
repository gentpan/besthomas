import { ProjectsView, projectsMetadata } from "@/components/site/projects-view";

export const dynamic = "force-dynamic";

export const generateMetadata = () => projectsMetadata("zh");

export default function ProjectsPage() {
  return <ProjectsView lang="zh" />;
}
