
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, NavLink, useNavigate, useLocation, useParams, Link as RouterLink } from 'react-router-dom';
import { MediaItem, Reaction, RatedItem, WatchlistItem, TMDBGenre, FeedActivityType, TMDBMovie, TMDBShow, CreditsResponse, CastMember, CrewMember, TVSeasonDetailsResponse, Episode as EpisodeType, RankedItem, IterativeComparisonSession, ComparisonSummary, ComparisonStep, WatchProviderResponse, WatchProviderCountryResult, CustomList, CustomListMediaItem, PersonDetails, PersonCombinedCreditsResponse, UserProfile, FeedComment, PersonCreditItem } from './types';
import { MediaCard, ReactionPicker, PairwiseComparisonModal, SearchBar, Modal, RatedMediaCard, Skeleton, PosterImage, CastCard, EpisodeCard, ComparisonSummaryModal, NotesTextarea, WatchProviderDisplay, CreateListModal, AddToListModal, CustomListItemCard, CrewMemberDisplay, FeedCard } from './components';
import { HomeIcon, ListBulletIcon, UserGroupIcon, StarIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon, EyeIcon as SeenIconAction, PlusIcon as AddIconAction, InformationCircleIcon, PlusCircleIcon, PencilIcon, TrashIcon, FilmIcon, TvIcon, RectangleStackIcon, CheckCircleIcon, ArrowUpOnSquareIcon, TrophyIcon, FireIcon, UserIcon as ProfileNavIcon, BookmarkIcon as WantToTryIcon, HeartIcon as RecsIcon } from './icons';
import { tmdbService, userListService, geminiService, getRuntimeCategory } from './services';
import { mockFeedItems, mockUser } from './mockData'; 
import { APP_NAME, REACTION_EMOJIS, REACTION_LABELS, TMDB_IMAGE_BASE_URL_ORIGINAL, ACCENT_COLOR_CLASS_TEXT, ACCENT_COLOR_CLASS_BG, ACCENT_COLOR_CLASS_BG_HOVER, ACCENT_COLOR_CLASS_BORDER, ACCENT_COLOR_CLASS_RING, DEFAULT_USER_ID } from './constants';

const MAX_COMPARISONS_PER_ITEM = 5;

