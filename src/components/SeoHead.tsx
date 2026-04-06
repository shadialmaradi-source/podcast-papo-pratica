import { useEffect } from "react";

interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath: string;
  type?: "website" | "article";
  image?: string;
  structuredData?: Record<string, unknown>[];
  alternates?: { hrefLang: string; hrefPath: string }[];
}

function upsertMeta(name: string, content: string, attr: "name" | "property" = "name") {
  const selector = `meta[${attr}="${name}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function SeoHead({
  title,
  description,
  canonicalPath,
  type = "website",
  image,
  structuredData = [],
  alternates = [],
}: SeoHeadProps) {
  useEffect(() => {
    const base = window.location.origin;
    const canonicalUrl = `${base}${canonicalPath}`;
    const resolvedImage = image ? `${base}${image}` : `${base}/favicon.ico`;

    document.title = title;
    upsertMeta("description", description);
    upsertMeta("og:title", title, "property");
    upsertMeta("og:description", description, "property");
    upsertMeta("og:type", type, "property");
    upsertMeta("og:url", canonicalUrl, "property");
    upsertMeta("og:image", resolvedImage, "property");
    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", title);
    upsertMeta("twitter:description", description);
    upsertMeta("twitter:image", resolvedImage);

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    document.head
      .querySelectorAll('link[data-seo-alternate="true"]')
      .forEach((node) => node.remove());

    alternates.forEach(({ hrefLang, hrefPath }) => {
      const alt = document.createElement("link");
      alt.setAttribute("rel", "alternate");
      alt.setAttribute("hreflang", hrefLang);
      alt.setAttribute("href", `${base}${hrefPath}`);
      alt.dataset.seoAlternate = "true";
      document.head.appendChild(alt);
    });

    document.head
      .querySelectorAll('script[data-seo-structured="true"]')
      .forEach((node) => node.remove());

    structuredData.forEach((schema) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seoStructured = "true";
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      document.head
        .querySelectorAll('script[data-seo-structured="true"]')
        .forEach((node) => node.remove());
      document.head
        .querySelectorAll('link[data-seo-alternate="true"]')
        .forEach((node) => node.remove());
    };
  }, [title, description, canonicalPath, type, image, structuredData, alternates]);

  return null;
}
