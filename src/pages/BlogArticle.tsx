import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
import { blogPosts, getLanguageVersions } from "@/data/blogPosts";
import LandingFooter from "@/components/LandingFooter";
import { Headphones, ArrowLeft } from "lucide-react";

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) return <Navigate to="/blog" replace />;

  const versions = getLanguageVersions(post.slug);
  const langLabels: Record<string, string> = { en: "English", it: "Italiano", es: "Español", pt: "Português" };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold text-foreground">ListenFlow</span>
          </Link>
          <Link
            to="/blog"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← All posts
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-10 md:py-16 max-w-2xl">
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to blog
        </Link>

        <article>
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-4">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span aria-hidden>·</span>
            <span>{post.author}</span>
            <span aria-hidden>·</span>
            <span>{post.readTime}</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6 leading-tight tracking-tight">
            {post.title}
          </h1>

          {/* Language switcher */}
          {versions.length > 1 && (
            <nav aria-label="Language versions" className="flex flex-wrap gap-2 mb-8">
              {versions.map((v) => (
                <button
                  key={v.slug}
                  onClick={() => navigate(`/blog/${v.slug}`)}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    v.slug === post.slug
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span>{v.flag}</span>
                  <span>{langLabels[v.language] || v.language}</span>
                </button>
              ))}
            </nav>
          )}

          {/* Article body */}
          <div className="prose prose-sm md:prose-base prose-neutral dark:prose-invert max-w-none">
            {post.content.split("\n\n").map((block, i) => {
              if (block.startsWith("## ")) {
                return (
                  <h2 key={i} className="text-lg md:text-xl font-semibold text-foreground mt-10 mb-3">
                    {block.replace("## ", "")}
                  </h2>
                );
              }
              if (block.startsWith("1. ") || block.startsWith("- ")) {
                const items = block.split("\n");
                const isOrdered = block.startsWith("1. ");
                const ListTag = isOrdered ? "ol" : "ul";
                return (
                  <ListTag
                    key={i}
                    className={`${isOrdered ? "list-decimal" : "list-disc"} pl-5 space-y-1.5 my-5 text-muted-foreground`}
                  >
                    {items.map((item, j) => (
                      <li
                        key={j}
                        className="text-sm md:text-base leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: item
                            .replace(/^\d+\.\s/, "")
                            .replace(/^-\s/, "")
                            .replace(
                              /\*\*(.+?)\*\*/g,
                              "<strong class='text-foreground'>$1</strong>"
                            ),
                        }}
                      />
                    ))}
                  </ListTag>
                );
              }
              return (
                <p
                  key={i}
                  className="text-sm md:text-base text-muted-foreground leading-relaxed my-5"
                  dangerouslySetInnerHTML={{
                    __html: block.replace(
                      /\*\*(.+?)\*\*/g,
                      "<strong class='text-foreground'>$1</strong>"
                    ),
                  }}
                />
              );
            })}
          </div>
        </article>
      </main>

      <LandingFooter />
    </div>
  );
}
