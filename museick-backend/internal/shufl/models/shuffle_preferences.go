package models

type AudioFeaturePreference struct {
	Weight float64  `json:"weight"`
	Target float64  `json:"target"`
	Min    *float64 `json:"min,omitempty"`
	Max    *float64 `json:"max,omitempty"`
}

type ShufflePreferences struct {
	Genres           []string                          `json:"genres"`
	Tags             []string                          `json:"tags"`
	AudioFeatures    map[string]AudioFeaturePreference `json:"audio_features"`
	MemoryBiasWeight float64                           `json:"memory_bias_weight"`
}
