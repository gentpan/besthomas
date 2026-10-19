import { Fragment } from "react";
import { FooterIcon } from "@/components/footer-icon";
import { GridBackground } from "@/components/grid-pointer";
import { HTML_LANG, otherLang, UI, type Lang } from "@/lib/i18n";
import { delay } from "@/lib/motion";
import { listPosts } from "@/lib/posts";
import { getSiteSettings } from "@/lib/site";
import { LangSwitch } from "./lang-switch";

/** Grid-paper background, the paper sheet and the footer, shared by both language versions. */
export async function SiteShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const [site, translations] = await Promise.all([getSiteSettings(), listPosts({ lang: otherLang(lang) })]);
  const year = new Date().getFullYear();
  const external = (url: string) => /^https?:\/\//.test(url);

  return (
    <>
      {/* Fixed elements live outside .site/.paper: their containment and entrance transform would capture them. */}
      <div className="top-fade" aria-hidden="true" />
      <LangSwitch lang={lang} translated={translations.map((p) => p.slug)} />

      <div className="site" lang={HTML_LANG[lang]}>
        <GridBackground />
        <div className="paper">
          {children}
          <footer className="site-footer rise" style={delay(820)}>
            <nav aria-label={UI[lang].socialNav} data-icon-style={site.iconStyle}>
              {site.links.map((link, i) => (
                <Fragment key={`${i}-${link.url}`}>
                  {/* Dots only separate two text links; icons are spaced by the gap alone. */}
                  {i > 0 && !link.icon && !site.links[i - 1].icon && <span aria-hidden="true">·</span>}
                  {link.icon ? (
                    <FooterIcon
                      svg={link.icon}
                      label={link.label}
                      href={link.url}
                      color={link.color}
                      external={external(link.url)}
                    />
                  ) : (
                    <a href={link.url} {...(external(link.url) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {link.label}
                    </a>
                  )}
                </Fragment>
              ))}
            </nav>
            <div className="whitespace-nowrap">
              © {site[lang].name} {year}
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
