import { Reaction } from './types';

export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || ''; // Must be set in environment
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_URL_W500 = 'https://image.tmdb.org/t/p/w500';
export const TMDB_IMAGE_BASE_URL_ORIGINAL = 'https://image.tmdb.org/t/p/original';

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY; // Must be set in environment

export const APP_NAME = 'Seen';

// Adjusted for a more monochromatic theme
export const ACCENT_COLOR_NAME = 'neutral'; // Using a neutral placeholder
export const ACCENT_COLOR_CLASS_TEXT = `text-gray-300`; // Light gray for subtle text accents
export const ACCENT_COLOR_CLASS_BG = `bg-gray-700`; // Dark gray for backgrounds
export const ACCENT_COLOR_CLASS_BG_HOVER = `hover:bg-gray-600`; // Slightly lighter gray for hover
export const ACCENT_COLOR_CLASS_BORDER = `border-gray-600`; // Dark gray for borders
export const ACCENT_COLOR_CLASS_RING = `ring-gray-500`; // Medium gray for rings/focus


export const REACTION_EMOJIS: Record<Reaction, string> = {
  [Reaction.Liked]: '😍',
  [Reaction.Fine]: '🤔',
  [Reaction.Disliked]: '😒',
};

export const REACTION_LABELS: Record<Reaction, string> = {
  [Reaction.Liked]: 'Loved It', // Made more concise
  [Reaction.Fine]: 'It Was Fine',
  [Reaction.Disliked]: 'Not For Me',
};

export const DEFAULT_USER_ID = 'currentUser'; // For local storage keying, simulate single user

export const MAX_COMPARISON_CANDIDATES = 5;

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';

// Streaming Providers for US region (TMDB IDs)
// Reference: https://www.themoviedb.org/watch/providers?locale=US (Inspect network requests or look for IDs in TMDB docs)
export const STREAMING_PROVIDERS = [
  { id: 8, name: 'Netflix', shortName: 'Netflix' },
  { id: 9, name: 'Amazon Prime Video', shortName: 'Prime' },
  { id: 1899, name: 'Max', shortName: 'Max' },
  { id: 337, name: 'Disney Plus', shortName: 'Disney+' },
  { id: 15, name: 'Hulu', shortName: 'Hulu' },
  { id: 350, name: 'Apple TV Plus', shortName: 'Apple TV+' },
  { id: 531, name: 'Paramount Plus', shortName: 'Paramount+' }
  // Add more as needed, ensuring IDs are correct for 'US' region
];
