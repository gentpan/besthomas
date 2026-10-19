import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/post-editor";
import { isLang, otherLang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/paths";
import { getPost } from "@/lib/posts";

export default async function EditPostPage({ params }: PageProps<"/admin/posts/[lang]/[slug]">) {
  const { lang, slug } = await params;
  const post = isLang(lang) ? await getPost(lang, slug) : null;
  if (!post) notFound();
  const translation = await getPost(otherLang(post.lang), post.slug);
  return (
    <PostEditor
      key={`${post.lang}/${post.slug}`}
      initial={post}
      host={new URL(SITE_URL).host}
      translationExists={Boolean(translation)}
    />
  );
}