// --- Main App Component ---
const App: React.FC = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [seenList, setSeenList] = useState<RatedItem[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  
  const [selectedItemForReaction, setSelectedItemForReaction] = useState<MediaItem | null>(null);
  const [currentUserNotes, setCurrentUserNotes] = useState<string>("");
  const [isReactionModalOpen, setIsReactionModalOpen] = useState(false);

  const [iterativeComparisonState, setIterativeComparisonState] = useState<IterativeComparisonSession | null>(null);
  const [comparisonSummaryState, setComparisonSummaryState] = useState<ComparisonSummary>({ show: false, rankedItem: null, comparisonHistory: [], totalComparisonsMade: 0 });
  
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);

  // Modals for custom lists
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [selectedMediaForListAddition, setSelectedMediaForListAddition] = useState<MediaItem | null>(null);


  useEffect(() => {
    setWatchlist(userListService.getWatchlist());
    setSeenList(userListService.getSeenList());
    setCustomLists(userListService.getCustomLists());
  }, []);

  const handleAddToWatchlist = useCallback((item: MediaItem) => {
    const updated = userListService.addToWatchlist(item);
    setWatchlist(updated);
  }, []);

  const handleRemoveFromWatchlist = useCallback((itemId: number, itemType: 'movie' | 'tv') => {
    const updated = userListService.removeFromWatchlist(itemId, itemType);
    setWatchlist(updated);
  }, []);

  const handleMarkAsSeen = useCallback((item: MediaItem) => {
    setSelectedItemForReaction(item);
    const existingRating = userListService.isSeen(item.id, item.media_type as 'movie' | 'tv');
    setCurrentUserNotes(existingRating?.userNotes || "");
    setIsReactionModalOpen(true);
  }, []);

  const calculatePivotIndexSmartly = (low: number, high: number, newItem: RatedItem, comparisonList: RatedItem[]): number => {
    if (low > high) return low;
    return Math.floor((low + high) / 2);
  };

  const proceedToNextComparisonStep = useCallback(async (session: IterativeComparisonSession) => {
    if (!session.isActive) return;
    if (session.lowIndex > session.highIndex || session.comparisonsMade >= session.maxComparisons) {
      const insertionIndex = session.lowIndex;
      let finalOrderedBucket = [...session.comparisonBucketSnapshot];
      finalOrderedBucket.splice(insertionIndex, 0, session.newItem);
      const updatedFullSeenList = userListService.updateOrderAfterIteration(session.newItem, finalOrderedBucket);
      setSeenList(updatedFullSeenList);
      const fullyRankedItem = userListService.getRankedList(session.newItem.media_type, session.newItem.userReaction).find(i => i.id === session.newItem.id && i.media_type === session.newItem.media_type);
      setComparisonSummaryState({ show: true, rankedItem: fullyRankedItem || { ...session.newItem, rank: insertionIndex, personalScore: 0 }, comparisonHistory: session.history, totalComparisonsMade: session.comparisonsMade });
      setIterativeComparisonState(null); setIsLoadingGlobal(false); return;
    }
    const pivotIdx = calculatePivotIndexSmartly(session.lowIndex, session.highIndex, session.newItem, session.comparisonBucketSnapshot);
    const pivotItem = session.comparisonBucketSnapshot[pivotIdx];
    if (!pivotItem) { proceedToNextComparisonStep({ ...session, lowIndex: session.highIndex + 1 }); return; }
    setIsLoadingGlobal(true);
    const sharedGenres = session.newItem.genres.filter(g => pivotItem.genres.some(pg => pg.id === g.id)).map(g => g.name);
    const promptText = await geminiService.generateComparisonPrompt({ newItem: session.newItem, existingItem: pivotItem, reaction: session.newItem.userReaction, isIterative: true, sharedGenres });
    setIsLoadingGlobal(false);
    setIterativeComparisonState({ ...session, pivotItem: pivotItem, currentPrompt: promptText });
  }, []);

  const startIterativeComparison = useCallback(async (ratedItem: RatedItem) => {
    setIsLoadingGlobal(true);
    const allSeen = userListService.getSeenList(); // Get current list which includes the new item
    const relevantBucketItems = allSeen.filter(item => item.userReaction === ratedItem.userReaction && item.media_type === ratedItem.media_type && item.id !== ratedItem.id);
    
    if (relevantBucketItems.length === 0) { // Item is first in its bucket
      const updatedFullSeenList = userListService.updateOrderAfterIteration(ratedItem, [ratedItem]);
      setSeenList(updatedFullSeenList);
      const fullyRankedItem = userListService.getRankedList(ratedItem.media_type, ratedItem.userReaction).find(i => i.id === ratedItem.id && i.media_type === ratedItem.media_type);
      setComparisonSummaryState({ show: true, rankedItem: fullyRankedItem || { ...ratedItem, rank: 0, personalScore: userListService.calculatePersonalScore(0,1,ratedItem.userReaction)}, comparisonHistory: [], totalComparisonsMade: 0 });
      setIsLoadingGlobal(false); return;
    }

    const initialSession: IterativeComparisonSession = { isActive: true, newItem: ratedItem, comparisonBucketSnapshot: relevantBucketItems, lowIndex: 0, highIndex: relevantBucketItems.length - 1, pivotItem: null, currentPrompt: "Loading comparison...", comparisonsMade: 0, maxComparisons: MAX_COMPARISONS_PER_ITEM, history: [] };
    setIterativeComparisonState(initialSession);
    await proceedToNextComparisonStep(initialSession);
  }, [proceedToNextComparisonStep]);

  const handleReactionSelected = useCallback(async (reaction: Reaction) => {
    if (!selectedItemForReaction) return;
    setIsLoadingGlobal(true); setIsReactionModalOpen(false);
    // CreateRatedItem now also saves to seenList, so we get the list after
    const ratedItem = await userListService.createRatedItem(selectedItemForReaction, reaction, currentUserNotes);
    setWatchlist(userListService.getWatchlist()); // Update watchlist (item might have been removed)
    setSeenList(userListService.getSeenList()); // Reflect immediate addition
    setSelectedItemForReaction(null); setCurrentUserNotes("");
    await startIterativeComparison(ratedItem);
  }, [selectedItemForReaction, currentUserNotes, startIterativeComparison]);


  const handleIterativeComparisonChoice = useCallback((chosenItem: MediaItem) => {
    if (!iterativeComparisonState || !iterativeComparisonState.pivotItem || !iterativeComparisonState.isActive) return;
    const { newItem, pivotItem, lowIndex, highIndex, comparisonsMade, history, comparisonBucketSnapshot } = iterativeComparisonState;
    const userPreferredNewItem = chosenItem.id === newItem.id && chosenItem.media_type === newItem.media_type;
    const newHistoryEntry: ComparisonStep = { itemComparedAgainst: pivotItem, userPreferredNewItem: userPreferredNewItem, promptUsed: iterativeComparisonState.currentPrompt };
    let newLowIndex = lowIndex, newHighIndex = highIndex;
    const currentPivotIndexInSnapshot = comparisonBucketSnapshot.findIndex(p => p.id === pivotItem.id && p.media_type === pivotItem.media_type);
    if (userPreferredNewItem) newHighIndex = currentPivotIndexInSnapshot - 1; else newLowIndex = currentPivotIndexInSnapshot + 1;
    const updatedSession: IterativeComparisonSession = { ...iterativeComparisonState, lowIndex: newLowIndex, highIndex: newHighIndex, comparisonsMade: comparisonsMade + 1, history: [...history, newHistoryEntry], pivotItem: null };
    proceedToNextComparisonStep(updatedSession);
  }, [iterativeComparisonState, proceedToNextComparisonStep]);
  
  const handleCancelIterativeComparison = () => {
    // If comparison is cancelled, the item was already added by createRatedItem.
    // No specific reordering is done here, it remains at the top of its bucket until ranked otherwise or another item is added.
    setIterativeComparisonState(null); setIsLoadingGlobal(false); setCurrentUserNotes("");
  };
  
  // --- Custom List Handlers ---
  const handleCreateCustomList = (name: string, description?: string) => {
    const updatedLists = userListService.createCustomList(name, description);
    setCustomLists(updatedLists);
  };
  const handleOpenAddToListModal = (item: MediaItem) => {
    setSelectedMediaForListAddition(item);
    setIsAddToListModalOpen(true);
  };
  const handleAddItemToCustomList = (listId: string, item: MediaItem) => {
    const updatedList = userListService.addItemToCustomList(listId, item);
    if (updatedList) setCustomLists(userListService.getCustomLists()); // Refresh all lists
  };
  const handleCreateAndAddToList = (listName: string, item: MediaItem, listDescription?: string) => {
    const newLists = userListService.createCustomList(listName, listDescription);
    const newList = newLists.find(l => l.name === listName); // Assume first one if names can be non-unique for some reason
    if (newList) {
        userListService.addItemToCustomList(newList.id, item);
    }
    setCustomLists(userListService.getCustomLists()); // Refresh all lists
  };

  const commonPageProps = {
    watchlist, seenList, customLists,
    onAddToWatchlist: handleAddToWatchlist,
    onMarkAsSeen: handleMarkAsSeen,
    onRemoveFromWatchlist: handleRemoveFromWatchlist,
    onAddToList: handleOpenAddToListModal, // New prop for cards
    setCustomLists, 
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        <AppHeader />
        <main className="flex-grow container mx-auto px-3 sm:px-4 py-5 sm:py-6 mb-20">
          <Routes>
            <Route path="/" element={<FeedPage {...commonPageProps} currentUser={mockUser} />} />
            <Route path="/explore" element={<ExplorePage {...commonPageProps} />} />
            <Route path="/mylists" element={<MyListsPage {...commonPageProps} openCreateListModal={() => setIsCreateListModalOpen(true)} />} />
            <Route path="/mylists/:listId" element={<CustomListPage {...commonPageProps} />} />
            <Route path="/media/:type/:id" element={<MediaDetailPage {...commonPageProps} />} />
            <Route path="/person/:personId" element={<PersonDetailPage {...commonPageProps} />} />
            <Route path="/profile" element={<ProfilePage {...commonPageProps} />} /> 
          </Routes>
        </main>
        <AppNavigation />

        <Modal isOpen={isReactionModalOpen} onClose={() => { setIsReactionModalOpen(false); setCurrentUserNotes("");}} title={`Rate: ${selectedItemForReaction?.title || selectedItemForReaction?.name}`} size="md">
          {selectedItemForReaction && (<><ReactionPicker onSelectReaction={handleReactionSelected} /><NotesTextarea value={currentUserNotes} onChange={setCurrentUserNotes} />
            <button onClick={() => { const reactionToSubmit = selectedItemForReaction.media_type && userListService.isSeen(selectedItemForReaction.id, selectedItemForReaction.media_type as 'movie'|'tv')?.userReaction || Reaction.Fine; handleReactionSelected(reactionToSubmit); }}
              className={`w-full mt-6 py-3 ${ACCENT_COLOR_CLASS_BG} ${ACCENT_COLOR_CLASS_BG_HOVER} text-white font-semibold rounded-lg transition-colors text-lg`}>Save Rating & Notes</button></>
          )}
        </Modal>
        {iterativeComparisonState?.isActive && iterativeComparisonState.pivotItem && iterativeComparisonState.newItem && (
          <PairwiseComparisonModal isOpen={true} onClose={handleCancelIterativeComparison} itemA={iterativeComparisonState.newItem} itemB={iterativeComparisonState.pivotItem} comparisonPrompt={iterativeComparisonState.currentPrompt} onChoose={handleIterativeComparisonChoice} />
        )}
        <ComparisonSummaryModal isOpen={comparisonSummaryState.show} onClose={() => setComparisonSummaryState({ show: false, rankedItem: null, comparisonHistory: [], totalComparisonsMade: 0 })} rankedItem={comparisonSummaryState.rankedItem} comparisonHistory={comparisonSummaryState.comparisonHistory} totalComparisonsMade={comparisonSummaryState.totalComparisonsMade} />
        
        <CreateListModal isOpen={isCreateListModalOpen} onClose={() => setIsCreateListModalOpen(false)} onCreate={handleCreateCustomList} />
        <AddToListModal isOpen={isAddToListModalOpen} onClose={() => setIsAddToListModalOpen(false)} mediaItem={selectedMediaForListAddition} customLists={customLists} onAddToList={handleAddItemToCustomList} onCreateAndAddToList={handleCreateAndAddToList} />

        {isLoadingGlobal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]"><div className="bg-slate-800 p-5 rounded-xl shadow-xl flex items-center space-x-3 border border-slate-700">
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span className="text-white text-lg">Processing...</span></div></div>
        )}
      </div>
    </HashRouter>
  );
};

