import { MediaItem, UserProfile, FeedItem, Reaction, FeedActivityType, TMDBMovie, TMDBShow, RatedItem, TMDBGenre, CreditsResponse, CastMember, CrewMember, TMDBSeasonSummary, TVSeasonDetailsResponse, Episode, CustomList, CustomListMediaItem, PersonDetails, PersonCombinedCreditsResponse, PersonCreditItem, FeedComment } from './types';
import { getRuntimeCategory } from './services'; // Keep this import
import { DEFAULT_USER_ID } from './constants'; // For custom lists

export const mockUser: UserProfile = {
  id: DEFAULT_USER_ID, // Use consistent ID for user-specific data
  handle: 'CinephileChris',
  avatarUrl: 'https://picsum.photos/seed/chris/100/100',
};

export const mockFriendUser: UserProfile = {
  id: 'mockFriend456',
  handle: 'MovieMavenMaria',
  avatarUrl: 'https://picsum.photos/seed/maria/100/100',
};

export const mockUserAlex: UserProfile = {
  id: 'mockUserAlex789',
  handle: 'AlexPlays',
  avatarUrl: 'https://picsum.photos/seed/alex/100/100',
};

export const mockUserSam: UserProfile = {
  id: 'mockUserSam101',
  handle: 'SamWatches',
  avatarUrl: 'https://picsum.photos/seed/sam/100/100',
};

const mockMovieGenres: TMDBGenre[] = [{ id: 18, name: 'Drama' }];
const mockShowGenres: TMDBGenre[] = [{ id: 18, name: 'Drama' }, {id: 80, name: 'Crime'}];

export const mockMovie1: TMDBMovie = {
  id: 550,
  title: 'Fight Club',
  overview: 'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy. Their concept catches on, with underground "fight clubs" forming in every town, until soapstad flies way too far out of control and ignites an urban inferno.',
  poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  backdrop_path: '/hZkgoQYus5vegHoetLkCJbx1cl.jpg',
  vote_average: 8.4,
  release_date: '1999-10-15',
  genres: mockMovieGenres,
  runtime: 139,
  media_type: 'movie',
  original_language: 'en',
  popularity: 61.103,
};

export const mockMovie2: TMDBMovie = {
  id: 680,
  title: 'Pulp Fiction',
  overview: "A burger-loving hit man, his philosophical partner, a drug-addled gangster's moll and a washed-up boxer converge in this sprawling, comedic crime caper. Their adventures unfurl in three stories that ingeniously trip over each other.",
  poster_path: '/d5iIlFn5s0ImszYzBPb8KpgAUvW.jpg',
  backdrop_path: '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg',
  vote_average: 8.5,
  release_date: '1994-09-10',
  genres: [{ id: 53, name: 'Thriller' } as TMDBGenre, { id: 80, name: 'Crime' } as TMDBGenre],
  runtime: 154,
  media_type: 'movie',
  original_language: 'en',
  popularity: 70.78,
};

export const mockShow1Seasons: TMDBSeasonSummary[] = [
  { air_date: "2008-01-20", episode_count: 7, id: 3572, name: "Season 1", overview: "High school chemistry teacher Walter White's life is thrown into turmoil when he is diagnosed with stage III lung cancer. Desperate to secure his family's financial future, he teams up with former student Jesse Pinkman to cook and sell high-quality methamphetamine.", poster_path: "/1BP4xYv9ZG4ZVHkL0KMtHkAbhN6.jpg", season_number: 1 },
  { air_date: "2009-03-08", episode_count: 13, id: 3573, name: "Season 2", overview: "Walt and Jesse's meth business expands, attracting unwanted attention from drug lord Tuco Salamanca and the DEA. Skyler becomes suspicious of Walt's behavior, while Jesse falls for his landlord, Jane Margolis.", poster_path: "/e3NBFPkC7rS9vYhN7xVN0u2N03i.jpg", season_number: 2 },
];


export const mockShow1: TMDBShow = {
  id: 1396,
  name: 'Breaking Bad',
  overview: 'When Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live. He becomes filled with a sense of fearlessness and an unrelenting desire to secure his family\'s financial future at any cost as he enters the dangerous world of drugs and crime.',
  poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  backdrop_path: '/tsRy63Mu59QlA9Ped6ettqUCSbt.jpg',
  vote_average: 8.8,
  first_air_date: '2008-01-20',
  genres: mockShowGenres,
  episode_run_time: [45, 55],
  media_type: 'tv',
  seasons: mockShow1Seasons,
  number_of_seasons: 5,
  number_of_episodes: 62,
  original_language: 'en',
  popularity: 200.85,
};

