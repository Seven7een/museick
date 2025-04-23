**Design Document: Museick ShuffleMaster Extension**

**Overview:**
Museick ShuffleMaster is an extension of the Museick platform, designed to allow users greater control over how their Spotify music is shuffled. Rather than relying solely on Spotify's default shuffle, ShuffleMaster generates intelligent playlists or playback queues based on user preferences, behavioral data, and enriched track metadata.

---

**Key Features & Design Decisions:**

1. **Session-Based Dynamic Playlist Generation**
   - Users can generate a new shuffle session with tailored parameters.
   - Options include tag filters, genre preferences, audio feature ranges, snoozed tracks, and more.

2. **Song Snoozing**
   - Users can "snooze" a song, temporarily removing it from shuffle for X days/weeks/months.
   - Tracks have a `snoozed_until` field in the database, checked during queue generation.

3. **User-Defined Tags and Genre Filters**
   - Custom tags (e.g., "study", "gym") can be assigned to songs.
   - Users can select or exclude tags/genres during shuffle.
   - Songs are enriched with artist and album genres from the Spotify API.

4. **Memory-Based Shuffle Bias**
   - Tracks that haven't been played recently are given higher priority in shuffle.
   - Each track has a `last_played` timestamp used to calculate memory bias.

5. **Weighted Shuffle Algorithm**
   - Users can boost or reduce the play frequency of individual tracks using a `weight` value.
   - A weighted scoring function ranks tracks based on user preferences.

6. **Queue Options**
   - a virtual queue managed by the app can simulate enhanced shuffle logic.

---

**Track Metadata and Enrichment**

Tracks are enriched with metadata from Spotify and custom data. Metadata includes:

- **Basic Metadata:**
  - `id`, `name`, `artists`, `album`, `duration_ms`, `popularity`, `uri`

- **Audio Features** (via Spotify's `/audio-features` endpoint):
  - `danceability`: suitability for dancing (0.0 to 1.0)
  - `energy`: intensity and activity (0.0 to 1.0)
  - `key`: musical key (0-11, with C=0)
  - `loudness`: overall loudness in dB
  - `mode`: major (1) or minor (0)
  - `speechiness`: presence of spoken words
  - `acousticness`: probability the track is acoustic
  - `instrumentalness`: likelihood of instrumental content
  - `liveness`: presence of live audience
  - `valence`: musical positiveness
  - `tempo`: BPM
  - `time_signature`: number of beats per bar

- **Genre Metadata:**
  - First attempts to pull from the album’s genre
  - Falls back to artist’s genres if album data is unavailable
  - Stored as an array of strings

- **Custom Metadata:**
  - `tags`: user-defined strings ("focus", "throwback")
  - `snoozed_until`: ISO timestamp
  - `last_played`: timestamp of last playback
  - `weight`: user-defined float to increase/decrease play likelihood

---

**Shuffle Algorithm (High-Level):**

1. **Initial Filtering:**
   - Exclude snoozed tracks.
   - Apply genre and tag filters.
   - Apply specific metadata exclusions (e.g., key, mode, time_signature).

2. **Audio Feature Filtering:**
   - Remove tracks outside min/max bounds for audio features (if exclusion toggles are enabled).

3. **Scoring:**
   - Each remaining track receives a score based on:
     - Audio feature match to user preferences (weighted)
     - Memory bias (favoring older last_played timestamps)
     - Custom `weight`

4. **Sorting and Selection:**
   - Tracks are sorted by score.
   - Top N tracks are returned as the next shuffled session.

---

**Additional Features (Optional):**
- Shuffle Templates: Save combinations of preferences.
- Session History: Keep track of past generated playlists.
- Artist Blacklist: Exclude specific artists globally.

---

**Next Steps:**
- Finalize MongoDB schema for song storage and enrichment.
- Implement Spotify data ingestion service.
- Build frontend UI for session generator and preference sliders.
- Create scoring engine with test cases.

