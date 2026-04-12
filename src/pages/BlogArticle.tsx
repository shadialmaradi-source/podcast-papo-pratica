import { Link, useParams } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";
import {
  BLOG_DEFAULT_LANGUAGE,
  getAvailableLanguagesForSlug,
  getLocalizedBlogPost,
} from "@/data/blogPosts";

export default function BlogArticle() {
  const { lang, slug } = useParams();
  const resolvedLang = lang || BLOG_DEFAULT_LANGUAGE;
  const post = getLocalizedBlogPost(resolvedLang, slug);

  if (!post) {
    return (
      <main className="min-h-screen bg-background px-4 py-12">
        <SeoHead
          title="Article Not Found | ListenFlow Blog"
          description="The requested article could not be found."
          canonicalPath={`/blog/${resolvedLang}/${slug || ""}`}
          type="article"
        />
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-3xl font-bold">Article not found</h1>
          <p className="text-muted-foreground">
            This blog article does not exist yet. Browse all posts in the{" "}
            <Link className="text-primary underline" to="/blog">
              Blog
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  const canonicalPath = `/blog/${post.lang}/${post.slug}`;
  const availableLanguages = getAvailableLanguagesForSlug(post.slug);
  const mappedAlternates = Object.entries(post.alternates).map(([language, alternateSlug]) => ({
    hrefLang: language,
    hrefPath: `/blog/${language}/${alternateSlug}`,
  }));

  const alternates = (mappedAlternates.length ? mappedAlternates : availableLanguages.map((language) => ({
    hrefLang: language,
    hrefPath: `/blog/${language}/${post.slug}`,
  })));

  alternates.push({
    hrefLang: "x-default",
    hrefPath: `/blog/${BLOG_DEFAULT_LANGUAGE}/${post.alternates[BLOG_DEFAULT_LANGUAGE] || post.slug}`,
  });

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${window.location.origin}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${window.location.origin}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: `${window.location.origin}${canonicalPath}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      author: {
        "@type": "Organization",
        name: post.authorName,
      },
      publisher: {
        "@type": "Organization",
        name: "ListenFlow",
      },
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      inLanguage: post.lang,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${window.location.origin}${canonicalPath}`,
      },
    },
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <SeoHead
        title={`${post.title} | ListenFlow Blog`}
        description={post.description}
        canonicalPath={canonicalPath}
        type="article"
        structuredData={structuredData}
        alternates={alternates}
      />
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="text-sm text-muted-foreground">
          <Link className="underline hover:text-foreground" to="/blog">
            Blog
          </Link>{" "}
          / {post.title}
        </p>
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(post.publishedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          · {post.authorName}
        </p>
        <div className="space-y-4">
          {post.content.split(/\n\s*\n/).map((paragraph, index) => (
            <p key={index} className="text-foreground leading-relaxed">
              {paragraph.trim()}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
