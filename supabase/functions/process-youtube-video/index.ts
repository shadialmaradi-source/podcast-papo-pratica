import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoInfo {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
}

interface Exercise {
  id: string;
  type: string;
  question: string;
  options?: any;
  correctAnswer: string;
  explanation: string;
  points: number;
  difficulty: string;
  level: string;
  mode: string;
  orderIndex?: number;
  vocabularyWords?: string[];
  contextSentence?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, language = 'italian', difficulty = 'beginner', userId } = await req.json();
    
    if (!videoUrl) {
      throw new Error('Video URL is required');
    }

    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if video already exists
    const { data: existingVideo } = await supabase
      .from('youtube_videos')
      .select('*')
      .eq('video_id', videoId)
      .single();

    if (existingVideo) {
      console.log('Video already exists:', videoId);
      return new Response(JSON.stringify({ 
        success: true, 
        video: existingVideo,
        message: 'Video already processed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get video info from YouTube oEmbed API
    const videoInfo = await getVideoInfo(videoId);
    
    // Create video record with processing status
    const { data: video, error: videoError } = await supabase
      .from('youtube_videos')
      .insert({
        video_id: videoId,
        title: videoInfo.title,
        description: videoInfo.description,
        thumbnail_url: videoInfo.thumbnail,
        language,
        difficulty_level: difficulty,
        status: 'processing',
        processing_started_at: new Date().toISOString(),
        added_by_user_id: userId,
        is_curated: false
      })
      .select()
      .single();

    if (videoError) {
      throw new Error(`Failed to create video record: ${videoError.message}`);
    }

    console.log('Created video record:', video.id);

    // Start background processing
    await processVideoInBackground(supabase, video, videoId);

    return new Response(JSON.stringify({ 
      success: true, 
      video,
      message: 'Video processing started' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-youtube-video function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

async function getVideoInfo(videoId: string): Promise<VideoInfo> {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    
    if (!response.ok) {
      throw new Error('Video not found');
    }
    
    const data = await response.json();
    
    return {
      id: videoId,
      title: data.title || 'YouTube Video',
      description: data.author_name ? `Video by ${data.author_name}` : 'YouTube Video',
      duration: 'N/A',
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    throw new Error('Could not fetch video information.');
  }
}

async function processVideoInBackground(supabase: any, video: any, videoId: string) {
  try {
    console.log('Starting transcript generation for video:', videoId);
    
    // Generate transcript using OpenAI Whisper
    const transcript = await generateTranscript(videoId);
    
    if (!transcript) {
      throw new Error('Failed to generate transcript');
    }

    console.log('Generated transcript, length:', transcript.length);

    // Save transcript
    const { error: transcriptError } = await supabase
      .from('youtube_transcripts')
      .insert({
        video_id: video.id,
        transcript,
        language: video.language,
        word_count: transcript.split(' ').length
      });

    if (transcriptError) {
      throw new Error(`Failed to save transcript: ${transcriptError.message}`);
    }

    console.log('Saved transcript for video:', video.id);

    // Generate exercises for all difficulty levels and intensities
    const exercises = await generateAllExercises(transcript, video.id);
    
    if (exercises.length > 0) {
      const { error: exercisesError } = await supabase
        .from('youtube_exercises')
        .insert(exercises);

      if (exercisesError) {
        throw new Error(`Failed to save exercises: ${exercisesError.message}`);
      }

      console.log('Saved', exercises.length, 'exercises for video:', video.id);
    }

    // Update video status to completed
    await supabase
      .from('youtube_videos')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', video.id);

    console.log('Video processing completed successfully:', video.id);

  } catch (error) {
    console.error('Error in background processing:', error);
    
    // Update video status to failed
    await supabase
      .from('youtube_videos')
      .update({
        status: 'failed'
      })
      .eq('id', video.id);
  }
}

async function generateTranscript(videoId: string): Promise<string> {
  console.log('Starting transcript generation for video:', videoId);
  
  try {
    // Try multiple transcript APIs in order (same as client-side)
    const APIs = [
      {
        url: `https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}`,
        parser: (data: any) => Array.isArray(data) ? data.map((item: any) => item.text).join(' ') : null
      },
      {
        url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
        parser: (data: any) => data.events?.map((event: any) => 
          event.segs?.map((seg: any) => seg.utf8).join('') || ''
        ).join(' ') || null
      }
    ];

    for (const api of APIs) {
      try {
        console.log(`Trying transcript API: ${api.url}`);
        
        const response = await fetch(api.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('API Response received:', typeof data);
          
          const transcript = api.parser(data);
          
          if (transcript && transcript.trim().length > 0) {
            console.log(`Transcript loaded successfully, length: ${transcript.length}`);
            return transcript.trim();
          }
        }
      } catch (error) {
        console.log(`API ${api.url} failed:`, error);
        continue; // Try next API
      }
    }
    
    throw new Error('All transcript APIs failed - no captions available');
  } catch (error) {
    console.error('Error generating transcript:', error);
    throw new Error('This video does not have captions available or the transcript service is temporarily unavailable.');
  }
}

async function generateAllExercises(transcript: string, videoId: string): Promise<any[]> {
  const exercises = [];
  const difficulties = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const intensities = ['light', 'intense'];

  for (const difficulty of difficulties) {
    for (const intensity of intensities) {
      const exerciseCount = intensity === 'light' ? 5 : 10;
      const generatedExercises = generateTranscriptBasedExercises(transcript, difficulty, exerciseCount);
      
      for (let i = 0; i < generatedExercises.length; i++) {
        const exercise = generatedExercises[i];
        exercises.push({
          video_id: videoId,
          question: exercise.question,
          exercise_type: exercise.type,
          options: exercise.options || null,
          correct_answer: exercise.correctAnswer,
          explanation: exercise.explanation || '',
          difficulty,
          intensity,
          xp_reward: exercise.points || 10,
          order_index: i,
          vocabulary_words: exercise.vocabularyWords || null,
          context_sentence: exercise.contextSentence || null
        });
      }
    }
  }

  return exercises;
}

function generateTranscriptBasedExercises(transcript: string, level: string, exerciseCount: number): Exercise[] {
  const exercises: Exercise[] = [];
  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  
  if (sentences.length === 0) return exercises;

  const mode = exerciseCount > 5 ? 'intense' : 'light';
  
  // Generate different types of exercises
  const types = ['multiple_choice', 'true_false', 'gap_fill', 'matching'];
  
  for (let i = 0; i < exerciseCount && i < sentences.length; i++) {
    const sentence = sentences[i];
    const type = types[i % types.length];
    
    let exercise: Exercise;
    
    switch (type) {
      case 'multiple_choice':
        exercise = generateMCQFromSentence(sentence, level, mode, i);
        break;
      case 'true_false':
        exercise = generateTrueFalseFromSentence(sentence, level, mode, i);
        break;
      case 'gap_fill':
        exercise = generateGapFillFromSentence(sentence, level, mode, i);
        break;
      case 'matching':
        exercise = generateMatchingFromSentence(sentence, level, mode, i);
        break;
      default:
        exercise = generateMCQFromSentence(sentence, level, mode, i);
    }
    
    exercises.push(exercise);
  }
  
  return exercises;
}

function generateMCQFromSentence(sentence: string, level: string, mode: string, index: number): Exercise {
  const words = sentence.split(' ').filter(w => w.length > 3);
  const targetWord = words[Math.floor(Math.random() * words.length)] || 'word';
  
  const options = [
    targetWord,
    generateSimilarWord(targetWord),
    generateSimilarWord(targetWord),
    generateSimilarWord(targetWord)
  ].sort(() => Math.random() - 0.5);

  return {
    id: `mcq_${index}`,
    type: 'multiple_choice',
    question: `What does "${targetWord}" mean in this context: "${sentence}"?`,
    options,
    correctAnswer: targetWord,
    explanation: `The correct answer is "${targetWord}" based on the context.`,
    points: getPointsByLevel(level),
    difficulty: level,
    level,
    mode,
    orderIndex: index
  };
}

function generateTrueFalseFromSentence(sentence: string, level: string, mode: string, index: number): Exercise {
  const isTrue = Math.random() > 0.5;
  const question = isTrue ? sentence : modifySentenceToFalse(sentence);
  
  return {
    id: `tf_${index}`,
    type: 'true_false',
    question: `True or False: ${question}`,
    options: ['True', 'False'],
    correctAnswer: isTrue ? 'True' : 'False',
    explanation: isTrue ? 'This statement is true according to the video.' : 'This statement is false according to the video.',
    points: getPointsByLevel(level),
    difficulty: level,
    level,
    mode,
    orderIndex: index
  };
}

function generateGapFillFromSentence(sentence: string, level: string, mode: string, index: number): Exercise {
  const words = sentence.split(' ');
  const randomIndex = Math.floor(Math.random() * words.length);
  const targetWord = words[randomIndex];
  const gappedSentence = words.map((w, i) => i === randomIndex ? '___' : w).join(' ');
  
  const options = [
    targetWord,
    generateSimilarWord(targetWord),
    generateSimilarWord(targetWord)
  ].sort(() => Math.random() - 0.5);

  return {
    id: `gap_${index}`,
    type: 'gap_fill',
    question: `Fill in the blank: ${gappedSentence}`,
    options,
    correctAnswer: targetWord,
    explanation: `The correct word is "${targetWord}".`,
    points: getPointsByLevel(level),
    difficulty: level,
    level,
    mode,
    orderIndex: index
  };
}

function generateMatchingFromSentence(sentence: string, level: string, mode: string, index: number): Exercise {
  const words = sentence.split(' ').filter(w => w.length > 4).slice(0, 3);
  const pairs = words.map(word => [word, generateDefinition(word)]);
  
  return {
    id: `match_${index}`,
    type: 'matching',
    question: 'Match the words with their definitions:',
    options: {
      words: pairs.map(p => p[0]),
      definitions: pairs.map(p => p[1]).sort(() => Math.random() - 0.5)
    },
    correctAnswer: JSON.stringify(pairs),
    explanation: 'Match each word with its correct definition.',
    points: getPointsByLevel(level),
    difficulty: level,
    level,
    mode,
    orderIndex: index
  };
}

function generateSimilarWord(word: string): string {
  const similar = {
    'the': 'a',
    'and': 'or',
    'is': 'was',
    'are': 'were',
    'this': 'that',
    'have': 'has',
    'with': 'without',
    'for': 'from',
    'can': 'could',
    'will': 'would'
  };
  return similar[word.toLowerCase()] || word + 's';
}

function modifySentenceToFalse(sentence: string): string {
  const modifications = [
    s => s.replace(/is/g, 'is not'),
    s => s.replace(/are/g, 'are not'),
    s => s.replace(/can/g, 'cannot'),
    s => s.replace(/will/g, 'will not'),
    s => s.replace(/have/g, 'do not have')
  ];
  
  const modifier = modifications[Math.floor(Math.random() * modifications.length)];
  return modifier(sentence);
}

function generateDefinition(word: string): string {
  return `Definition of ${word}`;
}

function getPointsByLevel(level: string): number {
  const points = {
    'A1': 5,
    'A2': 7,
    'B1': 10,
    'B2': 12,
    'C1': 15,
    'C2': 20
  };
  return points[level] || 10;
}