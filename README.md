# Museick

**A Music Memory Journal**

---

## 🧠 Overview
Museick is a calendar-based music journal that helps users reflect on their listening habits by choosing their favorite (**Muse**) and least favorite (**Ick**) song each month. At the end of the year, Museick compiles these choices into a personalized musical wrap-up.

---

## ✨ Features

- **Muses & Icks**: Choose your top and bottom song each month
- **Candidate Pool**: Build a non-ordered list of potential picks as the month goes on
- **Year-End Recap**: See a visual and statistical journey of your musical year
- **Spotify Integration**: Search, select, and analyze directly from your library and history
- **User Stats**: Track decision dates, change count, time to final choice

---

## 🎨 User Experience

### Monthly Flow
1. Connect Spotify account
2. Add song candidates throughout the month
3. Pick your **Muse** and **Ick** from that pool

### Recap Flow
- Display 12 Muses and 12 Icks
- Include stats like:
  - How many songs considered each month
  - How often you changed your picks
  - Time taken to finalize each choice

---

## 🧱 Tech Stack

- **Frontend**: React (possibly Next.js)
- **Auth**: Clerk
- **Music API**: Spotify
- **Backend**: Go (Golang)
- **Database**: MongoDB (may switch to PostgreSQL later)

---

## 🗂 Data Models (MongoDB)

### `users`
```ts
{
  _id: ObjectId,
  clerkId: string,
  createdAt: ISODate,
  spotifyId: string,
  // other profile info
}
```

### `songs`
```ts
{
  _id: ObjectId,
  spotifyId: string,
  name: string,
  artist: string,
  album: string,
  addedByUsers: [ObjectId]  // cross-user reference
}
```

### `user_songs`
```ts
{
  _id: ObjectId,
  userId: ObjectId,
  songId: ObjectId,
  month: "2025-04",
  addedAt: ISODate,
  changedCount: number,
  type: "muse" | "ick" | null
}
```

---

## 🔌 API Endpoints (Sketch)

- `GET /month/:userId/:month` → Get user's monthly data
- `POST /add-song` → Add a candidate to month
- `POST /select` → Mark song as Muse or Ick
- `GET /recap/:userId` → Compile year-end story

---

## 🔐 Clerk Integration
- Clerk issues a JWT with a unique `sub` (subject) field
- Use `sub` to identify users in the database via `clerkId`
- Authenticate and validate token on each request

---

## 🚧 Future Ideas
- Per-song notes or stories
- Export playlist to Spotify
- Global charts (most common Muse of the year)
- Shareable public recap pages

---

This README is a living document. Expect structure changes, schema evolution, and wild ideas. Let’s build 🎶


