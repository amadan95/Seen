import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { TMDB_API_KEY, TMDB_BASE_URL, GEMINI_API_KEY, GEMINI_TEXT_MODEL, DEFAULT_USER_ID, MAX_COMPARISON_CANDIDATES, TMDB_IMAGE_BASE_URL_W500, TMDB_IMAGE_BASE_URL_ORIGINAL } from './constants';
import { MediaItem, TMDBMovie, TMDBShow, Reaction, RatedItem, WatchlistItem, RankedItem, TMDBGenre, GeminiComparisonPromptRequest, CreditsResponse, TVSeasonDetailsResponse, WatchProviderResponse, TMDBGenreListResponse, CustomList, CustomListMediaItem, PersonDetails, PersonCombinedCreditsResponse, PersonCreditItem } from './types';

// --- TMDB Service ---
interface TMDBListResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

const fetchTMDB = async <T,>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

  const response = await fetch(url.toString());
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown TMDB API error' }));
    throw new Error(`TMDB API Error: ${errorData.status_message || response.statusText || 'Failed to fetch data from TMDB'}`);
  }
  return response.json();
};

export const getRuntimeCategory = (item: MediaItem): string => {
  const duration = item.media_type === 'movie' ? item.runtime : (item.episode_run_time && item.episode_run_time.length > 0 ? item.episode_run_time[0] : undefined);
  if (duration === undefined || duration === null) return 'Unknown';
  if (duration < 45) return '<45 min';
  if (duration <= 75) return '45-75 min';
  return '>75 min';
};


