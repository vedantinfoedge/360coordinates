import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { UpcomingProjectCard } from '../components/UpcomingProjectCard';
import CompactSearchBar from '../components/CompactSearchBar';
import FullscreenMapSearch from '../components/FullscreenMapSearch';
import MapView from '../../components/Map/MapView';
import { propertiesAPI } from '../../services/api.service';
import '../styles/SearchResults.css';
import '../styles/CompactSearchBar.css';


const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const resultsHeaderRef = useRef(null);
  const propertyCardRefs = useRef({});
  const hoverTimeoutRef = useRef(null);

  // Scroll to top is handled by ScrollToTop component in buyer-dashboard.jsx
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  // Detect mobile screen size (≤767px) - matches CSS breakpoint
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [activeFilters, setActiveFilters] = useState({
    city: '',
    location: '',
    type: '',
    budget: '',
    bedrooms: '',
    area: '',
    seats: '',
    status: '',
    upload_time: '',
    expected_possession: '',
    project_status: ''
  });

  // Upcoming-projects mode: from View All in Upcoming Projects section
  const isUpcomingMode = useMemo(() => {
    const mode = searchParams.get('searchMode');
    const projectType = searchParams.get('project_type');
    return mode === 'upcoming-projects' || projectType === 'upcoming';
  }, [searchParams]);

  // Helpers for mapping upcoming projects (used only in upcoming mode)
  const extractCityFromLocation = (location) => {
    if (!location) return 'Unknown';
    const parts = location.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : location.split(' ')[0];
  };
  const formatBhkFromConfig = (configurations) => {
    if (!configurations || !Array.isArray(configurations) || configurations.length === 0) return 'N/A';
    const bhkConfigs = (configurations || [])
      .filter(c => c && (String(c).includes('BHK') || String(c).includes('bhk')))
      .map(c => {
        const m = String(c).match(/(\d+)\s*BHK/i);
        return m ? `${m[1]} BHK` : c;
      })
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => (parseInt(a.match(/\d+/)?.[0] || '0') - parseInt(b.match(/\d+/)?.[0] || '0')));
    return bhkConfigs.length > 0 ? bhkConfigs.join(', ') : configurations.join(', ');
  };
  const formatPriceForRange = (price) => {
    if (!price) return '0';
    return (price / 10000000).toFixed(1);
  };

  // Fetch properties from backend with filters
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        // Get search parameters from URL
        const city = searchParams.get('city') || '';
        const location = searchParams.get('location') || '';
        let type = searchParams.get('type') || searchParams.get('property_type') || '';
        const budget = searchParams.get('budget') || '';
        const bedrooms = searchParams.get('bedrooms') || '';
        const area = searchParams.get('area') || '';
        const seats = searchParams.get('seats') || '';
        let status = searchParams.get('status') || '';
        const uploadTime = searchParams.get('upload_time') || '';
        const expectedPossession = searchParams.get('expected_possession') || '';
        const projectStatus = searchParams.get('project_status') || '';

        // Upcoming-projects mode: fetch ONLY upcoming projects, ignore property listing flow
        if (searchParams.get('searchMode') === 'upcoming-projects' || searchParams.get('project_type') === 'upcoming') {
          const apiParams = { limit: 1000, project_type: 'upcoming' };
          if (city) apiParams.city = city;
          if (location) apiParams.location = location;
          if (type) apiParams.property_type = type;
          const response = await propertiesAPI.list(apiParams);
          if (!response.success || !response.data) {
            setFilteredProperties([]);
            setLoading(false);
            return;
          }
          let properties = response.data.properties || response.data.property || [];
          if (!Array.isArray(properties)) properties = [];
          const normalizeStatus = (s) => (s || '').toString().toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
          const mapped = properties.map(prop => {
            let imageUrl = prop.cover_image && prop.cover_image.trim() !== '' ? prop.cover_image
              : (Array.isArray(prop.images) && prop.images.length > 0 ? prop.images.find(img => img && img.trim() !== '') : null) || null;
            if (!imageUrl || imageUrl.trim() === '') imageUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';
            let upcomingData = {};
            try {
              if (typeof prop.upcoming_project_data === 'string') upcomingData = JSON.parse(prop.upcoming_project_data) || {};
              else if (typeof prop.upcoming_project_data === 'object') upcomingData = prop.upcoming_project_data || {};
            } catch (e) { /* ignore */ }
            if (projectStatus) {
              const projectStatusVal = normalizeStatus(upcomingData.projectStatus || '');
              const statusFilter = normalizeStatus(projectStatus);
              if (!projectStatusVal || !statusFilter || (projectStatusVal !== statusFilter && !projectStatusVal.includes(statusFilter))) return null;
            }
            const expPoss = upcomingData.expectedPossessionDate || upcomingData.expected_possession || '';
            if (expectedPossession && expPoss) {
              const expDate = new Date(expPoss);
              if (!isNaN(expDate.getTime())) {
                const now = new Date();
                const monthsUntil = (expDate.getFullYear() - now.getFullYear()) * 12 + (expDate.getMonth() - now.getMonth());
                const maxMonths = parseInt(expectedPossession, 10);
                if (maxMonths === 24) { if (monthsUntil < 24) return null; }
                else if (!isNaN(maxMonths)) { if (monthsUntil > maxMonths || monthsUntil < 0) return null; }
              } else return null;
            } else if (expectedPossession) return null;
            const imagesArr = Array.isArray(prop.images) ? prop.images : (prop.images ? [prop.images] : (imageUrl ? [imageUrl] : []));
            return {
              id: prop.id,
              image: imageUrl,
              images: imagesArr,
              cover_image: prop.cover_image || imageUrl,
              title: prop.title,
              location: prop.location,
              city: extractCityFromLocation(prop.location),
              bhkType: formatBhkFromConfig(upcomingData.configurations),
              priceRange: formatPriceForRange(prop.price),
              projectStatus: upcomingData.projectStatus,
              price: parseFloat(prop.price) || 0,
              builder: upcomingData.builderName || prop.seller_name || 'Builder',
              builderLink: `#builder-${prop.id}`,
              upcomingData,
              propertyData: prop,
              latitude: prop.latitude,
              longitude: prop.longitude
            };
          }).filter(Boolean);
          setFilteredProperties(mapped);
          setLoading(false);
          return;
        }

        // Context-aware: View All from Buy/Rent/PG pages passes propertyType (buy|rent|pg)
        const propertyType = (searchParams.get('propertyType') || '').toLowerCase();
        if (propertyType === 'buy') {
          status = status || 'sale';
        } else if (propertyType === 'rent') {
          status = status || 'rent';
        } else if (propertyType === 'pg') {
          type = type || 'PG / Hostel';
        }

        // Check if this is a PG/Hostel search
        const isPGHostelSearch = type === 'PG / Hostel' || type.toLowerCase().includes('pg') || type.toLowerCase().includes('hostel');

        // Build API parameters
        const apiParams = {
          limit: 1000 // Increased limit for PG/Hostel searches to get more properties
        };

        // Pass city if available (backend uses city OR location, preferring location)
        if (city) apiParams.city = city;
        if (location) apiParams.location = location;
        if (budget) apiParams.budget = budget;
        if (bedrooms) apiParams.bedrooms = bedrooms;
        if (area) apiParams.area = area;
        if (seats) apiParams.seats = seats;
        if (status) {
          // Convert "For Sale" / "For Rent" to "sale" / "rent"
          apiParams.status = status.toLowerCase().replace('for ', '');
        }
        if (uploadTime) apiParams.upload_time = uploadTime;

        console.log('🔍 Search parameters from URL:', { city, location, type, budget, bedrooms, area, seats, status });

        let response;

        // For PG/Hostel searches, fetch all property types that are available for bachelors (PG/Hostel, Apartment, Flat, etc.)
        if (isPGHostelSearch) {
          console.log('📡 PG/Hostel search detected - fetching all property types available for bachelors');

          response = await propertiesAPI.list({
            ...apiParams,
            available_for_bachelors: true
          });
        } else {
          // For non-PG/Hostel searches, use normal API call
          if (type) apiParams.property_type = type;
          console.log('📡 API params being sent:', apiParams);
          response = await propertiesAPI.list(apiParams);
        }

        console.log('✅ API response received:', response);
        console.log('📊 Response success:', response.success);
        console.log('📦 Response data:', response.data);

        if (response.success && response.data) {
          // Handle different response structures
          let properties = [];

          if (Array.isArray(response.data.properties)) {
            properties = response.data.properties;
          } else if (Array.isArray(response.data.property)) {
            properties = response.data.property;
          } else if (Array.isArray(response.data)) {
            properties = response.data;
          } else if (response.data.properties && typeof response.data.properties === 'object') {
            // If properties is an object, try to convert to array
            properties = Object.values(response.data.properties);
          }

          console.log(`📋 Found ${properties.length} properties`);

          if (Array.isArray(properties) && properties.length > 0) {
            // Convert backend properties to frontend format
            // Exclude upcoming projects - they should only appear in Upcoming Projects section
            // For PG/Hostel searches: show all property types that are available for bachelors
            const backendProperties = properties
              .filter(prop => {
                // Exclude upcoming projects
                if (prop.project_type && prop.project_type === 'upcoming') {
                  return false;
                }

                // If this is a PG/Hostel search, show only properties available for bachelors
                if (isPGHostelSearch) {
                  const isAvailableForBachelors = prop.available_for_bachelors === 1 || prop.available_for_bachelors === true;
                  return isAvailableForBachelors;
                }

                return true;
              })
              .map(prop => {
                // Get the best image (cover_image or first image from array)
                let imageUrl = prop.cover_image ||
                  (Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : null) ||
                  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500';

                return {
                  id: prop.id,
                  image: imageUrl,
                  cover_image: prop.cover_image || imageUrl,
                  title: prop.title || 'Untitled Property',
                  price: parseFloat(prop.price) || 0,
                  location: prop.location || 'Location not specified',
                  bedrooms: prop.bedrooms || '0',
                  bathrooms: prop.bathrooms || '0',
                  area: parseFloat(prop.area) || 0,
                  seats: prop.seats || '',
                  type: prop.property_type || prop.type || 'Unknown',
                  status: prop.status === 'sale' ? 'For Sale' : (prop.status === 'rent' ? 'For Rent' : prop.status || 'For Sale'),
                  propertyType: prop.property_type || prop.type || 'Unknown',
                  projectType: prop.project_type || null, // Include project_type for reference
                  description: prop.description || '',
                  amenities: Array.isArray(prop.amenities) ? prop.amenities : (prop.amenities ? [prop.amenities] : []),
                  images: Array.isArray(prop.images) ? prop.images : (prop.images ? [prop.images] : []),
                  latitude: prop.latitude,
                  longitude: prop.longitude,
                  createdAt: prop.created_at,
                  seller_name: prop.seller_name,
                  seller_phone: prop.seller_phone,
                  available_for_bachelors: prop.available_for_bachelors || 0
                };
              });

            // Client-side fallback: apply filters in case backend returned unfiltered/partial data
            // For PG/Hostel search, don't filter by type so we show all property types available for bachelors
            const statusForFilter = status === 'sale' ? 'For Sale' : status === 'rent' ? 'For Rent' : status || '';
            const locationForFilter = location || city || '';
            const typeForFilter = isPGHostelSearch ? '' : type;
            const filtered = filterProperties(locationForFilter, typeForFilter, budget, bedrooms, area, seats, statusForFilter, backendProperties);

            console.log(`✅ Setting ${filtered.length} properties to state (upcoming projects excluded)`);
            setFilteredProperties(filtered);
          } else {
            console.log('⚠️ No properties found in response array');
            setFilteredProperties([]);
          }
        } else {
          console.warn('⚠️ API response not successful:', response);
          setFilteredProperties([]);
        }
      } catch (error) {
        console.error('❌ Error fetching properties:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          errors: error.errors
        });

        // On error, try to fetch all properties as fallback
        try {
          console.log('🔄 Attempting fallback: fetching all properties');
          const fallbackLocation = searchParams.get('location') || '';
          const fallbackCity = searchParams.get('city') || '';
          const fallbackBudget = searchParams.get('budget') || '';
          const fallbackBedrooms = searchParams.get('bedrooms') || '';
          const fallbackArea = searchParams.get('area') || '';
          const fallbackSeats = searchParams.get('seats') || '';
          const fallbackResponse = await propertiesAPI.list({ limit: 100 });
          if (fallbackResponse.success && fallbackResponse.data) {
            const fallbackProperties = fallbackResponse.data.properties || fallbackResponse.data.property || [];
            if (Array.isArray(fallbackProperties) && fallbackProperties.length > 0) {
              // Derive type/status from propertyType (View All context) same as main fetch
              const fallbackPropertyType = (searchParams.get('propertyType') || '').toLowerCase();
              let fallbackType = searchParams.get('type') || searchParams.get('property_type') || '';
              let fallbackStatus = searchParams.get('status') || '';
              if (fallbackPropertyType === 'pg') fallbackType = fallbackType || 'PG / Hostel';
              if (fallbackPropertyType === 'buy') fallbackStatus = fallbackStatus || 'sale';
              if (fallbackPropertyType === 'rent') fallbackStatus = fallbackStatus || 'rent';
              const isPGHostelSearchFallback = fallbackType === 'PG / Hostel' || fallbackType.toLowerCase().includes('pg') || fallbackType.toLowerCase().includes('hostel');

              // Exclude upcoming projects in fallback as well
              const convertedProperties = fallbackProperties
                .filter(prop => {
                  if (prop.project_type && prop.project_type === 'upcoming') {
                    return false;
                  }
                  if (fallbackStatus === 'sale' && (prop.status !== 'sale' && prop.status !== 'For Sale')) return false;
                  if (fallbackStatus === 'rent' && (prop.status !== 'rent' && prop.status !== 'For Rent')) return false;
                  if (isPGHostelSearchFallback) {
                    const isAvailableForBachelors = prop.available_for_bachelors === 1 || prop.available_for_bachelors === true;
                    return isAvailableForBachelors;
                  }
                  return true;
                })
                .map(prop => ({
                  id: prop.id,
                  image: prop.cover_image || (Array.isArray(prop.images) && prop.images[0]) || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500',
                  title: prop.title || 'Untitled Property',
                  price: parseFloat(prop.price) || 0,
                  location: prop.location || 'Location not specified',
                  bedrooms: prop.bedrooms || '0',
                  bathrooms: prop.bathrooms || '0',
                  area: parseFloat(prop.area) || 0,
                  seats: prop.seats || '',
                  type: prop.property_type || prop.type || 'Unknown',
                  status: prop.status === 'sale' ? 'For Sale' : (prop.status === 'rent' ? 'For Rent' : prop.status || 'For Sale'),
                  propertyType: prop.property_type || prop.type || 'Unknown',
                  projectType: prop.project_type || null, // Include project_type for reference
                  description: prop.description || '',
                  amenities: Array.isArray(prop.amenities) ? prop.amenities : [],
                  images: Array.isArray(prop.images) ? prop.images : [],
                  latitude: prop.latitude,
                  longitude: prop.longitude,
                  createdAt: prop.created_at,
                  seller_name: prop.seller_name,
                  seller_phone: prop.seller_phone,
                  available_for_bachelors: prop.available_for_bachelors || 0
                }));
              // Client-side fallback: apply filters to fallback results (no type filter for PG/Hostel so all bachelor-available types show)
              const fallbackStatusForFilter = fallbackStatus === 'sale' ? 'For Sale' : fallbackStatus === 'rent' ? 'For Rent' : fallbackStatus || '';
              const fallbackTypeForFilter = isPGHostelSearchFallback ? '' : fallbackType;
              const fallbackFiltered = filterProperties(fallbackLocation || fallbackCity, fallbackTypeForFilter, fallbackBudget, fallbackBedrooms, fallbackArea, fallbackSeats, fallbackStatusForFilter, convertedProperties);
              console.log(`✅ Fallback: Setting ${fallbackFiltered.length} properties (upcoming projects excluded)`);
              setFilteredProperties(fallbackFiltered);
            } else {
              setFilteredProperties([]);
            }
          } else {
            setFilteredProperties([]);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback fetch also failed:', fallbackError);
          setFilteredProperties([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [searchParams]);

  const isInBudgetRange = (price, budgetRange, status) => {
    const saleRanges = {
      '0-25L': { min: 0, max: 2500000 },
      '25L-50L': { min: 2500000, max: 5000000 },
      '50L-75L': { min: 5000000, max: 7500000 },
      '75L-1Cr': { min: 7500000, max: 10000000 },
      '1Cr-2Cr': { min: 10000000, max: 20000000 },
      '2Cr+': { min: 20000000, max: Infinity }
    };
    // Rent / PG Hostel budgets (monthly)
    const rentRanges = {
      '0K-5K': { min: 0, max: 5000 },
      '5K-10K': { min: 5000, max: 10000 },
      '10K-20K': { min: 10000, max: 20000 },
      '20K-30K': { min: 20000, max: 30000 },
      '30K-50K': { min: 30000, max: 50000 },
      '50K-75K': { min: 50000, max: 75000 },
      '75K-1L': { min: 75000, max: 100000 },
      '1L-2L': { min: 100000, max: 200000 },
      '2L+': { min: 200000, max: Infinity }
    };

    const ranges = status === 'For Rent' ? rentRanges : saleRanges;
    const range = ranges[budgetRange];
    if (!range) return true;

    const comparePrice = price;
    return comparePrice >= range.min && comparePrice <= range.max;
  };

  const filterProperties = useCallback((location, type, budget, bedrooms, area, seats, status, properties) => {
    let results = [...(properties || [])];

    // Filter by status (For Sale / For Rent)
    if (status) {
      results = results.filter(property =>
        property.status === status
      );
    }

    // Filter by location (case-insensitive, partial match)
    if (location) {
      results = results.filter(property =>
        property.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Filter by property type (handles compound types like "Villa / Row House / Bungalow / Farm House")
    if (type) {
      // Split compound types by " / " to get individual types
      const typesToMatch = type.split(' / ').map(t => t.trim().toLowerCase());

      results = results.filter(property => {
        const propertyType = property.type.toLowerCase().trim();
        // Check if property type matches ANY of the types in the selection
        return typesToMatch.some(t =>
          propertyType === t || propertyType.includes(t) || t.includes(propertyType)
        );
      });
    }

    // Filter by budget range
    if (budget) {
      results = results.filter(property => {
        const price = property.price;
        return isInBudgetRange(price, budget, property.status);
      });
    }

    // Filter by bedrooms (handle BHK format like "1 BHK", "2 BHK" or plain numbers like "1", "2", "5+")
    if (bedrooms) {
      const bedroomStr = bedrooms.toString();
      // Extract number from formats: "1", "2", "1 BHK", "2 BHK", "5+", "5+ BHK"
      const bedroomMatch = bedroomStr.match(/(\d+)/);
      const bedroomCount = bedroomMatch ? parseInt(bedroomMatch[1]) : null;
      const isPlus = bedroomStr.includes('+');

      if (bedroomCount !== null) {
        results = results.filter(property => {
          // Extract number from property bedrooms (handles "1", "2", "1 BHK", "2 BHK", etc.)
          const propBedrooms = typeof property.bedrooms === 'string'
            ? (parseInt(property.bedrooms.replace(/\D/g, '')) || 0)
            : (property.bedrooms || 0);

          if (isPlus) {
            // For "5+" or "5+ BHK", return properties with >= 5 bedrooms
            return propBedrooms >= bedroomCount;
          } else {
            // For exact match like "1", "2", "1 BHK", "2 BHK"
            return propBedrooms === bedroomCount;
          }
        });
      }
    }

    // Filter by area (if provided)
    if (area) {
      // Parse area range like "0-500 sq ft"
      const areaMatch = area.match(/(\d+)-(\d+)/);
      if (areaMatch) {
        const minArea = parseInt(areaMatch[1]);
        const maxArea = parseInt(areaMatch[2]);
        results = results.filter(property => {
          const propArea = typeof property.area === 'string'
            ? parseFloat(property.area)
            : property.area;
          return propArea >= minArea && propArea <= maxArea;
        });
      } else if (area.includes('+')) {
        // Handle "10000+ sq ft"
        const minArea = parseInt(area.replace(/\D/g, ''));
        results = results.filter(property => {
          const propArea = typeof property.area === 'string'
            ? parseFloat(property.area)
            : property.area;
          return propArea >= minArea;
        });
      }
    }

    // Filter by seats (if provided)
    if (seats) {
      // Parse seat range like "2-5 seats" or "10+ seats"
      const seatMatch = seats.match(/(\d+)[–-](\d+)/); // Handle both en-dash and hyphen
      if (seatMatch) {
        const minSeats = parseInt(seatMatch[1]);
        const maxSeats = parseInt(seatMatch[2]);
        results = results.filter(property => {
          const propSeats = parseInt(property.seats) || 0;
          return propSeats >= minSeats && propSeats <= maxSeats;
        });
      } else if (seats.includes('+')) {
        const minSeats = parseInt(seats.replace(/\D/g, ''));
        results = results.filter(property => {
          const propSeats = parseInt(property.seats) || 0;
          return propSeats >= minSeats;
        });
      } else if (seats.includes('1 seat')) {
        results = results.filter(property => (parseInt(property.seats) || 0) === 1);
      }
    }

    return results;
  }, []);

  // Update active filters when search params change (sync with filter UI)
  useEffect(() => {
    let city = searchParams.get('city') || '';
    const location = searchParams.get('location') || '';
    let type = searchParams.get('type') || searchParams.get('property_type') || '';
    const budget = searchParams.get('budget') || '';
    const bedrooms = searchParams.get('bedrooms') || '';
    const area = searchParams.get('area') || '';
    const seats = searchParams.get('seats') || '';
    let status = searchParams.get('status') || '';
    const upload_time = searchParams.get('upload_time') || '';
    const expected_possession = searchParams.get('expected_possession') || '';
    const project_status = searchParams.get('project_status') || '';

    // Context-aware: reflect propertyType in filter UI (Buy/Rent/PG from View All)
    const propertyType = (searchParams.get('propertyType') || '').toLowerCase();
    if (propertyType === 'buy') {
      status = status || 'For Sale';
    } else if (propertyType === 'rent') {
      status = status || 'For Rent';
    } else if (propertyType === 'pg') {
      type = type || 'PG / Hostel';
    } else {
      if (status === 'sale') status = 'For Sale';
      else if (status === 'rent') status = 'For Rent';
    }

    setActiveFilters({ city, location, type, budget, bedrooms, area, seats, status, upload_time, expected_possession, project_status });
  }, [searchParams]);


  const clearAllFilters = () => {
    const basePath = location.pathname.includes('/buyer-dashboard/search')
      ? '/buyer-dashboard/search'
      : '/searchresults';
    if (isUpcomingMode) {
      navigate(`${basePath}?searchMode=upcoming-projects&project_type=upcoming`);
    } else {
      navigate(basePath);
    }
    setActiveFilters({ city: '', location: '', type: '', budget: '', bedrooms: '', area: '', seats: '', status: '', upload_time: '', expected_possession: '', project_status: '' });
  };

  const removeFilter = (filterName) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(filterName);

    if (filterName === 'type') {
      newParams.delete('property_type');
      newParams.delete('propertyType');
    }
    if (filterName === 'status') {
      newParams.delete('propertyType');
    }
    if (isUpcomingMode) {
      if (!newParams.has('searchMode')) newParams.set('searchMode', 'upcoming-projects');
      if (!newParams.has('project_type')) newParams.set('project_type', 'upcoming');
    }

    const queryString = newParams.toString();
    const basePath = location.pathname.includes('/buyer-dashboard/search') ? '/buyer-dashboard/search' : '/searchresults';
    navigate(queryString ? `${basePath}?${queryString}` : basePath);
  };


  const hasActiveFilters = isUpcomingMode
    ? (activeFilters.city || activeFilters.location || activeFilters.type || activeFilters.expected_possession || activeFilters.project_status)
    : Object.values(activeFilters).some(value => value !== '');

  // Handle property card hover/selection - highlight on map (with debounce)
  const handlePropertyCardHover = useCallback((property) => {
    // Clear any existing timeout to avoid rapid switching
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set a new timeout to delay selection
    hoverTimeoutRef.current = setTimeout(() => {
      setSelectedPropertyId(property.id);
    }, 300); // 300ms delay
  }, []);

  // Handle property card leave - cancel pending selection
  const handlePropertyCardLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Handle map marker click - highlight property card
  const handleMapMarkerClick = useCallback((property) => {
    setSelectedPropertyId(property.id);
    // Scroll to property card
    if (propertyCardRefs.current[property.id]) {
      propertyCardRefs.current[property.id].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, []);

  // Helper to validate coordinates
  const isValidCoordinate = useCallback((lat, lng) => {
    if (lat === null || lng === null || lat === undefined || lng === undefined) return false;
    const numLat = typeof lat === 'string' ? parseFloat(lat) : lat;
    const numLng = typeof lng === 'string' ? parseFloat(lng) : lng;
    if (isNaN(numLat) || isNaN(numLng)) return false;
    return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180;
  }, []);

  // Calculate map center from properties
  const mapCenter = useMemo(() => {
    if (filteredProperties.length === 0) {
      return [73.8567, 18.5204]; // Default: Pune
    }

    const propertiesWithCoords = filteredProperties.filter(p =>
      isValidCoordinate(p.latitude, p.longitude)
    );

    if (propertiesWithCoords.length === 0) {
      return [73.8567, 18.5204]; // Default: Pune
    }

    const avgLng = propertiesWithCoords.reduce((sum, p) => {
      const lng = typeof p.longitude === 'string' ? parseFloat(p.longitude) : p.longitude;
      return sum + lng;
    }, 0) / propertiesWithCoords.length;

    const avgLat = propertiesWithCoords.reduce((sum, p) => {
      const lat = typeof p.latitude === 'string' ? parseFloat(p.latitude) : p.latitude;
      return sum + lat;
    }, 0) / propertiesWithCoords.length;

    return [avgLng, avgLat];
  }, [filteredProperties, isValidCoordinate]);

  // Convert properties to MapView format with proper validation
  const mapProperties = useMemo(() => {
    return filteredProperties
      .filter(p => isValidCoordinate(p.latitude, p.longitude))
      .map(property => {
        const lat = typeof property.latitude === 'string' ? parseFloat(property.latitude) : property.latitude;
        const lng = typeof property.longitude === 'string' ? parseFloat(property.longitude) : property.longitude;

        // Get image - handle various formats (prioritize full images array for carousel)
        let thumbnail = null;
        let images = [];

        if (property.images && Array.isArray(property.images) && property.images.length > 0) {
          if (typeof property.images[0] === 'string') {
            thumbnail = property.images[0];
            images = property.images;
          } else if (property.images[0] && property.images[0].url) {
            thumbnail = property.images[0].url;
            images = property.images.map(img => typeof img === 'string' ? img : (img && img.url) || '').filter(Boolean);
          }
        }
        if (images.length === 0 && (property.image || property.cover_image)) {
          thumbnail = property.image || property.cover_image;
          images = [thumbnail];
        }

        return {
          id: property.id,
          title: property.title || 'Untitled Property',
          location: property.location || 'Location not specified',
          price: typeof property.price === 'string' ? parseFloat(property.price) : (property.price || 0),
          area: typeof property.area === 'string' ? parseFloat(property.area) : (property.area || 0),
          bedrooms: property.bedrooms || '0',
          bathrooms: property.bathrooms || '0',
          listing_type: property.status === 'For Rent' ? 'rent' : 'sale',
          property_type: property.type || property.propertyType || 'Unknown',
          latitude: lat,
          longitude: lng,
          thumbnail: thumbnail,
          images: images,
          cover_image: thumbnail,
          seller_id: property.seller_id
        };
      });
  }, [filteredProperties, isValidCoordinate]);


  return (
    <div className="buyer-search-results-page">
      {/* Compact Search Bar */}
      <CompactSearchBar />

      {/* Main Split Layout */}
      <div className="search-results-split-layout">
        {/* Left Side - Scrollable Listings */}
        <div className="search-results-listings">
          {/* Results Header */}
          <div className="search-results-header" ref={resultsHeaderRef}>
            <div className="search-results-header-top">
              <h2 className="search-results-title">
                {filteredProperties.length} {isUpcomingMode
                  ? (filteredProperties.length === 1 ? 'project' : 'projects')
                  : (filteredProperties.length === 1 ? 'property' : 'properties')} found
              </h2>
              {/* Mobile Map Toggle */}
              {isMobile && (
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="mobile-map-toggle"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {showMap ? 'Hide Map' : 'Show Map'}
                </button>
              )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="search-results-filters">
                <span className="filters-label">Active Filters:</span>
                <div className="filter-tags">
                  {activeFilters.city && (
                    <div className="filter-tag filter-tag-city">
                      <span>City: {activeFilters.city}</span>
                      <button onClick={() => removeFilter('city')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.location && (
                    <div className="filter-tag filter-tag-location">
                      <span>Location: {activeFilters.location}</span>
                      <button onClick={() => removeFilter('location')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.type && (
                    <div className={`filter-tag filter-tag-type ${activeFilters.type.toLowerCase().includes('pg') || activeFilters.type.toLowerCase().includes('hostel') ? 'filter-tag-pghostel' : ''}`}>
                      <span>Type: {activeFilters.type}</span>
                      <button onClick={() => removeFilter('type')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.budget && (
                    <div className="filter-tag filter-tag-budget">
                      <span>Budget: {activeFilters.budget}</span>
                      <button onClick={() => removeFilter('budget')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.bedrooms && (
                    <div className="filter-tag filter-tag-bedrooms">
                      <span>Bedrooms: {activeFilters.bedrooms}</span>
                      <button onClick={() => removeFilter('bedrooms')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.area && (
                    <div className="filter-tag filter-tag-area">
                      <span>Area: {activeFilters.area}</span>
                      <button onClick={() => removeFilter('area')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.seats && (
                    <div className="filter-tag filter-tag-area">
                      <span>Seat Capacity: {activeFilters.seats}</span>
                      <button onClick={() => removeFilter('seats')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.status && (
                    <div className={`filter-tag filter-tag-status filter-tag-${activeFilters.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      <span>Status: {activeFilters.status}</span>
                      <button onClick={() => removeFilter('status')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {activeFilters.upload_time && (
                    <div className="filter-tag filter-tag-upload-time">
                      <span>Upload Time: {
                        activeFilters.upload_time === '7' ? 'Within 7 days' :
                          activeFilters.upload_time === '14' ? 'Within 2 weeks' :
                            activeFilters.upload_time === '30' ? 'Within 1 month' :
                              activeFilters.upload_time
                      }</span>
                      <button onClick={() => removeFilter('upload_time')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {isUpcomingMode && activeFilters.expected_possession && (
                    <div className="filter-tag filter-tag-expected-possession">
                      <span>Possession: {
                        activeFilters.expected_possession === '6' ? '6 Months' :
                          activeFilters.expected_possession === '12' ? '12 Months' :
                            activeFilters.expected_possession === '18' ? '18 Months' :
                              activeFilters.expected_possession === '24' ? '24 Months+' :
                                activeFilters.expected_possession
                      }</span>
                      <button onClick={() => removeFilter('expected_possession')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  {isUpcomingMode && activeFilters.project_status && (
                    <div className="filter-tag filter-tag-project-status">
                      <span>Status: {activeFilters.project_status}</span>
                      <button onClick={() => removeFilter('project_status')} className="remove-filter">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                  <button onClick={clearAllFilters} className="clear-all-btn">
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Content */}
          <div className="search-results-content">
            {loading ? (
              <div className="search-loading-results">
                <div className="search-loading-spinner"></div>
                <p>Searching properties...</p>
              </div>
            ) : filteredProperties.length > 0 ? (
              <div className="search-results-grid">
                {isUpcomingMode
                  ? filteredProperties.map(project => (
                    <div
                      key={project.id}
                      ref={el => propertyCardRefs.current[project.id] = el}
                      className={`property-card-wrapper ${selectedPropertyId === project.id ? 'selected' : ''}`}
                      onMouseEnter={() => handlePropertyCardHover(project)}
                      onMouseLeave={handlePropertyCardLeave}
                    >
                      <UpcomingProjectCard project={project} />
                    </div>
                  ))
                  : filteredProperties.map(property => (
                    <div
                      key={property.id}
                      ref={el => propertyCardRefs.current[property.id] = el}
                      className={`property-card-wrapper ${selectedPropertyId === property.id ? 'selected' : ''}`}
                      onMouseEnter={() => handlePropertyCardHover(property)}
                      onMouseLeave={handlePropertyCardLeave}
                    >
                      <PropertyCard property={property} />
                    </div>
                  ))}
              </div>
            ) : (
              <div className="search-no-results">
                <svg
                  width="100"
                  height="100"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#cbd5e0"
                  strokeWidth="1.5"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <h3>{isUpcomingMode ? 'No Projects Found' : 'No Properties Found'}</h3>
                <p>{isUpcomingMode ? "We couldn't find any upcoming projects matching your search criteria." : "We couldn't find any properties matching your search criteria."}</p>
                <div className="search-no-results-actions">
                  <button onClick={clearAllFilters} className="search-try-again-btn">
                    Clear Filters & Try Again
                  </button>
                  <button onClick={() => navigate('/buyer-dashboard')} className="search-go-home-btn">
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Fixed Map (Desktop only) */}
        {!isMobile && (
          <div className="search-results-map">
            <MapView
              properties={mapProperties}
              center={mapCenter}
              zoom={mapProperties.length > 0 ? 12 : 5}
              showControls={true}
              interactive={true}
              currentPropertyId={selectedPropertyId}
              onPropertyClick={handleMapMarkerClick}
              fullscreenSearchBar={<FullscreenMapSearch />}
            />
          </div>
        )}
      </div>

      {/* Mobile: Show map as overlay when toggled */}
      {isMobile && showMap && (
        <div className="mobile-map-overlay" onClick={() => setShowMap(false)}>
          <div className="mobile-map-container" onClick={(e) => e.stopPropagation()}>
            <button
              className="mobile-map-close"
              onClick={() => setShowMap(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <MapView
              properties={mapProperties}
              center={mapCenter}
              zoom={mapProperties.length > 0 ? 12 : 5}
              showControls={true}
              interactive={true}
              currentPropertyId={selectedPropertyId}
              onPropertyClick={handleMapMarkerClick}
              fullscreenSearchBar={<FullscreenMapSearch />}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;