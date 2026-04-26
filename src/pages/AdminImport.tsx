import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Upload, ArrowLeft, Plus, Trash2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

const FOUNDER_IDS = [
  '4019daee-273d-48e5-8128-fa3332e9acb0',
  'd16921f2-9385-4bcb-9052-5fd9902956fd',
  'dfba2332-5a13-441d-84e5-ed3d980ef155', // shadi.95@hotmail.it
];

const FOUNDER_EMAILS = (import.meta.env.VITE_ADMIN_IMPORT_ALLOWLIST_EMAILS || "")
  .split(",")
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

const LANGUAGES = [
  { value: 'auto', label: '🔍 Auto-detect' },
  { value: 'italian', label: '🇮🇹 Italian' },
  { value: 'portuguese', label: '🇧🇷 Portuguese' },
  { value: 'english', label: '🇬🇧 English' },
  { value: 'spanish', label: '🇪🇸 Spanish' },
  { value: 'french', label: '🇫🇷 French' },
  { value: 'german', label: '🇩🇪 German' },
];

interface VideoEntry {
  id: string;
  videoUrl: string;
  transcript: string;
  language: string;
}

interface ImportResult {
  entryId: string;
  success: boolean;
  videoDbId?: string;
  title?: string;
  language?: string;
  error?: string;
}

function createEntry(): VideoEntry {
  return { id: crypto.randomUUID(), videoUrl: "", transcript: "", language: "auto" };
}

export default function AdminImport() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<VideoEntry[]>([createEntry()]);
  const [importing, setImporting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [results, setResults] = useState<ImportResult[]>([]);
  const userEmail = user?.email?.toLowerCase() || "";
  const hasImportAccess = !!user && (
    FOUNDER_IDS.includes(user.id) ||
    (userEmail && FOUNDER_EMAILS.includes(userEmail))
  );

  if (loading) return null;
  if (!user) return <Navigate to="/app" replace />;
  if (!hasImportAccess) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Link to="/app">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Founder Import Tool</h1>
              <p className="text-sm text-muted-foreground">Access restricted to configured founders</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Access denied</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>You are signed in, but this account is not allow-listed for <code>/admin/import</code>.</p>
              <p><strong>User ID:</strong> <code>{user.id}</code></p>
              <p><strong>Email:</strong> <code>{user.email || "(none)"}</code></p>
              <p className="text-muted-foreground">
                To restore access after auth migrations, add your email to
                <code> VITE_ADMIN_IMPORT_ALLOWLIST_EMAILS</code> (comma-separated) and
                <code> ADMIN_IMPORT_ALLOWLIST_EMAILS</code> on the edge function.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const updateEntry = (id: string, field: keyof VideoEntry, value: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addEntry = () => setEntries(prev => [...prev, createEntry()]);

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return;
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleBatchImport = async () => {
    const valid = entries.filter(e => e.videoUrl.trim() && e.transcript.trim().length >= 50);
    if (valid.length === 0) {
      toast.error("Nessun video valido da importare (URL + transcript min 50 char)");
      return;
    }

    setImporting(true);
    setResults([]);
    const newResults: ImportResult[] = [];

    for (let i = 0; i < valid.length; i++) {
      const entry = valid[i];
      setCurrentIndex(i);
      try {
        const { data, error } = await supabase.functions.invoke('admin-import-video', {
          body: { videoUrl: entry.videoUrl.trim(), transcript: entry.transcript.trim(), language: entry.language }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        newResults.push({ entryId: entry.id, success: true, videoDbId: data.videoDbId, title: data.title, language: data.language });
      } catch (err: any) {
        newResults.push({ entryId: entry.id, success: false, error: err.message || "Errore sconosciuto" });
      }
      setResults([...newResults]);
    }

    const successCount = newResults.filter(r => r.success).length;
    const failCount = newResults.filter(r => !r.success).length;
    if (successCount > 0) toast.success(`${successCount} video importati con successo!`);
    if (failCount > 0) toast.error(`${failCount} video falliti`);

    // Remove successful entries
    const successIds = new Set(newResults.filter(r => r.success).map(r => r.entryId));
    setEntries(prev => {
      const remaining = prev.filter(e => !successIds.has(e.id));
      return remaining.length > 0 ? remaining : [createEntry()];
    });

    setImporting(false);
    setCurrentIndex(-1);
  };

  const validCount = entries.filter(e => e.videoUrl.trim() && e.transcript.trim().length >= 50).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/app">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Founder Import Tool</h1>
            <p className="text-sm text-muted-foreground">Batch import videos to the library</p>
          </div>
        </div>

        {entries.map((entry, idx) => (
          <Card key={entry.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" /> Video {idx + 1}
                </CardTitle>
                {entries.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeEntry(entry.id)} disabled={importing}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3">
                <div className="space-y-1">
                  <Label>YouTube URL</Label>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={entry.videoUrl}
                    onChange={(e) => updateEntry(entry.id, "videoUrl", e.target.value)}
                    disabled={importing}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Lingua</Label>
                  <Select value={entry.language} onValueChange={(v) => updateEntry(entry.id, "language", v)} disabled={importing}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Transcript</Label>
                <Textarea
                  placeholder="Incolla qui il transcript del video..."
                  value={entry.transcript}
                  onChange={(e) => updateEntry(entry.id, "transcript", e.target.value)}
                  disabled={importing}
                  className="min-h-[150px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {entry.transcript.length} chars • {entry.transcript.trim().split(/\s+/).filter(Boolean).length} words
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-3">
          <Button variant="outline" onClick={addEntry} disabled={importing} className="flex-1">
            <Plus className="h-4 w-4 mr-2" /> Add another video
          </Button>
          <Button onClick={handleBatchImport} disabled={importing || validCount === 0} className="flex-1">
            {importing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing {currentIndex + 1}/{validCount}...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" /> Import {validCount} video{validCount !== 1 ? 's' : ''}</>
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Results</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  {r.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div className="space-y-0.5">
                    {r.success ? (
                      <>
                        <p className="font-medium text-foreground">{r.title}</p>
                        <p className="text-xs text-muted-foreground">Lingua: {r.language}</p>
                        <Link to={`/lesson/${r.videoDbId}`} className="text-sm text-primary hover:underline">
                          Apri la lezione →
                        </Link>
                      </>
                    ) : (
                      <p className="text-sm text-destructive">{r.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