export const tmdbService = {
  searchMedia: async (query: string, page: number = 1): Promise<TMDBListResponse<MediaItem>> => {
    // Explicitly type the response as MediaItem to handle mixed results
    const response = await fetchTMDB<TMDBListResponse<any>>('/search/multi', { query, page: page.toString(), include_adult: 'false' });
    response.results = response.results.map(item => ({
        ...item,
        media_type: item.media_type // Ensure media_type is present
    })) as MediaItem[];
    return response as TMDBListResponse<MediaItem>;
  },
  getMediaDetails: async (id: number, type: 'movie' | 'tv'): Promise<MediaItem> => {
    if (type === 'movie') {
      const movieData = await fetchTMDB<Omit<TMDBMovie, 'media_type'>>(`/movie/${id}`, { append_to_response: 'genres,credits,release_dates' });
      return { ...movieData, media_type: 'movie' };
    } else {
      const showData = await fetchTMDB<Omit<TMDBShow, 'media_type'>>(`/tv/${id}`, { append_to_response: 'genres,credits,content_ratings' });
      return { ...showData, media_type: 'tv' };
    }
  },
  getPopularMovies: async (page: number = 1): Promise<TMDBListResponse<TMDBMovie>> => {
    const response = await fetchTMDB<TMDBListResponse<Omit<TMDBMovie, 'media_type'>>>(`/movie/popular`, { page: page.toString() });
    response.results = response.results.map(m => ({ ...m, media_type: 'movie' }));
    return response as TMDBListResponse<TMDBMovie>;
  },
  getPopularShows: async (page: number = 1): Promise<TMDBListResponse<TMDBShow>> => {
    const response = await fetchTMDB<TMDBListResponse<Omit<TMDBShow, 'media_type'>>>(`/tv/popular`, { page: page.toString() });
    response.results = response.results.map(s => ({ ...s, media_type: 'tv' }));
    return response as TMDBListResponse<TMDBShow>;
  },
  getTrendingMedia: async (mediaType: 'movie' | 'tv', timeWindow: 'day' | 'week' = 'week', page: number = 1): Promise<TMDBListResponse<MediaItem>> => {
    const response = await fetchTMDB<TMDBListResponse<MediaItem>>(`/trending/${mediaType}/${timeWindow}`, { page: page.toString() });
    response.results = response.results.map(apiItem => {
      if (mediaType === 'movie') {
        const movieItem = apiItem as TMDBMovie;
        return { ...movieItem, title: movieItem.title || "Unknown Movie", media_type: 'movie' as const };
      } else { 
        const showItem = apiItem as TMDBShow;
        return { ...showItem, name: showItem.name || "Unknown Show", media_type: 'tv' as const };
      }
    });
    return response;
  },
  getMediaCredits: async (id: number, type: 'movie' | 'tv'): Promise<CreditsResponse> => {
    return fetchTMDB<CreditsResponse>(`/${type}/${id}/credits`);
  },
  getTVSeasonDetails: async (tvId: number, seasonNumber: number): Promise<TVSeasonDetailsResponse> => {
    return fetchTMDB<TVSeasonDetailsResponse>(`/tv/${tvId}/season/${seasonNumber}`, {append_to_response: 'credits'});
  },
  getImageUrl: (path: string | null, size: 'w500' | 'original' = 'w500'): string | null => {
    if (!path) return null;
    return size === 'w500' ? `${TMDB_IMAGE_BASE_URL_W500}${path}` : `${TMDB_IMAGE_BASE_URL_ORIGINAL}${path}`;
  },
  prepareRatedItemProperties: async (item: MediaItem): Promise<MediaItem & { genres: TMDBGenre[], original_language: string, runtimeCategory: string }> => {
    let detailedItem = { ...item }; 

    const needsFetching = !detailedItem.genres || detailedItem.genres.length === 0 || 
                          !detailedItem.original_language || 
                          (detailedItem.media_type === 'movie' && typeof detailedItem.runtime !== 'number') ||
                          (detailedItem.media_type === 'tv' && (!detailedItem.episode_run_time || detailedItem.episode_run_time.length === 0));

    if (needsFetching && detailedItem.media_type) {
        try {
          const fetchedDetails = await tmdbService.getMediaDetails(detailedItem.id, detailedItem.media_type);
          detailedItem = { ...detailedItem, ...fetchedDetails };
        } catch (error) {
          console.error(`Failed to fetch full details for ${detailedItem.id} (${detailedItem.media_type}). Using existing data. Error:`, error);
        }
    }
    
    return { 
        ...detailedItem, 
        genres: detailedItem.genres || [],
        original_language: detailedItem.original_language || 'N/A', 
        runtimeCategory: getRuntimeCategory(detailedItem) 
    };
  },
  getMovieGenres: async (): Promise<TMDBGenre[]> => {
    const response = await fetchTMDB<TMDBGenreListResponse>('/genre/movie/list');
    return response.genres;
  },
  getTvGenres: async (): Promise<TMDBGenre[]> => {
    const response = await fetchTMDB<TMDBGenreListResponse>('/genre/tv/list');
    return response.genres;
  },
  getWatchProviders: async (id: number, type: 'movie' | 'tv'): Promise<WatchProviderResponse> => {
    return fetchTMDB<WatchProviderResponse>(`/${type}/${id}/watch/providers`);
  },
  getPersonDetails: async (personId: number): Promise<PersonDetails> => {
    return fetchTMDB<PersonDetails>(`/person/${personId}`);
  },
  getPersonCombinedCredits: async (personId: number): Promise<PersonCombinedCreditsResponse> => {
    const response = await fetchTMDB<any>(`/person/${personId}/combined_credits`);
    // TMDB combined_credits might include items without media_type, filter them out or ensure they have one.
    // Also, ensure titles/names are consistent.
    const mapCredit = (credit: any): PersonCreditItem | null => {
        if (!credit.media_type || (credit.media_type !== 'movie' && credit.media_type !== 'tv')) {
            return null; // Or handle as 'person' or other type if needed
        }
        return {
            ...credit,
            title: credit.media_type === 'movie' ? credit.title : undefined,
            name: credit.media_type === 'tv' ? credit.name : undefined,
        } as PersonCreditItem;
    };

    return {
        id: response.id,
        cast: response.cast.map(mapCredit).filter((c: PersonCreditItem | null): c is PersonCreditItem => c !== null),
        crew: response.crew.map(mapCredit).filter((c: PersonCreditItem | null): c is PersonCreditItem => c !== null),
    };
  },
  discoverMedia: async (params: Record<string, string> = {}, mediaType: 'movie' | 'tv' = 'movie', watchRegion?: string, watchProviders?: string): Promise<TMDBListResponse<MediaItem>> => {
    const endpoint = `/discover/${mediaType}`;
    const discoverParams: Record<string, string> = {
      ...params,
      include_adult: 'false',
      language: 'en-US',
      sort_by: params.sort_by || 'popularity.desc' // Keep user-defined sort or default to popularity
    };

    if (watchRegion) {
      discoverParams.watch_region = watchRegion;
    }
    if (watchProviders) {
      discoverParams.with_watch_providers = watchProviders;
    }

    try {
      const response = await fetchTMDB<TMDBListResponse<any>>(endpoint, discoverParams);
      response.results = response.results.map(item => ({
        ...item,
        media_type: mediaType // Ensure media_type is present
      })) as MediaItem[];
      return response as TMDBListResponse<MediaItem>;
    } catch (error) {
      console.error(`Error in discoverMedia for ${mediaType}:`, error);
      throw error;
    }
  }
};

