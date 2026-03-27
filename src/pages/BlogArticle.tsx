import { useParams, Link, Navigate } from "react-router-dom";
import { blogPosts } from "@/data/blogPosts";
import LandingFooter from "@/components/LandingFooter";
import { Headphones, ArrowLeft } from "lucide-react";

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) return <Navigate to="/blog" replace />;

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
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to blog
        </Link>

        <article>
          <p className="text-xs text-muted-foreground mb-3">
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · {post.author} · {post.readTime}
          </p>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="prose prose-sm md:prose-base prose-neutral dark:prose-invert max-w-none">
            {post.content.split("\n\n").map((block, i) => {
              if (block.startsWith("## ")) {
                return (
                  <h2 key={i} className="text-xl font-semibold text-foreground mt-8 mb-3">
                    {block.replace("## ", "")}
                  </h2>
                );
              }
              if (block.startsWith("1. ") || block.startsWith("- ")) {
                const items = block.split("\n");
                const isOrdered = block.startsWith("1. ");
                const ListTag = isOrdered ? "ol" : "ul";
                return (
                  <ListTag key={i} className={`${isOrdered ? "list-decimal" : "list-disc"} pl-5 space-y-1 my-4 text-muted-foreground`}>
                    {items.map((item, j) => (
                      <li key={j} className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: item
                            .replace(/^\d+\.\s/, "")
                            .replace(/^-\s/, "")
                            .replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>"),
                        }}
                      />
                    ))}
                  </ListTag>
                );
              }
              return (
                <p
                  key={i}
                  className="text-sm md:text-base text-muted-foreground leading-relaxed my-4"
                  dangerouslySetInnerHTML={{
                    __html: block.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>"),
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
