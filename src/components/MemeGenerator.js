import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaDownload, FaShare, FaRedo, FaMagic } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { generateMeme } from '../services/api';
import { MEME_TEMPLATES } from '../utils/constants';
import './MemeGenerator.css';

function MemeGenerator({ user }) {
  const [loading, setLoading] = useState(false);
  const [memeText, setMemeText] = useState('');
  const [template, setTemplate] = useState('drake');
  const [generatedMeme, setGeneratedMeme] = useState(null);
  const [trendingTopic, setTrendingTopic] = useState('');
  const [dailyCount, setDailyCount] = useState(0);
  const [memeMode, setMemeMode] = useState('trending'); // 'trending' or 'custom'
  const [customDescription, setCustomDescription] = useState('');
  const [fetchingTrends, setFetchingTrends] = useState(false);

  useEffect(() => {
    fetchTrendingTopic();
    checkDailyLimit();
  }, []);

  const fetchTrendingTopic = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-trending');
      const data = await response.json();
      if (data.topics && data.topics.length > 0) {
        setTrendingTopic(data.topics[0].topic);
      }
    } catch (error) {
      console.error('Error fetching trending topic:', error);
    }
  };

  const checkDailyLimit = () => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('memeGeneratorDate');
    const savedCount = parseInt(localStorage.getItem('memeGeneratorCount') || '0');
    
    if (savedDate === today) {
      setDailyCount(savedCount);
    } else {
      localStorage.setItem('memeGeneratorDate', today);
      localStorage.setItem('memeGeneratorCount', '0');
      setDailyCount(0);
    }
  };

  const handleGenerate = async () => {
    if (!user && dailyCount >= 10) {
      toast.error('Daily limit reached! Sign up for unlimited memes.');
      return;
    }

    setLoading(true);
    setFetchingTrends(true);
    
    try {
      // Fetch fresh trending data on each generation
      await fetchTrendingTopic();
      
      // Determine what text to send based on mode
      let inputText = '';
      if (memeMode === 'custom' && customDescription.trim()) {
        inputText = customDescription.trim();
      } else if (memeMode === 'trending' && memeText.trim()) {
        inputText = memeText.trim();
      } else {
        inputText = `Make a meme about ${trendingTopic}`;
      }

      const result = await generateMeme({
        text: inputText,
        template,
        user_id: user?.id
      });

      setGeneratedMeme(result);
      
      if (!user) {
        const newCount = dailyCount + 1;
        setDailyCount(newCount);
        localStorage.setItem('memeGeneratorCount', newCount.toString());
      }

      toast.success('Meme generated successfully!');
    } catch (error) {
      toast.error('Failed to generate meme. Please try again.');
    } finally {
      setLoading(false);
      setFetchingTrends(false);
    }
  };

  const handleDownload = () => {
    if (!generatedMeme) return;
    
    // Check if user is authenticated
    if (!user) {
      toast.error('Sign up to download memes without watermarks!');
      // Could trigger a signup modal here
      return;
    }
    
    const link = document.createElement('a');
    link.href = generatedMeme.image_url;
    link.download = `meme-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Meme downloaded!');
  };

  const handleShare = async () => {
    if (!generatedMeme) return;
    
    try {
      await navigator.share({
        title: 'Check out this meme!',
        text: generatedMeme.text,
        url: generatedMeme.image_url
      });
    } catch (error) {
      navigator.clipboard.writeText(generatedMeme.image_url);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <div className="meme-generator">
      <motion.div 
        className="generator-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2>Create Your Meme</h2>
        
        {!user && (
          <div className="limit-warning">
            {10 - dailyCount} free memes remaining today
          </div>
        )}

        <div className="input-group">
          <label>Meme Mode</label>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${memeMode === 'trending' ? 'active' : ''}`}
              onClick={() => setMemeMode('trending')}
            >
              🔥 Trending Topics
            </button>
            <button
              className={`mode-btn ${memeMode === 'custom' ? 'active' : ''}`}
              onClick={() => setMemeMode('custom')}
            >
              ✏️ Custom Description
            </button>
          </div>
        </div>

        {memeMode === 'trending' ? (
          <div className="input-group">
            <label>Meme Text (or leave blank for AI suggestion)</label>
            <textarea
              value={memeText}
              onChange={(e) => setMemeText(e.target.value)}
              placeholder={`e.g., "Make a meme about ${trendingTopic}"`}
              rows={3}
            />
          </div>
        ) : (
          <div className="input-group">
            <label>Custom Meme Description</label>
            <textarea
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Describe your meme idea in detail... e.g., 'A meme about procrastinating on important tasks by organizing your music playlist instead'"
              rows={4}
            />
            <div className="custom-hint">
              💡 Be specific! The more detail you provide, the funnier and more viral your meme will be.
            </div>
          </div>
        )}

        <div className="input-group">
          <label>Template Style</label>
          <div className="template-grid">
            {Object.entries(MEME_TEMPLATES).map(([key, value]) => (
              <button
                key={key}
                className={`template-btn ${template === key ? 'active' : ''}`}
                onClick={() => setTemplate(key)}
              >
                {value.emoji} {value.name}
              </button>
            ))}
          </div>
        </div>

        {memeMode === 'trending' && (
          <div className="trending-hint">
            <FaMagic /> 
            {fetchingTrends ? 'Fetching latest trends...' : `Trending now: ${trendingTopic}`}
          </div>
        )}

        <button 
          className="btn btn-primary generate-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="loading" />
              {fetchingTrends ? 'Analyzing trends...' : 'Generating meme...'}
            </>
          ) : (
            <>
              <FaMagic />
              Generate {memeMode === 'custom' ? 'Custom' : 'Trending'} Meme
            </>
          )}
        </button>
      </motion.div>

      {generatedMeme && (
        <motion.div 
          className="result-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <img src={generatedMeme.image_url} alt="Generated meme" />
          
          <div className="meme-actions">
            <button 
              className={`btn ${!user ? 'btn-disabled' : 'btn-secondary'}`} 
              onClick={handleDownload}
              title={!user ? 'Sign up to download without watermarks' : 'Download meme'}
            >
              <FaDownload /> {!user ? 'Sign Up to Download' : 'Download'}
            </button>
            <button className="btn btn-secondary" onClick={handleShare}>
              <FaShare /> Share
            </button>
            <button className="btn btn-secondary" onClick={handleGenerate}>
              <FaRedo /> Remix
            </button>
          </div>

          {!user && (
            <div className="watermark-notice">
              Remove watermark with Pro subscription
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default MemeGenerator;