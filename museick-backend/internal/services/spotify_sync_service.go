package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/seven7een/museick/museick-backend/internal/dao"
	"github.com/seven7een/museick/museick-backend/internal/models"
	"github.com/zmb3/spotify/v2" // Using spotify client library
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// SpotifySyncService handles fetching data from Spotify API and syncing it to the database.
type SpotifySyncService struct {
	spotifyClient *spotify.Client // Assumes SpotifyService provides an authenticated client
	songDAO       dao.SpotifySongDAO
	albumDAO      dao.SpotifyAlbumDAO
	artistDAO     dao.SpotifyArtistDAO
	// TODO: Inject SpotifyService or a way to get an authenticated client
}

// NewSpotifySyncService creates a new instance of SpotifySyncService.
// It needs access to the DAOs and a way to make authenticated Spotify API calls.
func NewSpotifySyncService(
	songDAO dao.SpotifySongDAO,
	albumDAO dao.SpotifyAlbumDAO,
	artistDAO dao.SpotifyArtistDAO,
	// spotifyService *SpotifyService // Option 1: Inject the existing service
	// clientProvider func(ctx context.Context) (*spotify.Client, error) // Option 2: Inject a function to get a client
) *SpotifySyncService {
	// For now, we'll assume a client is obtained elsewhere or this service
	// gets enhanced later to handle client authentication/refresh.
	// This is a placeholder and needs proper implementation for auth.
	log.Println("Initializing SpotifySyncService (NOTE: Spotify client setup is placeholder)")
	return &SpotifySyncService{
		songDAO:   songDAO,
		albumDAO:  albumDAO,
		artistDAO: artistDAO,
		// spotifyClient: nil, // Needs proper initialization
	}
}

// SyncItem fetches details for a Spotify item (song, album, artist) by its ID
// and upserts it into the corresponding database collection.
// It requires an authenticated Spotify client.
func (s *SpotifySyncService) SyncItem(ctx context.Context, spotifyID string, itemType models.SpotifyItemType, client *spotify.Client) error {
	if client == nil {
		log.Println("Error: Spotify client is nil in SyncItem")
		return errors.New("spotify client not available")
	}

	log.Printf("Syncing Spotify item: ID=%s, Type=%s", spotifyID, itemType)

	var err error
	switch itemType {
	case models.SpotifyItemTypeSong:
		err = s.syncSong(ctx, spotifyID, client)
	case models.SpotifyItemTypeAlbum:
		err = s.syncAlbum(ctx, spotifyID, client)
	case models.SpotifyItemTypeArtist:
		err = s.syncArtist(ctx, spotifyID, client)
	default:
		err = fmt.Errorf("unsupported spotify item type: %s", itemType)
	}

	if err != nil {
		log.Printf("Error syncing item %s (%s): %v", spotifyID, itemType, err)
		return err
	}

	log.Printf("Successfully synced item %s (%s)", spotifyID, itemType)
	return nil
}

// syncSong fetches song details and upserts to DB.
func (s *SpotifySyncService) syncSong(ctx context.Context, spotifyID string, client *spotify.Client) error {
	fullTrack, err := client.GetTrack(ctx, spotify.ID(spotifyID))
	if err != nil {
		return fmt.Errorf("failed to get song from Spotify API: %w", err)
	}

	// Map spotify.FullTrack to models.SpotifySong
	dbSong := mapSpotifyTrackToDBSongModel(fullTrack)

	// Upsert into database
	return s.songDAO.Upsert(ctx, dbSong)
}

// syncAlbum fetches album details and upserts to DB.
func (s *SpotifySyncService) syncAlbum(ctx context.Context, spotifyID string, client *spotify.Client) error {
	fullAlbum, err := client.GetAlbum(ctx, spotify.ID(spotifyID))
	if err != nil {
		return fmt.Errorf("failed to get album from Spotify API: %w", err)
	}

	// Create album with total tracks from full album data
	dbAlbum := mapSpotifyAlbumToDBModel(&fullAlbum.SimpleAlbum)
	if fullAlbum.Tracks.Total > 0 {
		dbAlbum.TotalTracks = int(fullAlbum.Tracks.Total)
	}

	// Upsert into database
	return s.albumDAO.Upsert(ctx, dbAlbum)
}

