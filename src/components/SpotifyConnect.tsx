import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";

interface SpotifyConnectProps {
  onConnect: () => void;
}

export function SpotifyConnect({ onConnect }: SpotifyConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    // Simulate connection process
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      onConnect();
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-elevated border-0">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center">
            <Music className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">PodcastLearn</CardTitle>
            <p className="text-muted-foreground mt-2">
              Aprenda português com podcasts do Spotify
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!isConnected ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm">Acesso a milhares de podcasts brasileiros</span>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm">Exercícios personalizados por nível</span>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm">Acompanhe seu progresso</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning">Demonstração</p>
                    <p className="text-muted-foreground mt-1">
                      Esta é uma versão demo. Na versão real, você se conectaria ao Spotify para acessar podcasts reais.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full gap-2 h-12"
                size="lg"
              >
                {isConnecting ? (
                  "Conectando..."
                ) : (
                  <>
                    <Music className="h-5 w-5" />
                    Conectar com Spotify
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">Conectado ao Spotify!</span>
              </div>
              
              <p className="text-muted-foreground">
                Agora você pode começar a aprender português com podcasts!
              </p>

              <Button onClick={onConnect} className="w-full" size="lg">
                Começar a Aprender
              </Button>
            </div>
          )}
          
          <div className="text-center">
            <Badge variant="outline" className="text-xs">
              Versão Demo • Podcasts simulados
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}