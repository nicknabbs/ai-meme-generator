import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaFire, FaTwitter, FaReddit, FaTiktok } from 'react-icons/fa';
import './TrendingTopics.css';

function TrendingTopics() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingTopics();
    const interval = setInterval(fetchTrendingTopics, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrendingTopics = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-trending');
      const data = await response.json();
      setTopics(data.topics || []);
    } catch (error) {
      console.error('Error fetching trending topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'twitter': return <FaTwitter />;
      case 'reddit': return <FaReddit />;
      case 'tiktok': return <FaTiktok />;
      default: return <FaFire />;
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="loading" /></div>;
  }

  return (
    <div className="trending-topics">
      <h2>🔥 Trending Right Now</h2>
      <p className="subtitle">Jump on these trends before they peak!</p>

      <div className="topics-grid">
        {topics.map((topic, index) => (
          <motion.div
            key={topic.id}
            className="topic-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="topic-header">
              <span className="topic-rank">#{index + 1}</span>
              <span className="topic-source">{getSourceIcon(topic.source)}</span>
            </div>
            
            <h3>{topic.topic}</h3>
            
            <div className="topic-stats">
              <div className="stat">
                <span className="stat-label">Heat Score</span>
                <span className="stat-value">{topic.score}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Growth</span>
                <span className="stat-value">+{topic.growth || 0}%</span>
              </div>
            </div>

            <button className="btn btn-secondary use-topic">
              Use This Topic
            </button>
          </motion.div>
        ))}
      </div>

      <div className="trending-footer">
        <p>Updates every minute • Data from Twitter, Reddit, TikTok</p>
      </div>
    </div>
  );
}

export default TrendingTopics;