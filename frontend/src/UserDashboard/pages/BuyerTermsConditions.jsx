import React, { useEffect } from 'react';
import '../../LandingPage/styles/TermConditions.css';

const BuyerTermsConditions = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="terms-container">
      <div className="terms-content">
        <header className="terms-header">
          <h1>Terms & Conditions</h1>
          <p className="last-updated">Last Updated: 26 Nov 2025</p>
        </header>

        <div className="terms-body">
          <p className="intro-text">
            Welcome to <strong>360Coordinates</strong>, owned and operated by Mr. Sudhakar Poul & Company, 
            located in Ambegaon BK, Pune, India. By accessing or using our website{' '}
            <a href="http://www.360coordinates.com" target="_blank" rel="noopener noreferrer">
              www.360coordinates.com
            </a>{' '}
            and services, you agree to comply with these Terms & Conditions. Please read them carefully before proceeding.
          </p>

          <section className="terms-section">
            <h2>1. Introduction</h2>
            <p>
              360Coordinates is a real estate service platform designed to connect buyers, sellers, homeowners, 
              and real estate agents across India. By using our services, you accept these terms and confirm that 
              you are legally capable of entering into a binding agreement.
            </p>
          </section>

          <section className="terms-section">
            <h2>2. Services Provided</h2>
            <p>360Coordinates offers a wide range of real estate-related services, including:</p>
            <ul>
              <li>Property listing for buyers and sellers</li>
              <li>Lead generation for real estate agents</li>
              <li>Property marketing and promotion</li>
              <li>Homeowner property management support</li>
              <li>Real estate consultation and guidance</li>
            </ul>
            <p>We reserve the right to add, modify, or discontinue services at any time.</p>
          </section>

          <section className="terms-section">
            <h2>3. User Responsibilities</h2>
            <p>By using 360Coordinates, you agree that:</p>
            <ul>
              <li>All information you submit (property details, contact info, documents, etc.) is accurate and genuine.</li>
              <li>You will not upload any misleading, fraudulent, abusive, or illegal content.</li>
              <li>You will use the platform only for lawful real estate dealings.</li>
              <li>You will not attempt to copy, hack, or misuse the platform or its resources.</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>4. Property Listings & Accuracy</h2>
            <p>
              360Coordinates does not guarantee the accuracy, legality, or authenticity of property listings 
              shared by users. All users (buyer, seller, agent, homeowner) are responsible for verifying:
            </p>
            <ul>
              <li>Ownership documents</li>
              <li>Property conditions</li>
              <li>Legal permissions</li>
              <li>Pricing & availability</li>
            </ul>
            <p>360Coordinates is not liable for disputes between users.</p>
          </section>

          <section className="terms-section">
            <h2>5. Payments & Fees</h2>
            <p>Some services provided by 360Coordinates may require payment. You agree that:</p>
            <ul>
              <li>All payments are non-refundable unless stated otherwise.</li>
              <li>Prices may change based on service updates.</li>
              <li>Payment details provided must be valid and authorized.</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>6. Third-Party Services</h2>
            <p>
              360Coordinates may link you to third-party websites, agents, or service vendors. 
              We are not responsible for:
            </p>
            <ul>
              <li>External site content</li>
              <li>Vendor service quality</li>
              <li>Third-party policies</li>
            </ul>
            <p>Users must verify independently before proceeding.</p>
          </section>

          <section className="terms-section">
            <h2>7. Intellectual Property Rights</h2>
            <p>
              All content on 360Coordinates—including logos, text, graphics, data, and website design—belongs 
              to Mr. Sudhakar Poul & Company. Users may not copy, reproduce, modify, or distribute any content 
              without written permission.
            </p>
          </section>

          <section className="terms-section">
            <h2>8. Privacy & Data Protection</h2>
            <p>Your personal information is used only to:</p>
            <ul>
              <li>Deliver services</li>
              <li>Connect buyers, sellers, and agents</li>
              <li>Provide support</li>
              <li>Improve website experience</li>
            </ul>
            <p>
              We never sell or misuse user data. Please read our Privacy Policy for detailed information.
            </p>
          </section>

          <section className="terms-section">
            <h2>9. Limitation of Liability</h2>
            <p>360Coordinates is not responsible for:</p>
            <ul>
              <li>Property disputes</li>
              <li>Fraudulent user activities</li>
              <li>Incorrect or outdated listings</li>
              <li>Losses arising from user decisions</li>
              <li>Service interruption or technical errors</li>
            </ul>
            <p>Users are advised to conduct proper due diligence before finalizing any deal.</p>
          </section>

          <section className="terms-section">
            <h2>10. Account Termination</h2>
            <p>We may suspend or terminate access to 360Coordinates if:</p>
            <ul>
              <li>User violates terms</li>
              <li>Fraudulent or illegal activity is detected</li>
              <li>Misuse of platform is identified</li>
            </ul>
            <p>No refunds will be provided for terminated accounts.</p>
          </section>

          <section className="terms-section">
            <h2>11. Changes to Terms</h2>
            <p>
              360Coordinates reserves the right to update or change these Terms & Conditions at any time. 
              Continued use of the site means you agree to the updated terms.
            </p>
          </section>

          <section className="terms-section contact-section">
            <h2>12. Contact Information</h2>
            <p>For any queries or support, contact:</p>
            <div className="contact-details">
              <p><strong>360Coordinates – Mr. Sudhakar Poul & Company</strong></p>
              <p>Ambegaon BK, Pune, Maharashtra, India</p>
              <p>Email: <a href="mailto:info@360coordinates.com">info@360coordinates.com</a></p>
              <p>Phone: <a href="tel:+919860638920">+91 98606 38920</a></p>
            </div>
          </section>
        </div>

        <footer className="terms-footer">
          <p>
            By continuing to use 360Coordinates, you acknowledge that you have read, understood, 
            and agree to be bound by these Terms & Conditions.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default BuyerTermsConditions;