let ai: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
} else {
  console.warn("Gemini API Key not found. Comparison prompts will be generic.");
}

export const geminiService = {
  generateComparisonPrompt: async (data: GeminiComparisonPromptRequest): Promise<string> => {
    const newItemTitle = data.newItem.title || data.newItem.name;
    const existingItemTitle = data.existingItem.title || data.existingItem.name;
    
    if (!ai) {
      return `Which do you prefer: "${newItemTitle}" or "${existingItemTitle}"?`;
    }

    let promptContents = `A user is comparing two titles they've previously indicated similar sentiment for: "${newItemTitle}" (Reaction: ${data.reaction}) and "${existingItemTitle}" (Reaction: ${data.reaction}). `;
    if (data.isIterative) {
        promptContents += `This is part of a ranking process. `;
    } else {
        promptContents += `The user just rated "${newItemTitle}". `;
    }
    if (data.sharedGenres && data.sharedGenres.length > 0) {
        promptContents += `Both are in the ${data.sharedGenres.join('/')} genre. `
    }
    promptContents += `Generate a short, engaging question (1-2 sentences, max 25 words) to help them decide which of these two they prefer overall. Focus on lasting impact, core appeal, or a specific comparative aspect if genres are known. Avoid generic "Which is better?".`;
    
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: promptContents,
        config: { thinkingConfig: { thinkingBudget: 0 } } 
      });
      let text = (response.text ?? '').trim();
      const preambles = ["Okay, here's a question:", "Sure, here's one:", "Here's a question for you:"];
      for (const preamble of preambles) {
        if (text.toLowerCase().startsWith(preamble.toLowerCase())) {
          text = text.substring(preamble.length).trim();
          break;
        }
      }
      return text || `Which one truly resonated more: "${newItemTitle}" or "${existingItemTitle}"?`;
    } catch (error) {
      console.error("Error generating comparison prompt with Gemini:", error);
      return `Which one truly resonated more: "${newItemTitle}" or "${existingItemTitle}"?`;
    }
  },
};

const getLocalStorageKey = (key: string) => `${DEFAULT_USER_ID}_${key}`;

const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  const storedValue = localStorage.getItem(getLocalStorageKey(key));
  try {
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  } catch (error) {
    console.error("Error parsing localStorage item:", error);
    return defaultValue;
  }
};

const saveToLocalStorage = <T,>(key: string, value: T): void => {
  localStorage.setItem(getLocalStorageKey(key), JSON.stringify(value));
};

export const calculatePersonalScore = (rank: number, totalItemsInBucket: number, reaction: Reaction): number => {
  if (totalItemsInBucket <= 0 || rank < 0 ) return 0; 

  let baseScore: number;
  let topScore: number;
  let rangeWidth: number;

  switch (reaction) {
    case Reaction.Liked: baseScore = 7.0; topScore = 10.0; break;
    case Reaction.Fine: baseScore = 4.0; topScore = 6.9; break;
    case Reaction.Disliked: baseScore = 0.0; topScore = 3.9; break;
    default: return 0; 
  }
  rangeWidth = topScore - baseScore;

  if (totalItemsInBucket === 1) return parseFloat(topScore.toFixed(1));
  
  const normalizedRank = Math.max(0, Math.min(rank, totalItemsInBucket - 1));
  const denominator = totalItemsInBucket - 1;
  if (denominator === 0) return parseFloat(topScore.toFixed(1));

  const relativeScore = (denominator - normalizedRank) / denominator;
  const finalScore = baseScore + (relativeScore * rangeWidth);
  
  return parseFloat(finalScore.toFixed(1));
};

// Helper function to get ISO week number and year
const getISOWeekAndYear = (date: Date): { week: number; year: number } => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // Set to nearest Thursday: current date + 4 - current day number
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7); // Calculate week number
    return { week: weekNumber, year: d.getUTCFullYear() };
};

