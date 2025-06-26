const axios = require('axios');

// Cache for storing trending data to avoid rate limiting
let trendingCache = {
  data: null,
  timestamp: null,
  expiry: 2 * 60 * 1000 // 2 minutes for fresher mood-based data
};

exports.handler = async function(event, context) {
  console.log('=== GET TRENDING FUNCTION START ===');
  
  // Extract mood and forceRefresh from query parameters
  const mood = event.queryStringParameters?.mood || 'viral';
  const forceRefresh = event.queryStringParameters?.forceRefresh === 'true';
  
  console.log('Request params:', { mood, forceRefresh });
  
  // Check cache unless forceRefresh is requested
  const now = Date.now();
  const cacheKey = `${mood}_trends`;
  
  if (!forceRefresh && trendingCache.data && trendingCache.timestamp && (now - trendingCache.timestamp < trendingCache.expiry)) {
    console.log('✅ Returning cached trending data for mood:', mood);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ 
        topics: trendingCache.data,
        cached: true,
        mood: mood,
        timestamp: trendingCache.timestamp
      })
    };
  }

  try {
    console.log(`🔍 Fetching fresh trending data for mood: ${mood}...`);
    
    // Mood-based subreddit mapping
    const moodSubreddits = {
      funny: ['memes', 'funny', 'dankmemes', 'meirl', 'PrequelMemes', 'comedyheaven', 'okbuddyretard'],
      tech: ['technology', 'programming', 'MachineLearning', 'gadgets', 'Android'],
      motivational: ['GetMotivated', 'wholesomememes', 'MadeMeSmile', 'HumansBeingBros'],
      relatable: ['meirl', 'mildlyinfuriating', 'antiwork', 'adultlife', 'twentysomething'],
      viral: ['memes', 'dankmemes', 'funny', 'technology', 'worldnews', 'todayilearned'],
      entertainment: ['gaming', 'movies', 'television', 'Music', 'netflix'],
      work: ['antiwork', 'programming', 'productivity', 'cscareerquestions', 'entrepreneur'],
      love: ['dating', 'relationship_advice', 'relationships', 'dating_advice'],
      sad: ['depression', 'sad', 'lonely', 'support'],
      happy: ['happy', 'wholesome', 'MadeMeSmile', 'UpliftingNews'],
      angry: ['mildlyinfuriating', 'rage', 'antiwork', 'rant'],
      cool: ['coolguides', 'interestingasfuck', 'nextfuckinglevel'],
      mindblown: ['todayilearned', 'interestingasfuck', 'science', 'Damnthatsinteresting'],
      money: ['investing', 'cryptocurrency', 'personalfinance', 'stocks']
    };

    // Get environment variables (Netlify functions don't use REACT_APP_ prefix)
    const redditClientId = process.env.REDDIT_CLIENT_ID;
    const redditClientSecret = process.env.REDDIT_CLIENT_SECRET;
    const newsApiKey = process.env.NEWSAPI_KEY;

    console.log('Environment check:', {
      hasRedditId: !!redditClientId,
      hasRedditSecret: !!redditClientSecret,
      hasNewsApi: !!newsApiKey
    });

    const trendingTopics = [];
    const selectedSubreddits = moodSubreddits[mood] || moodSubreddits.viral;

    // 1. Get Reddit trending topics
    if (redditClientId && redditClientSecret) {
      try {
        console.log('📱 Fetching Reddit trending data...');
        
        // Get Reddit access token
        const authString = Buffer.from(`${redditClientId}:${redditClientSecret}`).toString('base64');
        
        const tokenResponse = await axios.post('https://www.reddit.com/api/v1/access_token', 
          'grant_type=client_credentials',
          {
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'web:ai-meme-generator:v1.0.0 (by /u/AI-Meme-Bot)'
            }
          }
        );

        const accessToken = tokenResponse.data.access_token;
        console.log('✅ Reddit access token obtained');

        // Fetch hot posts from mood-specific subreddits
        console.log(`📱 Fetching from ${mood} subreddits:`, selectedSubreddits);
        
        for (const subreddit of selectedSubreddits) {
          try {
            const response = await axios.get(`https://oauth.reddit.com/r/${subreddit}/hot`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'web:ai-meme-generator:v1.0.0 (by /u/AI-Meme-Bot)'
              },
              params: {
                limit: 5 // Get top 5 hot posts from each subreddit
              }
            });

            const posts = response.data.data.children;
            
            posts.forEach(post => {
              const data = post.data;
              if (data.title && data.score > 100) { // Only include posts with decent engagement
                trendingTopics.push({
                  id: `reddit_${data.id}`,
                  topic: data.title,
                  score: data.score,
                  growth: Math.floor(data.score / 100), // Approximate growth based on score
                  source: 'reddit',
                  subreddit: subreddit,
                  url: `https://reddit.com${data.permalink}`,
                  created: data.created_utc
                });
              }
            });

          } catch (subredditError) {
            console.error(`Error fetching r/${subreddit}:`, subredditError.message);
          }
        }

        console.log(`✅ Reddit: Found ${trendingTopics.length} trending topics`);

      } catch (redditError) {
        console.error('❌ Reddit API error:', redditError.message);
        console.error('Reddit error details:', redditError.response?.data);
      }
    }

    // 2. Get NewsAPI trending topics (exclude moods that should be Reddit-only)
    const redditOnlyMoods = ['funny', 'love', 'sad', 'angry', 'happy']; // These moods use only Reddit
    
    if (newsApiKey && !redditOnlyMoods.includes(mood)) {
      try {
        console.log(`📰 Fetching NewsAPI trending data for ${mood}...`);
        
        // Mood-based NewsAPI categories (refined to avoid celebrity gossip)
        const moodNewsCategories = {
          tech: 'technology',
          motivational: 'business',
          relatable: 'general',
          viral: 'general',
          entertainment: 'entertainment',
          work: 'business',
          cool: 'science',
          mindblown: 'science',
          money: 'business'
        };
        
        const newsCategory = moodNewsCategories[mood] || 'general';
        console.log(`📰 Using NewsAPI category: ${newsCategory}`);
        
        const newsResponse = await axios.get('https://newsapi.org/v2/top-headlines', {
          params: {
            apiKey: newsApiKey,
            country: 'us',
            pageSize: 10,
            category: newsCategory
          }
        });

        const articles = newsResponse.data.articles;
        
        articles.forEach((article, index) => {
          if (article.title && !article.title.includes('[Removed]')) {
            // Extract key topics from headlines
            const topic = article.title.split(' - ')[0]; // Remove source attribution
            
            trendingTopics.push({
              id: `news_${index}`,
              topic: topic,
              score: 1000 - (index * 50), // Assign decreasing scores based on position
              growth: Math.floor(Math.random() * 100) + 50, // Simulated growth
              source: 'news',
              url: article.url,
              created: new Date(article.publishedAt).getTime() / 1000
            });
          }
        });

        console.log(`✅ NewsAPI: Found ${newsResponse.data.articles.length} news topics`);

      } catch (newsError) {
        console.error('❌ NewsAPI error:', newsError.message);
        console.error('NewsAPI error details:', newsError.response?.data);
      }
    } else if (redditOnlyMoods.includes(mood)) {
      console.log(`⚡ Skipping NewsAPI for Reddit-only mood: ${mood}`);
    }

    // 3. Process and rank trending topics
    console.log(`🔄 Processing ${trendingTopics.length} total topics...`);
    
    // Sort by score and recency
    const processedTopics = trendingTopics
      .sort((a, b) => {
        // Prioritize by score, but boost recent content
        const aRecency = (Date.now() / 1000 - a.created) / 3600; // Hours ago
        const bRecency = (Date.now() / 1000 - b.created) / 3600;
        
        const aAdjustedScore = a.score - (aRecency * 10); // Reduce score for older content
        const bAdjustedScore = b.score - (bRecency * 10);
        
        return bAdjustedScore - aAdjustedScore;
      })
      .slice(0, 15) // Keep top 15 topics
      .map((topic, index) => ({
        ...topic,
        rank: index + 1
      }));

    // 4. Add mood-specific fallback topics if we don't have enough
    if (processedTopics.length < 5) {
      console.log(`⚠️ Adding fallback topics for ${mood}...`);
      
      const moodFallbacks = {
        funny: [
          { topic: 'Funny everyday life situations', source: 'fallback', score: 500 },
          { topic: 'Internet memes and viral content', source: 'fallback', score: 480 },
          { topic: 'Relatable social media moments', source: 'fallback', score: 460 }
        ],
        tech: [
          { topic: 'Latest technology innovations', source: 'fallback', score: 500 },
          { topic: 'Programming and development trends', source: 'fallback', score: 480 },
          { topic: 'AI and machine learning updates', source: 'fallback', score: 460 }
        ],
        motivational: [
          { topic: 'Success and achievement stories', source: 'fallback', score: 500 },
          { topic: 'Personal growth and improvement', source: 'fallback', score: 480 },
          { topic: 'Overcoming challenges', source: 'fallback', score: 460 }
        ],
        relatable: [
          { topic: 'Everyday life struggles', source: 'fallback', score: 500 },
          { topic: 'Work from home experiences', source: 'fallback', score: 480 },
          { topic: 'Adult life realities', source: 'fallback', score: 460 }
        ],
        viral: [
          { topic: 'Trending social media content', source: 'fallback', score: 500 },
          { topic: 'Current viral moments', source: 'fallback', score: 480 },
          { topic: 'Internet culture phenomena', source: 'fallback', score: 460 }
        ],
        entertainment: [
          { topic: 'Gaming and streaming trends', source: 'fallback', score: 500 },
          { topic: 'Movie and TV show discussions', source: 'fallback', score: 480 },
          { topic: 'Celebrity and pop culture', source: 'fallback', score: 460 }
        ],
        work: [
          { topic: 'Career and productivity tips', source: 'fallback', score: 500 },
          { topic: 'Workplace culture and trends', source: 'fallback', score: 480 },
          { topic: 'Professional development', source: 'fallback', score: 460 }
        ],
        love: [
          { topic: 'Dating and relationship humor', source: 'fallback', score: 500 },
          { topic: 'Romance and relationship advice', source: 'fallback', score: 480 },
          { topic: 'Love and dating experiences', source: 'fallback', score: 460 }
        ],
        sad: [
          { topic: 'Emotional support and understanding', source: 'fallback', score: 500 },
          { topic: 'Coping with difficult times', source: 'fallback', score: 480 },
          { topic: 'Mental health awareness', source: 'fallback', score: 460 }
        ],
        happy: [
          { topic: 'Positive and uplifting moments', source: 'fallback', score: 500 },
          { topic: 'Good news and happy stories', source: 'fallback', score: 480 },
          { topic: 'Wholesome and feel-good content', source: 'fallback', score: 460 }
        ],
        angry: [
          { topic: 'Everyday frustrations and rants', source: 'fallback', score: 500 },
          { topic: 'Things that mildly infuriate people', source: 'fallback', score: 480 },
          { topic: 'Common annoying experiences', source: 'fallback', score: 460 }
        ],
        cool: [
          { topic: 'Interesting facts and cool guides', source: 'fallback', score: 500 },
          { topic: 'Amazing and impressive content', source: 'fallback', score: 480 },
          { topic: 'Cool lifestyle and trends', source: 'fallback', score: 460 }
        ],
        mindblown: [
          { topic: 'Surprising facts and discoveries', source: 'fallback', score: 500 },
          { topic: 'Mind-blowing science and nature', source: 'fallback', score: 480 },
          { topic: 'Incredible and fascinating content', source: 'fallback', score: 460 }
        ],
        money: [
          { topic: 'Personal finance and investing tips', source: 'fallback', score: 500 },
          { topic: 'Cryptocurrency and trading trends', source: 'fallback', score: 480 },
          { topic: 'Money management and wealth building', source: 'fallback', score: 460 }
        ]
      };
      
      const fallbackTopics = moodFallbacks[mood] || moodFallbacks.viral;

      fallbackTopics.forEach((topic, index) => {
        if (processedTopics.length < 10) {
          processedTopics.push({
            id: `fallback_${index}`,
            topic: topic.topic,
            score: topic.score,
            growth: Math.floor(Math.random() * 50) + 25,
            source: topic.source,
            rank: processedTopics.length + 1
          });
        }
      });
    }

    // 5. Cache the results
    trendingCache.data = processedTopics;
    trendingCache.timestamp = now;
    
    console.log(`✅ Successfully processed ${processedTopics.length} trending topics for mood: ${mood}`);
    console.log('Top 3 topics:', processedTopics.slice(0, 3).map(t => t.topic));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ 
        topics: processedTopics,
        cached: false,
        mood: mood,
        timestamp: now,
        sources: {
          reddit: trendingTopics.filter(t => t.source === 'reddit').length,
          news: trendingTopics.filter(t => t.source === 'news').length,
          fallback: processedTopics.filter(t => t.source === 'fallback').length
        }
      })
    };

  } catch (error) {
    console.error('=== TRENDING FUNCTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Return fallback data in case of complete failure
    const fallbackData = [
      {
        id: 'fallback_1',
        topic: 'AI and automation trends',
        score: 1000,
        growth: 150,
        source: 'fallback'
      },
      {
        id: 'fallback_2',
        topic: 'Social media viral content',
        score: 950,
        growth: 120,
        source: 'fallback'
      },
      {
        id: 'fallback_3',
        topic: 'Technology and innovation',
        score: 900,
        growth: 100,
        source: 'fallback'
      },
      {
        id: 'fallback_4',
        topic: 'Entertainment and gaming',
        score: 850,
        growth: 90,
        source: 'fallback'
      },
      {
        id: 'fallback_5',
        topic: 'Current events and news',
        score: 800,
        growth: 80,
        source: 'fallback'
      }
    ];

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ 
        topics: fallbackData,
        error: true,
        mood: mood || 'viral',
        message: 'Using fallback data due to API errors',
        timestamp: Date.now()
      })
    };
  }
};