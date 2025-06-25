import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import MemeGenerator from './components/MemeGenerator';
import TrendingTopics from './components/TrendingTopics';
import MemeHistory from './components/MemeHistory';
import PricingModal from './components/PricingModal';
import { supabase } from './services/supabase';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [showPricing, setShowPricing] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  return (
    <div className="App">
      <Toaster position="top-center" />
      
      <header className="app-header">
        <h1>🚀 AI Meme Generator</h1>
        <nav>
          <button 
            className={activeTab === 'generate' ? 'active' : ''}
            onClick={() => setActiveTab('generate')}
          >
            Generate
          </button>
          <button 
            className={activeTab === 'trending' ? 'active' : ''}
            onClick={() => setActiveTab('trending')}
          >
            Trending
          </button>
          <button 
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
          <button className="pricing-btn" onClick={() => setShowPricing(true)}>
            Go Pro 💎
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'generate' && <MemeGenerator user={user} />}
        {activeTab === 'trending' && <TrendingTopics />}
        {activeTab === 'history' && <MemeHistory user={user} />}
      </main>

      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </div>
  );
}

export default App;