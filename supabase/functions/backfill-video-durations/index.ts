import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse ISO 8601 duration format (PT#H#M#S) to seconds
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Scrape duration directly from YouTube HTML page (no API key needed)
async function scrapeDurationFromYouTube(videoId: string): Promise<number> {
  try {
    console.log('Scraping YouTube HTML for duration...');
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (!response.ok) return 0;
    const html = await response.text();
    
    // Method 1: Extract from meta tag
    const metaMatch = html.match(/<meta\s+itemprop="duration"\s+content="([^"]+)"/i);
    if (metaMatch) {
      const duration = parseISO8601Duration(metaMatch[1]);
      if (duration > 0) return duration;
    }
    
    // Method 2: Extract from ytInitialPlayerResponse JSON
    const jsonMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
    if (jsonMatch) {
      const duration = parseInt(jsonMatch[1], 10);
      if (duration > 0) return duration;
    }
    
    // Method 3: Try approxDurationMs
    const approxMatch = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/);
    if (approxMatch) {
      const duration = Math.round(parseInt(approxMatch[1], 10) / 1000);
      if (duration > 0) return duration;
    }
    
    return 0;
  } catch (error) {
    return 0;
  }
}

async function getVideoDuration(videoId: string): Promise<number | null> {
  // Try YouTube HTML scraping first (free, no API key)
  const scrapedDuration = await scrapeDurationFromYouTube(videoId);
  if (scrapedDuration > 0) {
    console.log(`Got duration for ${videoId}: ${scrapedDuration}s from YouTube HTML`);
    return scrapedDuration;
  }

  // Fallback to Invidious API
  const invidiousInstances = [
    'https://vid.puffyan.us',
    'https://invidious.snopyta.org',
    'https://yewtu.be'
  ];

  for (const instance of invidiousInstances) {
    try {
      const response = await fetch(`${instance}/api/v1/videos/${videoId}?fields=lengthSeconds`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.lengthSeconds) {
          console.log(`Got duration for ${videoId}: ${data.lengthSeconds}s from ${instance}`);
          return data.lengthSeconds;
        }
      }
    } catch (error) {
      console.log(`Invidious instance ${instance} failed for ${videoId}`);
    }
  }

  console.log(`No duration found for ${videoId}`);
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all videos with null duration
    const { data: videos, error: fetchError } = await supabase
      .from('youtube_videos')
      .select('id, video_id, title')
      .is('duration', null)
      .eq('status', 'completed');

    if (fetchError) {
      throw new Error(`Failed to fetch videos: ${fetchError.message}`);
    }

    console.log(`Found ${videos?.length || 0} videos with null duration`);

    const results = {
      total: videos?.length || 0,
      updated: 0,
      failed: 0,
      details: [] as { videoId: string; title: string; duration: number | null; success: boolean }[]
    };

    // Process videos in batches to avoid rate limits
    for (const video of videos || []) {
      const duration = await getVideoDuration(video.video_id);
      
      if (duration !== null) {
        const { error: updateError } = await supabase
          .from('youtube_videos')
          .update({ duration })
          .eq('id', video.id);

        if (updateError) {
          console.error(`Failed to update ${video.video_id}:`, updateError);
          results.failed++;
          results.details.push({ 
            videoId: video.video_id, 
            title: video.title, 
            duration: null, 
            success: false 
          });
        } else {
          results.updated++;
          results.details.push({ 
            videoId: video.video_id, 
            title: video.title, 
            duration, 
            success: true 
          });
        }
      } else {
        results.failed++;
        results.details.push({ 
          videoId: video.video_id, 
          title: video.title, 
          duration: null, 
          success: false 
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`Backfill complete: ${results.updated} updated, ${results.failed} failed`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
