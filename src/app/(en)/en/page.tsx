import { HomeView, homeMetadata } from "@/components/site/home-view";

export const dynamic = "force-dynamic";

export const generateMetadata = () => homeMetadata("en");

export default function EnglishHomePage() {
  return <HomeView lang="en" />;
}
