import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-6">Terms of Service</h1>
        <div className="prose prose-sm text-muted-foreground space-y-4">
          <p><strong>Last updated:</strong> March 2026</p>
          <p>By using ListenFlow, you agree to these terms. Please read them carefully.</p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Use of Service</h2>
          <p>ListenFlow provides language learning tools through video and audio content. You agree to use the service for lawful purposes only.</p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Accounts</h2>
          <p>You are responsible for maintaining the security of your account and for all activities that occur under it.</p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Intellectual Property</h2>
          <p>All content and materials available on ListenFlow are the property of ListenFlow or its licensors unless otherwise stated.</p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Contact</h2>
          <p>Questions about these terms? Visit our <Link to="/contact" className="text-primary hover:underline">contact page</Link>.</p>
        </div>
      </div>
    </div>
  );
}
