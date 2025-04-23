package models

type AudioFeatureRange struct {
	Min *float64 `json:"min,omitempty"`
	Max *float64 `json:"max,omitempty"`
}

type TrackFilters struct {
	Genres        []string                     `json:"genres,omitempty"`
	Tags          []string                     `json:"tags,omitempty"`
	AudioFeatures map[string]AudioFeatureRange `json:"audio_features,omitempty"`
}
