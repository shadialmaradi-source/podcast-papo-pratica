import { Link } from "react-router-dom";
import { blogPosts } from "@/data/blogPosts";
import LandingFooter from "@/components/LandingFooter";
import { Headphones, ArrowRight } from "lucide-react";

export default function Blog() {
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
            to="/auth?role=student"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-10 md:py-16 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Blog</h1>
        <p className="text-muted-foreground mb-10">
          Tips, research, and updates on learning languages from real conversations.
        </p>

        <div className="space-y-8">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block group rounded-xl border border-border bg-background p-5 md:p-6 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <p className="text-xs text-muted-foreground mb-2">
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · {post.readTime}
              </p>
              <h2 className="text-lg md:text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-2 leading-snug">
                {post.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {post.excerpt}
              </p>
              <span className="inline-flex items-center gap-1 text-sm text-primary mt-3 font-medium">
                Read more <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
