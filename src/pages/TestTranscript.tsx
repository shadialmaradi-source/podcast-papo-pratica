import { useState } from "react";
import { getVideoTranscript, extractVideoId } from "@/services/youtubeService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const TestTranscript = () => {
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedId, setExtractedId] = useState<string | null>(null);

  const handleGetTranscript = async () => {
    setError(null);
    setTranscript(null);
    setExtractedId(null);

    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError("Could not extract video ID from URL. Please check the format.");
      return;
    }

    setExtractedId(videoId);
    setLoading(true);
    console.log("[TestTranscript] Extracted video ID:", videoId);

    try {
      const result = await getVideoTranscript(videoId);
      console.log("[TestTranscript] Result:", result ? `${result.length} chars` : "null");
      
      if (result) {
        setTranscript(result);
      } else {
        setError("No transcript returned. The video may not have captions available.");
      }
    } catch (err) {
      console.error("[TestTranscript] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>YouTube Transcript Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleGetTranscript} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Get Transcript"
              )}
            </Button>
          </div>

          {extractedId && (
            <p className="text-sm text-muted-foreground">
              Extracted Video ID: <code className="bg-muted px-1 rounded">{extractedId}</code>
            </p>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-destructive font-medium">Error</p>
              <p className="text-destructive/80 text-sm">{error}</p>
            </div>
          )}

          {transcript && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Transcript ({transcript.length} characters):
              </p>
              <div className="max-h-96 overflow-y-auto p-4 bg-muted rounded-md">
                <pre className="whitespace-pre-wrap text-sm font-mono">{transcript}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestTranscript;