const AppHeader: React.FC = () => {
  const location = useLocation(); const navigate = useNavigate();
  const params = useParams();
  const getTitle = () => {
    if (location.pathname.startsWith('/media/')) return "Details"; 
    if (location.pathname.startsWith('/person/')) return "Person Details";
    if (location.pathname.startsWith('/mylists/')) {
        const list = userListService.getCustomListById(params.listId || '');
        return list ? `List: ${list.name}` : "Custom List";
    }
    switch (location.pathname) {
      case '/': case '/feed': return 'Activity Feed';
      case '/explore': return 'Explore';
      case '/mylists': return 'My Lists';
      case '/profile': return 'Profile'; // Added Profile Title
      default: return APP_NAME;
    }
  };
  const mainTabs = ['/', '/feed', '/explore', '/mylists', '/profile']; // Added Profile to main tabs
  const showBackButton = !mainTabs.includes(location.pathname) || (location.pathname === '/' && !mainTabs.includes('/feed'));
  return (
    <header className="bg-slate-800/80 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b border-slate-700">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between"><div className="flex items-center min-w-0">
          {showBackButton && (<button onClick={() => navigate(-1)} className="mr-2.5 p-1.5 text-slate-300 hover:text-white rounded-full hover:bg-slate-700 transition-colors" aria-label="Go back"><ChevronLeftIcon className="w-6 h-6" /></button>)}
          <h1 className={`text-xl font-bold ${ACCENT_COLOR_CLASS_TEXT} truncate`}>{getTitle()}</h1></div>
        {location.pathname !== '/profile' && ( /* Hide avatar link if already on profile */
            <RouterLink to="/profile" aria-label="View Profile"> 
                <div className={`w-9 h-9 ${ACCENT_COLOR_CLASS_BG} rounded-full flex items-center justify-center text-md font-semibold text-white flex-shrink-0 shadow-md`}>{mockUser.handle.substring(0,1).toUpperCase()}</div>
            </RouterLink>
        )}
      </div>
    </header>
  );
};

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
  <NavLink to={to} end={to === "/"} className={({ isActive }) => `flex flex-col items-center justify-center px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 w-1/4 transform hover:scale-105 ${isActive ? `${ACCENT_COLOR_CLASS_TEXT} bg-slate-700/50` : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-700/30'}`}>
    {icon}<span className="mt-1.5">{label}</span>
  </NavLink>
);
const AppNavigation: React.FC = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-slate-800/90 backdrop-blur-md border-t border-slate-700 shadow-t-xl z-40">
    <div className="container mx-auto sm:px-0"><div className="flex justify-around items-center h-16">
        <NavItem to="/" icon={<UserGroupIcon className="w-5 h-5" />} label="Feed" />
        <NavItem to="/explore" icon={<SparklesIcon className="w-5 h-5" />} label="Explore" />
        <NavItem to="/mylists" icon={<ListBulletIcon className="w-5 h-5" />} label="My Lists" />
        <NavItem to="/profile" icon={<ProfileNavIcon className="w-5 h-5" />} label="Profile" />
    </div></div>
  </nav>
);

interface BasePageProps {
  watchlist: WatchlistItem[];
  seenList: RatedItem[];
  customLists: CustomList[]; // Added
  onAddToWatchlist: (item: MediaItem) => void;
  onMarkAsSeen: (item: MediaItem) => void;
  onRemoveFromWatchlist: (itemId: number, itemType: 'movie' | 'tv') => void;
  onAddToList: (item: MediaItem) => void; // Added for MediaCard context
  setCustomLists: React.Dispatch<React.SetStateAction<CustomList[]>>; // To update lists
}

