import React from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaCheck } from 'react-icons/fa';
import './PricingModal.css';

function PricingModal({ onClose }) {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      features: [
        '10 memes per day',
        'Basic templates',
        'Watermarked images',
        'Standard quality'
      ],
      cta: 'Current Plan',
      disabled: true
    },
    {
      name: 'Pro',
      price: '$9.99',
      period: '/month',
      features: [
        'Unlimited memes',
        'All premium templates',
        'No watermarks',
        'HD quality',
        'Priority generation',
        'Download history'
      ],
      cta: 'Upgrade to Pro',
      popular: true
    },
    {
      name: 'Business',
      price: '$99',
      period: '/month',
      features: [
        'Everything in Pro',
        'API access',
        'Bulk generation',
        'Custom templates',
        'Team collaboration',
        'Analytics dashboard',
        'Priority support'
      ],
      cta: 'Contact Sales'
    }
  ];

  return (
    <motion.div 
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div 
        className="pricing-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose}>
          <FaTimes />
        </button>

        <h2>Choose Your Plan</h2>
        <p className="modal-subtitle">Unlock unlimited AI meme potential</p>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <div 
              key={plan.name} 
              className={`pricing-card ${plan.popular ? 'popular' : ''}`}
            >
              {plan.popular && <div className="popular-badge">Most Popular</div>}
              
              <h3>{plan.name}</h3>
              <div className="price">
                <span className="amount">{plan.price}</span>
                {plan.period && <span className="period">{plan.period}</span>}
              </div>

              <ul className="features">
                {plan.features.map((feature, i) => (
                  <li key={i}>
                    <FaCheck className="check-icon" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                disabled={plan.disabled}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default PricingModal;