// fileName: seller-pro-details.jsx

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { FaPhone, FaEnvelope, FaAngleLeft, FaAngleRight, FaBed, FaShower, FaRulerCombined, FaTimes, FaCheckCircle, FaUser, FaCommentAlt } from "react-icons/fa";
import '../../UserDashboard/styles/ViewDetailPage.css';
import { useProperty } from './PropertyContext';

// --- Image Slider Modal Component ---
const ImageSliderModal = ({ images, currentIndex, onClose, onNext, onPrev }) => {
    const isOpen = currentIndex !== null;
    
    if (!images || images.length === 0) return null;
    
    const currentImage = isOpen ? images[currentIndex] : null;
    const showControls = images.length > 1;
    
    return (
        <div className={`buyer-image-slider-modal-overlay ${isOpen ? 'open' : ''}`}>
            {currentImage && (
                <div className="buyer-image-slider-modal-content">
                    <button className="buyer-slider-close-btn" onClick={onClose} aria-label="Close Slider">
                        <FaTimes />
                    </button>
                    
                    <div className="buyer-slider-controls">
                        {showControls && (
                            <button className="buyer-slider-prev-btn" onClick={onPrev} aria-label="Previous Image">
                                <FaAngleLeft />
                            </button>
                        )}
                        
                        <img 
                            src={typeof currentImage === 'string' ? currentImage : currentImage.url || currentImage} 
                            alt="Property" 
                            className="buyer-slider-main-image" 
                        />

                        {showControls && (
                            <button className="buyer-slider-next-btn" onClick={onNext} aria-label="Next Image">
                                <FaAngleRight />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Helper function to map property data to ViewDetailsPage structure ---
const getPropertyDetails = (property) => {
    window.scrollTo(0,0);
    if (!property) return null;
    
    // Convert images array to format expected by buyer layout
    // Handle both string URLs and object format, filter out blob URLs
    let images = [];
    if (property.images && property.images.length > 0) {
        // Filter out blob URLs (temporary preview URLs) and keep only actual URLs
        const validImages = property.images.filter(img => {
            if (typeof img === 'string') {
                return !img.startsWith('blob:');
            }
            return img && (img.url || img);
        });
        
        if (validImages.length > 0) {
            images = validImages.map((img, idx) => ({
                id: idx + 1,
                url: typeof img === 'string' ? img : (img.url || img),
                alt: property.title || `Property view ${idx + 1}`
            }));
        }
    }
    
    // Fallback to cover_image if no valid images
    if (images.length === 0 && property.cover_image) {
        images = [{
            id: 1,
            url: property.cover_image,
            alt: property.title || 'Property image'
        }];
    }
    
    // Final fallback to placeholder
    if (images.length === 0) {
        images = [{
            id: 1,
            url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500',
            alt: property.title || 'Property image'
        }];
    }
    
    const status = property.status === 'sale' ? 'For Sale' : 'For Rent';
    const price = property.status === 'rent' 
        ? `₹ ${parseFloat(property.price).toLocaleString('en-IN')}/Month` 
        : `₹ ${parseFloat(property.price).toLocaleString('en-IN')}`;
    
    return {
        id: property.id,
        title: property.title,
        location: property.location,
        price: price,
        area: `${property.area?.toLocaleString('en-IN') || property.area} sq.ft.`,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        status: status,
        description: property.description || `Discover unparalleled living in this magnificent property. Featuring modern amenities, panoramic city views, and spacious interiors. Perfect blend of comfort and luxury.`,
        amenities: property.amenities || ["Swimming Pool", "Gymnasium", "24/7 Security", "Covered Parking", "Clubhouse", "Children's Play Area"],
        images: images
    };
}

// ============================================================================
// GOOGLE MAP FEATURE COMPONENT
// ============================================================================

const GoogleMapFeature = memo(({ location, latitude, longitude }) => {
    // Create Google Maps embed URL - using public embed API (no key needed for basic embed)
    const mapUrl = latitude && longitude
        ? `https://www.google.com/maps?q=${latitude},${longitude}&output=embed&z=15`
        : `https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed&z=15`;
    
    return (
        <div className="buyer-map-card-container">
            <h3>Property Location</h3>
            <div className="buyer-map-embed-area" aria-label={`Google Map for ${location}`}>
                <iframe
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0, borderRadius: '8px' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map showing ${location}`}
                ></iframe>
            </div>
        </div>
    );
});

// --- Main Page Component ---
const ViewDetailsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Extract ID from pathname since we're using catch-all route
    // Path format: /seller-dashboard/seller-pro-details/2
    const pathMatch = location.pathname.match(/seller-pro-details\/(\d+)/);
    const id = pathMatch ? pathMatch[1] : null;
    const propertyId = id ? parseInt(id, 10) : null;
    
    console.log('🔍 ViewDetailsPage - Pathname:', location.pathname);
    console.log('🔍 ViewDetailsPage - Extracted ID:', id, 'PropertyId:', propertyId);

    const { properties, loading: propertiesLoading } = useProperty();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Try to find property in context first
    useEffect(() => {
        const findProperty = async () => {
            setLoading(true);
            
            console.log('🔍 Finding property:', { propertyId, pathname: location.pathname, propertiesCount: properties.length, propertiesLoading });
            console.log('🔍 Available property IDs:', properties.map(p => ({ id: p.id, type: typeof p.id })));
            
            // First, try to find in context - check multiple ID formats
            let foundProperty = null;
            
            if (!propertyId || isNaN(propertyId)) {
                console.error('❌ Invalid propertyId:', propertyId);
                setLoading(false);
                return;
            }
            
            // Try to find by exact match first
            foundProperty = properties.find(p => {
                const propIdNum = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                return propIdNum === propertyId;
            });
            
            // If not found, try string comparison
            if (!foundProperty) {
                foundProperty = properties.find(p => 
                    String(p.id) === String(propertyId)
                );
            }
            
            console.log('🔍 Found in context:', foundProperty ? 'YES' : 'NO');
            
            // If not found in context, wait for properties to load or refresh the list
            if (!foundProperty) {
                if (propertiesLoading) {
                    // Wait for properties to finish loading
                    console.log('🔍 Waiting for properties to load...');
                } else {
                    // Properties loaded but property not found - refresh the list
                    console.log('🔍 Property not in context, refreshing properties list...');
                    try {
                        const { sellerPropertiesAPI } = await import('../../services/api.service');
                        const response = await sellerPropertiesAPI.list();
                        
                        if (response.success && response.data && response.data.properties) {
                            const backendProperties = response.data.properties.map(prop => ({
                                id: prop.id,
                                title: prop.title,
                                location: prop.location,
                                price: prop.price.toString(),
                                bedrooms: prop.bedrooms,
                                bathrooms: prop.bathrooms,
                                area: prop.area.toString(),
                                status: prop.status,
                                propertyType: prop.property_type,
                                furnishing: prop.furnishing || '',
                                facing: prop.facing || '',
                                floor: prop.floor || '',
                                totalFloors: prop.total_floors || '',
                                age: prop.age || '',
                                amenities: Array.isArray(prop.amenities) ? prop.amenities : (prop.amenities ? prop.amenities.split(',') : []),
                                description: prop.description || '',
                                images: Array.isArray(prop.images) && prop.images.length > 0 
                                    ? prop.images 
                                    : (prop.cover_image ? [prop.cover_image] : []),
                                createdAt: prop.created_at,
                                views: prop.views_count || 0,
                                inquiries: prop.inquiry_count || 0,
                                cover_image: prop.cover_image
                            }));
                            
                            // Now try to find in the refreshed list
                            foundProperty = backendProperties.find(p => {
                                const propIdNum = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                                return propIdNum === propertyId || String(p.id) === String(propertyId);
                            });
                            
                            console.log('🔍 Property found after refresh:', foundProperty ? 'YES' : 'NO');
                        }
                    } catch (error) {
                        console.error('❌ Error refreshing properties:', error);
                    }
                }
            }
            
            console.log('🔍 Final property:', foundProperty);
            setProperty(foundProperty);
            setLoading(false);
        };
        
        // Only run if we have a valid propertyId
        if (propertyId && !isNaN(propertyId)) {
            findProperty();
        } else {
            console.error('❌ Invalid property ID:', propertyId, 'from pathname:', location.pathname);
            setLoading(false);
        }
    }, [propertyId, properties, propertiesLoading, location.pathname]);

    // Memoize propertyData to prevent unnecessary recalculations
    const propertyData = useMemo(() => getPropertyDetails(property), [property]);

    const imageCount = useMemo(() => propertyData?.images?.length || 0, [propertyData]); 

    // Memoize thumbnail calculations to prevent recalculation on every render
    // MUST be before any early returns (React Hooks rules)
    const thumbnailImages = useMemo(() => 
        propertyData?.images?.slice(1, 4) || [], 
        [propertyData]
    );
    const remainingCount = useMemo(() => 
        (propertyData?.images?.length || 0) - 4, 
        [propertyData]
    );

    const [currentImageIndex, setCurrentImageIndex] = useState(null);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        message: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    const openSlider = useCallback((index) => {
        if (imageCount > 0) {
            setCurrentImageIndex(index);
        }
    }, [imageCount]);

    const closeSlider = useCallback(() => {
        setCurrentImageIndex(null);
    }, []);

    const nextImage = useCallback(() => {
        if (imageCount === 0) return;
        setCurrentImageIndex((prevIndex) => 
            (prevIndex + 1) % imageCount
        );
    }, [imageCount]);

    const prevImage = useCallback(() => {
        if (imageCount === 0) return;
        setCurrentImageIndex((prevIndex) => 
            (prevIndex - 1 + imageCount) % imageCount
        );
    }, [imageCount]);

    const handleBack = useCallback(() => {
        navigate('/seller-dashboard');
    }, [navigate]);

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (currentImageIndex === null) return;
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'Escape') closeSlider();
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentImageIndex, prevImage, nextImage, closeSlider]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmitInquiry = (e) => {
        e.preventDefault();
        
        // Validation
        const errors = {};
        if (!formData.name || formData.name.trim().length < 2) {
            errors.name = 'Name must be at least 2 characters';
        }
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Valid email is required';
        }
        const phoneCleaned = formData.mobile.replace(/\D/g, '');
        if (!formData.mobile || !/^[6-9]\d{9}$/.test(phoneCleaned)) {
            errors.mobile = 'Valid Indian phone number is required (10 digits starting with 6-9)';
        }
        
        if (Object.keys(errors).length > 0) {
            // Show errors (you can add error state if needed)
            alert(Object.values(errors).join('\n'));
            return;
        }
        
        console.log('Inquiry submitted:', formData);
        setIsSubmitted(true);
        
        setTimeout(() => {
            setIsSubmitted(false);
            setFormData({ name: '', email: '', mobile: '', message: '' });
        }, 5000);
    };

    // Show loading if we're still loading or if properties are loading
    if (loading || propertiesLoading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '400px',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #003B73',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <p>Loading property details...</p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!property || !propertyData) {
        console.error('❌ Property not found:', propertyId, 'Available properties:', properties.map(p => p.id));
        console.error('❌ Pathname:', location.pathname);
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Property Not Found</h2>
                <p>Property ID: {propertyId || 'Invalid'}</p>
                <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                    Path: {location.pathname}
                </p>
                <button 
                    onClick={() => navigate('/seller-dashboard/properties')} 
                    style={{ 
                        marginTop: '1rem', 
                        padding: '0.5rem 1rem',
                        background: '#003B73',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    Back to Properties
                </button>
            </div>
        );
    }

    return (
        <div className="buyer-details-wrapper">
            <main className="buyer-view-details-page">
                <div className="buyer-details-container">

                    {/* Back Button */}
                    <button className="buyer-back-button" onClick={handleBack}>
                        <FaAngleLeft />
                    </button>

                    {/* Property Header - ENHANCED */}
                    <header className="buyer-property-header">
                        <div className="buyer-header-badges">
                            <button 
                                className={`buyer-status-badge ${propertyData.status === 'For Sale' ? 'buyer-for-sale' : 'buyer-for-rent'}`}
                            >
                                {propertyData.status}
                            </button>
                            <span className="buyer-premium-badge">
                                🏠 Premium Property
                            </span>
                        </div>
                        <h1>{propertyData.title}</h1>
                        <p className="buyer-property-location">
                            {propertyData.location}
                        </p>
                        <div className="buyer-property-meta-info">
                            <div className="buyer-meta-divider"></div>
                            <div className="buyer-meta-item">
                                <span className="buyer-meta-label">Listed Since</span>
                                <span className="buyer-meta-value">
                                    {property?.createdAt 
                                        ? new Date(property.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                                        : 'Dec 2024'}
                                </span>
                            </div>
                            <div className="buyer-meta-divider"></div>
                        </div>
                    </header>

                    <div className="buyer-main-content-area">

                        {/* --- Left Column (Details) --- */}
                        <section className="buyer-property-details-section">

                            {/* Image Gallery */}
                            <div className="buyer-image-gallery">
                                {/* Main Image (Grid Column 1) */}
                                <div className="buyer-main-image" onClick={() => openSlider(0)}>
                                    <img 
                                        src={propertyData.images[0]?.url} 
                                        alt={propertyData.images[0]?.alt || propertyData.title}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>

                                {/* Thumbnails (Grid Column 2) */}
                                <div className="buyer-thumbnail-gallery">
                                    {thumbnailImages.map((image, index) => (
                                        <div 
                                            key={image.id || index} 
                                            className="buyer-thumbnail" 
                                            onClick={() => openSlider(index + 1)} 
                                        >
                                            <img 
                                                src={image.url} 
                                                alt={image.alt}
                                                loading="lazy"
                                                decoding="async"
                                            />
                                            {index === 2 && remainingCount > 0 && (
                                                <div className="buyer-view-more-overlay">
                                                    <span>+{remainingCount} Photos</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Key Features using .features-grid */}
                            <div className="buyer-features-grid">
                                {/* Price/Rent */}
                                <div className="buyer-feature-item">
                                    <div className="buyer-feature-icon">
                                        <span role="img" aria-label="price">💰</span>
                                    </div>
                                    <span className="buyer-feature-value">{propertyData.price}</span>
                                    <span className="buyer-feature-label">{propertyData.status === 'For Rent' ? 'Monthly Rent' : 'Total Price'}</span>
                                </div>

                                {/* Bedrooms */}
                                <div className="buyer-feature-item">
                                    <div className="buyer-feature-icon">
                                        <FaBed />
                                    </div>
                                    <span className="buyer-feature-value">{propertyData.bedrooms}</span>
                                    <span className="buyer-feature-label">Bedrooms</span>
                                </div>

                                {/* Bathrooms */}
                                <div className="buyer-feature-item">
                                    <div className="buyer-feature-icon">
                                        <FaShower />
                                    </div>
                                    <span className="buyer-feature-value">{propertyData.bathrooms}</span>
                                    <span className="buyer-feature-label">Bathrooms</span>
                                </div>

                                {/* Area */}
                                <div className="buyer-feature-item">
                                    <div className="buyer-feature-icon">
                                        <FaRulerCombined />
                                    </div>
                                    <span className="buyer-feature-value">{propertyData.area}</span>
                                    <span className="buyer-feature-label">Area</span>
                                </div>
                            </div>
                            {/* END of Key Features */}

                            <hr className="buyer-divider" />

                            {/* Description */}
                            <div className="buyer-description-section">
                                <h2>Description</h2>
                                <p>{propertyData.description}</p>
                            </div>
                            <hr className="buyer-divider" />

                            {/* Amenities */}
                            <div className="buyer-amenities-section">
                                <h2>Amenities</h2>
                                <div className="buyer-amenities-grid">
                                    {propertyData.amenities.map((amenity, index) => (
                                        <div key={index} className="buyer-amenity-item">
                                            <FaCheckCircle className="buyer-check-icon" />
                                            <span>{amenity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* --- Right Column (Inquiry Form) --- */}
                        <aside className="buyer-agent-sidebar">
                            
                            {/* Google Map Feature Card */}
                            <GoogleMapFeature location={propertyData.location} /> 

                            {/* Contact Form Card - Disabled for Sellers (Preview Only) */}
                            <div className="buyer-detail-contact-card seller-contact-preview">
                                <div className="seller-contact-overlay">
                                    <div className="seller-contact-overlay-message">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                            <path d="M9 12l2 2 4-4"/>
                                        </svg>
                                        <p>This feature is for buyers/tenants only</p>
                                    </div>
                                </div>
                                <h3>Get in Touch</h3>
                                <p className="buyer-contact-card-subtitle">Send your inquiry about this property</p>
                                
                                {!isSubmitted ? (
                                    <form className="buyer-detail-contact-form" onSubmit={handleSubmitInquiry} style={{ pointerEvents: 'none', opacity: 0.6 }}>
                                        {/* Name Field */}
                                        <div className="buyer-contact-field-group">
                                            <label htmlFor="name">Full Name *</label>
                                            <div className="buyer-contact-input-box">
                                                <FaUser className="buyer-contact-field-icon" />
                                                <input
                                                    type="text"
                                                    id="name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    placeholder="Your full name"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Email Field */}
                                        <div className="buyer-contact-field-group">
                                            <label htmlFor="email">Email Address *</label>
                                            <div className="buyer-contact-input-box">
                                                <FaEnvelope className="buyer-contact-field-icon" />
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    placeholder="your.email@example.com"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Mobile Field */}
                                        <div className="buyer-contact-field-group">
                                            <label htmlFor="mobile">Mobile Number *</label>
                                            <div className="buyer-contact-input-box">
                                                <FaPhone className="buyer-contact-field-icon" />
                                                <input
                                                    type="tel"
                                                    id="mobile"
                                                    name="mobile"
                                                    value={formData.mobile}
                                                    onChange={handleInputChange}
                                                    placeholder="+91 XXXXX XXXXX"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Message Field */}
                                        <div className="buyer-contact-field-group">
                                            <label htmlFor="message">Your Message</label>
                                            <div className="buyer-contact-input-box buyer-contact-textarea-box">
                                                <FaCommentAlt className="buyer-contact-field-icon buyer-contact-textarea-icon" />
                                                <textarea
                                                    id="message"
                                                    name="message"
                                                    value={formData.message}
                                                    onChange={handleInputChange}
                                                    placeholder="I'm interested in this property..."
                                                    rows="4"
                                                ></textarea>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <button type="submit" className="buyer-contact-send-button">
                                            Send Inquiry
                                        </button>
                                    </form>
                                ) : (
                                    <div className="buyer-contact-success-message">
                                        <FaCheckCircle className="buyer-contact-success-icon" />
                                        <h4>Inquiry Sent Successfully!</h4>
                                        <p>Thank you for your interest. The owner will contact you soon.</p>
                                    </div>
                                )}
                            </div>
                        </aside>

                    </div>
                </div>
            </main>

            {/* Mount the Slider Modal outside the main structure */}
            {currentImageIndex !== null && (
                <ImageSliderModal
                    images={propertyData.images}
                    currentIndex={currentImageIndex}
                    onClose={closeSlider}
                    onNext={nextImage}
                    onPrev={prevImage}
                />
            )}
        </div>
    );
};

export default ViewDetailsPage;