// --- Explore Page ---
const ExplorePage: React.FC<BasePageProps> = ({ onAddToWatchlist, onMarkAsSeen, onAddToList, seenList }) => {
  const location = useLocation();
  const initialTab = location.state?.activeTab || 'trendingMovies';
  const [activeTab, setActiveTab] = useState<'trendingMovies' | 'trendingShows' | 'search' | 'forYou'>(initialTab);
  
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentQuery, setCurrentQuery] = useState('');
  
  const [movieGenres, setMovieGenres] = useState<TMDBGenre[]>([]);
  const [tvGenres, setTvGenres] = useState<TMDBGenre[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<Set<number>>(new Set());
  const [recommendations, setRecommendations] = useState<Record<string, MediaItem[]>>({}); // For "For You"

  const navigate = useNavigate();
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return; if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting && currentPage < totalPages) handlePageChange(currentPage + 1); });
    if (node) observer.current.observe(node);
  }, [isLoading, currentPage, totalPages]);

  useEffect(() => { (async () => { try { const [m, t] = await Promise.all([tmdbService.getMovieGenres(), tmdbService.getTvGenres()]); setMovieGenres(m); setTvGenres(t); } catch (err) { console.error("Failed to fetch genres:", err); } })(); }, []);

  const generateForYouRecommendations = useCallback(async () => {
    setIsLoading(true); setRecommendations({});
    const likedItems = seenList.filter(item => item.userReaction === Reaction.Liked);
    if (likedItems.length === 0) { setIsLoading(false); return; }

    const newRecs: Record<string, MediaItem[]> = {};
    // Rec 1: Based on top liked genre
    const genreCounts: Record<number, number> = {};
    likedItems.forEach(item => item.genres?.forEach(g => genreCounts[g.id] = (genreCounts[g.id] || 0) + 1));
    const sortedGenres = Object.entries(genreCounts).sort((a,b) => b[1] - a[1]);
    if (sortedGenres.length > 0) {
        const topGenreId = sortedGenres[0][0];
        const topGenreName = movieGenres.find(g=>g.id === +topGenreId)?.name || tvGenres.find(g=>g.id === +topGenreId)?.name || "Top Genre";
        try {
            const movieRecs = await tmdbService.discoverMedia({ with_genres: topGenreId }, 'movie');
            if (movieRecs.results.length > 0) newRecs[`Because you love ${topGenreName} movies`] = movieRecs.results.slice(0,5);
            const tvRecs = await tmdbService.discoverMedia({ with_genres: topGenreId }, 'tv');
            if (tvRecs.results.length > 0) newRecs[`Because you love ${topGenreName} TV shows`] = tvRecs.results.slice(0,5);
        } catch (e) { console.error("Error fetching genre recs:", e); }
    }
    // Rec 2: Based on top actor (simplified: first actor from most recent liked item)
    if (likedItems.length > 0) {
        const recentLiked = likedItems.sort((a,b) => new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime())[0];
        if(recentLiked.media_type) {
            try {
                const credits = await tmdbService.getMediaCredits(recentLiked.id, recentLiked.media_type);
                if (credits.cast.length > 0) {
                    const topActor = credits.cast[0];
                    const actorCredits = await tmdbService.getPersonCombinedCredits(topActor.id);
                    const popularWorks = [...actorCredits.cast, ...actorCredits.crew]
                        .filter(work => work.id !== recentLiked.id && (work.media_type === 'movie' || work.media_type === 'tv'))
                        .sort((a,b) => (b.popularity || 0) - (a.popularity || 0))
                        .slice(0,5);
                    if(popularWorks.length > 0) newRecs[`More from ${topActor.name}`] = popularWorks;
                }
            } catch (e) { console.error("Error fetching actor recs:", e); }
        }
    }
    setRecommendations(newRecs); setIsLoading(false);
  }, [seenList, movieGenres, tvGenres]);

  const fetchMedia = useCallback(async (tab: 'trendingMovies' | 'trendingShows' | 'search', query: string, page: number) => {
    setIsLoading(true); setError(null);
    try {
      let data;
      if (tab === 'search') { data = await tmdbService.searchMedia(query, page); data.results = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv'); } 
      else { const mediaType = tab === 'trendingMovies' ? 'movie' : 'tv'; data = await tmdbService.getTrendingMedia(mediaType, 'week', page); }
      const processedResults = data.results.map(item => {
        const newItem = { ...item };
        if (newItem.genre_ids && (!newItem.genres || newItem.genres.length === 0)) {
          const sourceGenreList = newItem.media_type === 'movie' ? movieGenres : tvGenres;
          newItem.genres = newItem.genre_ids.map(id => sourceGenreList.find(g => g.id === id)).filter(g => g !== undefined) as TMDBGenre[];
        }
        return newItem;
      });
      setResults(prev => page === 1 ? processedResults : [...prev, ...processedResults]);
      setTotalPages(data.total_pages > 500 ? 500 : data.total_pages);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to fetch media.'); if (page === 1) setResults([]); } 
    finally { setIsLoading(false); }
  }, [movieGenres, tvGenres]);

  useEffect(() => {
    setCurrentPage(1); setResults([]); // Reset results when tab changes
    if (activeTab === 'forYou') { generateForYouRecommendations(); }
    else if (activeTab === 'trendingMovies' || activeTab === 'trendingShows') { fetchMedia(activeTab, '', 1); } 
    else if (activeTab === 'search') { if (currentQuery) fetchMedia('search', currentQuery, 1); else setResults([]); }
  }, [activeTab, fetchMedia, generateForYouRecommendations, currentQuery]); // Ensure currentQuery is a dependency for search tab resets
  
  useEffect(() => { // Sync activeTab with location state if it changes
    if (location.state?.activeTab && location.state?.activeTab !== activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state, activeTab]);


  const handleSearch = (query: string) => { setActiveTab('search'); setCurrentQuery(query); /* Page reset is handled by useEffect */ };
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || isLoading) return; setCurrentPage(newPage);
    if (activeTab === 'search' && currentQuery) fetchMedia('search', currentQuery, newPage);
    else if (activeTab === 'trendingMovies' || activeTab === 'trendingShows') fetchMedia(activeTab, '', newPage);
  };
  const handleCardClick = (item: MediaItem | PersonCreditItem) => { if (item.media_type) navigate(`/media/${item.media_type}/${item.id}`); };
  const toggleGenreFilter = (genreId: number) => setSelectedGenreIds(prev => { const newSet = new Set(prev); if (newSet.has(genreId)) newSet.delete(genreId); else newSet.add(genreId); return newSet; });
  const getFilteredResults = () => { if (selectedGenreIds.size === 0) return results; return results.filter(item => item.genres?.some(genre => selectedGenreIds.has(genre.id))); };
  const displayResults = getFilteredResults();
  const currentGenreList = activeTab === 'trendingMovies' ? movieGenres : activeTab === 'trendingShows' ? tvGenres : [];

  return (
    <div className="space-y-8">
      <SearchBar onSearch={handleSearch} placeholder="Search all media..."/>
      <div className="flex space-x-2 border-b border-slate-700 pb-1 mb-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        {(['trendingMovies', 'trendingShows', 'forYou'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setCurrentQuery(''); setSelectedGenreIds(new Set()); }}
            className={`py-2.5 px-4 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${activeTab === tab ? `border-b-2 ${ACCENT_COLOR_CLASS_BORDER} ${ACCENT_COLOR_CLASS_TEXT}` : 'text-slate-400 hover:text-slate-200 hover:border-b-2 border-slate-600'}`}>
            {tab === 'trendingMovies' ? 'Trending Movies' : tab === 'trendingShows' ? 'Trending Shows' : 'For You'}
          </button>
        ))}
        {activeTab === 'search' && currentQuery && (<button className={`py-2.5 px-4 text-sm font-medium whitespace-nowrap rounded-t-lg border-b-2 ${ACCENT_COLOR_CLASS_BORDER} ${ACCENT_COLOR_CLASS_TEXT}`} disabled aria-current="page">Search: "{currentQuery}"</button>)}
      </div>
      
      { (activeTab === 'trendingMovies' || activeTab === 'trendingShows') && currentGenreList.length > 0 && (
        <div className="mb-4"><h3 className="text-sm font-medium text-slate-400 mb-2">Filter by Genre:</h3><div className="flex flex-wrap gap-2">
            {currentGenreList.slice(0, 10).map(genre => (<button key={genre.id} onClick={() => toggleGenreFilter(genre.id)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${selectedGenreIds.has(genre.id) ? `${ACCENT_COLOR_CLASS_BG} text-white border-transparent` : `bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:${ACCENT_COLOR_CLASS_BORDER}`}`}>{genre.name}</button>))}
        </div></div>
      )}

      {error && <p className="text-red-400 bg-red-900/50 p-4 rounded-xl text-center">{error}</p>}
      
      {isLoading && results.length === 0 && activeTab !== 'forYou' && ( <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">{Array.from({ length: 10 }).map((_, idx) => <Skeleton key={idx} className="w-full aspect-[2/3] rounded-xl" />)}</div>)}
      {isLoading && activeTab === 'forYou' && Object.keys(recommendations).length === 0 && <div className="space-y-4">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-32 w-full"/>)}</div>}


      {activeTab === 'forYou' && !isLoading && Object.keys(recommendations).length === 0 && (<p className="text-center text-slate-500 py-10">Rate more items to get personalized recommendations!</p>)}
      {activeTab === 'forYou' && Object.keys(recommendations).length > 0 && (
        <div className="space-y-8">
            {Object.entries(recommendations).map(([reason, items]) => (
                <div key={reason}>
                    <h3 className="text-lg font-semibold mb-3 text-slate-200">{reason}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
                        {items.map(item => <MediaCard key={`${item.id}-${item.media_type}`} item={item} onClick={handleCardClick} onAddToWatchlist={onAddToWatchlist} onMarkAsSeen={onMarkAsSeen} onAddToList={onAddToList} isWatchlisted={!!(item.media_type && userListService.isWatchlisted(item.id, item.media_type))} isSeen={!!(item.media_type && userListService.isSeen(item.id, item.media_type))} />)}
                    </div>
                </div>
            ))}
        </div>
      )}

      {activeTab !== 'forYou' && !isLoading && displayResults.length === 0 && (activeTab === 'search' && currentQuery || selectedGenreIds.size > 0) && (<p className="text-center text-slate-500 py-10">No results found for your current filters.</p>)}
      {activeTab !== 'forYou' && !isLoading && displayResults.length === 0 && (activeTab === 'trendingMovies' || activeTab === 'trendingShows') && !currentQuery && selectedGenreIds.size === 0 && (<p className="text-center text-slate-500 py-10">No trending {activeTab === 'trendingMovies' ? 'movies' : 'shows'} found.</p>)}

      {activeTab !== 'forYou' && displayResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
            {displayResults.map(item => <MediaCard key={`${item.id}-${item.media_type}`} item={item} onClick={handleCardClick} onAddToWatchlist={onAddToWatchlist} onMarkAsSeen={onMarkAsSeen} onAddToList={onAddToList} isWatchlisted={!!(item.media_type && userListService.isWatchlisted(item.id, item.media_type))} isSeen={!!(item.media_type && userListService.isSeen(item.id, item.media_type))} />)}
        </div>
      )}
      { activeTab !== 'forYou' && results.length > 0 && currentPage < totalPages && !isLoading && <div ref={loadMoreRef} className="h-10" /> }
      { activeTab !== 'forYou' && isLoading && results.length > 0 && currentPage > 1 && <Skeleton className="w-full h-20 mt-4" /> }
    </div>
  );
};

// --- Media Detail Page ---
const MediaDetailPage: React.FC<BasePageProps> = ({ onAddToWatchlist, onMarkAsSeen, onAddToList }) => {
  const { type, id } = useParams<{ type: 'movie' | 'tv'; id: string }>();
  const [mediaItem, setMediaItem] = useState<MediaItem | null>(null);
  const [credits, setCredits] = useState<CreditsResponse | null>(null);
  const [selectedSeasonDetails, setSelectedSeasonDetails] = useState<TVSeasonDetailsResponse | null>(null);
  const [watchProviders, setWatchProviders] = useState<WatchProviderCountryResult | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | null>(null);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!type || !id) { setError("Invalid media type or ID."); setIsLoading(false); return; }
    const fetchDetails = async () => {
      setIsLoading(true); setError(null); setSelectedSeasonDetails(null); setSelectedSeasonNumber(null); setWatchProviders(undefined);
      try {
        const itemDetails = await tmdbService.getMediaDetails(Number(id), type); setMediaItem(itemDetails);
        const itemCredits = await tmdbService.getMediaCredits(Number(id), type); setCredits(itemCredits);
        setIsLoadingProviders(true);
        try { const pData = await tmdbService.getWatchProviders(Number(id), type); setWatchProviders(pData.results.US); } 
        catch (provErr) { console.warn("Failed to load watch providers:", provErr); } finally { setIsLoadingProviders(false); }
        if (type === 'tv' && (itemDetails as TMDBShow).seasons && (itemDetails as TMDBShow).seasons!.length > 0) {
          const sortedSeasons = (itemDetails as TMDBShow).seasons!.filter(s => s.episode_count > 0).sort((a,b) => a.season_number - b.season_number);
          const firstDisplayableSeason = sortedSeasons.find(s => s.season_number > 0) || sortedSeasons[0];
          if(firstDisplayableSeason) await handleSeasonChange(firstDisplayableSeason.season_number);
        }
      } catch (err) { setError(err instanceof Error ? err.message : "Failed to load media details."); } 
      finally { setIsLoading(false); }
    };
    fetchDetails();
  }, [type, id]);

  const handleSeasonChange = async (seasonNumber: number) => {
    if (!mediaItem || mediaItem.media_type !== 'tv' || !id) return;
    setSelectedSeasonNumber(seasonNumber); setIsLoadingSeason(true); setError(null); 
    try { const data = await tmdbService.getTVSeasonDetails(Number(id), seasonNumber); setSelectedSeasonDetails(data); } 
    catch (err) { setError(err instanceof Error ? err.message : `Failed to load S${seasonNumber} details.`); setSelectedSeasonDetails(null); } 
    finally { setIsLoadingSeason(false); }
  };
  const handlePersonClick = (personId: number) => navigate(`/person/${personId}`);

  if (isLoading && !mediaItem) { /* Skeleton rendering */ return <div className="space-y-8 p-4"><Skeleton className="w-full h-64 md:h-96"/><div className="flex flex-col md:flex-row gap-6"><Skeleton className="w-1/2 md:w-1/3 h-auto aspect-[2/3]"/><div className="flex-grow space-y-4"><Skeleton variant="text" className="w-3/4 h-10"/><Skeleton variant="text" className="w-1/2 h-6"/><Skeleton variant="text" className="w-full h-5"/><Skeleton variant="text" className="w-full h-5"/><Skeleton variant="text" className="w-4/5 h-5"/></div></div><Skeleton variant="text" className="w-1/3 h-8 mb-3"/><div className="flex space-x-4 overflow-x-auto">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="w-32 h-52"/>)}</div></div> }
  if (error && !mediaItem) return <p className="text-red-400 bg-red-900/50 p-4 rounded-xl text-center">{error}</p>;
  if (!mediaItem) return <p className="text-center text-slate-500 py-10">Media not found.</p>;

  const title = mediaItem.title || mediaItem.name;
  const releaseYear = mediaItem.release_date?.substring(0, 4) || mediaItem.first_air_date?.substring(0, 4);
  const genresText = mediaItem.genres?.map(g => g.name).join(' / ') || 'N/A';
  const runtime = mediaItem.media_type === 'movie' ? (mediaItem as TMDBMovie).runtime : (mediaItem as TMDBShow).episode_run_time?.[0];
  const isCurrentlyWatchlisted = mediaItem.media_type ? userListService.isWatchlisted(mediaItem.id, mediaItem.media_type) : false;
  const seenInfo = mediaItem.media_type ? userListService.isSeen(mediaItem.id, mediaItem.media_type) : undefined;

  return (
    <div className="space-y-8">
      {mediaItem.backdrop_path && (<div className="relative h-56 md:h-96 -mx-3 sm:-mx-4 -mt-5 sm:-mt-6 rounded-b-xl overflow-hidden shadow-xl"><img src={`${TMDB_IMAGE_BASE_URL_ORIGINAL}${mediaItem.backdrop_path}`} alt={`${title} backdrop`} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div></div>)}
      <div className={`flex flex-col md:flex-row gap-6 md:gap-8 ${mediaItem.backdrop_path ? 'md:-mt-32 relative z-10' : ''}`}>
        <div className="w-1/2 md:w-1/3 lg:w-1/4 mx-auto md:mx-0 flex-shrink-0"><PosterImage path={mediaItem.poster_path} alt={title || "Poster"} className="rounded-xl shadow-2xl aspect-[2/3]" /></div>
        <div className="flex-grow space-y-3.5 text-center md:text-left pt-2">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-50">{title}</h1>
          <p className="text-slate-400 text-sm md:text-base">{releaseYear} &bull; {genresText} {runtime && `• ${runtime} min${mediaItem.media_type === 'tv' ? '/ep' : ''}`}</p>
          {mediaItem.original_language && <p className="text-slate-400 text-xs">Language: {mediaItem.original_language.toUpperCase()}</p>}
          {mediaItem.vote_average > 0 && (<div className="flex items-center justify-center md:justify-start text-sm text-slate-300"><StarIcon className="w-5 h-5 text-yellow-400 mr-1.5" /><span>{mediaItem.vote_average.toFixed(1)}/10 (TMDB)</span></div>)}
          <div className="flex flex-col sm:flex-row gap-3.5 justify-center md:justify-start pt-3">
            {!seenInfo && (<button onClick={() => onAddToWatchlist(mediaItem)} className={`flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg ${isCurrentlyWatchlisted ? 'bg-green-600 hover:bg-green-700' : `${ACCENT_COLOR_CLASS_BG} ${ACCENT_COLOR_CLASS_BG_HOVER}`} text-white transform hover:scale-105`}><AddIconAction className="w-5 h-5 mr-2"/> {isCurrentlyWatchlisted ? 'On Watchlist' : 'Add to Watchlist'}</button>)}
            <button onClick={() => onMarkAsSeen(mediaItem)} className={`flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg ${seenInfo ? 'bg-purple-600 hover:bg-purple-700' : 'bg-teal-600 hover:bg-teal-700'} text-white transform hover:scale-105`}><SeenIconAction className="w-5 h-5 mr-2"/> {seenInfo ? `Rated ${REACTION_EMOJIS[seenInfo.userReaction]}` : 'Mark as Seen'}</button>
            <button onClick={() => onAddToList(mediaItem)} className={`flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105`}><ListBulletIcon className="w-5 h-5 mr-2"/>Add to List</button>
          </div>
        </div>
      </div>
      {mediaItem.overview && (<div><h2 className={`text-xl font-semibold mb-2.5 ${ACCENT_COLOR_CLASS_TEXT}`}>Overview</h2><p className="text-slate-300 leading-relaxed text-sm md:text-base">{mediaItem.overview}</p></div>)}
      {seenInfo && seenInfo.userNotes && (<div><h2 className={`text-xl font-semibold mb-2.5 ${ACCENT_COLOR_CLASS_TEXT}`}>Your Notes</h2><p className="text-slate-300 leading-relaxed text-sm md:text-base bg-slate-800 p-4 rounded-lg border border-slate-700 whitespace-pre-wrap">{seenInfo.userNotes}</p></div>)}
      {isLoadingProviders &&  <div><h2 className={`text-xl font-semibold mb-2.5 ${ACCENT_COLOR_CLASS_TEXT}`}>Where to Watch</h2><Skeleton className="w-full h-20"/></div> }
      {!isLoadingProviders && watchProviders && (<div><h2 className={`text-xl font-semibold mb-3 ${ACCENT_COLOR_CLASS_TEXT}`}>Where to Watch <span className="text-xs text-slate-500">(US)</span></h2><WatchProviderDisplay providers={watchProviders} itemTitle={title || 'this item'} /></div>)}
      {credits && credits.cast && credits.cast.length > 0 && (
        <div><h2 className={`text-xl font-semibold mb-4 ${ACCENT_COLOR_CLASS_TEXT}`}>Top Billed Cast</h2>
          <div className="flex space-x-4 overflow-x-auto pb-4 -mx-3 px-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
            {credits.cast.slice(0, 15).map(member => <CastCard key={member.id} member={member} onClick={handlePersonClick} />)}
          </div>
        </div>
      )}
      {credits && credits.crew && credits.crew.length > 0 && (
        <div><h2 className={`text-xl font-semibold mb-3 ${ACCENT_COLOR_CLASS_TEXT}`}>Key Crew Members</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {credits.crew.filter(c => ['Directing', 'Writing', 'Production'].includes(c.department) && (c.job === 'Director' || c.job === 'Screenplay' || c.job === 'Producer' || c.job === 'Executive Producer' || c.job === 'Writer' || c.job === 'Story')).slice(0,6).map(member => <CrewMemberDisplay key={`${member.id}-${member.job}`} member={member} onClick={handlePersonClick} />)}
        </div></div>
      )}
      {mediaItem.media_type === 'tv' && (mediaItem as TMDBShow).seasons && ((mediaItem as TMDBShow).seasons?.length ?? 0) > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-xl font-semibold ${ACCENT_COLOR_CLASS_TEXT}`}>Seasons & Episodes</h2>
            {((mediaItem as TMDBShow).seasons?.filter(s=>s.episode_count > 0).length ?? 0) > 1 && 
              <select value={selectedSeasonNumber ?? ''} onChange={(e) => handleSeasonChange(Number(e.target.value))} className={`p-2.5 bg-slate-700 text-slate-200 rounded-lg border border-slate-600 focus:ring-2 ${ACCENT_COLOR_CLASS_RING} ${ACCENT_COLOR_CLASS_BORDER} outline-none text-sm transition-colors`} aria-label="Select TV Season">
                <option value="" disabled>Select a season</option>
                {(mediaItem as TMDBShow).seasons!.filter(s => s.episode_count > 0 && (s.season_number > 0 || ((mediaItem as TMDBShow).seasons!.length === 1 && s.season_number === 0))).sort((a,b) => a.season_number - b.season_number)
                  .map(season => (<option key={season.id} value={season.season_number}>{season.name} ({season.episode_count} ep)</option>))}
              </select>}
          </div>
          {isLoadingSeason && (<div className="space-y-4">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="w-full h-28 rounded-xl" />)}</div>)}
          {!isLoadingSeason && selectedSeasonDetails && selectedSeasonDetails.episodes.length > 0 && (<div className="space-y-4">{selectedSeasonDetails.episodes.map(episode => <EpisodeCard key={episode.id} episode={episode} />)}</div>)}
          {!isLoadingSeason && selectedSeasonDetails && selectedSeasonDetails.episodes.length === 0 && (<p className="text-slate-500">No episode information available for this season.</p>)}
          {!isLoadingSeason && selectedSeasonNumber !== null && !selectedSeasonDetails && error && (<p className="text-red-400 bg-red-900/50 p-4 rounded-xl">{error}</p>)}
        </div>
      )}
    </div>
  );
};

