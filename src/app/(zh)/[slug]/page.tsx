import { PostView, postMetadata } from "@/components/site/post-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[slug]">) {
  return postMetadata("zh", (await params).slug);
}

export default async function PostPage({ params }: PageProps<"/[slug]">) {
  return <PostView lang="zh" slug={(await params).slug} />;
}
