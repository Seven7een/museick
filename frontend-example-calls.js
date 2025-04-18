// --- Example Frontend API Calls ---

const API_BASE_URL = 'http://127.0.0.1:8080/api'; // Adjust if needed

// Function to get the JWT token (replace with your actual Clerk integration)
async function getAuthToken() {
	// Example using Clerk (ensure Clerk is initialized)
	// return await window.Clerk.session.getToken();
	return 'your-jwt-token-here'; // Placeholder
}

/**
 * Adds an item (song, album, artist) to the user's shortlist for a given month.
 * Initially adds it as a 'candidate'.
 */
async function addSelectionCandidate(spotifyId, spotifyType, monthYear) {
	const token = await getAuthToken();
	const url = `${API_BASE_URL}/selections`;

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`,
			},
			body: JSON.stringify({
				spotify_id: spotifyId, // e.g., "11dFghVXANMlKmJXsNCbNl"
				spotify_type: spotifyType, // "song", "album", or "artist"
				month_year: monthYear, // "YYYY-MM", e.g., "2024-07"
				selection_type: 'candidate', // Add as candidate initially
				notes: '', // Optional initial notes
			}),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error('Error adding selection:', data.error || response.statusText);
			// Handle specific errors (e.g., 400, 401, 404, 500)
			return null;
		}

		console.log('Selection added/found:', data);
		// data will be the created or existing user_selections document
		return data; // Contains the MongoDB _id as 'id'

	} catch (error) {
		console.error('Network or other error adding selection:', error);
		return null;
	}
}

/**
 * Lists all selections (candidates, muses, icks) for a given month.
 */
async function listSelections(monthYear) {
	const token = await getAuthToken();
	const url = `${API_BASE_URL}/selections/${monthYear}`; // e.g., /api/selections/2024-07

	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${token}`,
			},
		});

		const data = await response.json();

		if (!response.ok) {
			console.error('Error listing selections:', data.error || response.statusText);
			return [];
		}

		console.log(`Selections for ${monthYear}:`, data);
		return data; // Array of user_selections documents

	} catch (error) {
		console.error('Network or other error listing selections:', error);
		return [];
	}
}

/**
 * Updates a selection, e.g., promotes a candidate to Muse/Ick or adds notes.
 */
async function updateSelection(selectionMongoId, updates) {
	const token = await getAuthToken();
	const url = `${API_BASE_URL}/selections/${selectionMongoId}`; // Use the MongoDB _id

	// updates should be an object like:
	// { selection_type: "muse" } or { notes: "New note" } or { selection_type: "ick", notes: "Updated note" }

	if (!updates || (updates.selection_type === undefined && updates.notes === undefined)) {
		console.error("UpdateSelection requires 'selection_type' or 'notes' in updates object.");
		return null;
	}


	try {
		const response = await fetch(url, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`,
			},
			body: JSON.stringify(updates),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error('Error updating selection:', data.error || response.statusText);
			return null;
		}

		console.log('Selection updated:', data);
		return data; // The updated user_selections document

	} catch (error) {
		console.error('Network or other error updating selection:', error);
		return null;
	}
}

/**
 * Deletes a selection.
 */
async function deleteSelection(selectionMongoId) {
	const token = await getAuthToken();
	const url = `${API_BASE_URL}/selections/${selectionMongoId}`; // Use the MongoDB _id

	try {
		const response = await fetch(url, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${token}`,
			},
		});

		if (!response.ok) {
            // Handle non-JSON errors for 204 No Content on success
            if (response.status === 204) {
                 console.log('Selection deleted successfully.');
                 return true;
            }
			// Try parsing error JSON for other statuses
			let errorData = {};
			try {
				errorData = await response.json();
			} catch(e) {
				// Ignore JSON parse error if body is empty or not JSON
			}
			console.error('Error deleting selection:', errorData.error || response.statusText);
			return false;
		}

        // Should be 204 No Content on success
        if (response.status === 204) {
             console.log('Selection deleted successfully.');
             return true;
        } else {
            // Unexpected status code for success
             console.warn('Unexpected status code on delete:', response.status);
             return false;
        }


	} catch (error) {
		console.error('Network or other error deleting selection:', error);
		return false;
	}
}


// --- Example Usage ---
/*
async function runExamples() {
    // Example: Add a song as a candidate for July 2024
    const addedSelection = await addSelectionCandidate("spotifySongId123", "song", "2024-07");

    if (addedSelection) {
        console.log("Added selection with ID:", addedSelection.id); // Note: backend returns MongoDB _id as 'id'

        // Example: List selections for July 2024
        const julySelections = await listSelections("2024-07");

        // Example: Update the previously added selection to be a 'Muse'
        const updatedSelection = await updateSelection(addedSelection.id, { selection_type: "muse", notes: "This is my jam!" });

        // Example: Delete the selection
        // const deleted = await deleteSelection(addedSelection.id);
    }

     // Example: List selections for August 2024 (might be empty)
     const augustSelections = await listSelections("2024-08");
}

runExamples();
*/
