import { HomeView, homeMetadata } from "@/components/site/home-view";

export const dynamic = "force-dynamic";

export const generateMetadata = () => homeMetadata("zh");

export default function HomePage() {
  return <HomeView lang="zh" />;
}
