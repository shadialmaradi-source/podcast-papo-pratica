import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p><strong>Last updated:</strong> March 2026</p>
          <p>ListenFlow ("we", "us") respects your privacy. This policy describes how we collect, use, and protect your personal information when you use our platform.</p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Information We Collect</h2>
          <p>We collect information you provide directly, such as your email address and learning preferences, as well as usage data to improve our service.</p>
          <h2 className="text-lg font-semibold text-foreground mt-6">How We Use Your Information</h2>
          <p>We use your information to provide and improve the ListenFlow service, personalize your learning experience, and communicate with you about your account.</p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Contact</h2>
          <p>For privacy-related questions, please reach out via our <Link to="/contact" className="text-primary hover:underline">contact page</Link>.</p>
        </div>
      </div>
    </div>
  );
}
