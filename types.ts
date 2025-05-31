export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBMediaItemBase {
  id: number;
  title?: string; // For movies
  name?: string; // For TV shows
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number; // TMDB rating
  release_date?: string; // For movies
  first_air_date?: string; // For TV shows
  genres?: TMDBGenre[];
  genre_ids?: number[];
  runtime?: number; // For movies, in minutes
  episode_run_time?: number[]; // For TV shows, in minutes
  media_type: 'movie' | 'tv' | 'person';
  original_language?: string;
  popularity?: number; // Added for recommendation sorting
  // User-defined or potentially derived in future
  moodTags?: string[]; 
  platform?: string; 
  recScore?: number; // ADDED for recommendation score
  // For person credits
  character?: string; 
  job?: string; 
  credits?: CreditsResponse; // Moved credits here, as it can apply to movie or TV for recs
}

export interface TMDBMovie extends TMDBMediaItemBase {
  title: string;
  release_date: string;
  media_type: 'movie';
  runtime?: number;
  backdrop_path: string | null;
}

export interface TMDBSeasonSummary {
  air_date: string | null;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
}

export interface TMDBShow extends TMDBMediaItemBase {
  name: string;
  original_name?: string;
  first_air_date: string;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: TMDBSeasonSummary[];
  backdrop_path: string | null;
}

export type MediaItem = TMDBMovie | TMDBShow;

export enum Reaction {
  Liked = 'liked',
  Fine = 'fine',
  Disliked = 'disliked',
}

// Properties specific to a rated item
interface RatingDetails {
  userReaction: Reaction;
  ratedAt: string; // ISO date string
  userNotes?: string;
  runtimeCategory?: string;
  // No credits here, it's on TMDBMediaItemBase now for rated items
}

// RatedItem is a MediaItem (Movie or Show) that also has RatingDetails
export type RatedItem = MediaItem & RatingDetails;

export type RankedItem = RatedItem & {
  personalScore: number;
  rank: number;
};

export interface UserProfile {
  id: string;
  handle: string;
  avatarUrl?: string;
}

export type WatchlistItem = MediaItem & {
  addedAt: string;
};

export interface ComparisonStep {
  itemComparedAgainst: MediaItem;
  userPreferredNewItem: boolean;
  promptUsed?: string;
}

export interface IterativeComparisonSession {
  isActive: boolean;
  newItem: RatedItem;
  comparisonBucketSnapshot: RatedItem[]; 
  lowIndex: number;
  highIndex: number;
  pivotItem: RatedItem | null;
  currentPrompt: string;
  comparisonsMade: number;
  maxComparisons: number;
  history: ComparisonStep[];
}

export interface ComparisonSummary {
  show: boolean;
  rankedItem: RankedItem | null;
  comparisonHistory: ComparisonStep[];
  totalComparisonsMade: number;
}

export enum FeedActivityType {
  NewRating = 'new_rating',
  NewWatchlist = 'new_watchlist',
  DirectRec = 'direct_rec',
  TasteMatchUpdate = 'taste_match_update',
  GroupTrend = 'group_trend',
  NewCustomList = 'new_custom_list', // For social feed
}

// For Social Feed Comments (simulated)
export interface FeedComment {
  id: string;
  user: UserProfile;
  text: string;
  timestamp: string;
}

export interface FeedItem {
  id: string;
  user: UserProfile;
  activityType: FeedActivityType;
  mediaItem?: MediaItem;
  relatedMediaItem?: MediaItem; // e.g. for TasteMatch, could be another user's profile or a common item
  customListName?: string; // For NewCustomList activity
  timestamp: string;
  message?: string;
  reaction?: Reaction;
  // For simulated social interaction
  likes?: number;
  comments?: FeedComment[];
}

export interface GeminiComparisonPromptRequest {
  newItem: MediaItem;
  existingItem: MediaItem;
  reaction: Reaction;
  isIterative?: boolean; 
  sharedGenres?: string[]; 
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
  // Added from combined credits if available
  gender?: number;
  known_for_department?: string;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
  // Added from combined credits if available
  gender?: number;
  known_for_department?: string;
}

export interface CreditsResponse {
  id: number;
  cast: CastMember[];
  crew: CrewMember[];
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string | null;
  vote_average: number;
  crew?: CrewMember[];
  guest_stars?: CastMember[];
}

export interface TVSeasonDetailsResponse {
  _id: string;
  air_date: string | null;
  episodes: Episode[];
  name: string;
  overview: string;
  id: number;
  poster_path: string | null;
  season_number: number;
}

export interface WatchProviderDetails {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface WatchProviderCountryResult {
  link: string;
  flatrate?: WatchProviderDetails[];
  rent?: WatchProviderDetails[];
  buy?: WatchProviderDetails[];
  ads?: WatchProviderDetails[];
  free?: WatchProviderDetails[];
}

export interface WatchProviderResponse {
  id: number;
  results: {
    [countryCode: string]: WatchProviderCountryResult;
  };
}

export interface TMDBGenreListResponse {
  genres: TMDBGenre[];
}

// --- Custom List Types ---
export type CustomListMediaItem = MediaItem & { addedToListAt: string };

export interface CustomList {
  id: string; // UUID
  name: string;
  description?: string;
  userId: string; // Could be 'currentUser' for local
  items: CustomListMediaItem[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// --- Person (Actor/Director/Crew) Detail Types ---
export interface PersonDetails {
  adult: boolean;
  also_known_as: string[];
  biography: string;
  birthday: string | null;
  deathday: string | null;
  gender: number; // 0: Not set, 1: Female, 2: Male, 3: Non-binary
  homepage: string | null;
  id: number;
  imdb_id: string;
  known_for_department: string;
  name: string;
  place_of_birth: string | null;
  popularity: number;
  profile_path: string | null;
}

// Item in combined credits (can be movie or TV)
export type PersonCreditItem = MediaItem & {
  // specific to credits list
  credit_id: string;
  // for cast
  character?: string;
  order?: number; // if cast
  // for crew
  department?: string;
  job?: string;
};

export interface PersonCombinedCreditsResponse {
  id: number; // Person's ID
  cast: PersonCreditItem[];
  crew: PersonCreditItem[];
}

// For "Known For" department, potentially more structured than just string
export enum PersonKnownForDepartment {
    Acting = "Acting",
    Directing = "Directing",
    Writing = "Writing",
    Production = "Production",
    Crew = "Crew",
    // ... other TMDB departments
}

export interface TMDBListResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}
