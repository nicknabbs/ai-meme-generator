exports.handler = async function(event, context) {
  // In production, this would fetch from Twitter, Reddit, TikTok APIs
  // For demo, return mock trending topics
  
  const mockTopics = [
    {
      id: '1',
      topic: 'AI taking over jobs',
      score: 9500,
      growth: 245,
      source: 'twitter'
    },
    {
      id: '2',
      topic: 'New iPhone features',
      score: 8200,
      growth: 180,
      source: 'reddit'
    },
    {
      id: '3',
      topic: 'Summer vacation fails',
      score: 7800,
      growth: 150,
      source: 'tiktok'
    },
    {
      id: '4',
      topic: 'Cryptocurrency memes',
      score: 7200,
      growth: 120,
      source: 'twitter'
    },
    {
      id: '5',
      topic: 'Celebrity drama',
      score: 6900,
      growth: 95,
      source: 'reddit'
    },
    {
      id: '6',
      topic: 'Food delivery nightmares',
      score: 6500,
      growth: 88,
      source: 'tiktok'
    }
  ];

  return {
    statusCode: 200,
    body: JSON.stringify({ topics: mockTopics })
  };
};