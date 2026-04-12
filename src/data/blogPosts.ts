export type BlogLanguage = "en" | "it" | "es" | "pt" | "fr" | "de";

export interface LocalizedBlogPost {
  lang: BlogLanguage;
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  authorName: string;
  alternates: Partial<Record<BlogLanguage, string>>;
  content: string;
}

const SUPPORTED_LANGUAGES: BlogLanguage[] = ["en", "it", "es", "pt", "fr", "de"];

export const BLOG_DEFAULT_LANGUAGE: BlogLanguage = "en";

const markdownModules = import.meta.glob("../../content/blog/*/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { metadata: {}, content: raw.trim() };

  const metadata: Record<string, string> = {};
  const frontmatter = match[1];

  frontmatter.split("\n").forEach((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) return;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    metadata[key] = value;
  });

  return { metadata, content: match[2].trim() };
}

function parseAlternates(rawAlternates: string | undefined, fallbackSlug: string) {
  const alternates: Partial<Record<BlogLanguage, string>> = {
    [BLOG_DEFAULT_LANGUAGE]: fallbackSlug,
  };

  if (!rawAlternates) return alternates;

  rawAlternates
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [language, slug] = entry.split(":").map((value) => value.trim());
      if (!language || !slug) return;
      if (!SUPPORTED_LANGUAGES.includes(language as BlogLanguage)) return;
      alternates[language as BlogLanguage] = slug;
    });

  return alternates;
}

const posts = Object.entries(markdownModules)
  .map(([path, raw]) => {
    const { metadata, content } = parseFrontmatter(raw);

    const language = metadata.language as BlogLanguage;
    const slug = metadata.slug;

    if (!language || !slug || !SUPPORTED_LANGUAGES.includes(language)) return null;

    const post: LocalizedBlogPost = {
      lang: language,
      slug,
      title: metadata.title || slug,
      description: metadata.description || "",
      publishedAt: metadata.date || "",
      updatedAt: metadata.updatedAt,
      authorName: metadata.author || "ListenFlow Team",
      alternates: parseAlternates(metadata.alternates, slug),
      content,
    };

    return post;
  })
  .filter((post): post is LocalizedBlogPost => Boolean(post))
  .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

export const LOCALIZED_BLOG_POSTS: LocalizedBlogPost[] = posts;

export function getLocalizedBlogPost(lang: string | undefined, slug?: string) {
  if (!slug) return null;
  const safeLang = (lang || BLOG_DEFAULT_LANGUAGE) as BlogLanguage;
  return (
    LOCALIZED_BLOG_POSTS.find((post) => post.lang === safeLang && post.slug === slug) || null
  );
}

export function getAvailableLanguagesForSlug(slug: string): BlogLanguage[] {
  const languages = LOCALIZED_BLOG_POSTS.filter((post) => post.slug === slug).map((post) => post.lang);
  if (!languages.length) return [];
  return languages;
}

export const BLOG_LIST_ITEMS = LOCALIZED_BLOG_POSTS.filter(
  (post) => post.lang === BLOG_DEFAULT_LANGUAGE,
);