export const mockRatedItem1: RatedItem = {
  ...mockMovie1,
  userReaction: Reaction.Liked,
  ratedAt: new Date('2023-10-01T10:00:00Z').toISOString(),
  genres: mockMovie1.genres || [],
  original_language: mockMovie1.original_language || 'en',
  runtimeCategory: getRuntimeCategory(mockMovie1),
  userNotes: "Absolutely mind-blowing! A modern classic."
};

export const mockRatedItem2: RatedItem = {
  ...mockShow1,
  userReaction: Reaction.Liked, // Changed to Liked for recommendation example
  ratedAt: new Date('2023-09-15T14:30:00Z').toISOString(),
  genres: mockShow1.genres || [],
  original_language: mockShow1.original_language || 'en',
  runtimeCategory: getRuntimeCategory(mockShow1),
  userNotes: "Incredible series, compelling from start to finish."
};

export const mockSearchResults: MediaItem[] = [
  mockMovie1,
  mockShow1,
  mockMovie2,
  {
    id: 76600,
    title: 'Avatar: The Way of Water',
    overview: 'Set more than a decade after the events of the first film, learn the story of the Sully family (Jake, Neytiri, and their kids), the trouble that follows them, the lengths they go to keep each other safe, the battles they fight to stay alive, and the tragedies they endure.',
    poster_path: '/t6HIqrRAclMCA60HoHIRpalkeA.jpg',
    backdrop_path: '/s16H6tpK2utvwDtzZ8Qy4qm5Emw.jpg',
    vote_average: 7.7,
    release_date: '2022-12-14',
    media_type: 'movie',
    genres: [{ id: 878, name: 'Science Fiction'} as TMDBGenre, {id: 28, name: 'Action'} as TMDBGenre, {id: 12, name: 'Adventure'} as TMDBGenre]
  },
];

// --- Mock Comments ---
export const mockComments: FeedComment[] = [
    { id: 'comment1', user: mockUser, text: "Totally agree, this was amazing!", timestamp: new Date('2023-10-25T10:05:00Z').toISOString()},
    { id: 'comment2', user: mockFriendUser, text: "Right?! So glad I watched it.", timestamp: new Date('2023-10-25T10:10:00Z').toISOString()},
    { id: 'commentAlexOnFeed1', user: mockUserAlex, text: "Pulp Fiction is a classic! Great choice.", timestamp: new Date('2023-10-25T12:00:00Z').toISOString()},
];


export const mockFeedItems: FeedItem[] = [
  {
    id: 'feed1',
    user: mockFriendUser,
    activityType: FeedActivityType.NewRating,
    mediaItem: mockMovie2,
    reaction: Reaction.Liked,
    timestamp: new Date('2023-10-25T10:00:00Z').toISOString(),
    message: `${mockFriendUser.handle} loved ${mockMovie2.title}!`,
    likes: 15,
    comments: [mockComments[0], mockComments[2]],
  },
  {
    id: 'feed2',
    user: mockFriendUser,
    activityType: FeedActivityType.NewWatchlist,
    mediaItem: mockShow1,
    timestamp: new Date('2023-10-24T18:30:00Z').toISOString(),
    message: `${mockFriendUser.handle} added ${mockShow1.name} to their watchlist.`,
    likes: 5,
    comments: [],
  },
  {
    id: 'feed3',
    user: mockUser,
    activityType: FeedActivityType.TasteMatchUpdate,
    relatedMediaItem: mockMovie1,
    timestamp: new Date('2023-10-23T12:00:00Z').toISOString(),
    message: `You and ${mockFriendUser.handle} have a 75% TasteMatch! You both loved ${mockMovie1.title}.`,
    likes: 2,
    comments: [],
  },
  {
    id: 'feed4',
    user: mockUser, 
    activityType: FeedActivityType.DirectRec,
    mediaItem: mockMovie1, 
    relatedMediaItem: { 
        id: 999999, 
        title: mockFriendUser.handle, 
        poster_path: mockFriendUser.avatarUrl?.replace("https://picsum.photos", "") || null, // Use relative path for consistency if picsum
        backdrop_path: null, 
        overview: '', 
        vote_average: 0,
        media_type: 'movie', 
        release_date: ''
    } ,
    timestamp: new Date('2023-10-22T09:15:00Z').toISOString(),
    message: `${mockFriendUser.handle} recommended ${mockMovie1.title} for you!`,
    likes: 8,
    comments: [],
  },
  {
    id: 'feed5',
    user: mockUser,
    activityType: FeedActivityType.NewCustomList,
    customListName: "My Top 10 Mind-Benders",
    timestamp: new Date('2023-10-21T15:00:00Z').toISOString(),
    message: `${mockUser.handle} created a new list: "My Top 10 Mind-Benders"`,
    likes: 12,
    comments: [{ id: 'comment3', user: mockFriendUser, text: "Ooh, can't wait to see what's on it!", timestamp: new Date('2023-10-21T15:05:00Z').toISOString()}]
  },
  {
    id: 'feed6',
    user: mockUserAlex,
    activityType: FeedActivityType.NewRating,
    mediaItem: mockMovie1,
    reaction: Reaction.Fine,
    timestamp: new Date('2023-10-26T11:00:00Z').toISOString(),
    message: `${mockUserAlex.handle} rated ${mockMovie1.title}.`,
    likes: 3,
    comments: [],
  },
  {
    id: 'feed7',
    user: mockUserSam,
    activityType: FeedActivityType.NewWatchlist,
    mediaItem: mockMovie2,
    timestamp: new Date('2023-10-27T09:30:00Z').toISOString(),
    message: `${mockUserSam.handle} added ${mockMovie2.title} to their watchlist.`,
    likes: 7,
    comments: [],
  }
];

