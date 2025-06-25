const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async function(event, context) {
  console.log('=== FUNCTION START ===');
  console.log('Generate meme function called');
  console.log('Event method:', event.httpMethod);
  console.log('Event headers:', event.headers);
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Validate environment variables
  const claudeApiKey = process.env.REACT_APP_CLAUDE_API_KEY;
  const openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY;
  
  console.log('Environment check:', {
    hasClaude: !!claudeApiKey,
    hasOpenAI: !!openaiApiKey,
    claudeKeyPrefix: claudeApiKey ? claudeApiKey.substring(0, 10) + '...' : 'missing',
    openaiKeyPrefix: openaiApiKey ? openaiApiKey.substring(0, 10) + '...' : 'missing'
  });

  if (!claudeApiKey) {
    console.error('Missing REACT_APP_CLAUDE_API_KEY');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Claude API key configuration' })
    };
  }

  if (!openaiApiKey) {
    console.error('Missing REACT_APP_OPENAI_API_KEY');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing OpenAI API key configuration' })
    };
  }

  const anthropic = new Anthropic({
    apiKey: claudeApiKey,
  });

  const openai = new OpenAI({
    apiKey: openaiApiKey,
    organization: "org-2EYm2mphT2Yn21zw5J1DtVJq",
    timeout: 580000, // 9 minutes 40 seconds (slightly less than function timeout)
  });

  try {
    const { text, template, user_id } = JSON.parse(event.body);
    console.log('Request params:', { text, template, user_id });

    // Generate meme text with Claude
    console.log('Calling Claude API...');
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Generate a funny meme text for the ${template} meme format. Topic: ${text || 'something trending'}. Keep it short, punchy, and viral-worthy. Return only the meme text, no explanation.`
      }]
    });

    const memeText = claudeResponse.content[0].text;
    console.log('Claude response:', memeText);

    // Generate image with GPT Image 1
    console.log('Calling OpenAI API with GPT Image 1 model...');
    console.log('Organization ID: org-2EYm2mphT2Yn21zw5J1DtVJq');
    console.log('Note: GPT Image 1 may take several minutes to generate high-quality memes');
    const imageResponse = await openai.images.generate({
      model: "gpt-image-1",
      prompt: `A ${template} meme with the text: "${memeText}". High quality, viral meme style with clear, readable text.`,
      n: 1,
      size: "1024x1024", // Square format - only supported size options
      quality: "low", // Use low quality for fastest processing
    });

    const imageUrl = imageResponse.data[0].url;
    console.log('OpenAI image generated:', imageUrl);

    // Add watermark for free users
    const finalImageUrl = !user_id ? addWatermark(imageUrl) : imageUrl;

    console.log('Meme generation successful');
    return {
      statusCode: 200,
      body: JSON.stringify({
        text: memeText,
        image_url: finalImageUrl,
        template,
        created_at: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error generating meme:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate meme',
        details: error.message
      })
    };
  }
}

function addWatermark(imageUrl) {
  // In production, you'd process the image to add a watermark
  // For now, return the original URL
  return imageUrl;
};