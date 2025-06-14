# Seen: A TV & Movie Tracker

Seen is a web application designed for tracking movies and TV shows. It allows users to log what they've watched, create personalized watchlists, and discover new content. The app leverages modern web technologies to provide a rich, interactive, and personalized user experience.

## Key Features

- **Track Watched Media**: Log the movies and TV shows you've seen.
- **Rate Content**: Give ratings to everything you watch to keep a record of your preferences.
- **Personalized Watchlists**: Create and manage custom lists of content you want to watch.
- **AI-Powered Comparisons**: Utilizes the Google Gemini API to generate personalized prompts to help you rank and compare content you've rated similarly.
- **Social Features**: Follow other users, see their profiles with follower/following counts, and get a personalized feed of what your friends are watching.
- **Rich Media Details**: Integrates with The Movie Database (TMDB) API to provide detailed information, including cast, crew, genres, and where to stream.
- **User Analytics**: Implements a robust event tracking system with client-side batching to capture user interactions for analytics.

## Technologies Used

- **Frontend**: React, TypeScript, Vite
- **Component Framework**: Tailwind CSS
- **Backend-as-a-Service**: Supabase (for event tracking and user data)
- **External APIs**:
  - Google Gemini API for AI-powered recommendations.
  - The Movie Database (TMDB) for media information.
- **Routing**: React Router
- **Mobile Gestures**: react-swipeable

## Run Locally

**Prerequisites:** Node.js

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your API keys:
    ```
    VITE_GEMINI_API_KEY=your_gemini_api_key
    VITE_TMDB_API_KEY=your_tmdb_api_key
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9000`.
