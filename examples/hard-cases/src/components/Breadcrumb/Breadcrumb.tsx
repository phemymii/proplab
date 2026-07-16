import PageObject from "@/types/PageObject";
import { demo } from "../../theme";

/**
 * Uses an imported object type that may be null.
 * PropLab should fixture a real PathObjectType (not null) so the trail renders.
 */
export function Breadcrumb({
  pathObject,
  shortenedOnMobile = false,
  page = "Accessories",
}: Readonly<{
  pathObject: PageObject | null;
  shortenedOnMobile?: boolean;
  page?: "Home" | "Accessories";
}>) {
  if (pathObject == null) return null;

  const crumbs = shortenedOnMobile
    ? pathObject.breadcrumb.slice(-2)
    : pathObject.breadcrumb;

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        fontFamily: demo.font,
        fontSize: 13,
        color: demo.muted,
        maxWidth: 520,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: demo.soft,
          marginBottom: 8,
        }}
      >
        {page} · {pathObject.path}
      </div>
      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
        }}
      >
        {crumbs.map((crumb, index) => (
          <li
            key={`${crumb.href}-${index}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {index > 0 ? (
              <span aria-hidden style={{ color: demo.line }}>
                /
              </span>
            ) : null}
            <a
              href={crumb.href}
              style={{
                color: index === crumbs.length - 1 ? demo.ink : demo.accent,
                textDecoration: "none",
                fontWeight: index === crumbs.length - 1 ? 650 : 500,
              }}
            >
              {crumb.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
