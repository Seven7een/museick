package models

// SimplifiedArtist represents a simplified artist object as returned by Spotify API within other objects.
type SimplifiedArtist struct {
	ExternalUrls map[string]string `bson:"external_urls" json:"external_urls"`
	Href         string            `bson:"href" json:"href"`
	ID           string            `bson:"id" json:"id"` // Spotify Artist ID
	Name         string            `bson:"name" json:"name"`
	Type         string            `bson:"type" json:"type"` // "artist"
	URI          string            `bson:"uri" json:"uri"`
}

// SimplifiedAlbum represents a simplified album object as returned by Spotify API within track objects.
type SimplifiedAlbum struct {
	AlbumType            string             `bson:"album_type" json:"album_type"`
	TotalTracks          int                `bson:"total_tracks" json:"total_tracks"`
	AvailableMarkets     []string           `bson:"available_markets" json:"available_markets"`
	ExternalUrls         map[string]string  `bson:"external_urls" json:"external_urls"`
	Href                 string             `bson:"href" json:"href"`
	ID                   string             `bson:"id" json:"id"` // Spotify Album ID
	Images               []ImageObject      `bson:"images" json:"images"`
	Name                 string             `bson:"name" json:"name"`
	ReleaseDate          string             `bson:"release_date" json:"release_date"`
	ReleaseDatePrecision string             `bson:"release_date_precision" json:"release_date_precision"`
	Restrictions         *Restrictions      `bson:"restrictions,omitempty" json:"restrictions,omitempty"`
	Type                 string             `bson:"type" json:"type"` // "album"
	URI                  string             `bson:"uri" json:"uri"`
	Artists              []SimplifiedArtist `bson:"artists" json:"artists"` // Simplified artist objects
}

// ImageObject represents an image object from Spotify API.
type ImageObject struct {
	URL    string `bson:"url" json:"url"`
	Height *int   `bson:"height" json:"height"` // Pointer to handle null
	Width  *int   `bson:"width" json:"width"`   // Pointer to handle null
}

// Restrictions represents restriction information from Spotify API.
type Restrictions struct {
	Reason string `bson:"reason" json:"reason"`
}
