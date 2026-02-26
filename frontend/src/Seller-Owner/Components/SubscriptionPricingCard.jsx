import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/SubscriptionPricingCard.css";

/**
 * Subscription Pricing Card – informs sellers/agents about the paid listing plan.
 * ₹99 + GST per property per month. UI + navigation only; no payment logic.
 * Use subscriptionPath for Agent dashboard (e.g. "/agent-dashboard/subscription").
 */
const SubscriptionPricingCard = ({ variant = "default", onNavigate, subscriptionPath = "/seller-dashboard/subscription" }) => {
  const navigate = useNavigate();

  const handleCtaClick = () => {
    if (onNavigate) {
      onNavigate("subscription");
    } else {
      navigate(subscriptionPath);
    }
  };

  return (
    <div className={`subscription-pricing-card subscription-pricing-card--${variant}`}>
      <div className="subscription-pricing-card__inner">
        <h3 className="subscription-pricing-card__title">
          Property Listing Subscription
        </h3>
        <p className="subscription-pricing-card__message">
          List your property for just{" "}
          <span className="subscription-pricing-card__price">₹99</span> per month
          per property <span className="subscription-pricing-card__gst">+ GST</span>
        </p>

        <ul className="subscription-pricing-card__features">
          <li>Upload and manage properties easily</li>
          <li>Get verified buyer leads</li>
          <li>Increase visibility across India</li>
          <li>Pay only for the properties you list</li>
        </ul>

        <button
          type="button"
          className="subscription-pricing-card__cta"
          onClick={handleCtaClick}
        >
          Activate Listing Plan
        </button>

        <p className="subscription-pricing-card__note">
          No long-term commitment. Cancel anytime.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPricingCard;
