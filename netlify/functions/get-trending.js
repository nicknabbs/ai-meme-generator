const axios = require('axios');

// Cache for storing trending data to avoid rate limiting
let trendingCache = {
  data: null,
  timestamp: null,
  expiry: 5 * 60 * 1000 // 5 minutes
};

exports.handler = async function(event, context) {
  console.log('=== GET TRENDING FUNCTION START ===');
  
  // Check if we have cached data that's still valid
  const now = Date.now();
  if (trendingCache.data && trendingCache.timestamp && (now - trendingCache.timestamp < trendingCache.expiry)) {
    console.log('✅ Returning cached trending data');
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ 
        topics: trendingCache.data,
        cached: true,
        timestamp: trendingCache.timestamp
      })
    };
  }

  try {
    console.log('🔍 Fetching fresh trending data...');
    
    // Get environment variables
    const redditClientId = process.env.REACT_APP_REDDIT_CLIENT_ID;
    const redditClientSecret = process.env.REACT_APP_REDDIT_CLIENT_SECRET;
    const newsApiKey = process.env.REACT_APP_NEWSAPI_KEY;

    console.log('Environment check:', {
      hasRedditId: !!redditClientId,
      hasRedditSecret: !!redditClientSecret,
      hasNewsApi: !!newsApiKey
    });

    const trendingTopics = [];

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
              'User-Agent': 'AI-Meme-Generator/1.0.0'
            }
          }
        );

        const accessToken = tokenResponse.data.access_token;
        console.log('✅ Reddit access token obtained');

        // Fetch hot posts from multiple subreddits
        const subreddits = ['memes', 'dankmemes', 'funny', 'technology', 'worldnews', 'todayilearned'];
        
        for (const subreddit of subreddits) {
          try {
            const response = await axios.get(`https://oauth.reddit.com/r/${subreddit}/hot`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'AI-Meme-Generator/1.0.0'
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

    // 2. Get NewsAPI trending topics
    if (newsApiKey) {
      try {
        console.log('📰 Fetching NewsAPI trending data...');
        
        const newsResponse = await axios.get('https://newsapi.org/v2/top-headlines', {
          params: {
            apiKey: newsApiKey,
            country: 'us',
            pageSize: 10,
            category: 'general'
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

    // 4. Add fallback topics if we don't have enough
    if (processedTopics.length < 5) {
      console.log('⚠️ Adding fallback topics...');
      
      const fallbackTopics = [
        { topic: 'AI and technology trends', source: 'fallback', score: 500 },
        { topic: 'Social media viral moments', source: 'fallback', score: 480 },
        { topic: 'Celebrity news and drama', source: 'fallback', score: 460 },
        { topic: 'Gaming and entertainment', source: 'fallback', score: 440 },
        { topic: 'Current events and politics', source: 'fallback', score: 420 }
      ];

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
    
    console.log(`✅ Successfully processed ${processedTopics.length} trending topics`);
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
        message: 'Using fallback data due to API errors',
        timestamp: Date.now()
      })
    };
  }
};