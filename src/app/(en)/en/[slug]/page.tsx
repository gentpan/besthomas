import { PostView, postMetadata } from "@/components/site/post-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/en/[slug]">) {
  return postMetadata("en", (await params).slug);
}

export default async function EnglishPostPage({ params }: PageProps<"/en/[slug]">) {
  return <PostView lang="en" slug={(await params).slug} />;
}
