import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaDownload, FaShare, FaRedo, FaMagic } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { generateMeme } from '../services/api';
// MEME_TEMPLATES removed - AI now auto-selects templates
import './MemeGenerator.css';

function MemeGenerator({ user }) {
  const [loading, setLoading] = useState(false);
  // memeText removed - trending topics are handled directly
  // Template will be auto-selected by AI
  const [generatedMeme, setGeneratedMeme] = useState(null);
  const [trendingTopic, setTrendingTopic] = useState('');
  const [dailyCount, setDailyCount] = useState(0);
  const [memeMode, setMemeMode] = useState('trending'); // 'trending' or 'custom'
  const [customDescription, setCustomDescription] = useState('');
  const [fetchingTrends, setFetchingTrends] = useState(true); // Start with loading state
  // Template selection removed - AI auto-selects
  const [allTrendingTopics, setAllTrendingTopics] = useState([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState('viral'); // Default mood
  const [isGenerating, setIsGenerating] = useState(false); // Prevent duplicate clicks

  useEffect(() => {
    // Reset localStorage for testing
    localStorage.setItem('memeGeneratorCount', '0');
    localStorage.setItem('memeGeneratorDate', new Date().toDateString());
    
    fetchTrendingTopic();
    checkDailyLimit();
  }, []);

  // Template selection removed - AI automatically chooses optimal template

  const handleMoodChange = async (newMood) => {
    setSelectedMood(newMood);
    await fetchTrendingTopic(newMood);
  };

  const fetchTrendingTopic = async (mood = selectedMood) => {
    setFetchingTrends(true);
    try {
      const response = await fetch(`/.netlify/functions/get-trending?mood=${mood}&forceRefresh=true`);
      const data = await response.json();
      if (data.topics && data.topics.length > 0) {
        setAllTrendingTopics(data.topics.slice(0, 6)); // Store top 6 trending topics
        setTrendingTopic(data.topics[0].topic);
      }
    } catch (error) {
      console.error('Error fetching trending topic:', error);
    } finally {
      setFetchingTrends(false);
    }
  };

  // Function to handle clicking on a trending topic
  const handleTrendingClick = async (topic) => {
    if (!user && dailyCount >= 1000) {
      toast.error('Daily limit reached! Sign up for unlimited memes.');
      return;
    }

    if (isGenerating) {
      console.log('Generation already in progress, ignoring click');
      return; // Prevent duplicate generation
    }

    // No need to set memeText - topic is passed directly
    setIsGenerating(true);
    setLoading(true);
    
    try {
      // Generate meme directly with the clicked topic - no need to fetch trends again
      const result = await generateMeme({
        text: `Create a viral, funny meme about this trending topic: ${topic}`,
        user_id: user?.id,
        skipTrendingFetch: true // Flag to skip unnecessary API calls
      });

      setGeneratedMeme(result);
      
      if (!user) {
        const newCount = dailyCount + 1;
        setDailyCount(newCount);
        localStorage.setItem('memeGeneratorCount', newCount.toString());
      }

      toast.success(`Meme generated for: ${topic.substring(0, 30)}...`);
    } catch (error) {
      console.error('Trending meme generation error:', error);
      
      if (error.response?.data?.suggestions) {
        const suggestions = error.response.data.suggestions.join('\n• ');
        toast.error(
          `${error.response.data.userMessage}\n\nSuggestions:\n• ${suggestions}`,
          { duration: 8000 }
        );
      } else if (error.response?.data?.userMessage) {
        toast.error(error.response.data.userMessage, { duration: 6000 });
      } else {
        toast.error('Failed to generate meme. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsGenerating(false);
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
    if (!user && dailyCount >= 1000) {
      toast.error('Daily limit reached! Sign up for unlimited memes.');
      return;
    }

    if (isGenerating) {
      console.log('Generation already in progress, ignoring click');
      return; // Prevent duplicate generation
    }

    setIsGenerating(true);
    setLoading(true);
    
    try {
      // Determine what text to send based on mode
      let inputText = '';
      let skipTrendingFetch = false;
      
      if (memeMode === 'custom' && customDescription.trim()) {
        inputText = customDescription.trim();
        skipTrendingFetch = true; // No need to fetch trends for custom memes
      } else {
        // For trending mode, always fetch fresh data
        setFetchingTrends(true);
        await fetchTrendingTopic();
        inputText = `Create a viral, funny meme about this trending topic: ${trendingTopic}`;
        setFetchingTrends(false);
      }

      const result = await generateMeme({
        text: inputText,
        user_id: user?.id,
        skipTrendingFetch
      });

      setGeneratedMeme(result);
      
      if (!user) {
        const newCount = dailyCount + 1;
        setDailyCount(newCount);
        localStorage.setItem('memeGeneratorCount', newCount.toString());
      }

      toast.success('Meme generated successfully!');
    } catch (error) {
      console.error('Meme generation error:', error);
      
      // Check if it's a content moderation error with suggestions
      if (error.response?.data?.suggestions) {
        const suggestions = error.response.data.suggestions.join('\n• ');
        toast.error(
          `${error.response.data.userMessage}\n\nSuggestions:\n• ${suggestions}`,
          { duration: 8000 }
        );
      } else if (error.response?.data?.userMessage) {
        toast.error(error.response.data.userMessage, { duration: 6000 });
      } else {
        toast.error('Failed to generate meme. Please try again.');
      }
    } finally {
      setLoading(false);
      setFetchingTrends(false);
      setIsGenerating(false);
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
            {1000 - dailyCount} free memes remaining today
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

        {memeMode === 'custom' && (
          <div className="input-group">
            <label>Custom Meme Description</label>
            <textarea
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Describe your meme idea... Examples: When you try to adult but end up watching TikTok for 3 hours, or pretending to understand crypto while secretly googling everything, or that friend who replies 'K' to your 3-paragraph message"
              rows={5}
            />
            <div className="custom-hint">
              🔥 The AI will choose the perfect meme format and rewrite your idea for maximum virality!
            </div>
          </div>
        )}


        {memeMode === 'trending' && (
          <>
            <div className="mood-selector">
              <label>What's your mood?</label>
              <div className="mood-scroll-container">
                <div className="mood-scroll">
                  {[
                    { id: 'funny', emoji: '😂', label: 'Funny' },
                    { id: 'tech', emoji: '🤓', label: 'Tech' },
                    { id: 'motivational', emoji: '💪', label: 'Motivational' },
                    { id: 'relatable', emoji: '😴', label: 'Relatable' },
                    { id: 'viral', emoji: '🔥', label: 'Viral' },
                    { id: 'entertainment', emoji: '🎮', label: 'Entertainment' },
                    { id: 'work', emoji: '💼', label: 'Work' },
                    { id: 'love', emoji: '❤️', label: 'Love' },
                    { id: 'sad', emoji: '😢', label: 'Sad' },
                    { id: 'happy', emoji: '😊', label: 'Happy' },
                    { id: 'angry', emoji: '😤', label: 'Angry' },
                    { id: 'cool', emoji: '😎', label: 'Cool' },
                    { id: 'mindblown', emoji: '🤯', label: 'Mind-blown' },
                    { id: 'money', emoji: '💰', label: 'Money' }
                  ].map((mood) => (
                    <button
                      key={mood.id}
                      className={`mood-btn ${selectedMood === mood.id ? 'active' : ''}`}
                      onClick={() => handleMoodChange(mood.id)}
                      disabled={fetchingTrends}
                    >
                      {mood.emoji} {mood.label}
                    </button>
                  ))}
                </div>
                <div className="scroll-indicator">← Scroll for more moods →</div>
              </div>
            </div>

            <div className="trending-section">
              <div className="trending-header">
                <FaMagic /> 
                {fetchingTrends ? `🔄 Finding ${selectedMood} trending topics...` : 'Trending Now - Click to Generate!'}
              </div>
            {!fetchingTrends && allTrendingTopics.length > 0 && (
              <div className="trending-topics">
                {allTrendingTopics.map((topic, index) => (
                  <button
                    key={topic.id || index}
                    className="trending-topic-btn"
                    onClick={() => handleTrendingClick(topic.topic)}
                    title={`Click to generate a meme about: ${topic.topic}`}
                  >
                    🔥 {topic.topic}
                  </button>
                ))}
              </div>
            )}
            </div>
          </>
        )}

        <button 
          className="btn btn-primary generate-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="loading" />
              {fetchingTrends ? 'Getting latest trends...' : 'Creating your meme...'}
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
          <img 
            src={generatedMeme.image_url} 
            alt="Generated meme" 
            onClick={() => setShowImageModal(true)}
            title="Click to view full size"
          />
          
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

      {/* Image Modal */}
      {showImageModal && generatedMeme && (
        <div className="image-modal" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-close" onClick={() => setShowImageModal(false)}>
            ×
          </div>
          <img 
            src={generatedMeme.image_url} 
            alt="Generated meme - full size" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default MemeGenerator;