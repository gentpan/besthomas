import type { CSSProperties } from "react";
import { svgDataUri, svgHasColors } from "@/lib/svg-icon";

/**
 * A footer link drawn as an icon. The one-colour version is the SVG used as a CSS mask filled with the
 * current text colour; coloured logos also get an <img> of the original that fades in on hover.
 * Colours, the 18px box and the 1.3× hover zoom come from `.social-icon` in globals.css, together with
 * the `data-icon-style` attribute on an ancestor.
 */
export function FooterIcon({
  svg,
  label,
  href,
  color,
  external,
}: {
  svg: string;
  label: string;
  href?: string;
  color?: string;
  external?: boolean;
}) {
  const uri = svgDataUri(svg);
  const colored = svgHasColors(svg);
  const style = { "--icon": `url("${uri}")`, ...(color ? { "--icon-hover": color } : {}) } as CSSProperties;
  const content = (
    <>
      <span className="social-icon-mono" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny inline SVG, nothing to optimise */}
      {colored && <img className="social-icon-color" src={uri} alt="" aria-hidden="true" />}
    </>
  );
  return href ? (
    <a
      href={href}
      className="social-icon"
      data-colored={colored || undefined}
      aria-label={label}
      title={label}
      style={style}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {content}
    </a>
  ) : (
    <span className="social-icon" data-colored={colored || undefined} title={label} style={style}>
      {content}
    </span>
  );
}
