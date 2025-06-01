import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HashRouter, Routes, Route, NavLink, useNavigate, useLocation, useParams, Link as RouterLink } from 'react-router-dom';
import { MediaItem, Reaction, RatedItem, WatchlistItem, TMDBGenre, FeedActivityType, TMDBMovie, TMDBShow, CreditsResponse, CastMember, CrewMember, TVSeasonDetailsResponse, Episode as EpisodeType, RankedItem, IterativeComparisonSession, ComparisonSummary, ComparisonStep, WatchProviderResponse, WatchProviderCountryResult, CustomList, CustomListMediaItem, PersonDetails, PersonCombinedCreditsResponse, UserProfile, FeedComment, PersonCreditItem, TMDBListResponse } from './types';
import { MediaCard, ReactionPicker, PairwiseComparisonModal, SearchBar, Modal, RatedMediaCard, Skeleton, PosterImage, CastCard, EpisodeCard, ComparisonSummaryModal, NotesTextarea, WatchProviderDisplay, CreateListModal, AddToListModal, CustomListItemCard, CrewMemberDisplay, FeedCard } from './components';
import { 
  HomeIcon, ListBulletIcon, UserGroupIcon, StarIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon, 
  EyeIcon as SeenIconAction, PlusIcon as AddIconAction, InformationCircleIcon, PlusCircleIcon, 
  PencilIcon, TrashIcon, FilmIcon, TvIcon, RectangleStackIcon, CheckCircleIcon, ArrowUpOnSquareIcon, 
  TrophyIcon, FireIcon, UserIcon as ProfileNavIcon, BookmarkIcon as WantToTryIcon, HeartIcon as RecsIcon, 
  NewHomeIcon, NewExploreIcon, NewListIcon, NewUserIcon, // Added new icons
  FilterIcon, BookmarkSquareIcon, BookmarkIcon, // IMPORT THE NEW FilterIcon and BookmarkSquareIcon AND BookmarkIcon for MyListsPage tabs
  EyeIcon, // Removed EyeSlashIcon, GoogleIcon, EmailIcon
  // Removed LocalGoogleIcon, LocalEyeSlashIcon, LocalEmailIcon
} from './icons';
import TopCategoryNav from './TopCategoryNav'; // Import the new component
import MediaCarousel from './MediaCarousel'; // ADD MediaCarousel import
import { tmdbService, userListService, geminiService, getRuntimeCategory } from './services';
import { mockFeedItems, mockUser } from './mockData'; 
import { APP_NAME, REACTION_EMOJIS, REACTION_LABELS, TMDB_IMAGE_BASE_URL_ORIGINAL, ACCENT_COLOR_CLASS_TEXT, ACCENT_COLOR_CLASS_BG, ACCENT_COLOR_CLASS_BG_HOVER, ACCENT_COLOR_CLASS_BORDER, ACCENT_COLOR_CLASS_RING, DEFAULT_USER_ID, STREAMING_PROVIDERS } from './constants';
import { LoginPage } from './components/LoginPage'; // Added
import { SignupPage } from './components/SignupPage'; // Added
import { useAuth } from './contexts/AuthContext'; // Import useAuth
import OnboardingPage from './components/OnboardingPage'; // Added OnboardingPage import

const MAX_COMPARISONS_PER_ITEM = 5;

// NEW: AppContent component
const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth(); // Get auth state
  const navigate = useNavigate(); // Added for redirection
  const location = useLocation();
  const [initialLoading, setInitialLoading] = useState(true);

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [seenList, setSeenList] = useState<RatedItem[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  
  const [selectedItemForReaction, setSelectedItemForReaction] = useState<MediaItem | null>(null);
  const [currentUserNotes, setCurrentUserNotes] = useState<string>("");
  const [isReactionModalOpen, setIsReactionModalOpen] = useState(false);

  const [iterativeComparisonState, setIterativeComparisonState] = useState<IterativeComparisonSession | null>(null);
  const [comparisonSummaryState, setComparisonSummaryState] = useState<ComparisonSummary>({ show: false, rankedItem: null, comparisonHistory: [], totalComparisonsMade: 0 });
  
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);

  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [selectedMediaForListAddition, setSelectedMediaForListAddition] = useState<MediaItem | null>(null);

  const [currentExploreTab, setCurrentExploreTab] = useState<'trendingMovies' | 'trendingShows' | 'search' | 'forYou' | 'moviesOnly' | 'tvShowsOnly'>('trendingMovies');
  
  // Moved all hooks before the conditional return
  useEffect(() => {
    setWatchlist(userListService.getWatchlist());
    setSeenList(userListService.getSeenList());
    setCustomLists(userListService.getCustomLists());
  }, []); // This effect now runs on initial mount, good for fetching initial data

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

  const proceedToNextComparisonStep = useCallback(async (session: IterativeComparisonSession) => {
    if (!session.isActive) return;
    if (session.lowIndex > session.highIndex || session.comparisonsMade >= session.maxComparisons) {
      const insertionIndex = session.lowIndex;
      let finalOrderedBucket = [...session.comparisonBucketSnapshot];
      finalOrderedBucket.splice(insertionIndex, 0, session.newItem);
      const updatedFullSeenList = userListService.updateOrderAfterIteration(session.newItem, finalOrderedBucket);
      setSeenList(updatedFullSeenList);
      const fullyRankedItem = userListService.getRankedList(session.newItem.media_type as 'movie' | 'tv' | undefined, session.newItem.userReaction).find(i => i.id === session.newItem.id && i.media_type === session.newItem.media_type);
      setComparisonSummaryState({ show: true, rankedItem: fullyRankedItem || { ...session.newItem, rank: insertionIndex, personalScore: 0 }, comparisonHistory: session.history, totalComparisonsMade: session.comparisonsMade });
      setIterativeComparisonState(null); setIsLoadingGlobal(false); return;
    }
    const pivotIdx = calculatePivotIndexSmartly(session.lowIndex, session.highIndex, session.newItem, session.comparisonBucketSnapshot);
    const pivotItem = session.comparisonBucketSnapshot[pivotIdx];
    if (!pivotItem) { proceedToNextComparisonStep({ ...session, lowIndex: session.highIndex + 1 }); return; }
    setIsLoadingGlobal(true);
    const sharedGenres = session.newItem.genres?.filter(g => pivotItem.genres?.some(pg => pg.id === g.id)).map(g => g.name) || [];
    const promptText = await geminiService.generateComparisonPrompt({ newItem: session.newItem, existingItem: pivotItem, reaction: session.newItem.userReaction, isIterative: true, sharedGenres });
    setIsLoadingGlobal(false);
    setIterativeComparisonState({ ...session, pivotItem: pivotItem, currentPrompt: promptText });
  }, []); // Removed dependencies that were causing re-memoization issues earlier, they are stable or correctly handled by closure.

  const startIterativeComparison = useCallback(async (ratedItem: RatedItem) => {
    setIsLoadingGlobal(true);
    const allSeen = userListService.getSeenList();
    const relevantBucketItems = allSeen.filter(item => item.userReaction === ratedItem.userReaction && item.media_type === ratedItem.media_type && item.id !== ratedItem.id);
    
    if (relevantBucketItems.length === 0) {
      const updatedFullSeenList = userListService.updateOrderAfterIteration(ratedItem, [ratedItem]);
      setSeenList(updatedFullSeenList);
      const fullyRankedItem = userListService.getRankedList(ratedItem.media_type as 'movie' | 'tv' | undefined, ratedItem.userReaction).find(i => i.id === ratedItem.id && i.media_type === ratedItem.media_type);
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
    const ratedItem = await userListService.createRatedItem(selectedItemForReaction, reaction, currentUserNotes);
    setWatchlist(userListService.getWatchlist()); // Update watchlist after rating
    setSeenList(userListService.getSeenList()); // Update seenlist from source of truth
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
  
  // Main useEffect for onboarding and auth redirection logic
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');
    if (!onboardingCompleted) {
      navigate('/onboarding');
      setInitialLoading(false);
      return; 
    }

    if (!authLoading && !user) {
      const publicPaths = ['/login', '/signup', '/onboarding'];
      if (!publicPaths.includes(location.pathname)) {
        navigate('/login');
      }
    }
    setInitialLoading(false);
  }, [authLoading, user, location, navigate]); // Dependencies for this effect

  // Conditional return for loading states - NOW ALL HOOKS ARE CALLED BEFORE THIS
  if (initialLoading || (authLoading && !user && !['/login', '/signup', '/onboarding'].includes(location.pathname))) {
    return (
      <div className="min-h-screen bg-[#111111] text-[#F6F6F6] flex flex-col font-sans items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Helper function (not a hook)
  const calculatePivotIndexSmartly = (low: number, high: number, newItem: RatedItem, comparisonList: RatedItem[]): number => {
    if (low > high) return low;
    return Math.floor((low + high) / 2);
  };

  // Helper function (not a hook)
  const handleCancelIterativeComparison = () => {
    setIterativeComparisonState(null); setIsLoadingGlobal(false); setCurrentUserNotes("");
  };
  
  // Helper function (not a hook)
  const handleCreateCustomList = (name: string, description?: string) => {
    const updatedLists = userListService.createCustomList(name, description);
    setCustomLists(updatedLists);
  };
  // Helper function (not a hook)
  const handleOpenAddToListModal = (item: MediaItem) => {
    setSelectedMediaForListAddition(item);
    setIsAddToListModalOpen(true);
  };
  // Helper function (not a hook)
  const handleAddItemToCustomList = (listId: string, item: MediaItem) => {
    const updatedList = userListService.addItemToCustomList(listId, item);
    if (updatedList) setCustomLists(userListService.getCustomLists());
  };
  // Helper function (not a hook)
  const handleCreateAndAddToList = (listName: string, item: MediaItem, listDescription?: string) => {
    const newLists = userListService.createCustomList(listName, listDescription);
    const newList = newLists.find(l => l.name === listName);
    if (newList) {
        userListService.addItemToCustomList(newList.id, item);
    }
    setCustomLists(userListService.getCustomLists());
  };

  const handleCategorySelected = (category: string) => {
    console.log("Selected category from TopNav:", category);
    switch (category) {
      case "Trending": setCurrentExploreTab('trendingMovies'); break;
      case "Movies": setCurrentExploreTab('moviesOnly'); break;
      case "TV shows": setCurrentExploreTab('tvShowsOnly'); break;
      case "Recommendations": setCurrentExploreTab('forYou'); break;
      default: setCurrentExploreTab('trendingMovies'); break;
    }
  };

  const commonPageProps: BasePageProps = {
    userListService,
    watchlist,
    seenList,
    customLists,
    onAddToWatchlist: handleAddToWatchlist,
    onMarkAsSeen: handleMarkAsSeen,
    onRemoveFromWatchlist: handleRemoveFromWatchlist,
    onAddToList: handleOpenAddToListModal,
    setCustomLists, 
    openCreateListModal: () => setIsCreateListModalOpen(true)
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#F6F6F6] flex flex-col font-sans">
      {location.pathname === '/explore' && <TopCategoryNav onCategorySelect={handleCategorySelected} />}
        <main className="flex-grow container mx-auto px-3 sm:px-4 py-5 sm:py-6 mb-20">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/" element={<FeedPage {...commonPageProps} currentUser={mockUser} />} />
          <Route path="/explore" element={<ExplorePage {...commonPageProps} initialTab={currentExploreTab} watchlist={watchlist} />} />
            <Route path="/mylists" element={<MyListsPage {...commonPageProps} openCreateListModal={() => setIsCreateListModalOpen(true)} />} />
            <Route path="/mylists/:listId" element={<CustomListPage {...commonPageProps} />} />
            <Route path="/media/:type/:id" element={<MediaDetailPage {...commonPageProps} />} />
            <Route path="/person/:personId" element={<PersonDetailPage {...commonPageProps} />} />
            <Route path="/profile" element={<ProfilePage {...commonPageProps} />} /> 
          </Routes>
        </main>
      <AppNavigation setCurrentExploreTab={setCurrentExploreTab} />
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
  );
};

// --- Main App Component (now simpler) ---
const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; onClick?: () => void }> = ({ to, icon, label, onClick }) => (
  <NavLink 
    to={to} 
    end={to === "/"} 
    onClick={onClick} // Added onClick passthrough
    className={({ isActive }) => 
      `flex flex-col items-center justify-center px-3 py-2.5 text-xs font-medium transition-all duration-200 w-1/4 transform hover:opacity-80 \
      ${isActive ? 'text-[#F6F6F6]' : 'text-gray-500 hover:text-gray-300'}`
    }
  >
    {icon}
    <span className="mt-1.5">{label}</span>
  </NavLink>
);

const AppNavigation: React.FC<{ setCurrentExploreTab: (tab: 'trendingMovies' | 'trendingShows' | 'search' | 'forYou' | 'moviesOnly' | 'tvShowsOnly') => void }> = ({ setCurrentExploreTab }) => {
  const { user, loading } = useAuth(); // Get auth state

  return (
  <nav className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A]/90 backdrop-blur-md border-t border-gray-700 shadow-t-xl z-40"> {/* Adjusted background and border */}
    <div className="container mx-auto sm:px-0">
      <div className="flex justify-around items-center h-16">
        <NavItem to="/" icon={<NewHomeIcon className="w-6 h-6" />} label="Feed" /> {/* Changed to NewHomeIcon */}
        <NavItem 
          to="/explore" 
          icon={<NewExploreIcon className="w-6 h-6" />} 
          label="Explore" 
          onClick={() => setCurrentExploreTab('trendingMovies')} // Added onClick handler
        /> {/* Changed to NewExploreIcon */}
        <NavItem to="/mylists" icon={<NewListIcon className="w-6 h-6" />} label="My Lists" /> {/* Changed to NewListIcon */}
          {loading ? (
            <div className="flex flex-col items-center justify-center px-3 py-2.5 text-xs font-medium text-gray-500 w-1/4">
              <NewUserIcon className="w-6 h-6 animate-pulse" />
              <span className="mt-1.5">Loading...</span>
            </div>
          ) : user ? (
            <NavItem to="/profile" icon={<NewUserIcon className="w-6 h-6" />} label="Profile" />
          ) : (
            <NavItem to="/login" icon={<NewUserIcon className="w-6 h-6" />} label="Login" />
          )}
      </div>
    </div>
  </nav>
  )}; // Corrected: ensure this is a curly brace for the function body and a semicolon for the statement.

