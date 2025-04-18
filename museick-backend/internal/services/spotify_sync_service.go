package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/seven7een/museick/museick-backend/internal/dao"
	"github.com/seven7een/museick/museick-backend/internal/models"
	"github.com/zmb3/spotify/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/oauth2"
)

// SpotifySyncService handles fetching data from Spotify API and syncing it to the database.
type SpotifySyncService struct {
	trackDAO  dao.SpotifyTrackDAO
	albumDAO  dao.SpotifyAlbumDAO
	artistDAO dao.SpotifyArtistDAO
}

// NewSpotifySyncService creates a new instance of SpotifySyncService.
func NewSpotifySyncService(
	trackDAO dao.SpotifyTrackDAO,
	albumDAO dao.SpotifyAlbumDAO,
	artistDAO dao.SpotifyArtistDAO,
) *SpotifySyncService {
	log.Println("Initializing SpotifySyncService")
	return &SpotifySyncService{
		trackDAO:  trackDAO,
		albumDAO:  albumDAO,
		artistDAO: artistDAO,
	}
}

// createTemporaryClient creates a Spotify client using a provided access token.
func createTemporaryClient(ctx context.Context, accessToken string) *spotify.Client {
	token := &oauth2.Token{AccessToken: accessToken, TokenType: "Bearer"}
	// Create an http.Client that uses the provided token.
	httpClient := oauth2.NewClient(ctx, oauth2.StaticTokenSource(token))
	// Create the Spotify client using the OAuth2-aware http.Client.
	client := spotify.New(httpClient)
	return client
}

// SyncItem fetches details for a Spotify item using a provided client
// and upserts it into the corresponding database collection.
func (s *SpotifySyncService) SyncItem(ctx context.Context, spotifyID string, itemType string, client *spotify.Client) error {
	if client == nil {
		log.Println("Error: Spotify client is nil in SyncItem")
		return errors.New("spotify client not available for sync")
	}

	log.Printf("Syncing Spotify item: ID=%s, Type=%s", spotifyID, itemType)

	var err error
	switch itemType {
	case "track":
		err = s.syncTrack(ctx, spotifyID, client)
	case "album":
		err = s.syncAlbum(ctx, spotifyID, client)
	case "artist":
		err = s.syncArtist(ctx, spotifyID, client)
	default:
		err = fmt.Errorf("unsupported spotify item type: %s", itemType)
	}

	if err != nil {
		log.Printf("Error syncing item %s (%s): %v", spotifyID, itemType, err)
		return err // Return the specific sync error
	}

	log.Printf("Successfully synced item %s (%s)", spotifyID, itemType)
	return nil
}

// syncTrack fetches track details and upserts to DB.
func (s *SpotifySyncService) syncTrack(ctx context.Context, spotifyID string, client *spotify.Client) error {
	fullTrack, err := client.GetTrack(ctx, spotify.ID(spotifyID))
	if err != nil {
		return fmt.Errorf("failed to get track from Spotify API: %w", err)
	}
	dbTrack := mapSpotifyTrackToDBTrackModel(fullTrack)
	return s.trackDAO.Upsert(ctx, dbTrack)
}

// syncAlbum fetches album details and upserts to DB.
func (s *SpotifySyncService) syncAlbum(ctx context.Context, spotifyID string, client *spotify.Client) error {
	fullAlbum, err := client.GetAlbum(ctx, spotify.ID(spotifyID))
	if err != nil {
		return fmt.Errorf("failed to get album from Spotify API: %w", err)
	}
	dbAlbum := mapSpotifyAlbumToDBModel(fullAlbum) // Map from FullAlbum
	return s.albumDAO.Upsert(ctx, dbAlbum)
}

// syncArtist fetches artist details and upserts to DB.
func (s *SpotifySyncService) syncArtist(ctx context.Context, spotifyID string, client *spotify.Client) error {
	fullArtist, err := client.GetArtist(ctx, spotify.ID(spotifyID))
	if err != nil {
		return fmt.Errorf("failed to get artist from Spotify API: %w", err)
	}
	dbArtist := mapSpotifyArtistToDBModel(fullArtist)
	return s.artistDAO.Upsert(ctx, dbArtist)
}

// --- Mapping Functions ---