interface MyListsPageProps extends BasePageProps { openCreateListModal: () => void; }
const MyListsPage: React.FC<MyListsPageProps> = ({ watchlist, customLists, onRemoveFromWatchlist, openCreateListModal, setCustomLists, seenList }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const initialTab = location.state?.activeTab || 'watchlist';
  const initialMediaTypeFilter = location.state?.mediaTypeFilter || 'tv';

  const [activeTab, setActiveTab] = useState<Reaction | 'watchlist' | 'allseen' | 'custom'>(initialTab);
  const [selectedMediaTypeFilter, setSelectedMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>(initialMediaTypeFilter);

  useEffect(() => {
    if (location.state?.activeTab) setActiveTab(location.state.activeTab);
    if (location.state?.mediaTypeFilter) setSelectedMediaTypeFilter(location.state.mediaTypeFilter);
  }, [location.state]);


  const getListForDisplay = useCallback(() => {
    const mediaTypeFilter = selectedMediaTypeFilter === 'all' ? undefined : selectedMediaTypeFilter;
    if (activeTab === 'watchlist') {
      let filteredWatchlist = watchlist;
      if (mediaTypeFilter) filteredWatchlist = watchlist.filter(item => item.media_type === mediaTypeFilter);
      return filteredWatchlist.sort((a,b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    }
    if (activeTab === 'custom') return customLists.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (activeTab === 'allseen') {
      let rankedItems = userListService.getRankedList(mediaTypeFilter); // This list is already sorted by its specific criteria within the service
      return rankedItems.sort((a, b) => new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime()); // Then sort by ratedAt
    }
    const reaction = activeTab as Reaction;
    let rankedItemsForReaction = userListService.getRankedList(mediaTypeFilter, reaction);
    if (!mediaTypeFilter) rankedItemsForReaction.sort((a, b) => b.personalScore !== a.personalScore ? b.personalScore - a.personalScore : new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime());
    return rankedItemsForReaction;
  }, [activeTab, selectedMediaTypeFilter, watchlist, customLists, seenList]); // Added seenList dependency
  
  const currentListToDisplay = getListForDisplay();
  let baseTitle = activeTab === 'watchlist' ? "My Watchlist" : activeTab === 'allseen' ? "All My Seen Items" : activeTab === 'custom' ? "My Custom Lists" : `${REACTION_EMOJIS[activeTab as Reaction]} ${REACTION_LABELS[activeTab as Reaction]}`;
  if (activeTab !== 'custom' && selectedMediaTypeFilter !== 'all') baseTitle += ` - ${selectedMediaTypeFilter === 'movie' ? 'Movies' : 'TV Shows'}`;
  const listTitle = baseTitle;
  
  const handleCardClick = (item: MediaItem | RankedItem) => { if (item.media_type) navigate(`/media/${item.media_type}/${item.id}`); };
  const handleCustomListClick = (listId: string) => navigate(`/mylists/${listId}`);
  const handleDeleteCustomList = (listId: string) => { if(window.confirm("Are you sure you want to delete this list?")) setCustomLists(userListService.deleteCustomList(listId)); };

  return (
    <div className="space-y-6">
      <div className="flex space-x-1 border-b border-slate-700 pb-1 mb-3 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        {(['watchlist', ...Object.values(Reaction), 'allseen', 'custom'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`py-2.5 px-3.5 text-xs sm:text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${activeTab === tab ? `border-b-2 ${ACCENT_COLOR_CLASS_BORDER} ${ACCENT_COLOR_CLASS_TEXT}` : 'text-slate-400 hover:text-slate-200 hover:border-b-2 border-slate-600'}`}>
            {tab === 'watchlist' ? 'Watchlist' : tab === 'allseen' ? 'All Seen' : tab === 'custom' ? 'Custom Lists' : `${REACTION_EMOJIS[tab as Reaction]} ${REACTION_LABELS[tab as Reaction]}`}
          </button>
        ))}
      </div>
      {activeTab !== 'custom' && (<div className="flex justify-start sm:justify-start items-center gap-2 mb-6 px-1">
        <select id="mediaTypeFilter" value={selectedMediaTypeFilter} onChange={(e) => setSelectedMediaTypeFilter(e.target.value as 'all' | 'movie' | 'tv')}
            className={`p-2.5 bg-slate-700 text-slate-200 rounded-lg border border-slate-600 focus:ring-2 ${ACCENT_COLOR_CLASS_RING} ${ACCENT_COLOR_CLASS_BORDER} outline-none text-sm transition-colors w-auto sm:w-48`} aria-label="Filter by media type">
            <option value="tv">TV Shows</option><option value="movie">Movies</option><option value="all">All Media</option>
        </select></div>
      )}
      <div className="flex justify-between items-center -mt-1 mb-5">
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-100">{listTitle}</h2>
        {activeTab === 'custom' && <button onClick={openCreateListModal} className={`flex items-center px-4 py-2 ${ACCENT_COLOR_CLASS_BG} ${ACCENT_COLOR_CLASS_BG_HOVER} text-white text-sm font-semibold rounded-lg shadow-md`}><PlusCircleIcon className="w-5 h-5 mr-2"/>Create New List</button>}
      </div>
      {currentListToDisplay.length === 0 ? (<p className="text-center text-slate-500 py-10">This list is empty for the current filters.</p>) : (
        <div className="space-y-5">
          {currentListToDisplay.map(item => 
            activeTab === 'watchlist' ? (
              <div key={`${item.id}-${item.media_type}`} className="bg-slate-800 rounded-xl shadow-lg p-4 flex justify-between items-center hover:bg-slate-700/70 transition-colors border border-slate-700">
                <div onClick={() => handleCardClick(item as WatchlistItem)} className="cursor-pointer flex-grow mr-3 min-w-0"><h3 className="font-semibold text-slate-100 truncate">{(item as WatchlistItem).title || (item as WatchlistItem).name}</h3><p className="text-xs text-slate-400">Added: {new Date((item as WatchlistItem).addedAt).toLocaleDateString()}</p></div>
                <button onClick={() => { if((item as WatchlistItem).media_type) onRemoveFromWatchlist((item as WatchlistItem).id, (item as WatchlistItem).media_type!)}} className="p-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-md transition-colors flex-shrink-0 font-medium" disabled={!(item as WatchlistItem).media_type} aria-label={`Remove ${(item as WatchlistItem).title || (item as WatchlistItem).name} from watchlist`}>Remove</button>
              </div>
            ) : activeTab === 'custom' ? (
                <div key={(item as CustomList).id} className="bg-slate-800 rounded-xl shadow-lg p-4 border border-slate-700 hover:border-cyan-500 transition-colors">
                    <div className="flex justify-between items-start">
                        <div onClick={() => handleCustomListClick((item as CustomList).id)} className="cursor-pointer flex-grow mr-3 min-w-0">
                            <h3 className="text-lg font-semibold text-slate-100 hover:text-cyan-400">{(item as CustomList).name}</h3>
                            <p className="text-xs text-slate-400">{(item as CustomList).items.length} item(s) &bull; Updated: {new Date((item as CustomList).updatedAt).toLocaleDateString()}</p>
                            {(item as CustomList).description && <p className="text-sm text-slate-300 mt-1 line-clamp-2">{(item as CustomList).description}</p>}
                        </div>
                        <div className="flex-shrink-0 space-x-2">
                            <button onClick={() => navigate(`/mylists/${(item as CustomList).id}?edit=true`)} className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-md hover:bg-slate-700"><PencilIcon className="w-4 h-4"/></button>
                            <button onClick={() => handleDeleteCustomList((item as CustomList).id)} className="p-1.5 text-red-500 hover:text-red-400 rounded-md hover:bg-slate-700"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    </div>
                     {/* Mini preview of first few items */}
                    {(item as CustomList).items.length > 0 && (
                        <div className="mt-3 flex -space-x-3 overflow-hidden pl-1">
                            {(item as CustomList).items.slice(0,5).map(media => (
                                <img key={media.id} src={tmdbService.getImageUrl(media.poster_path)} alt={media.title || media.name}
                                     className="inline-block h-10 w-7 rounded-sm ring-2 ring-slate-800 object-cover" />
                            ))}
                            {(item as CustomList).items.length > 5 && <span className="flex items-center justify-center h-10 w-7 rounded-sm ring-2 ring-slate-800 bg-slate-700 text-xs text-slate-300 font-medium">+{ (item as CustomList).items.length - 5}</span>}
                        </div>
                    )}
                </div>
            ) : (<RatedMediaCard key={`${item.id}-${item.media_type}`} item={item as RankedItem} onClick={() => handleCardClick(item as RankedItem)} />)
          )}
        </div>
      )}
    </div>
  );
};

