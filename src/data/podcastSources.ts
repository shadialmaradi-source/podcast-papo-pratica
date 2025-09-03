export interface PodcastSource {
  id: string;
  title: string;
  description: string;
  rss_url: string;
  language: 'spanish' | 'portuguese';
  difficulty_level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  category: string;
  spotify_chart_rank: number;
  is_public: boolean;
  thumbnail_url: string;
  created_at: string;
  updated_at: string;
  // Additional fields for enhanced podcast experience
  official_url: string;
  spotify_url?: string;
  apple_podcasts_url?: string;
  embed_type: 'spotify' | 'apple' | 'custom';
  embed_url: string;
  author: string;
  copyright: string;
  episodes: PodcastEpisode[];
}

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  duration: string;
  publish_date: string;
  audio_url?: string;
  transcript_url?: string;
  excerpt?: string;
  episode_number?: number;
}

export const PODCAST_SOURCES: PodcastSource[] = [
  // Spanish Podcasts
  {
    id: 'duolingo-spanish',
    title: 'Duolingo Spanish Podcast',
    description: 'Real-life stories in simple Spanish',
    rss_url: 'https://feeds.soundcloud.com/users/soundcloud:users:253878014/sounds.rss',
    language: 'spanish',
    difficulty_level: 'A2',
    category: 'Language Learning',
    spotify_chart_rank: 5,
    is_public: true,
    thumbnail_url: 'https://i.scdn.co/image/ab67656300005f1f6e5e62cea4cb5d5e7c8e7b45',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    official_url: 'https://podcast.duolingo.com/spanish',
    spotify_url: 'https://open.spotify.com/show/4M2FSl5QAQtCRo6HyRuuJT',
    embed_type: 'spotify',
    embed_url: 'https://open.spotify.com/embed/show/4M2FSl5QAQtCRo6HyRuuJT',
    author: 'Duolingo',
    copyright: '© Duolingo',
    episodes: [
      {
        id: 'duolingo-ep1',
        title: 'El primer día de trabajo',
        description: 'Una historia sobre el primer día en un nuevo trabajo',
        duration: '15:30',
        publish_date: '2024-01-15',
        excerpt: 'María cuenta su experiencia en su primer día de trabajo en una oficina en Madrid.',
        episode_number: 1
      }
    ]
  },
  {
    id: 'un-dia-espanol',
    title: 'Un Día en Español',
    description: 'Daily conversations and cultural insights',
    rss_url: 'https://feeds.soundcloud.com/example1',
    language: 'spanish',
    difficulty_level: 'A1',
    category: 'Beginner Spanish',
    spotify_chart_rank: 12,
    is_public: true,
    thumbnail_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=300',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
    official_url: 'https://www.spanishpod101.com',
    spotify_url: 'https://open.spotify.com/show/example',
    embed_type: 'spotify',
    embed_url: 'https://open.spotify.com/embed/show/example',
    author: 'SpanishPod101',
    copyright: '© SpanishPod101',
    episodes: [
      {
        id: 'undia-ep1',
        title: 'Saludos y presentaciones',
        description: 'Aprende a saludar y presentarte en español',
        duration: '12:45',
        publish_date: '2024-01-10',
        excerpt: 'Conversaciones básicas para principiantes sobre saludos.',
        episode_number: 1
      }
    ]
  },
  {
    id: 'news-slow-spanish',
    title: 'News in Slow Spanish',
    description: 'Current events told in simple Spanish',
    rss_url: 'https://feeds.soundcloud.com/example2',
    language: 'spanish',
    difficulty_level: 'B1',
    category: 'News & Current Affairs',
    spotify_chart_rank: 8,
    is_public: true,
    thumbnail_url: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
    official_url: 'https://www.newsinslowspanish.com',
    spotify_url: 'https://open.spotify.com/show/example2',
    embed_type: 'spotify',
    embed_url: 'https://open.spotify.com/embed/show/example2',
    author: 'Linguistica 360',
    copyright: '© Linguistica 360',
    episodes: [
      {
        id: 'news-slow-ep1',
        title: 'Noticias de la semana',
        description: 'Resumen de las noticias más importantes',
        duration: '20:15',
        publish_date: '2024-01-20',
        excerpt: 'Noticias internacionales explicadas de forma clara.',
        episode_number: 1
      }
    ]
  },
  {
    id: 'spanish-coach',
    title: 'Spanish Language Coach',
    description: 'Intermediate Spanish lessons and practice',
    rss_url: 'https://feeds.soundcloud.com/example3',
    language: 'spanish',
    difficulty_level: 'B2',
    category: 'Language Learning',
    spotify_chart_rank: 15,
    is_public: true,
    thumbnail_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-18T00:00:00Z',
    official_url: 'https://spanishlanguagecoach.com',
    embed_type: 'custom',
    embed_url: 'https://spanishlanguagecoach.com/embed/player',
    author: 'Kara Alonso',
    copyright: '© Spanish Language Coach',
    episodes: [
      {
        id: 'coach-ep1',
        title: 'Expresiones coloquiales',
        description: 'Aprende expresiones comunes del español',
        duration: '25:30',
        publish_date: '2024-01-18',
        excerpt: 'Expresiones que usan los nativos en conversaciones cotidianas.',
        episode_number: 1
      }
    ]
  },
  {
    id: 'radio-ambulante',
    title: 'Radio Ambulante',
    description: 'Award-winning Latin American stories',
    rss_url: 'https://feeds.npr.org/radioambulante',
    language: 'spanish',
    difficulty_level: 'C1',
    category: 'Documentary',
    spotify_chart_rank: 3,
    is_public: true,
    thumbnail_url: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-22T00:00:00Z',
    official_url: 'https://radioambulante.org',
    spotify_url: 'https://open.spotify.com/show/07u6NJp8tIAOjaaPeHFlkJ',
    embed_type: 'spotify',
    embed_url: 'https://open.spotify.com/embed/show/07u6NJp8tIAOjaaPeHFlkJ',
    author: 'NPR',
    copyright: '© NPR',
    episodes: [
      {
        id: 'ambulante-ep1',
        title: 'El viaje de los migrantes',
        description: 'Historias reales de migración en América Latina',
        duration: '35:45',
        publish_date: '2024-01-22',
        excerpt: 'Testimonios de personas que han migrado en busca de mejores oportunidades.',
        episode_number: 1
      }
    ]
  },
  
  // Portuguese Podcasts
  {
    id: 'practice-portuguese',
    title: 'Practice Portuguese',
    description: 'Learn European Portuguese step by step',
    rss_url: 'https://feeds.soundcloud.com/practice-portuguese',
    language: 'portuguese',
    difficulty_level: 'A1',
    category: 'Language Learning',
    spotify_chart_rank: 18,
    is_public: true,
    thumbnail_url: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=300',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z',
    official_url: 'https://www.practiceportuguese.com',
    embed_type: 'custom',
    embed_url: 'https://www.practiceportuguese.com/embed/player',
    author: 'Joel Rendall',
    copyright: '© Practice Portuguese',
    episodes: [
      {
        id: 'practice-ep1',
        title: 'Primeiras palavras',
        description: 'Vocabulário básico para iniciantes',
        duration: '18:20',
        publish_date: '2024-01-12',
        excerpt: 'Aprenda as palavras mais importantes para começar a falar português.',
        episode_number: 1
      }
    ]
  },
  {
    id: 'ta-falado',
    title: 'Tá Falado (BrazilPod)',
    description: 'Brazilian Portuguese and culture',
    rss_url: 'https://feeds.soundcloud.com/ta-falado',
    language: 'portuguese',
    difficulty_level: 'A2',
    category: 'Brazilian Culture',
    spotify_chart_rank: 22,
    is_public: true,
    thumbnail_url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=300',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-14T00:00:00Z',
    official_url: 'https://coerll.utexas.edu/brazilpod/',
    embed_type: 'custom',
    embed_url: 'https://coerll.utexas.edu/brazilpod/embed',
    author: 'University of Texas',
    copyright: '© University of Texas at Austin',
    episodes: [
      {
        id: 'tafalado-ep1',
        title: 'Comida brasileira',
        description: 'Descobrindo os sabores do Brasil',
        duration: '22:15',
        publish_date: '2024-01-14',
        excerpt: 'Uma introdução à culinária brasileira e seus pratos típicos.',
        episode_number: 1
      }
    ]
  },
  {
    id: 'intermediate-portuguese',
    title: 'Intermediate Portuguese Podcast (Portuguese with Leo)',
    description: 'Stories and conversations for intermediate learners',
    rss_url: 'https://feeds.soundcloud.com/portuguese-leo',
    language: 'portuguese',
    difficulty_level: 'B1',
    category: 'Language Learning',
    spotify_chart_rank: 14,
    is_public: true,
    thumbnail_url: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=300',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-16T00:00:00Z',
    official_url: 'https://portuguesewithleo.com',
    spotify_url: 'https://open.spotify.com/show/example3',
    embed_type: 'spotify',
    embed_url: 'https://open.spotify.com/embed/show/example3',
    author: 'Leo Lins',
    copyright: '© Portuguese with Leo',
    episodes: [
      {
        id: 'leo-ep1',
        title: 'Vida em Lisboa',
        description: 'Como é viver na capital portuguesa',
        duration: '28:40',
        publish_date: '2024-01-16',
        excerpt: 'Experiências de estrangeiros morando em Lisboa.',
        episode_number: 1
      }
    ]
  },
  {
    id: 'introvertendo',
    title: 'Introvertendo',
    description: 'Deep conversations about life and society',
    rss_url: 'https://feeds.soundcloud.com/introvertendo',
    language: 'portuguese',
    difficulty_level: 'C1',
    category: 'Philosophy & Society',
    spotify_chart_rank: 9,
    is_public: true,
    thumbnail_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z',
    official_url: 'https://introvertendo.com.br',
    spotify_url: 'https://open.spotify.com/show/example4',
    embed_type: 'spotify',
    embed_url: 'https://open.spotify.com/embed/show/example4',
    author: 'Bruno Leal',
    copyright: '© Introvertendo',
    episodes: [
      {
        id: 'intro-ep1',
        title: 'A solidão na era digital',
        description: 'Reflexões sobre conexão humana no mundo moderno',
        duration: '45:20',
        publish_date: '2024-01-25',
        excerpt: 'Uma análise profunda sobre como a tecnologia afeta nossas relações.',
        episode_number: 1
      }
    ]
  }
];