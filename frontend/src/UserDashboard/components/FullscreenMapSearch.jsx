import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LocationAutoSuggest from '../../components/LocationAutoSuggest/LocationAutoSuggest';
import CompactSearchBar from './CompactSearchBar';
import '../styles/FullscreenMapSearch.css';

/**
 * Fullscreen map search: shows the full CompactSearchBar (location, listing type,
 * property type, budget, bedrooms/area, stored by, etc.) in a compact layout.
 */
const FullscreenMapSearch = () => {
  return (
    <div className="map-fullscreen-compact-search">
      <CompactSearchBar />
    </div>
  );
};

export default FullscreenMapSearch;