// --- Custom List Detail Page ---
interface CustomListPageProps extends BasePageProps {}
const CustomListPage: React.FC<CustomListPageProps> = ({ customLists, setCustomLists }) => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [list, setList] = useState<CustomList | null>(null);
  const [isEditingName, setIsEditingName] = useState(new URLSearchParams(location.search).get('edit') === 'true');
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  useEffect(() => {
    const foundList = userListService.getCustomListById(listId || '');
    if (foundList) { 
      setList(foundList); 
      setEditedName(foundList.name);
      setEditedDescription(foundList.description || '');
    } else {
      setList(null); // Or navigate back/show not found
    }
  }, [listId, customLists]); // Depend on customLists to refresh if external update

  const handleReorder = (listIdToReorderIn: string, itemIndex: number, direction: 'up' | 'down') => {
    if (list && list.id === listIdToReorderIn) {
      const updatedList = userListService.reorderCustomListItem(listIdToReorderIn, itemIndex, direction);
      if(updatedList) setList(updatedList); 
      setCustomLists(userListService.getCustomLists()); 
    }
  };
  const handleRemoveItem = (listIdToRemoveFrom: string, itemId: number, itemType: 'movie' | 'tv') => {
    if (list && list.id === listIdToRemoveFrom) {
      const updatedList = userListService.removeItemFromCustomList(listIdToRemoveFrom, itemId, itemType);
      if(updatedList) setList(updatedList);
      setCustomLists(userListService.getCustomLists());
    }
  };
  const handleMediaItemClick = (item: MediaItem) => { if (item.media_type) navigate(`/media/${item.media_type}/${item.id}`);};
  const handleSaveDetails = () => {
    if (list && editedName.trim()) {
        const updatedLists = userListService.updateCustomList(list.id, { name: editedName.trim(), description: editedDescription.trim() || undefined });
        setCustomLists(updatedLists);
        setList(updatedLists.find(l => l.id === list.id) || null);
        setIsEditingName(false);
        navigate(`/mylists/${list.id}`, { replace: true }); // Remove ?edit=true from URL
    }
  };

  if (!list) return <div className="text-center py-10 text-slate-500">Custom list not found. <RouterLink to="/mylists" className={`${ACCENT_COLOR_CLASS_TEXT} hover:underline`}>Go back to lists.</RouterLink></div>;

  return (
    <div className="space-y-6">
        {isEditingName ? (
            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 space-y-3">
                <input type="text" value={editedName} onChange={e => setEditedName(e.target.value)} className="w-full p-2.5 text-2xl font-semibold bg-slate-700 text-slate-100 rounded-lg border border-slate-600 focus:ring-2 focus:ring-cyan-500 outline-none" />
                <textarea value={editedDescription} onChange={e => setEditedDescription(e.target.value)} placeholder="List description (optional)" rows={2} className="w-full p-2.5 text-sm bg-slate-700 text-slate-200 rounded-lg border border-slate-600 focus:ring-2 focus:ring-cyan-500 outline-none scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700" />
                <div className="flex gap-3">
                    <button onClick={handleSaveDetails} className={`px-4 py-2 ${ACCENT_COLOR_CLASS_BG} ${ACCENT_COLOR_CLASS_BG_HOVER} text-white rounded-lg text-sm font-medium`}>Save</button>
                    <button onClick={() => {setIsEditingName(false); navigate(`/mylists/${list.id}`, { replace: true });}} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium">Cancel</button>
                </div>
            </div>
        ) : (
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-semibold text-slate-100">{list.name}</h2>
                    {list.description && <p className="text-slate-400 mt-1">{list.description}</p>}
                    <p className="text-xs text-slate-500 mt-0.5">{list.items.length} items &bull; Last updated: {new Date(list.updatedAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => setIsEditingName(true)} className="p-2 text-slate-400 hover:text-cyan-400 rounded-md hover:bg-slate-700"><PencilIcon className="w-5 h-5"/></button>
            </div>
        )}

      {list.items.length === 0 ? (<p className="text-center text-slate-500 py-10">This list is currently empty.</p>) : (
        <div className="space-y-4">
          {list.items.map((item, index) => (
            <CustomListItemCard key={item.id + '-' + item.addedToListAt} item={item} listId={list.id} index={index} totalItems={list.items.length}
              onClick={handleMediaItemClick} onRemove={handleRemoveItem} onReorder={handleReorder} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Person Detail Page ---
interface PersonDetailPageProps extends BasePageProps {}
const PersonDetailPage: React.FC<PersonDetailPageProps> = ({ onAddToWatchlist, onMarkAsSeen, onAddToList }) => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [credits, setCredits] = useState<PersonCombinedCreditsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!personId) { setError("Invalid person ID."); setIsLoading(false); return; }
    const fetchPersonData = async () => {
      setIsLoading(true); setError(null);
      try {
        const [details, combinedCredits] = await Promise.all([
          tmdbService.getPersonDetails(Number(personId)),
          tmdbService.getPersonCombinedCredits(Number(personId))
        ]);
        setPerson(details);
        setCredits(combinedCredits);
      } catch (err) { setError(err instanceof Error ? err.message : "Failed to load person details."); }
      finally { setIsLoading(false); }
    };
    fetchPersonData();
  }, [personId]);

  const handleMediaItemClick = (item: MediaItem) => { if (item.media_type) navigate(`/media/${item.media_type}/${item.id}`);};

  if (isLoading) return <div className="space-y-4 p-4">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className={`h-${i===0?48:24} w-full`}/>)}</div>;
  if (error) return <p className="text-red-400 bg-red-900/50 p-4 rounded-xl text-center">{error}</p>;
  if (!person) return <p className="text-center text-slate-500 py-10">Person not found.</p>;

  const knownForActing = credits?.cast.filter(c => c.popularity && c.popularity > 5).sort((a,b) => (b.popularity || 0) - (a.popularity || 0)).slice(0,10) || [];
  const knownForCrew = credits?.crew.filter(c => c.popularity && c.popularity > 2 && c.department !== "Actors").sort((a,b) => (b.popularity || 0) - (a.popularity || 0)).slice(0,10) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        <div className="w-1/2 md:w-1/3 lg:w-1/4 mx-auto md:mx-0 flex-shrink-0">
          <PosterImage path={person.profile_path} alt={person.name} className="rounded-xl shadow-2xl aspect-[2/3]" iconType="person"/>
        </div>
        <div className="flex-grow space-y-2.5">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-50">{person.name}</h1>
          <p className="text-slate-400 text-sm">Known For: {person.known_for_department}</p>
          {person.birthday && <p className="text-slate-400 text-sm">Born: {new Date(person.birthday).toLocaleDateString()} {person.place_of_birth && `in ${person.place_of_birth}`}</p>}
          {person.deathday && <p className="text-slate-400 text-sm">Died: {new Date(person.deathday).toLocaleDateString()}</p>}
        </div>
      </div>
      {person.biography && (<div><h2 className={`text-xl font-semibold mb-2 ${ACCENT_COLOR_CLASS_TEXT}`}>Biography</h2><p className="text-slate-300 leading-relaxed text-sm line-clamp-6 hover:line-clamp-none transition-all duration-300">{person.biography}</p></div>)}
      
      {knownForActing.length > 0 && (<div><h2 className={`text-xl font-semibold mb-3 ${ACCENT_COLOR_CLASS_TEXT}`}>Known For (Acting)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
            {knownForActing.map(item => <MediaCard key={item.credit_id} item={item} onClick={handleMediaItemClick} onAddToList={onAddToList} context="personCredits"/>)}
        </div></div>
      )}
       {knownForCrew.length > 0 && (<div><h2 className={`text-xl font-semibold mb-3 ${ACCENT_COLOR_CLASS_TEXT}`}>Known For (Crew)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
            {knownForCrew.map(item => <MediaCard key={item.credit_id} item={item} onClick={handleMediaItemClick} onAddToList={onAddToList} context="personCredits"/>)}
        </div></div>
      )}
    </div>
  );
};

