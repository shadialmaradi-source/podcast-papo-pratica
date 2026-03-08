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
import { Loader2, CheckCircle2, Upload, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const FOUNDER_IDS = [
  '4019daee-273d-48e5-8128-fa3332e9acb0',
];

const LANGUAGES = [
  { value: 'auto', label: '🔍 Auto-detect' },
  { value: 'italian', label: '🇮🇹 Italian' },
  { value: 'portuguese', label: '🇧🇷 Portuguese' },
  { value: 'english', label: '🇬🇧 English' },
  { value: 'spanish', label: '🇪🇸 Spanish' },
  { value: 'french', label: '🇫🇷 French' },
  { value: 'german', label: '🇩🇪 German' },
];

export default function AdminImport() {
  const { user, loading } = useAuth();
  const [videoUrl, setVideoUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("auto");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ videoDbId: string; title: string; language: string } | null>(null);

  if (loading) return null;
  if (!user || !FOUNDER_IDS.includes(user.id)) return <Navigate to="/app" replace />;

  const handleImport = async () => {
    if (!videoUrl.trim()) { toast.error("Inserisci un URL YouTube"); return; }
    if (transcript.trim().length < 50) { toast.error("Il transcript deve avere almeno 50 caratteri"); return; }

    setImporting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('admin-import-video', {
        body: { videoUrl: videoUrl.trim(), transcript: transcript.trim(), language }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast.success(`Video "${data.title}" importato con successo!`);
      setVideoUrl("");
      setTranscript("");
    } catch (err: any) {
      toast.error(err.message || "Errore durante l'importazione");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/app">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Founder Import Tool</h1>
            <p className="text-sm text-muted-foreground">Aggiungi video alla library velocemente</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" /> Importa Video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">YouTube URL</Label>
              <Input
                id="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={importing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Lingua</Label>
              <Select value={language} onValueChange={setLanguage} disabled={importing}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcript">Transcript</Label>
              <Textarea
                id="transcript"
                placeholder="Incolla qui il transcript del video..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                disabled={importing}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {transcript.length} caratteri • {transcript.trim().split(/\s+/).filter(Boolean).length} parole
              </p>
            </div>

            <Button onClick={handleImport} disabled={importing} className="w-full">
              {importing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importazione in corso...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Importa Video</>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{result.title}</p>
                  <p className="text-sm text-muted-foreground">Lingua: {result.language}</p>
                  <Link
                    to={`/lesson/${result.videoDbId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Apri la lezione →
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
