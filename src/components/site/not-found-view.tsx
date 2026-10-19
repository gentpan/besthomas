import Link from "next/link";
import { homePath, UI, type Lang } from "@/lib/i18n";

export function NotFoundView({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <main className="page">
      <h1 className="article-title">{t.notFoundTitle}</h1>
      <p className="article-meta">{t.notFoundBody}</p>
      <p className="article-body">
        <Link href={homePath(lang)} className="back-link">
          <span aria-hidden="true">←</span> {t.backHome}
        </Link>
      </p>
    </main>
  );
}
