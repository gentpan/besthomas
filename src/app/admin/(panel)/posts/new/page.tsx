import { PostEditor } from "@/components/admin/post-editor";
import { isLang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/paths";

/** ?lang=en&slug=hello-world pre-fills a translation of an existing post. */
export default async function NewPostPage({ searchParams }: PageProps<"/admin/posts/new">) {
  const { lang, slug } = await searchParams;
  return (
    <PostEditor
      initial={null}
      host={new URL(SITE_URL).host}
      defaults={{ lang: isLang(lang) ? lang : "zh", slug: typeof slug === "string" ? slug : "" }}
      translationExists={false}
    />
  );
}