interface BasePageProps {
  userListService: typeof userListService; // Add userListService
  watchlist: WatchlistItem[];
  seenList: RatedItem[];
  customLists: CustomList[]; 
  onAddToWatchlist: (item: MediaItem) => void;
  onMarkAsSeen: (item: MediaItem) => void;
  onRemoveFromWatchlist: (itemId: number, itemType: 'movie' | 'tv') => void;
  onAddToList: (item: MediaItem) => void; 
  setCustomLists: React.Dispatch<React.SetStateAction<CustomList[]>>;
  openCreateListModal: () => void; // Added here
}

// Prop type for ExplorePage including the new initialTab from App
interface ExplorePageProps extends BasePageProps {
  initialTab?: 'trendingMovies' | 'trendingShows' | 'search' | 'forYou' | 'moviesOnly' | 'tvShowsOnly';
  // Add watchlist to ExplorePageProps
  watchlist: WatchlistItem[]; 
}

// --- Explore Page ---
const ExplorePage: React.FC<ExplorePageProps> = ({ 
  onAddToWatchlist, 
  onMarkAsSeen, 
  onAddToList, 
  seenList, 
  watchlist, 
  initialTab 
}) => {
  const location = useLocation();
  const navigate = useNavigate(); // Moved navigate here
  const [activeTab, setActiveTab] = useState<'trendingMovies' | 'trendingShows' | 'search' | 'forYou' | 'moviesOnly' | 'tvShowsOnly'>(initialTab || location.state?.activeTab || 'trendingMovies');
  
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true); // ADDED hasMore state
  const [currentQuery, setCurrentQuery] = useState('');
  
  const [movieGenres, setMovieGenres] = useState<TMDBGenre[]>([]);
  const [tvGenres, setTvGenres] = useState<TMDBGenre[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<Set<number>>(new Set());
  const [selectedProviderIds, setSelectedProviderIds] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // New state for Trending tabs
  const [trendingSearchQuery, setTrendingSearchQuery] = useState('');
  const [selectedTrendingMovieGenreIds, setSelectedTrendingMovieGenreIds] = useState<Set<number>>(new Set());
  const [selectedTrendingShowGenreIds, setSelectedTrendingShowGenreIds] = useState<Set<number>>(new Set());
  // const [selectedTrendingMovieProviderIds, setSelectedTrendingMovieProviderIds] = useState<Set<number>>(new Set()); // Example if adding provider filters
  // const [selectedTrendingShowProviderIds, setSelectedTrendingShowProviderIds] = useState<Set<number>>(new Set()); // Example if adding provider filters
  const [showTrendingMovieFilters, setShowTrendingMovieFilters] = useState(false);
  const [showTrendingShowFilters, setShowTrendingShowFilters] = useState(false);

  // --- BEGIN DIAGNOSTIC LOGGING ---
  // const renderCount = useRef(0);
  // const selectedGenreIdsRefForLogging = useRef(selectedGenreIds);

  // useEffect(() => {
  //   renderCount.current += 1;
  //   let logMsg = `[ExplorePage] Render ${renderCount.current}. activeTab: ${activeTab}, currentPage: ${currentPage}.`;
  //   if (selectedGenreIdsRefForLogging.current !== selectedGenreIds) {
  //     logMsg += " selectedGenreIds REF CHANGED during this render cycle.";
  //     selectedGenreIdsRefForLogging.current = selectedGenreIds;
  //   } else {
  //     logMsg += " selectedGenreIds ref stable this render.";
  //   }
  //   console.log(logMsg, "Current selectedGenreIds:", selectedGenreIds);
  // }); // Log on every render

  // const prevSelectedGenreIdsInEffect = useRef<Set<number> | undefined>(undefined); // Initialized
  // --- END DIAGNOSTIC LOGGING ---

  const [trendingMoviesResults, setTrendingMoviesResults] = useState<MediaItem[]>([]);
  const [trendingShowsResults, setTrendingShowsResults] = useState<MediaItem[]>([]);
  const [searchQueryResults, setSearchQueryResults] = useState<MediaItem[]>([]);
  const [moviesOnlyResults, setMoviesOnlyResults] = useState<MediaItem[]>([]);
  const [tvShowsOnlyResults, setTvShowsOnlyResults] = useState<MediaItem[]>([]);

  const [recommendedMovies, setRecommendedMovies] = useState<MediaItem[]>([]);
  const [recommendedShows, setRecommendedShows] = useState<MediaItem[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  const [topTrendingCombined, setTopTrendingCombined] = useState<MediaItem[]>([]);
  const [isLoadingHorizontal, setIsLoadingHorizontal] = useState(false);

  const [recommendationTypeTab, setRecommendationTypeTab] = useState<'movies' | 'shows'>('movies');

  // Define handlers before they are used in fetchMedia or other dependent hooks/callbacks
  const handleMediaItemClick = (item: MediaItem | PersonCreditItem) => {
    if (item.media_type === 'movie' || item.media_type === 'tv') {
      navigate(`/media/${item.media_type as 'movie' | 'tv'}/${item.id}`);
    } else if (item.media_type === 'person') {
      const personCredit = item as PersonCreditItem;
      if (personCredit.id) {
        navigate(`/person/${personCredit.id}`);
      }
    }
  };

  const handleMarkAsSeenLocal = (item: MediaItem | PersonCreditItem) => {
    if (item.media_type !== 'person') {
      onMarkAsSeen(item as MediaItem);
    }
  };

  const handleAddToWatchlistLocal = (item: MediaItem | PersonCreditItem) => {
    if (item.media_type !== 'person') {
      onAddToWatchlist(item as MediaItem);
    }
  };

  const fetchMedia = useCallback(async (tabToFetch: string, query: string, page: number) => {
    // console.log('[ExplorePage] fetchMedia memoized/re-created. selectedGenreIds ref changed?', { tabToFetch, query, page, selectedGenreIds });
    setIsLoading(true);
    setError(null);
    try {
      let data: TMDBListResponse<MediaItem> | undefined;
      switch (tabToFetch) {
        case 'search':
          data = await tmdbService.searchMedia(query, page);
          break;
        case 'moviesOnly':
          data = await tmdbService.getPopularMovies(page);
          break;
        case 'tvShowsOnly':
          data = await tmdbService.getPopularShows(page);
          break;
        case 'trendingMovies':
          data = await tmdbService.getTrendingMedia('movie', 'day', page);
          break;
        case 'trendingShows':
          data = await tmdbService.getTrendingMedia('tv', 'day', page);
          break;
        default:
          setIsLoading(false);
          return;
      }

      if (!data?.results) {
        setResults(prevResults => page === 1 ? [] : prevResults);
        setTotalPages(1);
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      const filteredResults = data.results.filter((item: MediaItem): item is MediaItem => {
        if (item.media_type !== 'movie' && item.media_type !== 'tv') {
          return false;
        }

        // Apply tab-specific search query for trending tabs
        if ((tabToFetch === 'trendingMovies' || tabToFetch === 'trendingShows') && trendingSearchQuery) {
          const searchTerm = trendingSearchQuery.toLowerCase();
          const title = item.title?.toLowerCase() || item.name?.toLowerCase() || '';
          const overview = item.overview?.toLowerCase() || '';
          if (!title.includes(searchTerm) && !overview.includes(searchTerm)) {
            return false;
          }
        }
        
        // Apply genre filters
        let currentSelectedGenreIds = selectedGenreIds;
        if (tabToFetch === 'trendingMovies') {
          currentSelectedGenreIds = selectedTrendingMovieGenreIds;
        } else if (tabToFetch === 'trendingShows') {
          currentSelectedGenreIds = selectedTrendingShowGenreIds;
        }

        if (currentSelectedGenreIds.size > 0) {
          const itemGenres = item.genre_ids || [];
          if (!Array.from(currentSelectedGenreIds).some(genreId => itemGenres.includes(genreId))) {
            return false;
          }
        }
        return true;
      });
      
      if (page === 1) {
        if (tabToFetch === 'trendingMovies') setTrendingMoviesResults(filteredResults);
        else if (tabToFetch === 'trendingShows') setTrendingShowsResults(filteredResults);
        else if (tabToFetch === 'search') setSearchQueryResults(filteredResults);
        else if (tabToFetch === 'moviesOnly') {
          setMoviesOnlyResults(filteredResults); 
          // DO NOT setResults(filteredResults) for moviesOnly
        } else if (tabToFetch === 'tvShowsOnly') {
          setTvShowsOnlyResults(filteredResults);
          // DO NOT setResults(filteredResults) for tvShowsOnly
        }
        // Update generic results ONLY for tabs that might use it directly via displayResults fallback
        if (tabToFetch === 'trendingMovies' || tabToFetch === 'trendingShows' || tabToFetch === 'search') {
            setResults(filteredResults);
        }
      } else {
        // Ensure only unique items are added when paginating
        const addUnique = (prev: MediaItem[], newItems: MediaItem[]): MediaItem[] => {
          const existingIds = new Set(prev.map(item => item.id));
          const newUniqueItems = newItems.filter(item => !existingIds.has(item.id));
          return [...prev, ...newUniqueItems];
        };

        if (tabToFetch === 'trendingMovies') setTrendingMoviesResults(prev => addUnique(prev, filteredResults));
        else if (tabToFetch === 'trendingShows') setTrendingShowsResults(prev => addUnique(prev, filteredResults));
        else if (tabToFetch === 'search') setSearchQueryResults(prev => addUnique(prev, filteredResults));
        else if (tabToFetch === 'moviesOnly') {
            setMoviesOnlyResults(prev => addUnique(prev, filteredResults));
            // DO NOT setResults(prev => addUnique(prev, filteredResults)) for moviesOnly
        } else if (tabToFetch === 'tvShowsOnly') {
            setTvShowsOnlyResults(prev => addUnique(prev, filteredResults));
            // DO NOT setResults(prev => addUnique(prev, filteredResults)) for tvShowsOnly
        }
        // Update generic results ONLY for tabs that might use it directly via displayResults fallback
        if (tabToFetch === 'trendingMovies' || tabToFetch === 'trendingShows' || tabToFetch === 'search') {
            setResults(prev => addUnique(prev, filteredResults));
        }
      }

      setTotalPages(data.total_pages || 1);
      setHasMore(page < (data.total_pages || 1));
    } catch (err) {
      console.error('Error fetching media:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch media');
      setResults([]);
      setTotalPages(1);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGenreIds, trendingSearchQuery, selectedTrendingMovieGenreIds, selectedTrendingShowGenreIds]); // Added new dependencies

  const handlePageChange = useCallback((newPage: number) => {
    // console.log('[ExplorePage] handlePageChange called.', { newPage, currentPage, totalPages, isLoading, activeTab, currentQuery });
    if (newPage < 1 || newPage > totalPages || isLoading) return; 
    setCurrentPage(newPage);
    if (activeTab === 'search' && currentQuery) {
      fetchMedia('search', currentQuery, newPage);
    } else if (activeTab === 'trendingMovies' || activeTab === 'trendingShows' || activeTab === 'moviesOnly' || activeTab === 'tvShowsOnly') {
      fetchMedia(activeTab, '', newPage);
    }
  }, [activeTab, currentQuery, totalPages, isLoading, fetchMedia, setCurrentPage]);

  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return; if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting && currentPage < totalPages) handlePageChange(currentPage + 1); });
    if (node) observer.current.observe(node);
  }, [isLoading, currentPage, totalPages, handlePageChange]); // Corrected: Added handlePageChange

  useEffect(() => { (async () => { try { const [m, t] = await Promise.all([tmdbService.getMovieGenres(), tmdbService.getTvGenres()]); setMovieGenres(m); setTvGenres(t); } catch (err) { console.error("Failed to fetch genres:", err); } })(); }, []);

  useEffect(() => {
    const fetchHorizontalData = async () => {
      setIsLoadingHorizontal(true);
      setTopTrendingCombined([]); // Clear previous items
      try {
        const [moviesData, showsData] = await Promise.all([
          tmdbService.getTrendingMedia('movie', 'week', 1),
          tmdbService.getTrendingMedia('tv', 'week', 1)
        ]);
        
        if (moviesData && showsData) {
        const top5Movies = moviesData.results.slice(0, 5);
        const top5Shows = showsData.results.slice(0, 5);
        
        // Interleave movies and shows
        const combined: MediaItem[] = [];
        const maxLength = Math.max(top5Movies.length, top5Shows.length);
        for (let i = 0; i < maxLength; i++) {
          if (i < top5Movies.length) combined.push(top5Movies[i]);
          if (i < top5Shows.length) combined.push(top5Shows[i]);
        }
        setTopTrendingCombined(combined);
        }
      } catch (err) {
        console.error("Failed to fetch horizontal scroll data:", err);
      }
      setIsLoadingHorizontal(false);
    };
    fetchHorizontalData();
  }, []);

  useEffect(() => {
    // --- BEGIN DIAGNOSTIC LOGGING FOR RESET EFFECT ---
    // const selectedGenreIdsChangedSinceLastEffectRun = prevSelectedGenreIdsInEffect.current !== selectedGenreIds;
    // console.log(
    //   '[ExplorePage] Main reset useEffect CHECKING. selectedGenreIds ref changed since last run?', 
    //   selectedGenreIdsChangedSinceLastEffectRun,
    //   "Effect\'s current selectedGenreIds:", selectedGenreIds,
    //   "Effect\'s prev selectedGenreIds:", prevSelectedGenreIdsInEffect.current
    // );

    if (
      prevActiveTabInEffect.current !== activeTab || 
      prevCurrentQueryInEffect.current !== currentQuery || 
      prevSelectedGenreIdsInEffect.current !== selectedGenreIds || 
      prevSelectedProviderIdsInEffect.current !== selectedProviderIds ||
      // Add checks for trending-specific filters if they should trigger a full reset
      (activeTab === 'trendingMovies' && (
        prevTrendingSearchQueryInEffect.current !== trendingSearchQuery ||
        prevSelectedTrendingMovieGenreIdsInEffect.current !== selectedTrendingMovieGenreIds
      )) ||
      (activeTab === 'trendingShows' && (
        prevTrendingSearchQueryInEffect.current !== trendingSearchQuery || // Assuming same search query for both trending
        prevSelectedTrendingShowGenreIdsInEffect.current !== selectedTrendingShowGenreIds
      ))
    ) {
      // console.log('[ExplorePage] Main reset useEffect RUNNING. Dependencies that changed:', {
      //   activeTabChanged: prevActiveTabInEffect.current !== activeTab,
      //   currentQueryChanged: prevCurrentQueryInEffect.current !== currentQuery,
      //   selectedGenreIdsChanged: prevSelectedGenreIdsInEffect.current !== selectedGenreIds,
      //   selectedProviderIdsChanged: prevSelectedProviderIdsInEffect.current !== selectedProviderIds,
      // });
      // console.log('[ExplorePage] Main reset useEffect old deps:', { activeTab: prevActiveTabInEffect.current, currentQuery: prevCurrentQueryInEffect.current, selectedGenreIds: prevSelectedGenreIdsInEffect.current, selectedProviderIds: prevSelectedProviderIdsInEffect.current });
      // console.log('[ExplorePage] Main reset useEffect new deps:', { activeTab, currentQuery, selectedGenreIds, selectedProviderIds });


      // Store current dependencies for next run comparison
      prevActiveTabInEffect.current = activeTab;
      prevCurrentQueryInEffect.current = currentQuery;
      prevSelectedGenreIdsInEffect.current = selectedGenreIds;
      prevSelectedProviderIdsInEffect.current = selectedProviderIds;
      // Store trending-specific deps
      prevTrendingSearchQueryInEffect.current = trendingSearchQuery;
      prevSelectedTrendingMovieGenreIdsInEffect.current = selectedTrendingMovieGenreIds;
      prevSelectedTrendingShowGenreIdsInEffect.current = selectedTrendingShowGenreIds;
      // --- END DIAGNOSTIC LOGGING FOR RESET EFFECT ---

    setCurrentPage(1); 
    // Reset specific results arrays too
    setTrendingMoviesResults([]);
    setTrendingShowsResults([]);
    setSearchQueryResults([]);
    setMoviesOnlyResults([]);
    setTvShowsOnlyResults([]);
    setResults([]); // Reset generic results

    if (activeTab === 'forYou') { 
      // generateForYouRecommendations is called by its own useEffect based on seenList 
    } else if (activeTab === 'trendingMovies' || activeTab === 'trendingShows' || activeTab === 'moviesOnly' || activeTab === 'tvShowsOnly') { 
      fetchMedia(activeTab, '', 1); 
    } else if (activeTab === 'search') { 
      if (currentQuery) fetchMedia('search', currentQuery, 1); 
      else setResults([]); 
    }
    } else {
      console.log('[ExplorePage] Main reset useEffect SKIPPED (dependencies did not change reference).');
    }
  }, [activeTab, currentQuery, selectedGenreIds, selectedProviderIds, trendingSearchQuery, selectedTrendingMovieGenreIds, selectedTrendingShowGenreIds]); // REMOVED fetchMedia from dependencies, ADDED trending filter states
  
  // Refs to store previous values of dependencies for the main reset effect for logging
  const prevActiveTabInEffect = useRef<typeof activeTab | undefined>(undefined); // Initialized
  const prevCurrentQueryInEffect = useRef<typeof currentQuery | undefined>(undefined); // Initialized
  const prevSelectedGenreIdsInEffect = useRef<Set<number> | undefined>(undefined); // Re-add this line that was accidentally removed. It should be after the diagnostic logging section was commented out.
  const prevSelectedProviderIdsInEffect = useRef<typeof selectedProviderIds | undefined>(undefined);
  // New refs for trending-specific filters
  const prevTrendingSearchQueryInEffect = useRef<typeof trendingSearchQuery | undefined>(undefined);
  const prevSelectedTrendingMovieGenreIdsInEffect = useRef<Set<number> | undefined>(undefined);
  const prevSelectedTrendingShowGenreIdsInEffect = useRef<Set<number> | undefined>(undefined);

  
  useEffect(() => { // Sync activeTab with location state OR prop if it changes
    const tabFromLocation = location.state?.activeTab;
    // If initialTab is explicitly provided and differs, it takes precedence.
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
    // Else, if navigating via location.state and it differs.
    else if (tabFromLocation && tabFromLocation !== activeTab) {
      setActiveTab(tabFromLocation);
    }
  }, [location.state, initialTab]); // REMOVED activeTab from dependencies


  const handleSearch = (query: string) => { setActiveTab('search'); setCurrentQuery(query); /* Page reset is handled by useEffect */ };
  const handleCardClick = (item: MediaItem | RankedItem | PersonCreditItem) => {
    if (item.media_type === 'movie' || item.media_type === 'tv') {
      navigate(`/media/${item.media_type as 'movie' | 'tv'}/${item.id}`);
    } else if (item.media_type === 'person') {
      navigate(`/person/${item.id}`);
    }
  };
  const toggleGenreFilter = (genreId: number) => {
    setSelectedGenreIds(prev => { const newSet = new Set(prev); if (newSet.has(genreId)) newSet.delete(genreId); else newSet.add(genreId); return newSet; });
  };
  const toggleProviderFilter = (providerId: number) => {
    setSelectedProviderIds(prev => { const newSet = new Set(prev); if (newSet.has(providerId)) newSet.delete(providerId); else newSet.add(providerId); return newSet; });
  };

  // Determine which results to display based on activeTab
  const getDisplayResults = () => {
    switch (activeTab) {
      case 'trendingMovies': return trendingMoviesResults;
      case 'trendingShows': return trendingShowsResults;
      case 'search': return searchQueryResults;
      case 'moviesOnly': return moviesOnlyResults;
      case 'tvShowsOnly': return tvShowsOnlyResults;
      // 'forYou' is handled separately with recommendedMovies/recommendedShows
      default: return [];
    }
  };
  const displayResults = getDisplayResults();

  const currentGenreList = (activeTab === 'trendingMovies' || activeTab === 'moviesOnly') ? movieGenres : (activeTab === 'trendingShows' || activeTab === 'tvShowsOnly') ? tvGenres : [];

  // Determine if we are in the main recommendations view
  const isRecommendationsView = activeTab === 'forYou';
  // Determine if we are in an exclusive movie or TV show view
  const isMoviesOnlyView = activeTab === 'moviesOnly';
  const isTvShowsOnlyView = activeTab === 'tvShowsOnly';
  // Determine if we are in the general explore view (trending with subtabs)
  const isGeneralExploreView = activeTab === 'trendingMovies' || activeTab === 'trendingShows' || activeTab === 'search';

  const totalActiveFilters = selectedGenreIds.size + selectedProviderIds.size;
  const totalTrendingMovieFilters = selectedTrendingMovieGenreIds.size; // Add provider size if used
  const totalTrendingShowFilters = selectedTrendingShowGenreIds.size; // Add provider size if used

  const carouselDisplayItems = useMemo(() => {
    if (isMoviesOnlyView) {
      return topTrendingCombined.filter(item => item.media_type === 'movie');
    } else if (isTvShowsOnlyView) {
      return topTrendingCombined.filter(item => item.media_type === 'tv');
    }
    // For 'trendingMovies', 'trendingShows', 'search', and 'forYou', 
    // we can decide if this carousel should show mixed, specific, or be hidden.
    // For now, let's keep it mixed for the general 'trendingMovies' and 'trendingShows' tabs
    // and hide it for 'search' and 'forYou' to avoid redundancy or irrelevance.
    if (activeTab === 'trendingMovies') {
        return topTrendingCombined.filter(item => item.media_type === 'movie');
    }
    if (activeTab === 'trendingShows') {
        return topTrendingCombined.filter(item => item.media_type === 'tv');
    }
    if (activeTab === 'search' || activeTab === 'forYou') {
        return []; // Hide carousel for search and forYou tabs
    }
    return topTrendingCombined; // Default for other unhandled tabs, or could be []
  }, [activeTab, topTrendingCombined, isMoviesOnlyView, isTvShowsOnlyView]);

  const FilterSection = () => (
    <div className="w-full p-4 bg-slate-800 rounded-lg shadow-lg border border-slate-700 space-y-5 mb-5 transition-all duration-300 ease-in-out">
      {/* Provider Filters - Show for all relevant tabs now */}
      {STREAMING_PROVIDERS.length > 0 && (
        <div className="pt-1">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Filter by Streaming Service (US):</h3>
          <div className="flex flex-wrap gap-2">
            {STREAMING_PROVIDERS.map(provider => (
              <button 
                key={provider.id} 
                onClick={() => toggleProviderFilter(provider.id)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center
                                    ${selectedProviderIds.has(provider.id) 
                                      ? `${ACCENT_COLOR_CLASS_BG} text-white border-transparent` 
                                      : `bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:${ACCENT_COLOR_CLASS_BORDER}`}`}
              >
                {provider.shortName}
          </button>
        ))}
      </div>
        </div>
      )}
      
      {/* Genre Filters */}
      { (activeTab === 'trendingMovies' || activeTab === 'trendingShows' || isMoviesOnlyView || isTvShowsOnlyView) && currentGenreList.length > 0 && (
        <div className="mb-4 pt-1"><h3 className="text-sm font-medium text-slate-400 mb-2">Filter by Genre:</h3><div className="flex flex-wrap gap-2">
            {currentGenreList.slice(0, 10).map(genre => (<button key={genre.id} onClick={() => {
              if (activeTab === 'trendingMovies') {
                setSelectedTrendingMovieGenreIds(prev => { const newSet = new Set(prev); if (newSet.has(genre.id)) newSet.delete(genre.id); else newSet.add(genre.id); return newSet; });
              } else if (activeTab === 'trendingShows') {
                setSelectedTrendingShowGenreIds(prev => { const newSet = new Set(prev); if (newSet.has(genre.id)) newSet.delete(genre.id); else newSet.add(genre.id); return newSet; });
              } else {
                toggleGenreFilter(genre.id);
              }
            }}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                (activeTab === 'trendingMovies' && selectedTrendingMovieGenreIds.has(genre.id)) ||
                (activeTab === 'trendingShows' && selectedTrendingShowGenreIds.has(genre.id)) ||
                (!(activeTab === 'trendingMovies' || activeTab === 'trendingShows') && selectedGenreIds.has(genre.id))
                 ? `${ACCENT_COLOR_CLASS_BG} text-white border-transparent` : `bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:${ACCENT_COLOR_CLASS_BORDER}`}`}>{genre.name}</button>))}
        </div></div>
      )}
    </div>
  );

  return (
    <div className={`space-y-6 ${(isRecommendationsView || isMoviesOnlyView || isTvShowsOnlyView) ? 'px-4' : 'flex flex-col items-center'}`}>
      {/* Title: Dynamic based on activeTab */}
      {/* ... (title rendering logic - can be complex, ensure it's correct) ... */}
      {isMoviesOnlyView && <h2 className="text-3xl font-bold text-center my-6 text-white">All Movies</h2>}
      {isTvShowsOnlyView && <h2 className="text-3xl font-bold text-center my-6 text-white">All TV Shows</h2>}
      {isRecommendationsView && <h2 className="text-3xl font-bold text-center my-6 text-white">Your Recommendations</h2>}


      {/* Search Bar: Only for 'moviesOnly', 'tvShowsOnly' and 'search' tabs */
      /* MODIFIED: Also show for trending tabs */}
      {(isMoviesOnlyView || isTvShowsOnlyView || activeTab === 'search' || activeTab === 'trendingMovies' || activeTab === 'trendingShows') && (
        <div className="w-full max-w-xl mx-auto my-4 px-4">
          <SearchBar 
            onSearch={(query) => {
              if (activeTab === 'trendingMovies' || activeTab === 'trendingShows') {
                setTrendingSearchQuery(query);
                // Optionally, reset page or trigger re-filter/fetch for trending if needed
              } else {
                handleSearch(query);
              }
            }} 
            initialQuery={activeTab === 'trendingMovies' || activeTab === 'trendingShows' ? trendingSearchQuery : currentQuery} 
          />
        </div>
      )}

      {/* Filter Button & Panel - Show for recommendations, moviesOnly, tvShowsOnly */
      /* MODIFIED: Also show for trending tabs */}
      {(isRecommendationsView || isMoviesOnlyView || isTvShowsOnlyView || activeTab === 'trendingMovies' || activeTab === 'trendingShows') && (
        <div className="w-full max-w-3xl mx-auto px-4">
          <button
            onClick={() => {
              if (activeTab === 'trendingMovies') setShowTrendingMovieFilters(prev => !prev);
              else if (activeTab === 'trendingShows') setShowTrendingShowFilters(prev => !prev);
              else setShowFilters(prev => !prev);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg shadow-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <FilterIcon className="w-5 h-5" />
            <span>Filters</span>
            {(activeTab === 'trendingMovies' && totalTrendingMovieFilters > 0) && (
              <span className="bg-cyan-500 text-xs font-semibold text-slate-900 px-2 py-0.5 rounded-full">
                {totalTrendingMovieFilters}
              </span>
            )}
            {(activeTab === 'trendingShows' && totalTrendingShowFilters > 0) && (
              <span className="bg-cyan-500 text-xs font-semibold text-slate-900 px-2 py-0.5 rounded-full">
                {totalTrendingShowFilters}
              </span>
            )}
            {!(activeTab === 'trendingMovies' || activeTab === 'trendingShows') && totalActiveFilters > 0 && (
              <span className="bg-cyan-500 text-xs font-semibold text-slate-900 px-2 py-0.5 rounded-full">
                {totalActiveFilters}
              </span>
            )}
          </button>
          {((activeTab === 'trendingMovies' && showTrendingMovieFilters) || (activeTab === 'trendingShows' && showTrendingShowFilters) || (!(activeTab === 'trendingMovies' || activeTab === 'trendingShows') && showFilters)) && <FilterSection />}
                    </div>
      )}

      {/* Content Grid / Lists */}
      {isLoading && <LoadingSpinner />}
      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Add MediaCarousel for trending content */}
      {!isLoading && !error && carouselDisplayItems.length > 0 && (
        <div className="w-full max-w-7xl mx-auto px-4">
          <MediaCarousel
            title="Trending Now"
            items={carouselDisplayItems}
            onItemClick={handleMediaItemClick}
            onMarkAsSeenClick={handleMarkAsSeenLocal}
            onAddToWatchlistClick={handleAddToWatchlistLocal}
            isSeen={(item) => seenList.some(seenItem => seenItem.id === item.id && seenItem.media_type === item.media_type)}
            isWatchlisted={(item) => watchlist.some(watchItem => watchItem.id === item.id && watchItem.media_type === item.media_type)}
          />
        </div>
      )}

      {/* Recommendations View */}
      {isRecommendationsView && !isLoadingRecommendations && !error && (
        <div className="px-0">
          {/* Recommendation Sub-tabs */}
          <div className="flex justify-center space-x-3 mb-6 border-b border-slate-700">
            {['movies', 'shows'].map(type => (
              <button
                key={type}
                onClick={() => setRecommendationTypeTab(type as 'movies' | 'shows')}
                className={`px-6 py-2.5 text-sm font-medium focus:outline-none transition-all duration-200 ease-in-out
                  ${recommendationTypeTab === type
                    ? 'border-b-2 border-cyan-500 text-cyan-400'
                    : 'text-slate-400 hover:text-cyan-300'}`}
              >
                {type === 'movies' ? 'Recommended Movies' : 'Recommended TV Shows'}
                {type === 'movies' && recommendedMovies.length > 0 && <span className="ml-2 text-xs bg-slate-700 px-1.5 py-0.5 rounded-full">{recommendedMovies.length}</span>}
                {type === 'shows' && recommendedShows.length > 0 && <span className="ml-2 text-xs bg-slate-700 px-1.5 py-0.5 rounded-full">{recommendedShows.length}</span>}
              </button>
            ))}
                </div>

          {recommendationTypeTab === 'movies' && (
            recommendedMovies.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {recommendedMovies.map(item => (
                  <MediaCard
                    key={item.id}
                    item={item} 
                    onClick={handleMediaItemClick}
                    onMarkAsSeenClick={handleMarkAsSeenLocal} 
                    onAddToWatchlistClick={handleAddToWatchlistLocal} 
                    isSeen={seenList.some(seenItem => seenItem.id === item.id && seenItem.media_type === item.media_type )}
                    isWatchlisted={watchlist.some(watchItem => watchItem.id === item.id && watchItem.media_type === item.media_type)}
                  />
                ))}
              </div>
            ) : <p className="text-slate-400 text-center py-8">No movie recommendations based on your ratings and selected filters. Try rating more movies or adjusting filters.</p>
          )}
          {recommendationTypeTab === 'shows' && (
            recommendedShows.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {recommendedShows.map(item => (
                  <MediaCard
                    key={item.id}
                    item={item} 
                    onClick={handleMediaItemClick}
                    onMarkAsSeenClick={handleMarkAsSeenLocal} 
                    onAddToWatchlistClick={handleAddToWatchlistLocal} 
                    isSeen={seenList.some(seenItem => seenItem.id === item.id && seenItem.media_type === item.media_type )}
                    isWatchlisted={watchlist.some(watchItem => watchItem.id === item.id && watchItem.media_type === item.media_type)}
                  />
                ))}
              </div>
            ) : <p className="text-slate-400 text-center py-8">No TV show recommendations based on your ratings and selected filters. Try rating more shows or adjusting filters.</p>
          )}
           {isLoadingRecommendations && <LoadingSpinner />}
        </div>
      )}


      {/* MoviesOnly View */}
      {isMoviesOnlyView && !error && ( // Removed !isLoading from this outer condition
        moviesOnlyResults.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4">
            {moviesOnlyResults.map(item => (
              <MediaCard
                key={item.id}
                item={item} 
                onClick={handleMediaItemClick}
                onMarkAsSeenClick={handleMarkAsSeenLocal} 
                onAddToWatchlistClick={handleAddToWatchlistLocal} 
                isSeen={seenList.some(seenItem => seenItem.id === item.id && seenItem.media_type === item.media_type )}
                isWatchlisted={watchlist.some(watchItem => watchItem.id === item.id && watchItem.media_type === item.media_type)}
              />
            ))}
        </div>
        ) : (
          !isLoading && <p className="text-slate-400 text-center py-8">No movies found matching your criteria. Try a different search or adjust filters.</p> // Show "No results" only if NOT loading AND length is 0
        )
      )}

      {/* TVShowsOnly View */}
      {isTvShowsOnlyView && !error && ( // Removed !isLoading from this outer condition
        tvShowsOnlyResults.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4">
            {tvShowsOnlyResults.map(item => (
              <MediaCard
                key={item.id}
                item={item} 
                onClick={handleMediaItemClick}
                onMarkAsSeenClick={handleMarkAsSeenLocal} 
                onAddToWatchlistClick={handleAddToWatchlistLocal} 
                isSeen={seenList.some(seenItem => seenItem.id === item.id && seenItem.media_type === item.media_type )}
                isWatchlisted={watchlist.some(watchItem => watchItem.id === item.id && watchItem.media_type === item.media_type)}
              />
            ))}
          </div>
        ) : (
          !isLoading && <p className="text-slate-400 text-center py-8">No TV shows found matching your criteria. Try a different search or adjust filters.</p> // Show "No results" only if NOT loading AND length is 0
        )
      )}
      
      {/* Fallback for general results if specific views aren't active or for tabs like 'trending' if you bring them back as grids */}
      {!isRecommendationsView && !isMoviesOnlyView && !isTvShowsOnlyView && displayResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4">
          {displayResults.map(item => (
            <MediaCard
              key={item.id}
              item={item} 
              onClick={handleMediaItemClick}
              onMarkAsSeenClick={handleMarkAsSeenLocal} 
              onAddToWatchlistClick={handleAddToWatchlistLocal} 
              isSeen={seenList.some(seenItem => seenItem.id === item.id && seenItem.media_type === item.media_type )}
              isWatchlisted={watchlist.some(watchItem => watchItem.id === item.id && watchItem.media_type === item.media_type)}
            />
          ))}
        </div>
      )}

      {/* Load More Button/Observer - ensure it uses the correct list based on activeTab */}
      {!(activeTab === 'forYou') && ( // Simpler condition, always render for paginated tabs
        <div ref={loadMoreRef} className="h-10 w-full flex items-center justify-center">
          {!isLoading && currentPage < totalPages && ( // Button only appears if not loading AND there are actually more pages
          <button onClick={() => handlePageChange(currentPage + 1)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Load More</button>
          )}
          {isLoading && ( // Show a small spinner here when loading more items
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-slate-500"></div>
          )}
        </div>
      )}
    </div>
  );
}; // Add the closing brace and semicolon for ExplorePage

