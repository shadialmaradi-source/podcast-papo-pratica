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
  const [status, setStatus] = useState<string>("");

  const handleGetTranscript = async () => {
    setError(null);
    setTranscript(null);
    setExtractedId(null);
    setStatus("");

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
    setStatus("Calling edge function...");
    console.log("[TestTranscript] Extracted video ID:", videoId);
    console.log("[TestTranscript] Calling getVideoTranscript with URL:", url);

    try {
      // Pass the full URL - getVideoTranscript will extract the ID
      const result = await getVideoTranscript(url);
      console.log("[TestTranscript] Result:", result ? `${result.length} chars` : "null");
      
      if (result) {
        setTranscript(result);
        setStatus("Success!");
      } else {
        setError("No transcript returned. The video may not have captions available.");
        setStatus("Failed");
      }
    } catch (err) {
      console.error("[TestTranscript] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStatus("Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>YouTube Transcript Test</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tests the edge function: extract-youtube-transcript
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleGetTranscript()}
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

          {status && loading && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Status: {status}
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
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Success
                </span>
                <p className="text-sm text-muted-foreground">
                  {transcript.length.toLocaleString()} characters
                </p>
              </div>
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