export const mockCastMovie1: CastMember[] = [
  { id: 819, name: 'Edward Norton', character: 'The Narrator', profile_path: '/5hSVNd23zIn7E1jL2B0s5XmQxH2.jpg', order: 0 },
  { id: 287, name: 'Brad Pitt', character: 'Tyler Durden', profile_path: '/cckcYc2v0yh1tc9QjRelptcOB1s.jpg', order: 1 },
  { id: 1283, name: 'Helena Bonham Carter', character: 'Marla Singer', profile_path: '/DDF54Z9Yp9tU4L2j2JH5NZZ3s2h.jpg', order: 2 },
];
export const mockCrewMovie1: CrewMember[] = [
 { id: 7467, name: 'David Fincher', job: 'Director', department: 'Directing', profile_path: '/tpEodC1MKjNxEKzJ7kX32y0usp.jpg' },
];
export const mockCreditsMovie1: CreditsResponse = { id: 550, cast: mockCastMovie1, crew: mockCrewMovie1 };

export const mockCastShow1: CastMember[] = [
 { id: 17419, name: 'Bryan Cranston', character: 'Walter White', profile_path: '/nF4ry3N3L9iNC0YrYW361yA4pTF.jpg', order: 0 },
 { id: 84497, name: 'Aaron Paul', character: 'Jesse Pinkman', profile_path: '/g2M2GU0vT4G6SA2d80aJ07XW2rl.jpg', order: 1 },
 { id: 134252, name: 'Anna Gunn', character: 'Skyler White', profile_path: '/jNe7642l5wfDs2x22E8j3wgAh3H.jpg', order: 2 },
];
export const mockCreditsShow1: CreditsResponse = { id: 1396, cast: mockCastShow1, crew: [] };


export const mockEpisodesSeason1BB: Episode[] = [
  { id: 62085, name: "Pilot", overview: "Diagnosed with terminal lung cancer, a high school chemistry teacher resorts to cooking and selling methamphetamine to provide for his family.", episode_number: 1, season_number: 1, still_path: "/5752eLd00uS06i9TBOwO07L0f44.jpg", air_date: "2008-01-20", vote_average: 8.3 },
  { id: 62086, name: "Cat's in the Bag...", overview: "Walt and Jesse try to decide what to do with the two drug dealers they have taken captive.", episode_number: 2, season_number: 1, still_path: "/zVTy691Wfih2YjL3y78z0jHcOjp.jpg", air_date: "2008-01-27", vote_average: 8.1 },
  { id: 62087, name: "...And the Bag's in the River", overview: "Walt is struggling with the decision to kill Krazy-8, while Jesse tries to dispose of Emilio's body.", episode_number: 3, season_number: 1, still_path: "/mOaZgLpLPj91S2XF0sY0F7vKE62.jpg", air_date: "2008-02-10", vote_average: 8.4 },
];
export const mockSeason1DetailsBB: TVSeasonDetailsResponse = {
  _id: "5254949319c2957940000000",
  air_date: "2008-01-20",
  episodes: mockEpisodesSeason1BB,
  name: "Season 1",
  overview: "High school chemistry teacher Walter White's life is thrown into turmoil when he is diagnosed with stage III lung cancer. Desperate to secure his family's financial future, he teams up with former student Jesse Pinkman to cook and sell high-quality methamphetamine.",
  id: 3572,
  poster_path: "/1BP4xYv9ZG4ZVHkL0KMtHkAbhN6.jpg",
  season_number: 1,
};

