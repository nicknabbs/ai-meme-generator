import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { FaEye, FaShare, FaDownload } from 'react-icons/fa';
import { supabase } from '../services/supabase';
import './MemeHistory.css';

function MemeHistory({ user }) {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMemes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('memes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemes(data || []);
    } catch (error) {
      console.error('Error fetching memes:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMemes();
    } else {
      setLoading(false);
    }
  }, [user, fetchMemes]);

  if (!user) {
    return (
      <div className="history-empty">
        <h2>Sign in to see your meme history</h2>
        <p>Track your viral hits and download past creations</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-container"><div className="loading" /></div>;
  }

  return (
    <div className="meme-history">
      <h2>Your Meme History</h2>
      
      <div className="stats-row">
        <div className="stat-card">
          <h3>{memes.length}</h3>
          <p>Total Memes</p>
        </div>
        <div className="stat-card">
          <h3>{memes.reduce((sum, m) => sum + m.views, 0)}</h3>
          <p>Total Views</p>
        </div>
        <div className="stat-card">
          <h3>{memes.reduce((sum, m) => sum + m.shares, 0)}</h3>
          <p>Total Shares</p>
        </div>
      </div>

      <div className="memes-grid">
        {memes.map((meme, index) => (
          <motion.div
            key={meme.id}
            className="history-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <img src={meme.image_url} alt={meme.text_content} />
            
            <div className="meme-info">
              <p className="meme-text">{meme.text_content}</p>
              <p className="meme-date">
                {format(new Date(meme.created_at), 'MMM d, yyyy')}
              </p>
            </div>

            <div className="meme-stats">
              <span><FaEye /> {meme.views}</span>
              <span><FaShare /> {meme.shares}</span>
            </div>

            <button className="btn btn-secondary download-btn">
              <FaDownload /> Download
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default MemeHistory;