import type { Metadata } from "next";
import Link from "next/link";
import { homePath, projectsPath, UI, type Lang } from "@/lib/i18n";
import { excerpt, renderMarkdown } from "@/lib/markdown";
import { delay } from "@/lib/motion";
import { groupProjects, listProjects, type ProjectCard } from "@/lib/projects";
import { getSiteSettings } from "@/lib/site";

export async function projectsMetadata(lang: Lang): Promise<Metadata> {
  const [site, { intro }] = await Promise.all([getSiteSettings(), listProjects(lang)]);
  const t = UI[lang];
  const description = (intro && excerpt(intro)) || t.projectsDescription(site[lang].name);
  return {
    title: t.projects,
    description,
    alternates: {
      canonical: projectsPath(lang),
      languages: { "zh-CN": projectsPath("zh"), en: projectsPath("en") },
    },
    openGraph: { title: t.projects, description, url: projectsPath(lang), type: "website" },
    twitter: { card: "summary_large_image", title: t.projects, description },
  };
}

const external = (url: string) => /^https?:\/\//.test(url);
const linkProps = (url: string) => (external(url) ? { target: "_blank", rel: "noopener noreferrer" } : {});

function ProjectIcon({ project }: { project: ProjectCard }) {
  if (project.icon) {
    // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded file of unknown size
    return <img className="project-icon" src={project.icon} alt="" width={44} height={44} loading="lazy" />;
  }
  return (
    <span className="project-icon project-icon-letter" aria-hidden="true">
      {Array.from(project.name)[0]?.toUpperCase()}
    </span>
  );
}

function ProjectItem({ project, lang }: { project: ProjectCard; lang: Lang }) {
  const { name, url, year, description, source } = project;
  return (
    <>
      <ProjectIcon project={project} />
      <div className="project-body">
        <div className="project-head">
          {url ? (
            // The name's link covers the whole entry (see .project-link::before in globals.css).
            <a href={url} className="project-name project-link" {...linkProps(url)}>
              {name}
              {external(url) && (
                <span className="project-arrow" aria-hidden="true">
                  ↗
                </span>
              )}
            </a>
          ) : (
            <span className="project-name">{name}</span>
          )}
          {year && (
            <>
              <span className="post-leader" aria-hidden="true" />
              <span className="post-date">{year}</span>
            </>
          )}
        </div>
        {description && <p className="project-desc">{description}</p>}
        {source && (
          <a href={source} className="project-source" {...linkProps(source)}>
            {UI[lang].source}
            <span aria-hidden="true"> ↗</span>
          </a>
        )}
      </div>
    </>
  );
}

export async function ProjectsView({ lang }: { lang: Lang }) {
  const [site, { intro, items }] = await Promise.all([getSiteSettings(), listProjects(lang)]);
  const t = UI[lang];
  const introHtml = intro ? await renderMarkdown(intro) : "";
  const groups = groupProjects(items);
  // Stagger the entrance down the page, capped so long lists don't keep you waiting.
  let n = 0;
  const next = () => delay(320 + Math.min(n++, 12) * 50);

  return (
    <main className="page projects-page">
      <Link href={homePath(lang)} className="back-link rise" style={delay(60)}>
        <span aria-hidden="true">←</span> {site[lang].name}
      </Link>
      <h1 className="article-title rise" style={delay(120)}>
        {t.projects}
      </h1>
      {introHtml && <div className="intro rise" style={delay(200)} dangerouslySetInnerHTML={{ __html: introHtml }} />}

      {groups.length > 0 ? (
        <div className="project-groups">
          {groups.map((group) => (
            <section key={group.kind} className="project-group" aria-labelledby={`kind-${group.kind}`}>
              <h2 id={`kind-${group.kind}`} className="project-group-title rise" style={next()}>
                {t.kinds[group.kind]}
              </h2>
              <ul className="project-list">
                {group.items.map((project) => (
                  <li key={project.id} className="project rise" style={next()}>
                    <ProjectItem project={project} lang={lang} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="empty-note rise" style={delay(320)}>
          {t.noProjects}
        </p>
      )}
    </main>
  );
}