// syncArtist fetches artist details and upserts to DB.
func (s *SpotifySyncService) syncArtist(ctx context.Context, spotifyID string, client *spotify.Client) error {
	fullArtist, err := client.GetArtist(ctx, spotify.ID(spotifyID))
	if err != nil {
		return fmt.Errorf("failed to get artist from Spotify API: %w", err)
	}

	// Map spotify.FullArtist to models.SpotifyArtist
	dbArtist := mapSpotifyArtistToDBModel(fullArtist)

	// Upsert into database
	return s.artistDAO.Upsert(ctx, dbArtist)
}

// --- Mapping Functions ---

func mapSpotifyTrackToDBSongModel(st *spotify.FullTrack) *models.SpotifySong {
	if st == nil {
		return nil
	}
	return &models.SpotifySong{
		SpotifyID:        st.ID.String(),
		Album:            *mapSpotifySimpleAlbumToDBModel(&st.Album),
		Artists:          mapSpotifySimpleArtistsToDBModels(st.Artists),
		AvailableMarkets: st.AvailableMarkets,
		DiscNumber:       int(st.DiscNumber),
		DurationMs:       int(st.Duration),
		Explicit:         st.Explicit,
		ExternalIDs:      st.ExternalIDs,
		ExternalUrls:     st.ExternalURLs,
		Name:             st.Name,
		Popularity:       int(st.Popularity),
		PreviewURL:       st.PreviewURL,
		TrackNumber:      int(st.TrackNumber),
		Type:             string(st.Type),
		URI:              string(st.URI),
		IsLocal:          false, // IsLocal is not available in the Spotify API
		LastFetchedAt:    primitive.NewDateTimeFromTime(time.Now()),
	}
}

func mapSpotifyAlbumToDBModel(sa *spotify.SimpleAlbum) *models.SpotifyAlbum {
	if sa == nil {
		return nil
	}
	return &models.SpotifyAlbum{
		SpotifyID:            sa.ID.String(),
		AlbumType:            sa.AlbumType,
		TotalTracks:          0, // This should be set from FullAlbum.Tracks.Total
		AvailableMarkets:     sa.AvailableMarkets,
		ExternalUrls:         sa.ExternalURLs,
		Images:               mapSpotifyImagesToDBModels(sa.Images),
		Name:                 sa.Name,
		ReleaseDate:          sa.ReleaseDate,
		ReleaseDatePrecision: sa.ReleaseDatePrecision,
		URI:                  string(sa.URI),
		Artists:              mapSpotifySimpleArtistsToDBModels(sa.Artists),
		LastFetchedAt:        primitive.NewDateTimeFromTime(time.Now()),
	}
}

func mapSpotifySimpleAlbumToDBModel(sa *spotify.SimpleAlbum) *models.SimplifiedAlbum {
	if sa == nil {
		return nil
	}
	return &models.SimplifiedAlbum{
		AlbumType:            sa.AlbumType,
		TotalTracks:          0, // This field should be set from the full album if available
		AvailableMarkets:     sa.AvailableMarkets,
		ExternalUrls:         sa.ExternalURLs,
		ID:                   sa.ID.String(),
		Images:               mapSpotifyImagesToDBModels(sa.Images),
		Name:                 sa.Name,
		ReleaseDate:          sa.ReleaseDate,
		ReleaseDatePrecision: sa.ReleaseDatePrecision,
		URI:                  string(sa.URI),
		Artists:              mapSpotifySimpleArtistsToDBModels(sa.Artists),
	}
}

func mapSpotifyArtistToDBModel(sa *spotify.FullArtist) *models.SpotifyArtist {
	if sa == nil {
		return nil
	}
	popularity := int(sa.Popularity)
	return &models.SpotifyArtist{
		SpotifyID:     sa.ID.String(),
		ExternalUrls:  sa.ExternalURLs,
		Genres:        sa.Genres,
		Images:        mapSpotifyImagesToDBModels(sa.Images),
		Name:          sa.Name,
		Popularity:    &popularity,
		URI:           string(sa.URI),
		LastFetchedAt: primitive.NewDateTimeFromTime(time.Now()),
	}
}

func mapSpotifySimpleArtistsToDBModels(sas []spotify.SimpleArtist) []models.SimplifiedArtist {
	if sas == nil {
		return nil
	}
	dbArtists := make([]models.SimplifiedArtist, len(sas))
	for i, sa := range sas {
		dbArtists[i] = models.SimplifiedArtist{
			ExternalUrls: sa.ExternalURLs,
			ID:           sa.ID.String(),
			Name:         sa.Name,
			URI:          string(sa.URI),
		}
	}
	return dbArtists
}