// --- Mock Custom Lists ---
export const mockCustomListItems1: CustomListMediaItem[] = [
    { ...mockMovie1, addedToListAt: new Date('2023-11-01T10:00:00Z').toISOString() },
    { ...mockMovie2, addedToListAt: new Date('2023-11-01T09:00:00Z').toISOString() },
];
export const mockCustomLists: CustomList[] = [
    { 
        id: 'clist1', 
        name: "My Top Crime Movies", 
        description: "A collection of the best crime films I've seen.",
        userId: DEFAULT_USER_ID, 
        items: mockCustomListItems1, 
        createdAt: new Date('2023-11-01T08:00:00Z').toISOString(), 
        updatedAt: new Date('2023-11-01T10:00:00Z').toISOString() 
    },
    { 
        id: 'clist2', 
        name: "Weekend Binge Watch", 
        userId: DEFAULT_USER_ID, 
        items: [{...mockShow1, addedToListAt: new Date('2023-10-30T12:00:00Z').toISOString()}], 
        createdAt: new Date('2023-10-30T11:00:00Z').toISOString(), 
        updatedAt: new Date('2023-10-30T12:00:00Z').toISOString() 
    },
];

// --- Mock Person Details & Credits ---
export const mockPersonDetailsPitt: PersonDetails = {
    adult: false,
    also_known_as: ["William Bradley Pitt"],
    biography: "William Bradley Pitt is an American actor and film producer. He has received multiple awards, including two Academy Awards, a British Academy Film Award, two Golden Globe Awards, and a Primetime Emmy Award as a producer under his production company, Plan B Entertainment.",
    birthday: "1963-12-18",
    deathday: null,
    gender: 2,
    homepage: null,
    id: 287,
    imdb_id: "nm0000093",
    known_for_department: "Acting",
    name: "Brad Pitt",
    place_of_birth: "Shawnee, Oklahoma, USA",
    popularity: 36.953,
    profile_path: "/cckcYc2v0yh1tc9QjRelptcOB1s.jpg",
};

export const mockPersonCreditsPitt: PersonCombinedCreditsResponse = {
    id: 287,
    cast: [
        { ...mockMovie1, credit_id: "52fe4250c3a36847f80149a3", character: "Tyler Durden", order: 1 } as PersonCreditItem,
        { ...mockMovie2, credit_id: "52fe4260c3a36847f801697d", character: "Jules Winnfield (Mistake, actually Samuel L Jackson)", order: 0} as PersonCreditItem, // Intentional error for demo
        // Add more mock credits if needed
        {
            id: 49026, // Once Upon a Time in Hollywood
            title: "Once Upon a Time... in Hollywood",
            overview: "Los Angeles, 1969. TV star Rick Dalton, a struggling actor specializing in westerns, and stunt double Cliff Booth, his best friend, try to navigate the changing film industry.",
            poster_path: "/8j58iEBw9pYFD2L0nt0XendX9Wx.jpg",
            vote_average: 7.4,
            release_date: "2019-07-25",
            media_type: "movie",
            credit_id: "5ac175f00e0a2652d7009089",
            character: "Cliff Booth",
            order: 1
        } as PersonCreditItem,
    ],
    crew: [
         {
            id: 10551, // The Departed (as Producer)
            title: "The Departed",
            overview: "To take down South Boston's Irish Mafia, the police send in one of their own to infiltrate the underworld, not realizing the syndicate has done likewise.",
            poster_path: "/kWWAt2n0U5n9L3X2T54T0g9Nn1S.jpg",
            vote_average: 8.2,
            release_date: "2006-10-05",
            media_type: "movie",
            credit_id: "52fe438bc3a36847f8059ca9",
            department: "Production",
            job: "Producer"
        } as PersonCreditItem,
    ]
};
