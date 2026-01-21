import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getVideoDuration(videoId: string): Promise<number | null> {
  // Try Invidious API (public instances for YouTube metadata)
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

  // Fallback: Try YouTube oembed with noembed proxy
  try {
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (response.ok) {
      const data = await response.json();
      // noembed doesn't reliably provide duration, but worth trying
      if (data.duration) {
        console.log(`Got duration from noembed for ${videoId}: ${data.duration}`);
        return parseInt(data.duration, 10);
      }
    }
  } catch (error) {
    console.log(`noembed failed for ${videoId}`);
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