// --- Media Detail Page ---
const MediaDetailPage: React.FC<BasePageProps> = ({ userListService, onAddToWatchlist, onMarkAsSeen, onAddToList, seenList, watchlist, customLists }) => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [credits, setCredits] = useState<CreditsResponse | null>(null);
  const [tvSeasonDetails, setTvSeasonDetails] = useState<TVSeasonDetailsResponse | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [watchProviders, setWatchProviders] = useState<WatchProviderCountryResult | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Specifically for TV shows, to hold the full TMDBShow details including seasons
  const [currentShowDetails, setCurrentShowDetails] = useState<TMDBShow | null>(null);

  useEffect(() => {
    if (!id || !type || (type !== 'movie' && type !== 'tv')) {
      setError("Invalid ID or media type for MediaDetailPage.");
      setIsLoading(false);
      return;
    }
    const mediaTypeParam = type as 'movie' | 'tv';

    const fetchDetails = async () => {
      setIsLoading(true); setError(null); setTvSeasonDetails(null); setSelectedSeason(null); setWatchProviders(undefined); setCurrentShowDetails(null);
      try {
        const details = await tmdbService.getMediaDetails(Number(id), mediaTypeParam);
        setItem(details); // This will be MediaItem (TMDBMovie or TMDBShow)
        if (mediaTypeParam === 'tv' && details?.media_type === 'tv') {
          setCurrentShowDetails(details as TMDBShow); // Store full show details if it's a TV show
        }

        const [fetchedCredits, providers] = await Promise.all([
          tmdbService.getMediaCredits(Number(id), mediaTypeParam),
          tmdbService.getWatchProviders(Number(id), mediaTypeParam)
        ]);
        setCredits(fetchedCredits);
        if (providers.results && providers.results.US) {
          setWatchProviders(providers.results.US);
        } else {
            const availableRegion = Object.keys(providers.results)[0];
            if(availableRegion) setWatchProviders(providers.results[availableRegion]);
        }

        if (mediaTypeParam === 'tv' && details && details.media_type === 'tv' && (details as TMDBShow).seasons && (details as TMDBShow).seasons!.length > 0) {
          const showData = details as TMDBShow;
          const defaultSeason = showData.seasons!.find(s => s.season_number > 0 && s.episode_count > 0) || 
                                showData.seasons!.find(s => s.episode_count > 0) || 
                                showData.seasons![0];
          if (defaultSeason) handleSeasonChange(defaultSeason.season_number);
        }
      } catch (err) {
        console.error("Error fetching media details:", err);
        setError(err instanceof Error ? err.message : 'Failed to fetch media details.');
      }
      setIsLoading(false);
    };
    fetchDetails();
  }, [id, type]);

  const handleSeasonChange = async (seasonNumber: number) => {
    if (currentShowDetails?.id) { // Check currentShowDetails directly
      try {
        const seasonData = await tmdbService.getTVSeasonDetails(currentShowDetails.id, seasonNumber);
        if (seasonData) {
          setTvSeasonDetails(seasonData);
          setSelectedSeason(seasonNumber); // Also update selectedSeason state
        }
      } catch (error) {
        console.error('Error fetching season details:', error);
        setError('Failed to load season details.');
      }
    }
  };
  const handlePersonClick = (personId: number) => navigate(`/person/${personId}`);

  if (isLoading && !item) { /* Skeleton rendering */ return <div className="space-y-8 p-4"><Skeleton className="w-full h-64 md:h-96"/><div className="flex flex-col md:flex-row gap-6"><Skeleton className="w-1/2 md:w-1/3 h-auto aspect-[2/3]"/><div className="flex-grow space-y-4"><Skeleton variant="text" className="w-3/4 h-10"/><Skeleton variant="text" className="w-1/2 h-6"/><Skeleton variant="text" className="w-full h-5"/><Skeleton variant="text" className="w-full h-5"/><Skeleton variant="text" className="w-4/5 h-5"/></div></div><Skeleton variant="text" className="w-1/3 h-8 mb-3"/><div className="flex space-x-4 overflow-x-auto">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="w-32 h-52"/>)}</div></div> }
  if (error && !item) return <p className="text-red-400 bg-red-900/50 p-4 rounded-xl text-center">{error}</p>;
  if (!item) return <p className="text-center text-slate-500 py-10">Media not found.</p>;

  const title = item.title || item.name;
  const releaseYear = item.release_date?.substring(0, 4) || item.first_air_date?.substring(0, 4);
  const genresText = item.genres?.map(g => g.name).join(' / ') || 'N/A';
  const runtime = item.media_type === 'movie' ? (item as TMDBMovie).runtime : (item as TMDBShow).episode_run_time?.[0];
  const isCurrentlyWatchlisted = item.media_type && item.media_type !== 'person' ? userListService.isWatchlisted(item.id, item.media_type) : false;
  const seenInfo = item.media_type && item.media_type !== 'person' ? userListService.isSeen(item.id, item.media_type) : undefined;

  return (
    <div className="space-y-8">
      {item.backdrop_path && (<div className="relative h-56 md:h-96 -mx-3 sm:-mx-4 -mt-5 sm:-mt-6 rounded-b-xl overflow-hidden shadow-xl"><img src={`${TMDB_IMAGE_BASE_URL_ORIGINAL}${item.backdrop_path}`} alt={`${title} backdrop`} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div></div>)}
      <div className={`flex flex-col md:flex-row gap-6 md:gap-8 ${item.backdrop_path ? 'md:-mt-32 relative z-10' : ''}`}>
        <div className="w-1/2 md:w-1/3 lg:w-1/4 mx-auto md:mx-0 flex-shrink-0"><PosterImage path={item.poster_path} alt={title || "Poster"} className="rounded-xl shadow-2xl aspect-[2/3]" /></div>
        <div className="flex-grow space-y-3.5 text-center md:text-left pt-2">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-50">{title}</h1>
          <p className="text-slate-400 text-sm md:text-base">{releaseYear} &bull; {genresText} {runtime && `• ${runtime} min${item.media_type === 'tv' ? '/ep' : ''}`}</p>
          {item.original_language && <p className="text-slate-400 text-xs">Language: {item.original_language.toUpperCase()}</p>}
          {item.vote_average > 0 && (<div className="flex items-center justify-center md:justify-start text-sm text-slate-300"><StarIcon className="w-5 h-5 text-yellow-400 mr-1.5" /><span>{item.vote_average.toFixed(1)}/10 (TMDB)</span></div>)}
          <div className="flex flex-col sm:flex-row gap-3.5 justify-center md:justify-start pt-3">
            {!seenInfo && (<button onClick={() => onAddToWatchlist(item)} className={`flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg ${isCurrentlyWatchlisted ? 'bg-green-600 hover:bg-green-700' : `${ACCENT_COLOR_CLASS_BG} ${ACCENT_COLOR_CLASS_BG_HOVER}`} text-white transform hover:scale-105`}><AddIconAction className="w-5 h-5 mr-2"/> {isCurrentlyWatchlisted ? 'On Watchlist' : 'Add to Watchlist'}</button>)}
            <button onClick={() => onMarkAsSeen(item)} className={`flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg ${seenInfo ? 'bg-purple-600 hover:bg-purple-700' : 'bg-teal-600 hover:bg-teal-700'} text-white transform hover:scale-105`}><SeenIconAction className="w-5 h-5 mr-2"/> {seenInfo ? `Rated ${REACTION_EMOJIS[seenInfo.userReaction]}` : 'Mark as Seen'}</button>
            <button onClick={() => onAddToList(item)} className={`flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105`}><ListBulletIcon className="w-5 h-5 mr-2"/>Add to List</button>
          </div>
        </div>
      </div>
      {item.overview && (<div><h2 className={`text-xl font-semibold mb-2.5 ${ACCENT_COLOR_CLASS_TEXT}`}>Overview</h2><p className="text-slate-300 leading-relaxed text-sm md:text-base">{item.overview}</p></div>)}
      {seenInfo && seenInfo.userNotes && (<div><h2 className={`text-xl font-semibold mb-2.5 ${ACCENT_COLOR_CLASS_TEXT}`}>Your Notes</h2><p className="text-slate-300 leading-relaxed text-sm md:text-base bg-slate-800 p-4 rounded-lg border border-slate-700 whitespace-pre-wrap">{seenInfo.userNotes}</p></div>)}
      {isLoading && !watchProviders && <div><h2 className={`text-xl font-semibold mb-2.5 ${ACCENT_COLOR_CLASS_TEXT}`}>Where to Watch</h2><Skeleton className="w-full h-20"/></div> }
      {!isLoading && watchProviders && (<div><h2 className={`text-xl font-semibold mb-3 ${ACCENT_COLOR_CLASS_TEXT}`}>Where to Watch <span className="text-xs text-slate-500">(US)</span></h2><WatchProviderDisplay providers={watchProviders} itemTitle={title || 'this item'} /></div>)}
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
      {item.media_type === 'tv' && (item as TMDBShow).seasons && ((item as TMDBShow).seasons?.length ?? 0) > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-xl font-semibold ${ACCENT_COLOR_CLASS_TEXT}`}>Seasons & Episodes</h2>
            {((item as TMDBShow).seasons?.filter(s => s.episode_count > 0).length ?? 0) > 1 && 
              <select value={selectedSeason ?? ''} onChange={(e) => handleSeasonChange(Number(e.target.value))} className={`p-2.5 bg-slate-700 text-slate-200 rounded-lg border border-slate-600 focus:ring-2 ${ACCENT_COLOR_CLASS_RING} ${ACCENT_COLOR_CLASS_BORDER} outline-none text-sm transition-colors`} aria-label="Select TV Season">
                <option value="" disabled>Select a season</option>
                {(item as TMDBShow).seasons!.filter(s => s.episode_count > 0 && (s.season_number > 0 || (((item as TMDBShow).seasons!.length === 1 && s.season_number === 0)))).sort((a,b) => a.season_number - b.season_number)
                  .map(season => (<option key={season.id} value={season.season_number}>{season.name} ({season.episode_count} ep)</option>))}
              </select>}
          </div>
          {isLoading && !tvSeasonDetails && (<div className="space-y-4">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="w-full h-28 rounded-xl" />)}</div>)}
          {!isLoading && tvSeasonDetails && tvSeasonDetails.episodes.length > 0 && (<div className="space-y-4">{tvSeasonDetails.episodes.map(episode => <EpisodeCard key={episode.id} episode={episode} />)}</div>)}
          {!isLoading && tvSeasonDetails && tvSeasonDetails.episodes.length === 0 && (<p className="text-slate-500">No episode information available for this season.</p>)}
          {!isLoading && selectedSeason !== null && !tvSeasonDetails && error && (<p className="text-red-400 bg-red-900/50 p-4 rounded-xl">{error}</p>)}
        </div>
      )}
    </div>
  );
};

interface MyListsPageProps extends BasePageProps { openCreateListModal: () => void; }
const MyListsPage: React.FC<MyListsPageProps> = ({ watchlist, customLists, onRemoveFromWatchlist, openCreateListModal, setCustomLists, seenList: globalSeenList }) => { // Renamed seenList to globalSeenList
  type MyListsTab = 'ranking' | 'watchlist' | 'custom' | 'allseen';
  const [activeTab, setActiveTab] = useState<MyListsTab>('ranking');
  const navigate = useNavigate(); // Added useNavigate

  const [filterOptions, setFilterOptions] = useState({ mediaType: 'all', reaction: 'all', genre: 'all', runtime: 'all', provider: undefined as number | undefined });
  const [sortOption, setSortOption] = useState('personalScore_desc');
  const [genres, setGenres] = useState<TMDBGenre[]>([]);

  // Added missing state and ref for ranking pagination
  const [rankingPage, setRankingPage] = useState(1);
  const [paginatedRanking, setPaginatedRanking] = useState<RankedItem[]>([]);
  const [isLoadingMoreRanking, setIsLoadingMoreRanking] = useState(false);
  const rankingItemsPerPage = 20; // Define how many items per page for ranking
  const rankingLoadMoreRef = useRef<HTMLDivElement | null>(null);


  const seenListForRanking = useMemo(() => {
    return globalSeenList
      .map(item => ({
        ...item,
        personalScore: userListService.calculatePersonalScore(
          // userListService.getRankInReactionBucket(item.id, item.media_type, item.userReaction),
          0, // Placeholder for rank
          // userListService.getTotalInReactionBucket(item.media_type, item.userReaction),
          1, // Placeholder for total in bucket
          item.userReaction
        ),
        // rank: userListService.getRankInReactionBucket(item.id, item.media_type, item.userReaction)
        rank: 0 // Placeholder for rank
      }))
      .filter(item => item.personalScore > 0); // Filter out items with no score if needed
  }, [globalSeenList]);

  const tabs: { id: MyListsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'ranking', label: 'My Seen Ranking', icon: <TrophyIcon className="w-5 h-5 mr-2" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <BookmarkIcon className="w-5 h-5 mr-2" /> },
    { id: 'custom', label: 'Custom Lists', icon: <RectangleStackIcon className="w-5 h-5 mr-2" /> },
    // { id: 'allseen', label: 'All Seen (No Rank)', icon: <SeenIconAction className="w-5 h-5 mr-2" /> },
  ];

  useEffect(() => {
    const fetchGenres = async () => {
      const movieGenres = await tmdbService.getMovieGenres();
      const tvGenres = await tmdbService.getTvGenres();
      const uniqueGenres = [...movieGenres, ...tvGenres].filter((genre, index, self) => 
        index === self.findIndex((g) => g.id === genre.id && g.name === genre.name)
      );
      setGenres(uniqueGenres);
    };
    fetchGenres();
  }, []);
  
  const handleFilterChange = (type: keyof typeof filterOptions, value: string) => {
    setFilterOptions(prev => ({ ...prev, [type]: value }));
    setRankingPage(1); 
    setPaginatedRanking([]); 
  };

  const getSortedAndFilteredItems = (
    items: RankedItem[], // Changed from RatedItem[] to RankedItem[] as this is used for ranking
    sortOption: string,
    filterOptions: { mediaType: string; reaction: string; genre: string; runtime: string; provider?: number }
  ): RankedItem[] => { // Return type is RankedItem[]
    let processedItems = [...items];

    if (filterOptions.mediaType !== 'all') {
      processedItems = processedItems.filter(item => item.media_type === filterOptions.mediaType);
    }
    if (filterOptions.reaction !== 'all') {
      processedItems = processedItems.filter(item => item.userReaction === filterOptions.reaction);
    }
    if (filterOptions.genre !== 'all') {
      processedItems = processedItems.filter(item => item.genres?.some(g => g.id === parseInt(filterOptions.genre)));
    }
    if (filterOptions.runtime !== 'all') {
      processedItems = processedItems.filter(item => getRuntimeCategory(item) === filterOptions.runtime);
    }

    switch (sortOption) {
      case 'personalScore_desc':
        processedItems.sort((a, b) => (b.personalScore ?? 0) - (a.personalScore ?? 0));
        break;
      case 'personalScore_asc':
        processedItems.sort((a, b) => (a.personalScore ?? 0) - (b.personalScore ?? 0));
        break;
      case 'ratedAt_desc':
        processedItems.sort((a, b) => new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime());
        break;
      case 'ratedAt_asc':
        processedItems.sort((a, b) => new Date(a.ratedAt).getTime() - new Date(b.ratedAt).getTime());
        break;
      default:
        break;
    }
    return processedItems;
  };
  
  const rankedItems = useMemo(() => {
    const allRankedFromService = userListService.getRankedList('all', 'all');
    return getSortedAndFilteredItems(allRankedFromService, sortOption, filterOptions);
  }, [globalSeenList, sortOption, filterOptions]);

  const loadMoreRankingItems = useCallback(() => {
    if (isLoadingMoreRanking || paginatedRanking.length >= rankedItems.length) return;
    setIsLoadingMoreRanking(true);
    const nextPage = rankingPage + 1;
    const newItems = rankedItems.slice(0, nextPage * rankingItemsPerPage);
    setPaginatedRanking(newItems);
    setRankingPage(nextPage);
    setIsLoadingMoreRanking(false);
  }, [isLoadingMoreRanking, paginatedRanking.length, rankedItems, rankingPage, rankingItemsPerPage]);

  useEffect(() => {
    setPaginatedRanking(rankedItems.slice(0, rankingPage * rankingItemsPerPage));
  }, [rankedItems, rankingPage, rankingItemsPerPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoadingMoreRanking && paginatedRanking.length < rankedItems.length) {
          loadMoreRankingItems();
        }
      },
      { threshold: 1.0 }
    );
    const currentRef = rankingLoadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loadMoreRankingItems, isLoadingMoreRanking, paginatedRanking, rankedItems]);

  const generateStats = (items: (RatedItem | WatchlistItem | RankedItem)[]) => {
    if (!items || items.length === 0) return { total: 0, movies: 0, shows: 0, averageScore: 0, byReaction: {} };
    const total = items.length;
    const movies = items.filter(i => i.media_type === 'movie').length;
    const shows = items.filter(i => i.media_type === 'tv').length;
    
    const ratedItemsForScore = items.filter(item => typeof (item as RankedItem).personalScore === 'number') as RankedItem[];
    const totalScore = ratedItemsForScore.reduce((acc, item) => acc + (item.personalScore || 0), 0);
    const averageScore = ratedItemsForScore.length > 0 ? parseFloat((totalScore / ratedItemsForScore.length).toFixed(1)) : 0;

    const byReaction = items.reduce((acc, item) => {
      if ('userReaction' in item && item.userReaction) {
        const reaction = item.userReaction as Reaction;
        acc[reaction] = (acc[reaction] || 0) + 1;
      }
      return acc;
    }, {} as Record<Reaction, number>);
    return { total, movies, shows, averageScore, byReaction };
  };
  
  const watchlistStats = generateStats(watchlist);
  const rankingStats = generateStats(rankedItems);

  const handleCardClick = (item: MediaItem | RankedItem | PersonCreditItem) => {
    if ('media_type' in item && item.media_type && (item.media_type === 'movie' || item.media_type === 'tv')) {
      navigate(`/media/${item.media_type}/${item.id}`);
    }
  };

  const handleCustomListClick = (listId: string) => navigate(`/mylists/${listId}`);
  const handleDeleteCustomList = (listId: string) => { if(window.confirm("Are you sure you want to delete this list?")) setCustomLists(userListService.deleteCustomList(listId)); };

  const TABS = [
    { id: 'ranking', label: 'My Seen Ranking', icon: <TrophyIcon className="w-5 h-5 mr-2" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <BookmarkIcon className="w-5 h-5 mr-2" /> },
    { id: 'custom', label: 'Custom Lists', icon: <RectangleStackIcon className="w-5 h-5 mr-2" /> },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'watchlist':
  return (
          <div className="space-y-4">
            {watchlist.length > 0 ? watchlist.map(item => (
              <div key={`${item.id}-${item.media_type}`} className="flex items-center bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-700">
                <PosterImage path={item.poster_path} alt={item.title || item.name || "Poster"} className="w-16 h-24 object-cover rounded-md mr-4 flex-shrink-0" />
                <div className="flex-grow min-w-0">
                  <h3 className="text-md font-semibold text-slate-100 truncate cursor-pointer hover:text-cyan-400" onClick={() => handleCardClick(item)} role="button">{item.title || item.name}</h3>
                  <p className="text-xs text-slate-400">{item.media_type === 'movie' ? 'Movie' : 'TV Show'} &bull; Added: {new Date(item.addedAt).toLocaleDateString()}</p>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">{item.overview}</p>
                </div>
                <button onClick={() => onRemoveFromWatchlist(item.id, item.media_type as 'movie'|'tv')} className="ml-3 p-2 text-red-500 hover:text-red-400 transition-colors rounded-md hover:bg-slate-700 flex-shrink-0">
                  <TrashIcon className="w-5 h-5" />
          </button>
      </div>
            )) : <p className="text-slate-400 text-center py-8">Your watchlist is empty. Add some movies or shows!</p>}
      </div>
        );
      case 'ranking':
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
              <div>
                <label htmlFor="sortOption" className="block text-xs font-medium text-slate-400 mb-1">Sort By</label>
                <select id="sortOption" value={sortOption} onChange={e => setSortOption(e.target.value as typeof sortOption)} className="w-full p-2 bg-slate-700 text-slate-200 rounded-md border border-slate-600 text-sm focus:ring-1 focus:ring-cyan-500">
                  <option value="personalScore_desc">Score: High to Low</option>
                  <option value="personalScore_asc">Score: Low to High</option>
                  <option value="ratedAt_desc">Date Rated: Newest</option>
                  <option value="ratedAt_asc">Date Rated: Oldest</option>
                </select>
          </div>
              <div>
                <label htmlFor="mediaTypeFilter" className="block text-xs font-medium text-slate-400 mb-1">Media Type</label>
                <select id="mediaTypeFilter" value={filterOptions.mediaType} onChange={e => handleFilterChange('mediaType', e.target.value)} className="w-full p-2 bg-slate-700 text-slate-200 rounded-md border border-slate-600 text-sm focus:ring-1 focus:ring-cyan-500">
                  <option value="all">All</option>
                  <option value="movie">Movies</option>
                  <option value="tv">TV Shows</option>
                </select>
            </div>
              <div>
                <label htmlFor="reactionFilter" className="block text-xs font-medium text-slate-400 mb-1">Your Reaction</label>
                <select id="reactionFilter" value={filterOptions.reaction} onChange={e => handleFilterChange('reaction', e.target.value)} className="w-full p-2 bg-slate-700 text-slate-200 rounded-md border border-slate-600 text-sm focus:ring-1 focus:ring-cyan-500">
                  <option value="all">All Reactions</option>
                  {Object.values(Reaction).map(r => <option key={r} value={r}>{REACTION_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="genreFilter" className="block text-xs font-medium text-slate-400 mb-1">Genre</label>
                <select id="genreFilter" value={filterOptions.genre} onChange={e => handleFilterChange('genre', e.target.value)} className="w-full p-2 bg-slate-700 text-slate-200 rounded-md border border-slate-600 text-sm focus:ring-1 focus:ring-cyan-500">
                  <option value="all">All Genres</option>
                  {genres.map(genre => <option key={genre.id} value={genre.id.toString()}>{genre.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700"><p className={`text-xl font-bold ${ACCENT_COLOR_CLASS_TEXT}`}>{rankingStats.total}</p><p className="text-xs text-slate-400">Total Rated</p></div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700"><p className={`text-xl font-bold ${ACCENT_COLOR_CLASS_TEXT}`}>{rankingStats.movies}</p><p className="text-xs text-slate-400">Movies</p></div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700"><p className={`text-xl font-bold ${ACCENT_COLOR_CLASS_TEXT}`}>{rankingStats.shows}</p><p className="text-xs text-slate-400">TV Shows</p></div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700"><p className={`text-xl font-bold ${ACCENT_COLOR_CLASS_TEXT}`}>{rankingStats.averageScore || 'N/A'}</p><p className="text-xs text-slate-400">Avg. Score</p></div>
            </div>

            {paginatedRanking.length > 0 ? (
            <div className="space-y-4">
                {paginatedRanking.map((item) => (
                  <RatedMediaCard key={`${item.id}-${item.media_type}-${item.userReaction}`} item={item} onClick={() => handleCardClick(item)} />
              ))}
                {paginatedRanking.length < rankedItems.length && (
                   <div ref={rankingLoadMoreRef} className="flex justify-center py-4">
                    {isLoadingMoreRanking ? <LoadingSpinner /> : <button onClick={loadMoreRankingItems} className="text-cyan-400 hover:text-cyan-300 font-medium">Load More</button>}
            </div>
          )}
        </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No items match your current filters, or you haven't rated anything yet.</p>
            )}
              </div>
        );
      case 'custom':
        return (
          <div className="space-y-5">
            <button onClick={openCreateListModal} className={`w-full flex items-center justify-center py-3 px-4 ${ACCENT_COLOR_CLASS_BG} ${ACCENT_COLOR_CLASS_BG_HOVER} text-white font-semibold rounded-lg transition-colors`}>
              <PlusCircleIcon className="w-5 h-5 mr-2" /> Create New List
            </button>
            {customLists.length > 0 ? customLists.map(list => (
              <div key={list.id} className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 onClick={() => handleCustomListClick(list.id)} className="text-lg font-semibold text-slate-100 hover:text-cyan-400 cursor-pointer inline-block">{list.name}</h3>
                    {list.description && <p className="text-xs text-slate-400 mt-0.5">{list.description}</p>}
        </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => navigate(`/mylists/${list.id}?edit=true`)} className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors rounded-md hover:bg-slate-700"><PencilIcon className="w-4 h-4"/></button>
                    <button onClick={() => handleDeleteCustomList(list.id)} className="p-1.5 text-red-500 hover:text-red-400 transition-colors rounded-md hover:bg-slate-700"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                        </div>
                <p className="text-xs text-slate-500">
                  {list.items.length} item{list.items.length !== 1 ? 's' : ''} &bull; 
                  Last updated: {new Date(list.updatedAt).toLocaleDateString()}
                </p>
                {list.items.length > 0 && (
                  <div className="mt-3 flex -space-x-3 overflow-hidden">
                    {list.items.slice(0, 5).map(item => (
                       <div key={`${item.id}-${item.media_type}`} className="w-10 h-14 rounded border-2 border-slate-700 overflow-hidden flex-shrink-0 bg-slate-700">
                         <PosterImage path={item.poster_path} alt={item.title || item.name || ""} className="w-full h-full object-cover"/>
                    </div>
                    ))}
                    {list.items.length > 5 && <span className="flex items-center justify-center w-10 h-14 rounded-full bg-slate-600 text-xs text-slate-300 border-2 border-slate-700 z-10">+{list.items.length - 5}</span>}
                        </div>
                    )}
                </div>
            )) : <p className="text-slate-400 text-center py-8">You haven't created any custom lists yet.</p>}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Lists</h1>
      </div>

      <div className="border-b border-slate-700">
        <nav className="-mb-px flex space-x-1 sm:space-x-3" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'watchlist' | 'ranking' | 'custom')}
              className={`whitespace-nowrap py-3 px-2 sm:px-4 border-b-2 font-medium text-sm flex items-center transition-colors
                ${activeTab === tab.id
                  ? `${ACCENT_COLOR_CLASS_BORDER} ${ACCENT_COLOR_CLASS_TEXT}`
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
        </div>
      
      <div>{renderTabContent()}</div>
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
interface PersonDetailPageProps {} // Removed unused BasePageProps

const PersonDetailPage: React.FC<PersonDetailPageProps> = () => { // Removed unused props from destructuring
  const { personId } = useParams<{ personId: string }>();
  const [personDetails, setPersonDetails] = useState<PersonDetails | null>(null);
  const [personCredits, setPersonCredits] = useState<PersonCombinedCreditsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!personId) {
      setError("Invalid Person ID.");
      setIsLoading(false);
      return;
    }
    const fetchDetails = async () => {
      setIsLoading(true); setError(null);
      try {
        const [details, fetchedCredits] = await Promise.all([
          tmdbService.getPersonDetails(Number(personId)),
          tmdbService.getPersonCombinedCredits(Number(personId))
        ]);
        setPersonDetails(details || null);
        setPersonCredits(fetchedCredits || null);
      } catch (err) {
        console.error("Error fetching person details:", err);
        setError(err instanceof Error ? err.message : 'Failed to fetch person details.');
      }
      setIsLoading(false);
    };
    fetchDetails();
  }, [personId]);

  const handleMediaItemClick = (item: MediaItem | PersonCreditItem) => {
    // Check if it's a PersonCreditItem first, then if it's a MediaItem
    if ('media_type' in item && (item.media_type === 'movie' || item.media_type === 'tv')) {
      navigate(`/media/${item.media_type}/${item.id}`);
    } 
    // No navigation for 'person' type from here as we are already on a person's page
    // or if it's a PersonDetails type which doesn't have media_type.
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div></div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!personDetails) return <div className="text-center py-10">No details available for this person.</div>;

  return (
    <div className="container mx-auto px-4 py-8 text-slate-100">
      <div className="md:flex mb-8">
        <div className="md:w-1/3 mb-6 md:mb-0 md:mr-8 flex-shrink-0">
          <PosterImage 
            path={personDetails?.profile_path || null}
            alt={personDetails?.name || 'Person'}
            className="w-full h-auto object-cover rounded-lg shadow-xl" 
            iconType='person'
            size="w500"
          />
        </div>
        <div className="md:w-2/3">
          <h1 className="text-4xl font-bold mb-2">{personDetails?.name}</h1>
          <h2 className="text-xl font-semibold mb-2 mt-4">Biography</h2>
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap line-clamp-[8] hover:line-clamp-none transition-all duration-300">
            {personDetails?.biography || 'No biography available.'}
          </p>
          {personDetails && (
            <div className="mt-4 space-y-1 text-sm">
              {personDetails.birthday && <p><strong className="text-slate-400">Born:</strong> {new Date(personDetails.birthday).toLocaleDateString()} {personDetails.place_of_birth && `in ${personDetails.place_of_birth}`}</p>}
              {personDetails.deathday && <p><strong className="text-slate-400">Died:</strong> {new Date(personDetails.deathday).toLocaleDateString()}</p>}
              {personDetails.known_for_department && <p><strong className="text-slate-400">Known for:</strong> {personDetails.known_for_department}</p>}
      </div>
          )}
        </div>
      </div>

      {personCredits?.cast && personCredits.cast.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Known For (Cast)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
            {personCredits.cast.slice(0,18).map((creditItem) => (
              <MediaCard 
                key={creditItem.credit_id || creditItem.id} 
                item={creditItem} 
                onClick={() => handleMediaItemClick(creditItem)} 
                context="personCredits"
              />
            ))}
          </div>
        </div>
      )}
      
      {personCredits?.crew && personCredits.crew.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Known For (Crew)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
            {personCredits.crew.filter(c => !!c.job).slice(0,12).map((creditItem) => (
              <MediaCard 
                key={creditItem.credit_id || creditItem.id} 
                item={creditItem} 
                onClick={() => handleMediaItemClick(creditItem)} 
                context="personCredits"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Feed Page ---
interface FeedPageProps extends Omit<BasePageProps, 'onAddToWatchlist' | 'onMarkAsSeen' | 'onAddToList'> { 
  currentUser: UserProfile; 
}
const FeedPage: React.FC<FeedPageProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const handleCardClick = (item: MediaItem) => { if (item.media_type) navigate(`/media/${item.media_type}/${item.id}`); };
  const [feedItems, setFeedItems] = useState(mockFeedItems); 

  return (
    <div className="space-y-6">
      {/* Original feed rendering logic */}
      {feedItems.length === 0 ? (
        <p className="text-center text-slate-500 py-10">No activity yet. Follow some friends or rate some items!</p>
      ) : (
        <div className="space-y-5 max-w-2xl mx-auto"> {/* Centered feed content */}
          {feedItems.map(feedItem => (
            <FeedCard 
                key={feedItem.id} 
                feedItem={feedItem} 
                currentUser={currentUser}
                onCardClick={handleCardClick} // Changed from onMediaClick
            />
          ))}
        </div>
      )}
      <p className="text-center text-xs text-slate-600 pt-6">Feed content is currently mocked. A real backend would power this.</p>
    </div>
  );
};

// --- Profile Page ---
const ProfilePage: React.FC<BasePageProps> = ({ seenList, watchlist, userListService }) => {
    const navigate = useNavigate();
    const { user, signOut, loading: authLoading, error: authError, updateAnonymousUserToEmailPassword, linkOAuthToAnonymousUser } = useAuth();
    const [conversionEmail, setConversionEmail] = useState('');
    const [conversionPassword, setConversionPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [conversionError, setConversionError] = useState<string | null>(null);
    const [conversionLoading, setConversionLoading] = useState(false);

    useEffect(() => {
      if (!authLoading && !user) {
        navigate('/login');
      }
    }, [authLoading, user, navigate]);

    const handleSignOut = async () => {
      try {
        await signOut();
        navigate('/login');
      } catch (error) {
        console.error("Error signing out: ", error);
      }
    };

    const handleCardClick = (item: MediaItem | RankedItem) => {
        if (item.media_type) navigate(`/media/${item.media_type}/${item.id}`);
    };
    
    const handleConvertToEmailPassword = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!conversionEmail || !conversionPassword) {
        setConversionError("Email and password are required.");
        return;
      }
      if (conversionPassword.length < 6) {
        setConversionError("Password must be at least 6 characters long.");
        return;
      }
      setConversionError(null);
      setConversionLoading(true);
      const { error } = await updateAnonymousUserToEmailPassword(conversionEmail, conversionPassword);
      setConversionLoading(false);
      if (error) {
        setConversionError(error.message);
      } else {
        alert("Account successfully converted! You can now sign in with your email and password.");
        setConversionEmail('');
        setConversionPassword('');
      }
    };

    const handleLinkGoogle = async () => {
      setConversionError(null);
      setConversionLoading(true);
      const { error } = await linkOAuthToAnonymousUser('google');
      setConversionLoading(false);
      if (error) {
        setConversionError(error.message);
      }
      // On success, Supabase handles redirection and session update.
    };

    if (authLoading) return <LoadingSpinner />; // Removed size prop
    if (!user) return null;
    
    const initials = user.email?.substring(0, 2).toUpperCase() || user.user_metadata?.username?.substring(0,2).toUpperCase() || '??';
    const displayName = user.user_metadata?.username || user.email || (user.is_anonymous ? 'Anonymous User' : 'User');
    const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';

    return (
    <div className="space-y-8">
      {/* User Info Header */}
      <div className="flex items-center space-x-4 p-1">
        {user.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt={displayName} className="w-20 h-20 rounded-full object-cover border-2 border-slate-600 shadow-md" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-300 border-2 border-slate-600 shadow-md">
            {initials}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">{displayName}</h1>
          <p className="text-sm text-slate-400">Member since {memberSince} &bull; {seenList.length} items rated {user.is_anonymous && <span className="ml-2 px-2 py-0.5 bg-sky-600 text-sky-100 text-xs rounded-full">ANONYMOUS</span>}</p>
        </div>
      </div>
      
      {/* Account Conversion Section for Anonymous Users */}
      {user.is_anonymous && (
        <div className="bg-slate-800/70 p-6 rounded-xl border border-slate-700 shadow-lg space-y-5">
          <h2 className={`text-xl font-semibold ${ACCENT_COLOR_CLASS_TEXT} mb-3`}>Convert to Permanent Account</h2>
          <p className="text-sm text-slate-300 mb-4">
            Secure your account and access it from any device by adding an email/password or linking a Google account.
          </p>

          {conversionError && <p className="text-red-400 bg-red-900/30 p-3 rounded-md text-sm mb-3">{conversionError}</p>}
          
          <form onSubmit={handleConvertToEmailPassword} className="space-y-4">
            <div>
              <label htmlFor="conversionEmail" className="block text-sm font-medium text-slate-300 mb-1">New Email</label>
              <input type="email" id="conversionEmail" value={conversionEmail} onChange={(e) => setConversionEmail(e.target.value)} required className="w-full p-2.5 bg-slate-700/80 text-slate-100 rounded-md border border-slate-600 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-400" placeholder="you@example.com" disabled={conversionLoading}/>
            </div>
            <div>
              <label htmlFor="conversionPassword" className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
              <div className="relative">
                <input type={isPasswordVisible ? "text" : "password"} id="conversionPassword" value={conversionPassword} onChange={(e) => setConversionPassword(e.target.value)} required minLength={6} className="w-full p-2.5 bg-slate-700/80 text-slate-100 rounded-md border border-slate-600 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-400" placeholder="•••••••• (min. 6 characters)" disabled={conversionLoading}/>
                <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-sm text-slate-400 hover:text-slate-200" disabled={conversionLoading}>
                  {isPasswordVisible ? <EyeIcon className="h-5 w-5"/> : <LocalEyeSlashIcon className="h-5 w-5"/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={conversionLoading} className={`w-full flex items-center justify-center py-2.5 px-4 rounded-md text-sm font-semibold text-white ${ACCENT_COLOR_CLASS_BG} ${ACCENT_COLOR_CLASS_BG_HOVER} disabled:opacity-60 disabled:cursor-not-allowed`}>
              {conversionLoading && <LoadingSpinner className="mr-2 h-5 w-5" />}
              <LocalEmailIcon className="w-5 h-5 mr-2" /> Convert with Email/Password
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-600" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-800 text-slate-400">OR</span></div>
          </div>

          <button onClick={handleLinkGoogle} disabled={conversionLoading} className="w-full flex items-center justify-center py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-md shadow-sm transition-colors duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed">
            {conversionLoading && <LoadingSpinner className="mr-2 h-5 w-5" />}
            <LocalGoogleIcon className="w-5 h-5 mr-2" /> Link with Google
          </button>
        </div>
      )}

      {/* Sign Out Button */}
      <button 
        onClick={handleSignOut} 
        disabled={authLoading}
        className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-4 mb-6 text-sm">
        {authLoading ? 'Signing out...' : 'Sign Out'}
      </button>

      {/* Stats Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
          <p className={`text-3xl font-bold ${ACCENT_COLOR_CLASS_TEXT}`}>{seenList.length}</p>
          <p className="text-xs text-slate-400 uppercase">Total Items Rated</p>
            </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
          <p className={`text-3xl font-bold ${ACCENT_COLOR_CLASS_TEXT}`}>{watchlist.length}</p>
          <p className="text-xs text-slate-400 uppercase">On Watchlist</p>
            </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md col-span-2 sm:col-span-1">
          <p className={`text-3xl font-bold ${ACCENT_COLOR_CLASS_TEXT}`}>{userListService.calculateWeeklyStreak()} Day{userListService.calculateWeeklyStreak() !== 1 ? 's' : ''}</p>
          <p className="text-xs text-slate-400 uppercase">Rating Streak</p>
                </div>
            </div>

      {/* Recent Activity Section */}
      <div>
        <h2 className="text-xl font-semibold text-slate-200 mb-3">Recent Activity</h2>
        <div className="space-y-4">
          {userListService.getRankedList()
            .sort((a, b) => new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime())
            .slice(0, 5)
            .map(item => (
              <RatedMediaCard key={`${item.id}-${item.media_type}`} item={item} onClick={handleCardClick} />
            ))}
        </div>
      </div>

      <p className="text-center text-xs text-slate-600 pt-6">More profile features coming soon!</p>
    </div>
  );
};

// Simple Loading Spinner Component
const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex justify-center items-center py-10 ${className || ''}`.trim()}>
    <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 ${className ? 'h-5 w-5' : ''}`.trim()}></div>
  </div>
);

// --- SVG Icon Definitions for ProfilePage (local to App.tsx) ---

const LocalGoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    <path d="M1 1h22v22H1z" fill="none"/>
  </svg>
);

const LocalEyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
  </svg>
);

const LocalEmailIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

export default App;
