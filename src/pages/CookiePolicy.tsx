import { Link } from "react-router-dom";

export default function CookiePolicy() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-3xl font-bold">Cookie Policy</h1>
        <p className="text-muted-foreground">
          This is a placeholder cookie policy page. Full legal text can be added here.
        </p>
        <p className="text-muted-foreground">
          Read our <Link className="text-primary underline" to="/privacy-policy">Privacy Policy</Link> for more details.
        </p>
      </div>
    </main>
  );
}
