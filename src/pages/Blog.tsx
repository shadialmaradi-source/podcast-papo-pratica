import { Link } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";
import { BLOG_DEFAULT_LANGUAGE, BLOG_LIST_ITEMS } from "@/data/blogPosts";

export default function Blog() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${window.location.origin}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${window.location.origin}/blog` },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <SeoHead
        title="ListenFlow Blog | Language Learning Resources"
        description="Read practical language-learning resources for teachers and students."
        canonicalPath="/blog"
        type="website"
        structuredData={structuredData}
      />
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-bold">Blog</h1>
        <p className="text-muted-foreground">
          Practical resources for language teachers and students.
        </p>

        <div className="space-y-4">
          {BLOG_LIST_ITEMS.map((post) => (
            <article key={post.slug} className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                <Link to={`/blog/${BLOG_DEFAULT_LANGUAGE}/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{post.description}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