// --- Feed Page ---
interface FeedPageProps extends BasePageProps { currentUser: UserProfile; }
const FeedPage: React.FC<FeedPageProps> = ({ onAddToWatchlist, onMarkAsSeen, onAddToList, currentUser }) => {
  const navigate = useNavigate();
  const handleCardClick = (item: MediaItem) => { if (item.media_type) navigate(`/media/${item.media_type}/${item.id}`); };
  const [feedItems, setFeedItems] = useState(mockFeedItems); 

  return (
    <div className="space-y-6">
      {feedItems.length === 0 ? (<p className="text-center text-slate-500 py-10">No activity yet. Follow some friends or rate some items!</p>) : (
        <div className="space-y-5 max-w-2xl mx-auto"> {/* Centered feed content */}
          {feedItems.map(feedItem => (
            <FeedCard 
                key={feedItem.id} 
                feedItem={feedItem} 
                currentUser={currentUser}
                onCardClick={handleCardClick}
                onAddToWatchlist={onAddToWatchlist}
                onMarkAsSeen={onMarkAsSeen}
                onAddToList={onAddToList}
            />
          ))}
        </div>
      )}
      <p className="text-center text-xs text-slate-600 pt-6">Feed content is currently mocked. A real backend would power this.</p>
    </div>
  );
};

