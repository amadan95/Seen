
import { Reaction } from './types';

export const TMDB_API_KEY = 'dd0094d358b41f096f45fd2eaee7803a'; // User provided key
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_URL_W500 = 'https://image.tmdb.org/t/p/w500';
export const TMDB_IMAGE_BASE_URL_ORIGINAL = 'https://image.tmdb.org/t/p/original';

export const GEMINI_API_KEY = process.env.API_KEY; // Must be set in environment

export const APP_NAME = 'Seen';

// More vibrant accent color for the new theme
export const ACCENT_COLOR_NAME = 'cyan'; // e.g. cyan, teal, sky
export const ACCENT_COLOR_CLASS_TEXT = `text-${ACCENT_COLOR_NAME}-400`;
export const ACCENT_COLOR_CLASS_BG = `bg-${ACCENT_COLOR_NAME}-500`;
export const ACCENT_COLOR_CLASS_BG_HOVER = `hover:bg-${ACCENT_COLOR_NAME}-600`;
export const ACCENT_COLOR_CLASS_BORDER = `border-${ACCENT_COLOR_NAME}-500`;
export const ACCENT_COLOR_CLASS_RING = `ring-${ACCENT_COLOR_NAME}-500`;


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