func mapSpotifyImagesToDBModels(imgs []spotify.Image) []models.ImageObject {
	if imgs == nil {
		return nil
	}
	dbImages := make([]models.ImageObject, len(imgs))
	for i, img := range imgs {
		height := int(img.Height) // Convert spotify.Numeric to int
		width := int(img.Width)   // Convert spotify.Numeric to int
		dbImages[i] = models.ImageObject{
			URL:    img.URL,
			Height: &height,
			Width:  &width,
		}
	}
	return dbImages
}

// Helper function to check if an item needs refreshing based on LastFetchedAt
func needsRefresh(lastFetched time.Time, threshold time.Duration) bool {
	return time.Since(lastFetched) > threshold
}

// GetOrSyncItem tries to get an item from the DB first. If not found or stale,
// it fetches from Spotify API, upserts to DB, and returns the item.
// This requires an authenticated Spotify client.
func (s *SpotifySyncService) GetOrSyncItem(ctx context.Context, spotifyID string, itemType models.SpotifyItemType, client *spotify.Client, refreshThreshold time.Duration) (interface{}, error) {
	if client == nil {
		log.Println("Error: Spotify client is nil in GetOrSyncItem")
		return nil, errors.New("spotify client not available")
	}

	var dbItem interface{}
	var lastFetched time.Time
	var err error
	var foundInDB bool

	// 1. Try to get from DB
	switch itemType {
	case models.SpotifyItemTypeSong:
		song, errGet := s.songDAO.GetByID(ctx, spotifyID)
		if errGet == nil {
			dbItem = song
			lastFetched = song.LastFetchedAt.Time()
			foundInDB = true
		} else if !errors.Is(errGet, mongo.ErrNoDocuments) {
			return nil, fmt.Errorf("error getting song from DB: %w", errGet) // DB error
		}
	case models.SpotifyItemTypeAlbum:
		album, errGet := s.albumDAO.GetByID(ctx, spotifyID)
		if errGet == nil {
			dbItem = album
			lastFetched = album.LastFetchedAt.Time()
			foundInDB = true
		} else if !errors.Is(errGet, mongo.ErrNoDocuments) {
			return nil, fmt.Errorf("error getting album from DB: %w", errGet)
		}
	case models.SpotifyItemTypeArtist:
		artist, errGet := s.artistDAO.GetByID(ctx, spotifyID)
		if errGet == nil {
			dbItem = artist
			lastFetched = artist.LastFetchedAt.Time()
			foundInDB = true
		} else if !errors.Is(errGet, mongo.ErrNoDocuments) {
			return nil, fmt.Errorf("error getting artist from DB: %w", errGet)
		}
	default:
		return nil, fmt.Errorf("unsupported spotify item type: %s", itemType)
	}

	// 2. Check if refresh is needed (not found or stale)
	if !foundInDB || needsRefresh(lastFetched, refreshThreshold) {
		log.Printf("Item %s (%s) not found in DB or needs refresh. Fetching from Spotify...", spotifyID, itemType)
		// 3. Fetch from Spotify and Upsert
		err = s.SyncItem(ctx, spotifyID, itemType, client)
		if err != nil {
			return nil, fmt.Errorf("failed to sync item from Spotify: %w", err) // Sync failed
		}

		// 4. Get the newly upserted item from DB
		// Re-fetch from DB to ensure we return the stored version
		switch itemType {
		case models.SpotifyItemTypeSong:
			dbItem, err = s.songDAO.GetByID(ctx, spotifyID)
		case models.SpotifyItemTypeAlbum:
			dbItem, err = s.albumDAO.GetByID(ctx, spotifyID)
		case models.SpotifyItemTypeArtist:
			dbItem, err = s.artistDAO.GetByID(ctx, spotifyID)
		}
		if err != nil {
			// This shouldn't happen if upsert succeeded, but handle defensively
			return nil, fmt.Errorf("failed to get item from DB after sync: %w", err)
		}
	} else {
		log.Printf("Item %s (%s) found in DB and is fresh.", spotifyID, itemType)
	}

	return dbItem, nil
}
