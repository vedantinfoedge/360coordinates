// fileName: agent-pro-details.jsx

import React, { useState, useCallback, useEffect } from 'react'; 
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { FaPhone, FaEnvelope, FaAngleLeft, FaAngleRight, FaBed, FaShower, FaRulerCombined, FaTimes, FaCheckCircle, FaUser, FaCommentAlt } from "react-icons/fa";
import '../styles/Agentviewdetails.css';
import { useProperty } from './PropertyContext';
import { propertiesAPI } from '../../services/api.service';

// --- Image Slider Modal Component ---
const ImageSliderModal = ({ images, currentIndex, onClose, onNext, onPrev }) => {
    const isOpen = currentIndex !== null;
    
    if (!images || images.length === 0) return null;
    
    const currentImage = isOpen ? images[currentIndex] : null;
    const showControls = images.length > 1;
    
    return (
        <div className={`agent-image-slider-modal-overlay ${isOpen ? 'open' : ''}`}>
            {currentImage && (
                <div className="agent-image-slider-modal-content">
                    <button className="agent-slider-close-btn" onClick={onClose} aria-label="Close Slider">
                        <FaTimes />
                    </button>
                    
                    <div className="agent-slider-controls">
                        {showControls && (
                            <button className="agent-slider-prev-btn" onClick={onPrev} aria-label="Previous Image">
                                <FaAngleLeft />
                            </button>
                        )}
                        
                        <img 
                            src={typeof currentImage === 'string' ? currentImage : currentImage.url || currentImage} 
                            alt="Property" 
                            className="agent-slider-main-image" 
                        />

                        {showControls && (
                            <button className="agent-slider-next-btn" onClick={onNext} aria-label="Next Image">
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
    const images = property.images && property.images.length > 0 
        ? property.images.map((img, idx) => ({
            id: idx + 1,
            url: typeof img === 'string' ? img : img.url || img,
            alt: property.title || `Property view ${idx + 1}`
        }))
        : [{ id: 1, url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500', alt: property.title }];
    
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
        images: images,
        videoUrl: property.video_url || property.videoUrl || null
    };
}

// ============================================================================
// GOOGLE MAP FEATURE COMPONENT (Placeholder)
// ============================================================================

const GoogleMapFeature = ({ location }) => {
    return (
        <div className="agent-map-card-container">
            <h3>Property Location</h3>
            <div className="agent-map-embed-area" aria-label={`Google Map for ${location}`}>
                <p className="agent-map-placeholder-text">
                    Map Feature Placeholder: Location for <strong>{location}</strong>
                </p>
            </div>
        </div>
    );
}

// --- Main Page Component ---
const ViewDetailsPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const propertyId = parseInt(id, 10);

    const { properties } = useProperty();
    const foundProperty = properties.find(p => p.id === propertyId);
    const propertyData = getPropertyDetails(foundProperty);

    const imageCount = propertyData?.images?.length || 0; 

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
        navigate('/agent-dashboard');
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

    if (!foundProperty || !propertyData) {
        return <Navigate to="/agent-dashboard" replace />;
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmitInquiry = async (e) => {
        e.preventDefault();
        
        try {
            const response = await propertiesAPI.sendInquiry({
                property_id: propertyId,
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile,
                message: formData.message
            });
            
            if (response.success) {
                setIsSubmitted(true);
                setTimeout(() => {
                    setIsSubmitted(false);
                    setFormData({ name: '', email: '', mobile: '', message: '' });
                }, 5000);
            } else {
                alert('Failed to send inquiry: ' + (response.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to send inquiry:', error);
            alert('Failed to send inquiry. Please try again.');
        }
    };

    const thumbnailImages = propertyData.images.slice(1, 4);
    const remainingCount = propertyData.images.length - 4;

    return (
        <div className="agent-details-wrapper">
            <main className="agent-view-details-page">
                <div className="agent-details-container">

                    {/* Back Button */}
                    <button className="agent-back-button" onClick={handleBack}>
                        <FaAngleLeft />
                    </button>

                    {/* Property Header - ENHANCED */}
                    <header className="agent-property-header">
                        <div className="agent-header-badges">
                            <button 
                                className={`agent-status-badge ${propertyData.status === 'For Sale' ? 'agent-for-sale' : 'agent-for-rent'}`}
                            >
                                {propertyData.status}
                            </button>
                            <span className="agent-premium-badge">
                                🏠 Premium Property
                            </span>
                        </div>
                        <h1>{propertyData.title}</h1>
                        <p className="agent-property-location">
                            {propertyData.location}
                        </p>
                        <div className="agent-property-meta-info">
                            <div className="agent-meta-divider"></div>
                            <div className="agent-meta-item">
                                <span className="agent-meta-label">Listed Since</span>
                                <span className="agent-meta-value">Dec 2024</span>
                            </div>
                            <div className="agent-meta-divider"></div>
                        </div>
                    </header>

                    <div className="agent-main-content-area">

                        {/* --- Left Column (Details) --- */}
                        <section className="agent-property-details-section">

                            {/* Image Gallery */}
                            <div className="agent-image-gallery">
                                {/* Main Image (Grid Column 1) */}
                                <div className="agent-main-image" onClick={() => openSlider(0)}>
                                    <img src={propertyData.images[0].url} alt={propertyData.images[0].alt} />
                                </div>

                                {/* Thumbnails (Grid Column 2) */}
                                <div className="agent-thumbnail-gallery">
                                    {thumbnailImages.map((image, index) => (
                                        <div 
                                            key={image.id} 
                                            className="agent-thumbnail" 
                                            onClick={() => openSlider(index + 1)} 
                                        >
                                            <img src={image.url} alt={image.alt} />
                                            {index === 2 && remainingCount > 0 && (
                                                <div className="agent-view-more-overlay">
                                                    <span>+{remainingCount} Photos</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Key Features using .features-grid */}
                            <div className="agent-features-grid">
                                {/* Price/Rent */}
                                <div className="agent-feature-item">
                                    <div className="agent-feature-icon">
                                        <span role="img" aria-label="price">💰</span>
                                    </div>
                                    <span className="agent-feature-value">{propertyData.price}</span>
                                    <span className="agent-feature-label">{propertyData.status === 'For Rent' ? 'Monthly Rent' : 'Total Price'}</span>
                                </div>

                                {/* Bedrooms */}
                                <div className="agent-feature-item">
                                    <div className="agent-feature-icon">
                                        <FaBed />
                                    </div>
                                    <span className="agent-feature-value">{propertyData.bedrooms}</span>
                                    <span className="agent-feature-label">Bedrooms</span>
                                </div>

                                {/* Bathrooms */}
                                <div className="agent-feature-item">
                                    <div className="agent-feature-icon">
                                        <FaShower />
                                    </div>
                                    <span className="agent-feature-value">{propertyData.bathrooms}</span>
                                    <span className="agent-feature-label">Bathrooms</span>
                                </div>

                                {/* Area */}
                                <div className="agent-feature-item">
                                    <div className="agent-feature-icon">
                                        <FaRulerCombined />
                                    </div>
                                    <span className="agent-feature-value">{propertyData.area}</span>
                                    <span className="agent-feature-label">Area</span>
                                </div>
                            </div>
                            {/* END of Key Features */}

                            {/* Property Video Section - Only show if video exists */}
                            {propertyData?.videoUrl && (
                                <div className="agent-property-video-section">
                                    <h2>Property Video</h2>
                                    <div className="agent-property-video-wrapper">
                                        <video
                                            controls
                                            preload="metadata"
                                            className="agent-property-video-player"
                                            style={{
                                                width: '100%',
                                                maxWidth: '100%',
                                                height: 'auto',
                                                borderRadius: '8px',
                                                backgroundColor: '#000'
                                            }}
                                        >
                                            <source src={propertyData.videoUrl} type="video/mp4" />
                                            <source src={propertyData.videoUrl} type="video/webm" />
                                            <source src={propertyData.videoUrl} type="video/quicktime" />
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                </div>
                            )}

                            <hr className="agent-divider" />

                            {/* Description */}
                            <div className="agent-description-section">
                                <h2>Description</h2>
                                <p>{propertyData.description}</p>
                            </div>
                            <hr className="agent-divider" />

                            {/* Amenities */}
                            <div className="agent-amenities-section">
                                <h2>Amenities</h2>
                                <div className="agent-amenities-grid">
                                    {propertyData.amenities.map((amenity, index) => (
                                        <div key={index} className="agent-amenity-item">
                                            <FaCheckCircle className="agent-check-icon" />
                                            <span>{amenity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* --- Right Column (Inquiry Form) --- */}
                        <aside className="agent-agent-sidebar">
                            
                            {/* Google Map Feature Card */}
                            <GoogleMapFeature location={propertyData.location} /> 

                            {/* Contact Form Card */}
                            <div className="agent-detail-contact-card">
                                <h3>Get in Touch</h3>
                                <p className="agent-contact-card-subtitle">Send your inquiry about this property</p>
                                
                                {!isSubmitted ? (
                                    <form className="agent-detail-contact-form" onSubmit={handleSubmitInquiry}>
                                        {/* Name Field */}
                                        <div className="agent-contact-field-group">
                                            <label htmlFor="name">Full Name *</label>
                                            <div className="agent-contact-input-box">
                                                <FaUser className="agent-contact-field-icon" />
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
                                        <div className="agent-contact-field-group">
                                            <label htmlFor="email">Email Address *</label>
                                            <div className="agent-contact-input-box">
                                                <FaEnvelope className="agent-contact-field-icon" />
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
                                        <div className="agent-contact-field-group">
                                            <label htmlFor="mobile">Mobile Number *</label>
                                            <div className="agent-contact-input-box">
                                                <FaPhone className="agent-contact-field-icon" />
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
                                        <div className="agent-contact-field-group">
                                            <label htmlFor="message">Your Message</label>
                                            <div className="agent-contact-input-box agent-contact-textarea-box">
                                                <FaCommentAlt className="agent-contact-field-icon agent-contact-textarea-icon" />
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
                                        <button type="submit" className="agent-contact-send-button">
                                            Send Inquiry
                                        </button>
                                    </form>
                                ) : (
                                    <div className="agent-contact-success-message">
                                        <FaCheckCircle className="agent-contact-success-icon" />
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

