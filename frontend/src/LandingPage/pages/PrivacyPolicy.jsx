import React, { useEffect } from 'react';
import '../styles/PrivacyPolicy.css';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="privacy-container">
      <div className="privacy-content">
        <header className="privacy-header">
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last Updated: 26 Nov 2025</p>
        </header>

        <div className="privacy-body">
          <p className="intro-text">
            Welcome to <strong>360Coordinates</strong>, owned and operated by Mr. Sudhakar Poul & Company, 
            located in Ambegaon BK, Pune, India. By accessing or using our website{' '}
            <a href="http://www.360Coordinates.com" target="_blank" rel="noopener noreferrer">
              www.360Coordinates.com
            </a>{' '}
            and services, you agree to this Privacy Policy. Please read it carefully before proceeding.
          </p>

          <section className="privacy-section">
            <h2>1. Introduction</h2>
            <p>
              At 360Coordinates, we are committed to protecting your privacy and ensuring the security of your 
              personal information. This Privacy Policy explains how we collect, use, store, and protect your data 
              when you use our real estate platform. By using our services, you consent to the practices described 
              in this policy.
            </p>
          </section>

          <section className="privacy-section">
            <h2>2. Information We Collect</h2>
            <p>We collect various types of information to provide and improve our services:</p>
            <ul>
              <li><strong>Personal Information:</strong> Name, email address, phone number, postal address</li>
              <li><strong>Property Information:</strong> Property details, location, pricing, images, documents</li>
              <li><strong>Account Information:</strong> Username, password, profile details</li>
              <li><strong>Financial Information:</strong> Payment details for premium services (processed securely)</li>
              <li><strong>Technical Information:</strong> IP address, browser type, device information, cookies</li>
              <li><strong>Usage Data:</strong> Pages visited, search queries, interaction with listings</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>3. How We Use Your Information</h2>
            <p>Your personal information is used only for the following purposes:</p>
            <ul>
              <li>To provide and deliver our real estate services</li>
              <li>To connect buyers, sellers, homeowners, and real estate agents</li>
              <li>To process property listings and inquiries</li>
              <li>To communicate with you about services, updates, and support</li>
              <li>To improve website functionality and user experience</li>
              <li>To send promotional offers and marketing communications (with your consent)</li>
              <li>To prevent fraud and ensure platform security</li>
              <li>To comply with legal obligations and resolve disputes</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>4. How We Share Your Information</h2>
            <p>
              We respect your privacy and do not sell your personal information to third parties. However, we may 
              share your information in the following circumstances:
            </p>
            <ul>
              <li><strong>With Other Users:</strong> Property listings and contact details shared to facilitate transactions</li>
              <li><strong>With Service Providers:</strong> Third-party vendors who help us operate the platform (payment processors, hosting services)</li>
              <li><strong>With Real Estate Agents:</strong> When you request to connect with agents for property services</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or government regulations</li>
              <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of company assets</li>
            </ul>
            <p>We ensure that all third parties maintain strict confidentiality and security standards.</p>
          </section>

          <section className="privacy-section">
            <h2>5. Data Security</h2>
            <p>
              We take data security seriously and implement industry-standard measures to protect your information:
            </p>
            <ul>
              <li>Secure SSL encryption for data transmission</li>
              <li>Password-protected user accounts</li>
              <li>Regular security audits and updates</li>
              <li>Restricted access to personal data by authorized personnel only</li>
              <li>Secure payment processing through trusted gateways</li>
            </ul>
            <p>
              However, no method of transmission over the internet is 100% secure. While we strive to protect 
              your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="privacy-section">
            <h2>6. Cookies and Tracking Technologies</h2>
            <p>
              360Coordinates uses cookies and similar tracking technologies to enhance your browsing experience:
            </p>
            <ul>
              <li><strong>Essential Cookies:</strong> Required for website functionality</li>
              <li><strong>Performance Cookies:</strong> Help us understand how users interact with the site</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
              <li><strong>Marketing Cookies:</strong> Track your activity to display relevant advertisements</li>
            </ul>
            <p>
              You can manage or disable cookies through your browser settings. Note that disabling cookies may 
              affect website functionality.
            </p>
          </section>

          <section className="privacy-section">
            <h2>7. Your Rights and Choices</h2>
            <p>You have the following rights regarding your personal information:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and personal data</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails at any time</li>
              <li><strong>Data Portability:</strong> Request your data in a portable format</li>
              <li><strong>Withdraw Consent:</strong> Revoke consent for data processing where applicable</li>
            </ul>
            <p>
              To exercise these rights, please contact us using the information provided in Section 12.
            </p>
          </section>

          <section className="privacy-section">
            <h2>8. Data Retention</h2>
            <p>
              We retain your personal information only for as long as necessary to fulfill the purposes outlined 
              in this Privacy Policy, unless a longer retention period is required by law. When data is no longer 
              needed, we will securely delete or anonymize it.
            </p>
            <ul>
              <li>Active user accounts: Data retained while account is active</li>
              <li>Inactive accounts: Data may be deleted after prolonged inactivity</li>
              <li>Transaction records: Retained for legal and accounting purposes</li>
              <li>Marketing data: Retained until you opt-out or unsubscribe</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>9. Third-Party Links</h2>
            <p>
              Our website may contain links to third-party websites, services, or advertisements. We are not 
              responsible for the privacy practices or content of these external sites. We encourage you to 
              review the privacy policies of any third-party sites you visit.
            </p>
          </section>

          <section className="privacy-section">
            <h2>10. Children's Privacy</h2>
            <p>
              360Coordinates is not intended for use by individuals under the age of 18. We do not knowingly 
              collect personal information from children. If we discover that we have inadvertently collected 
              data from a minor, we will promptly delete it. If you believe a child has provided us with personal 
              information, please contact us immediately.
            </p>
          </section>

          <section className="privacy-section">
            <h2>11. Changes to This Privacy Policy</h2>
            <p>
              We reserve the right to update or modify this Privacy Policy at any time to reflect changes in our 
              practices or legal requirements. The "Last Updated" date at the top of this page will indicate when 
              the policy was last revised. Continued use of our services after changes are posted constitutes your 
              acceptance of the updated policy.
            </p>
          </section>

          <section className="privacy-section contact-section">
            <h2>12. Contact Information</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle 
              your personal information, please contact us:
            </p>
            <div className="contact-details">
              <p><strong>360Coordinates – Mr. Sudhakar Poul & Company</strong></p>
              <p>Ambegaon BK, Pune, Maharashtra, India</p>
              <p>Email: <a href="mailto:info@360Coordinates.com">info@360Coordinates.com</a></p>
              <p>Phone: <a href="tel:+919860638920">+91 98606 38920</a></p>
            </div>
          </section>
        </div>

        <footer className="privacy-footer">
          <p>
            By continuing to use 360Coordinates, you acknowledge that you have read, understood, 
            and agree to be bound by this Privacy Policy.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPolicy;