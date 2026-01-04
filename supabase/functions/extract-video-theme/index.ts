import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const THEMES = [
  'Cultura',
  'Viaggi', 
  'Sport',
  'Cucina',
  'Musica',
  'Scienza',
  'Storia',
  'Grammatica',
  'Conversazione',
  'Business',
  'Tecnologia',
  'Arte',
  'Lifestyle'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, videoId } = await req.json();
    
    if (!transcript || !videoId) {
      throw new Error('Transcript and videoId are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.log('LOVABLE_API_KEY not found, defaulting to Cultura');
      return new Response(JSON.stringify({ theme: 'Cultura' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Extracting theme for video:', videoId);
    
    // Use first 2000 chars for theme extraction
    const truncatedTranscript = transcript.substring(0, 2000);

    const prompt = `Analizza questo transcript di un video e assegna UNO dei seguenti temi:
${THEMES.join(', ')}

Transcript:
${truncatedTranscript}

Rispondi SOLO con il nome del tema, una singola parola dalla lista sopra. Nient'altro.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return new Response(JSON.stringify({ theme: 'Cultura' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Find matching theme from our list
    const matchedTheme = THEMES.find(t => 
      content.toLowerCase().includes(t.toLowerCase())
    ) || 'Cultura';

    console.log('Extracted theme:', matchedTheme, 'from response:', content);

    // Update video with theme
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabase
      .from('youtube_videos')
      .update({ category: matchedTheme })
      .eq('id', videoId);

    if (updateError) {
      console.error('Error updating video theme:', updateError);
    }

    return new Response(JSON.stringify({ theme: matchedTheme }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error extracting theme:', error);
    return new Response(JSON.stringify({ 
      theme: 'Cultura',
      error: error.message 
    }), {
      status: 200, // Return 200 with default theme
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
