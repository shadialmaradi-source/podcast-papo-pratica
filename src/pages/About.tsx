import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-6">About ListenFlow</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p>ListenFlow helps language learners improve through real video and audio content. We believe immersion-based practice with authentic media is the most effective way to build fluency.</p>
          <p>Our platform provides exercises, flashcards, speaking practice, and vocabulary tools — all built around content you actually want to watch and listen to.</p>
          <p>ListenFlow also supports language teachers with tools to create, assign, and track lessons for their students.</p>
        </div>
      </div>
    </div>
  );
}