func mapSpotifyTrackToDBTrackModel(st *spotify.FullTrack) *models.SpotifyTrack {
	if st == nil {
		return nil
	}
	isPlayable := false // Default value if IsPlayable is nil
	if st.IsPlayable != nil {
		isPlayable = *st.IsPlayable
	}
	return &models.SpotifyTrack{
		SpotifyID:        st.ID.String(), // Use SpotifyID as _id
		Name:             st.Name,
		Artists:          mapSpotifySimpleArtistsToDBModels(st.Artists),
		Album:            *mapSpotifySimpleAlbumToDBModel(&st.Album), // Map embedded SimpleAlbum
		DurationMs:       int(st.Duration),
		Explicit:         st.Explicit,
		Popularity:       int(st.Popularity),
		PreviewURL:       st.PreviewURL,
		TrackNumber:      int(st.TrackNumber),
		ExternalUrls:     st.ExternalURLs,
		AvailableMarkets: st.AvailableMarkets,
		DiscNumber:       int(st.DiscNumber),
		ExternalIDs:      st.ExternalIDs,
		Type:             string(st.Type),
		URI:              string(st.URI),
		IsLocal:          isPlayable, // Note: Library uses IsPlayable (*bool), model uses IsLocal (bool)
		LastFetchedAt:    primitive.NewDateTimeFromTime(time.Now()),
	}
}

func mapSpotifyAlbumToDBModel(fa *spotify.FullAlbum) *models.SpotifyAlbum {
	if fa == nil {
		return nil
	}
	// Access SimpleAlbum fields via fa.SimpleAlbum embedding
	return &models.SpotifyAlbum{
		SpotifyID:            fa.ID.String(), // Use SpotifyID as _id
		AlbumType:            fa.AlbumType,
		TotalTracks:          int(fa.Tracks.Total), // Get from FullAlbum's Tracks field
		AvailableMarkets:     fa.AvailableMarkets,
		ExternalUrls:         fa.ExternalURLs,
		// Href:                 fa.Href, // Not in the Go Api we're using
		Images:               mapSpotifyImagesToDBModels(fa.Images),
		Name:                 fa.Name,
		ReleaseDate:          fa.ReleaseDate,
		ReleaseDatePrecision: fa.ReleaseDatePrecision,
		// Restrictions:         mapRestrictions(fa.Restrictions), // Not in the Go Api we're using
		Type:                 string(fa.AlbumType),            // Use AlbumType from FullAlbum as Type
		URI:                  string(fa.URI),
		Artists:              mapSpotifySimpleArtistsToDBModels(fa.Artists), // Map embedded SimpleArtists
		// TODO: Add Genres, Label, Copyrights if they exist in models.SpotifyAlbum and fa.FullAlbum
		LastFetchedAt: primitive.NewDateTimeFromTime(time.Now()),
	}
}

func mapSpotifySimpleAlbumToDBModel(sa *spotify.SimpleAlbum) *models.SimplifiedAlbum {
	if sa == nil {
		return nil
	}
	return &models.SimplifiedAlbum{
		AlbumType:            sa.AlbumType,
		TotalTracks:          int(sa.TotalTracks),
		AvailableMarkets:     sa.AvailableMarkets,
		ExternalUrls:         sa.ExternalURLs,
		// Href:                 sa.Href, // Not in the Go Api we're using
		ID:                   sa.ID.String(),
		Images:               mapSpotifyImagesToDBModels(sa.Images),
		Name:                 sa.Name,
		ReleaseDate:          sa.ReleaseDate,
		ReleaseDatePrecision: sa.ReleaseDatePrecision,
		// Restrictions:         mapRestrictions(sa.Restrictions), // Not in the Go Api we're using
		Type:                 sa.AlbumGroup,                  
		URI:                  string(sa.URI),
		Artists:              mapSpotifySimpleArtistsToDBModels(sa.Artists),
	}
}

func mapSpotifyArtistToDBModel(fa *spotify.FullArtist) *models.SpotifyArtist {
	if fa == nil {
		return nil
	}
	popularity := int(fa.Popularity)
	// Access SimpleArtist fields via fa.SimpleArtist embedding
	return &models.SpotifyArtist{
		SpotifyID:    fa.ID.String(),
		ExternalUrls: fa.ExternalURLs,
		Genres:       fa.Genres, 
		// Href:         fa.Href,   // Not in the Go Api we're using
		Images:       mapSpotifyImagesToDBModels(fa.Images),
		Name:         fa.Name,
		Popularity:   &popularity,
		// Type:         string(fa.Type), // Not in the Go Api we're using
		URI:          string(fa.URI),
		// TODO: Map Followers if needed (fa.Followers.Count)
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
			// Href:         sa.Href, // Not in the Go Api we're using
			ID:           sa.ID.String(),
			Name:         sa.Name,
			// Type:         string(sa.Type), // Not in the Go Api we're using
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
		height := int(img.Height)
		width := int(img.Width)
		dbImages[i] = models.ImageObject{
			URL:    img.URL,
			Height: &height, // Model uses pointer
			Width:  &width,  // Model uses pointer
		}
	}
	return dbImages
}

