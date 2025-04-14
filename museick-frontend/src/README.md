src/
│
├── assets/                 # Static assets (images, fonts, etc.)
│
├── components/             # Reusable UI components (Button, Navbar, etc.)
│   ├── Navbar.tsx          # The app bar/navbar with Clerk
│
├── features/               # Major feature-specific components (Spotify Search, etc.)
│   ├── search/             # Spotify search related components
│   │   └── SpotifySearch.tsx
│
├── pages/                  # Individual pages/views
│   ├── Home.tsx            # Home page or landing page
│   ├── Profile.tsx         # User profile or settings page
│
├── theme/                  # Theme and styling-related files
│   └── theme.ts            # Centralized theme definition
│
├── utils/                  # Utility functions (Spotify integration, etc.)
│   └── spotifyAuth.ts      # Authentication helpers for Spotify
│
└── App.tsx                 # Main app component, imports other pages & components
└── index.tsx               # Entry point for the React app
└── App.css                 # Global CSS styles (if needed)


