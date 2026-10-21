import { ProjectsView, projectsMetadata } from "@/components/site/projects-view";

export const dynamic = "force-dynamic";

export const generateMetadata = () => projectsMetadata("en");

export default function EnglishProjectsPage() {
  return <ProjectsView lang="en" />;
}
