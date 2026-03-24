import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-6">Contact Us</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p>We'd love to hear from you. Whether you have a question, feedback, or a partnership inquiry, reach out and we'll get back to you.</p>
          <div className="flex items-center gap-2 mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <Mail className="h-5 w-5 text-primary" />
            <a href="mailto:hello@listenflow.app" className="text-primary hover:underline font-medium">
              hello@listenflow.app
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