// --- Profile Page ---
const ProfilePage: React.FC<BasePageProps> = ({ seenList, watchlist }) => {
    const navigate = useNavigate();
    const weeklyStreak = userListService.calculateWeeklyStreak();
    const mostRecentRatings = userListService.getRankedList()
        .sort((a, b) => new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime())
        .slice(0, 5);

    const handleCardClick = (item: MediaItem | RankedItem) => {
        if (item.media_type) navigate(`/media/${item.media_type}/${item.id}`);
    };
    
    const initials = mockUser.handle.substring(0, 2).toUpperCase();

    return (
        <div className="space-y-6 pb-8">
            {/* User Info Header */}
            <div className="flex flex-col items-center text-center space-y-3 pt-4">
                {mockUser.avatarUrl && !mockUser.avatarUrl.includes('picsum.photos') ? (
                    <PosterImage path={mockUser.avatarUrl} alt={mockUser.handle} className="w-24 h-24 rounded-full object-cover border-4 border-slate-700 shadow-lg" iconType="person" />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-3xl font-semibold text-slate-300 border-4 border-slate-600 shadow-lg">
                        {initials}
                    </div>
                )}
                <h1 className="text-2xl font-bold text-slate-50">{mockUser.handle}</h1> {/* Using handle as main name */}
                <p className="text-sm text-slate-400">@{mockUser.handle} &bull; Member since October 2024</p> {/* Static date for now */}
                <div className="flex space-x-3 pt-1">
                    <button className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors shadow-md"><PencilIcon className="w-4 h-4 inline mr-1.5" />Edit Profile</button>
                    <button className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors shadow-md"><ArrowUpOnSquareIcon className="w-4 h-4 inline mr-1.5" />Share Profile</button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex justify-around text-center py-3 border-y border-slate-700">
                <div><p className="text-xl font-semibold text-slate-100">14</p><p className="text-xs text-slate-400">Followers</p></div>
                <div><p className="text-xl font-semibold text-slate-100">13</p><p className="text-xs text-slate-400">Following</p></div>
                <div><p className="text-xl font-semibold text-slate-100">#95880</p><p className="text-xs text-slate-400">Rank on Seen</p></div>
            </div>

            {/* Navigation List */}
            <div className="space-y-1.5">
                {[
                    { label: "Seen", count: seenList.length, icon: <CheckCircleIcon className="w-5 h-5 mr-3 text-slate-400"/>, action: () => navigate('/mylists', { state: { activeTab: 'allseen', mediaTypeFilter: 'all' } }) },
                    { label: "Want to Try", count: watchlist.length, icon: <WantToTryIcon className="w-5 h-5 mr-3 text-slate-400"/>, action: () => navigate('/mylists', { state: { activeTab: 'watchlist', mediaTypeFilter: 'all' } }) },
                    { label: "Recs for You", icon: <RecsIcon className="w-5 h-5 mr-3 text-slate-400"/>, action: () => navigate('/explore', { state: { activeTab: 'forYou' }}) },
                ].map(item => (
                    <button key={item.label} onClick={item.action} className="flex items-center w-full p-3.5 bg-slate-800 hover:bg-slate-700/70 rounded-lg transition-colors text-left border border-transparent hover:border-slate-600">
                        {item.icon}
                        <span className="flex-1 text-sm font-medium text-slate-200">{item.label}</span>
                        {typeof item.count === 'number' && <span className="text-sm text-slate-400 mr-2">{item.count}</span>}
                        <ChevronRightIcon className="w-4 h-4 text-slate-500" />
                    </button>
                ))}
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-xl shadow-lg text-center border border-slate-700">
                    <TrophyIcon className={`w-7 h-7 mx-auto mb-1.5 ${ACCENT_COLOR_CLASS_TEXT}`} />
                    <p className="text-xs text-slate-400">Rank on Seen</p>
                    <p className="text-lg font-semibold text-slate-100">#95880</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl shadow-lg text-center border border-slate-700">
                    <FireIcon className={`w-7 h-7 mx-auto mb-1.5 ${ACCENT_COLOR_CLASS_TEXT}`} />
                    <p className="text-xs text-slate-400">Current Streak</p>
                    <p className="text-lg font-semibold text-slate-100">{weeklyStreak} week{weeklyStreak !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* Goal Setting Placeholder */}
            <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-md font-semibold text-slate-100">Set Your Watch Goal</h3>
                        <p className="text-xs text-slate-400">How many new titles to try this year?</p>
                    </div>
                    <TrophyIcon className="w-10 h-10 text-yellow-400 opacity-70 -mt-1 -mr-1" /> {/* Placeholder image */}
                </div>
                <div className="flex space-x-2.5 mt-3 overflow-x-auto pb-1">
                    {[20, 50, 100, 'Customize'].map(val => (
                        <button key={val} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-full whitespace-nowrap transition-colors">
                            {val}
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent Ratings */}
            {mostRecentRatings.length > 0 && (
                <div>
                    <h2 className={`text-xl font-semibold mb-3 ${ACCENT_COLOR_CLASS_TEXT}`}>Recent Ratings</h2>
                    <div className="space-y-4">
                        {mostRecentRatings.map(item => (
                            <RatedMediaCard key={`${item.id}-${item.media_type}`} item={item} onClick={() => handleCardClick(item)} />
                        ))}
                    </div>
                    <RouterLink to="/mylists" state={{ activeTab: 'allseen', mediaTypeFilter: 'all' }} className={`block mt-4 text-center text-sm ${ACCENT_COLOR_CLASS_TEXT} hover:underline font-medium`}>
                        View All Ratings
                    </RouterLink>
                </div>
            )}
        </div>
    );
};


export default App;