export const userListService = {
  getWatchlist: (): WatchlistItem[] => getFromLocalStorage<WatchlistItem[]>('watchlist', []),
  addToWatchlist: (item: MediaItem): WatchlistItem[] => {
    const list = userListService.getWatchlist();
    if (!list.find(i => i.id === item.id && i.media_type === item.media_type)) {
      const newItem: WatchlistItem = { ...item, addedAt: new Date().toISOString() };
      const updatedList = [newItem, ...list];
      saveToLocalStorage('watchlist', updatedList);
      return updatedList;
    }
    return list;
  },
  removeFromWatchlist: (itemId: number, itemType: 'movie' | 'tv'): WatchlistItem[] => {
    let list = userListService.getWatchlist();
    list = list.filter(i => !(i.id === itemId && i.media_type === itemType));
    saveToLocalStorage('watchlist', list);
    return list;
  },
  isWatchlisted: (itemId: number, itemType: 'movie' | 'tv'): boolean => {
    return !!userListService.getWatchlist().find(i => i.id === itemId && i.media_type === itemType);
  },

  getSeenList: (): RatedItem[] => getFromLocalStorage<RatedItem[]>('seenlist', []),

  createRatedItem: async (item: MediaItem, reaction: Reaction, userNotes?: string): Promise<RatedItem> => {
    const preparedItem = await tmdbService.prepareRatedItemProperties(item);
    const ratedItem: RatedItem = { 
        ...(preparedItem as MediaItem & { genres: TMDBGenre[], original_language: string, runtimeCategory: string }), 
        userReaction: reaction, 
        ratedAt: new Date().toISOString(),
        userNotes: userNotes?.trim() || undefined,
    };
    if (item.media_type) {
        const watchlist = userListService.getWatchlist();
        const updatedWatchlist = watchlist.filter(i => !(i.id === item.id && i.media_type === item.media_type));
        if (watchlist.length !== updatedWatchlist.length) {
            saveToLocalStorage('watchlist', updatedWatchlist);
        }
    }
    // Add to seen list immediately before comparison logic
    const currentSeenList = userListService.getSeenList();
    const updatedSeenList = [ratedItem, ...currentSeenList.filter(i => !(i.id === ratedItem.id && i.media_type === ratedItem.media_type))];
    saveToLocalStorage('seenlist', updatedSeenList);

    return ratedItem;
  },

  isSeen: (itemId: number, itemType: 'movie' | 'tv'): RatedItem | undefined => {
    return userListService.getSeenList().find(i => i.id === itemId && i.media_type === itemType);
  },
  
  calculatePersonalScore, 

  updateOrderAfterIteration: (
    itemJustRanked: RatedItem, 
    finalOrderedBucket: RatedItem[] 
  ): RatedItem[] => {
    const currentGlobalSeenList = userListService.getSeenList();
    const reactionOfBucket = itemJustRanked.userReaction;
    const mediaTypeOfBucket = itemJustRanked.media_type;

    const otherItemsFromGlobalList = currentGlobalSeenList.filter(i => 
        (i.userReaction !== reactionOfBucket || i.media_type !== mediaTypeOfBucket) &&
        !(i.id === itemJustRanked.id && i.media_type === itemJustRanked.media_type) // ensure the item itself is not duplicated
    );
    
    const newGlobalSeenList = [...finalOrderedBucket, ...otherItemsFromGlobalList];
    
    saveToLocalStorage('seenlist', newGlobalSeenList);
    return newGlobalSeenList;
  },

  getRankedList: (mediaType?: 'movie' | 'tv', reactionForBucket?: Reaction): RankedItem[] => {
    let itemsToRank = userListService.getSeenList();

    if (mediaType) {
      itemsToRank = itemsToRank.filter(i => i.media_type === mediaType);
    }
    if (reactionForBucket) {
      itemsToRank = itemsToRank.filter(i => i.userReaction === reactionForBucket);
    }

    return itemsToRank.map((item, indexInFilteredList) => {
      const itemsInActualReactionAndTypeBucket = userListService.getSeenList().filter(
        i => i.userReaction === item.userReaction && i.media_type === item.media_type
      );
      
      const rankInSpecificBucket = itemsInActualReactionAndTypeBucket.findIndex(i => i.id === item.id && i.media_type === item.media_type);
      
      return {
        ...item,
        rank: indexInFilteredList, 
        personalScore: calculatePersonalScore(
          rankInSpecificBucket, 
          itemsInActualReactionAndTypeBucket.length, 
          item.userReaction
        ),
      };
    });
  },  

  calculateWeeklyStreak: (): number => {
    const seenItems = userListService.getSeenList();
    if (seenItems.length === 0) return 0;

    const sortedItems = seenItems.sort((a, b) => new Date(a.ratedAt).getTime() - new Date(b.ratedAt).getTime());
    
    let streak = 0;
    let lastWeekYear: { week: number; year: number } | null = null;

    const uniqueWeeks = new Set<string>();
    for (const item of sortedItems) {
      uniqueWeeks.add(JSON.stringify(getISOWeekAndYear(new Date(item.ratedAt))));
    }

    const sortedUniqueWeekYears = Array.from(uniqueWeeks)
        .map(s => JSON.parse(s) as { week: number; year: number })
        .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.week - b.week;
        });

    if (sortedUniqueWeekYears.length === 0) return 0;

    for (let i = sortedUniqueWeekYears.length - 1; i >= 0; i--) {
        const currentWeekYear = sortedUniqueWeekYears[i];
        if (lastWeekYear === null) { // First item (most recent week)
            streak = 1;
            lastWeekYear = currentWeekYear;
        } else {
            // Check if current week is exactly one week before the lastWeekYear
            let expectedPrevYear = lastWeekYear.year;
            let expectedPrevWeek = lastWeekYear.week - 1;
            if (expectedPrevWeek === 0) { // Handle year boundary
                expectedPrevWeek = getISOWeekAndYear(new Date(lastWeekYear.year -1, 11, 31)).week; // last week of previous year
                expectedPrevYear -= 1;
            }

            if (currentWeekYear.year === expectedPrevYear && currentWeekYear.week === expectedPrevWeek) {
                streak++;
                lastWeekYear = currentWeekYear;
            } else {
                break; // Streak is broken
            }
        }
    }
    return streak;
  },

  // --- Custom List Service ---
  getCustomLists: (): CustomList[] => getFromLocalStorage<CustomList[]>('custom_lists', []),
  
  createCustomList: (name: string, description?: string): CustomList[] => {
    const lists = userListService.getCustomLists();
    const newList: CustomList = {
      id: crypto.randomUUID(),
      name,
      description,
      userId: DEFAULT_USER_ID,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedLists = [newList, ...lists];
    saveToLocalStorage('custom_lists', updatedLists);
    return updatedLists;
  },

  getCustomListById: (listId: string): CustomList | undefined => {
    return userListService.getCustomLists().find(list => list.id === listId);
  },

  updateCustomList: (listId: string, updates: Partial<Pick<CustomList, 'name' | 'description'>>): CustomList[] => {
    let lists = userListService.getCustomLists();
    lists = lists.map(list => 
      list.id === listId 
        ? { ...list, ...updates, updatedAt: new Date().toISOString() } 
        : list
    );
    saveToLocalStorage('custom_lists', lists);
    return lists;
  },

  deleteCustomList: (listId: string): CustomList[] => {
    let lists = userListService.getCustomLists();
    lists = lists.filter(list => list.id !== listId);
    saveToLocalStorage('custom_lists', lists);
    return lists;
  },

  addItemToCustomList: (listId: string, mediaItem: MediaItem): CustomList | undefined => {
    const lists = userListService.getCustomLists();
    const listIndex = lists.findIndex(l => l.id === listId);
    if (listIndex === -1) return undefined;

    const list = lists[listIndex];
    if (!list.items.find(item => item.id === mediaItem.id && item.media_type === mediaItem.media_type)) {
      const newItem: CustomListMediaItem = { ...mediaItem, addedToListAt: new Date().toISOString() };
      list.items = [newItem, ...list.items]; // Add to the beginning
      list.updatedAt = new Date().toISOString();
      saveToLocalStorage('custom_lists', lists);
      return list;
    }
    return list; // Item already exists
  },

  removeItemFromCustomList: (listId: string, mediaItemId: number, mediaItemType: 'movie' | 'tv'): CustomList | undefined => {
    const lists = userListService.getCustomLists();
    const listIndex = lists.findIndex(l => l.id === listId);
    if (listIndex === -1) return undefined;
    
    const list = lists[listIndex];
    list.items = list.items.filter(item => !(item.id === mediaItemId && item.media_type === mediaItemType));
    list.updatedAt = new Date().toISOString();
    saveToLocalStorage('custom_lists', lists);
    return list;
  },

  reorderCustomListItem: (listId: string, itemIndex: number, direction: 'up' | 'down'): CustomList | undefined => {
    const lists = userListService.getCustomLists();
    const listIndex = lists.findIndex(l => l.id === listId);
    if (listIndex === -1) return undefined;

    const list = lists[listIndex];
    const { items } = list;
    if (direction === 'up' && itemIndex > 0) {
      [items[itemIndex], items[itemIndex - 1]] = [items[itemIndex - 1], items[itemIndex]];
    } else if (direction === 'down' && itemIndex < items.length - 1) {
      [items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]];
    }
    list.updatedAt = new Date().toISOString();
    saveToLocalStorage('custom_lists', lists);
    return list;
  },
};
