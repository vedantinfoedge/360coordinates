// Property search helper based on location selection
// Uses existing buyer properties list API under the hood.

import { propertiesAPI } from './api.service';

/**
 * Search properties by location.
 *
 * @param {Object|string} locationData - Location object from LocationAutoSuggest or plain string
 * @param {Object} [extraParams] - Optional extra filters (status, property_type, budget, etc.)
 * @returns {Promise<any>} API response from backend
 */
export async function searchPropertiesByLocation(locationData, extraParams = {}) {
  if (!locationData) {
    throw new Error('Location is required to search properties');
  }

  const params = { ...extraParams };

  if (typeof locationData === 'string') {
    // Fallback: treat string as generic location filter
    params.location = locationData;
  } else {
    const { placeName, fullAddress, city, coordinates } = locationData;

    if (city) {
      params.city = city;
    }

    // Use placeName (locality) if available, else full address
    if (placeName) {
      params.location = placeName;
    } else if (fullAddress) {
      params.location = fullAddress;
    }

    // Pass coordinates + radius for future backend use (current PHP API ignores these safely)
    if (coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number') {
      params.lat = coordinates.lat;
      params.lng = coordinates.lng;
      if (!params.radius) {
        params.radius = 10; // default 10km radius
      }
    }
  }

  // Use existing buyer properties list endpoint with constructed query params
  const response = await propertiesAPI.list(params);
  return response;
}
