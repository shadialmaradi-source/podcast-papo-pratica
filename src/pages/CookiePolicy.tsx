import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-6">Cookie Policy</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p><strong>Last updated:</strong> March 2026</p>
          <p>ListenFlow uses cookies and similar technologies to provide and improve our service.</p>
          <h2 className="text-lg font-semibold text-foreground mt-6">What Are Cookies</h2>
          <p>Cookies are small text files stored on your device that help us remember your preferences and understand how you use our platform.</p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Cookies We Use</h2>
          <p><strong>Essential cookies:</strong> Required for authentication and basic platform functionality.</p>
          <p><strong>Analytics cookies:</strong> Help us understand usage patterns to improve the learning experience.</p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Managing Cookies</h2>
          <p>You can control cookies through your browser settings. Disabling essential cookies may affect platform functionality.</p>
        </div>
      </div>
    </div>
  );
}
