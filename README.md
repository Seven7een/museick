# Museick

**A Music Memory Journal**

---

## 🧠 Overview
Museick is a calendar-based music journal that helps users reflect on their listening habits by choosing their favorite (**Muse**) and least favorite (**Ick**) song each month. At the end of the year, Museick compiles these choices into a personalized musical wrap-up.

---

## ✨ Features

- **Muses & Icks**: Choose your top and bottom song/album/artist each month
- **Candidate Pool**: Build a non-ordered list of potential picks (candidates) as the month goes on
- **Year-End Recap**: See a visual and statistical journey of your musical year
- **Spotify Integration**: Search, select, and analyze directly from your library and history
- **User Stats**: Track decision dates, change count, time to final choice

---

## 🎨 User Experience

### Monthly Flow
1. Connect Spotify account
2. Add song/album/artist candidates throughout the month (creates `user_selections` entry with type `candidate`).
3. Pick your **Muse** and **Ick** from that pool or directly (updates `user_selections` entry type to `muse` or `ick`).

### Recap Flow
- Display 12 Muses and 12 Icks (fetched from `user_selections` filtered by type and month).
- Include stats like:
  - How many items considered each month (count `user_selections` for user/month).
  - How often you changed your picks (requires tracking history - future enhancement).
  - Time taken to finalize each choice (requires tracking history - future enhancement).

---

## 🧱 Tech Stack

- **Frontend**: React (possibly Next.js)
- **Auth**: Clerk
- **Music API**: Spotify
- **Backend**: Go (Golang) with Gin framework
- **Database**: MongoDB

### Data Model (MongoDB)
- `users`: Stores user profile information linked to Clerk ID.
- `spotify_songs`: Caches core song data fetched from Spotify API (identified by Spotify ID).
- `spotify_albums`: Caches core album data fetched from Spotify API (identified by Spotify ID).
- `spotify_artists`: Caches core artist data fetched from Spotify API (identified by Spotify ID).
- `user_selections`: Stores user-specific actions (Candidate, Muse, Ick) per month. Each document links a `user_id` to a `spotify_id` (from core collections) for a specific `month_year`, indicating its status via `selection_type`.

---

## 🚧 Future Ideas
- Per-selection notes or stories
- Export recap playlist to Spotify
- Global charts (most common Muse/Ick of the year)
- Shareable public recap pages
- Support for items other than songs (Albums, Artists) as Muse/Ick (Partially supported in backend model, needs frontend implementation)
- Track selection change history for stats.

---

This README is a living document.