// Not in the Go Api we're using

// mapRestrictions maps *spotify.Restrictions to *models.Restrictions
// Commented out as per user feedback
// func mapRestrictions(r *spotify.Restrictions) *models.Restrictions {
// 	if r == nil || r.Reason == "" {
// 		return nil
// 	}
// 	return &models.Restrictions{
// 		Reason: r.Reason,
// 	}
// }

// Helper function to check if an item needs refreshing based on LastFetchedAt
func needsRefresh(lastFetched time.Time, threshold time.Duration) bool {
	return time.Since(lastFetched) > threshold
}

// GetOrSyncItem tries to get an item from the DB first. If not found or stale,
// it fetches from Spotify API, upserts to DB, and returns the item.
func (s *SpotifySyncService) GetOrSyncItem(ctx context.Context, spotifyID string, itemType string, spotifyToken string, refreshThreshold time.Duration) (interface{}, error) {
	if spotifyToken == "" {
		log.Println("Warning: Spotify token is missing in GetOrSyncItem, cannot sync if needed.")
	}

	var dbItem interface{}
	var lastFetched time.Time
	var err error
	var foundInDB bool

	// 1. Try to get from DB using GetByID
	switch itemType {
	case "track":
		track, errGet := s.trackDAO.GetByID(ctx, spotifyID)
		if errGet == nil {
			dbItem = track
			lastFetched = track.LastFetchedAt.Time()
			foundInDB = true
		} else if !errors.Is(errGet, mongo.ErrNoDocuments) {
			return nil, fmt.Errorf("error getting track from DB: %w", errGet)
		}
	case "album":
		album, errGet := s.albumDAO.GetByID(ctx, spotifyID)
		if errGet == nil {
			dbItem = album
			lastFetched = album.LastFetchedAt.Time()
			foundInDB = true
		} else if !errors.Is(errGet, mongo.ErrNoDocuments) {
			return nil, fmt.Errorf("error getting album from DB: %w", errGet)
		}
	case "artist":
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
	needsSync := !foundInDB || needsRefresh(lastFetched, refreshThreshold)

	if needsSync {
		log.Printf("Item %s (%s) not found in DB or needs refresh. Attempting sync...", spotifyID, itemType)

		if spotifyToken == "" {
			log.Printf("Cannot sync item %s (%s): Spotify token is missing.", spotifyID, itemType)
			if foundInDB {
				log.Println("Returning stale item as sync is not possible without token.")
				return dbItem, nil
			}
			return nil, errors.New("cannot sync item: spotify token missing")
		}

		// Create a temporary client for this sync operation
		tempClient := createTemporaryClient(ctx, spotifyToken)

		// 3. Fetch from Spotify and Upsert using the temporary client
		err = s.SyncItem(ctx, spotifyID, itemType, tempClient)
		if err != nil {
			if foundInDB {
				log.Printf("Sync failed for stale item %s (%s), returning stale data. Error: %v", spotifyID, itemType, err)
				return dbItem, nil // Return stale data if sync fails
			}
			return nil, fmt.Errorf("failed to sync item from Spotify: %w", err) // Sync failed and no stale data
		}

		// 4. Get the newly upserted item from DB using GetByID
		switch itemType {
		case "track":
			dbItem, err = s.trackDAO.GetByID(ctx, spotifyID)
		case "album":
			dbItem, err = s.albumDAO.GetByID(ctx, spotifyID)
		case "artist":
			dbItem, err = s.artistDAO.GetByID(ctx, spotifyID)
		}
		if err != nil {
			return nil, fmt.Errorf("failed to get item from DB after sync: %w", err)
		}
		log.Printf("Successfully synced and retrieved item %s (%s).", spotifyID, itemType)
	} else {
		log.Printf("Item %s (%s) found in DB and is fresh.", spotifyID, itemType)
	}

	return dbItem, nil
}
