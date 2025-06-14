import { DEFAULT_USER_ID } from './constants';
export var mockUser = {
    id: DEFAULT_USER_ID,
    handle: 'CurrentUser',
    avatarUrl: undefined, // Or a placeholder image/initials logic if implemented
    joinDate: new Date('2023-01-15T10:00:00.000Z').toISOString(),
    followers: 125,
    following: 78,
    globalRank: 1503,
};
export var mockFriendUser = {
    id: 'friend_user_123',
    handle: 'MovieBuff23',
    avatarUrl: 'https://i.pravatar.cc/150?u=friend_user_123', // Example placeholder avatar
    joinDate: new Date('2022-11-20T14:30:00.000Z').toISOString(),
    followers: 250,
    following: 150,
    globalRank: 987,
};
var sampleMovie = {
    tmdbId: 550, // Fight Club
    mediaType: "movie",
    title: "Fight Club",
    posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    releaseYear: "1999",
    genres: [{ id: 18, name: "Drama" }]
};
var sampleShow = {
    tmdbId: 1396, // Breaking Bad
    mediaType: "tv",
    title: "Breaking Bad",
    posterPath: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    releaseYear: "2008",
    genres: [{ id: 18, name: "Drama" }, { id: 80, name: "Crime" }]
};
export var mockFeedItems = [
    {
        id: 'feed_1',
        type: "rating",
        user: { id: mockFriendUser.id, handle: mockFriendUser.handle, avatarUrl: mockFriendUser.avatarUrl },
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        mediaItem: sampleMovie,
        reaction: "Liked",
        comment: "One of my all time favorites!"
    },
    {
        id: 'feed_2',
        type: "list_create",
        user: { id: mockFriendUser.id, handle: mockFriendUser.handle, avatarUrl: mockFriendUser.avatarUrl },
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        listName: "Mind-Bending Movies",
        listId: "custom_list_abc"
    },
    {
        id: 'feed_3',
        type: "rating",
        user: { id: mockUser.id, handle: mockUser.handle, avatarUrl: mockUser.avatarUrl }, // Current user action
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        mediaItem: sampleShow,
        reaction: "Liked",
        comment: "Just finished this masterpiece!"
    },
    {
        id: 'feed_4',
        type: "list_update",
        user: { id: mockFriendUser.id, handle: mockFriendUser.handle, avatarUrl: mockFriendUser.avatarUrl },
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        listName: "Essential Sci-Fi Shows",
        listId: "custom_list_def",
        comment: "Added 3 new shows to the list."
    },
];
