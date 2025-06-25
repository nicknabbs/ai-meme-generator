const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// Content moderation system
function sanitizeContent(text) {
  if (!text) return text;
  
  // Political figures and sensitive terms to replace
  const politicalReplacements = {
    'trump': 'a politician',
    'donald trump': 'a political figure',
    'biden': 'a government official',
    'joe biden': 'a political leader',
    'harris': 'a government official',
    'kamala harris': 'a political figure',
    'powell': 'a fed official',
    'jerome powell': 'a federal reserve official',
    'fed rate': 'interest rate',
    'federal reserve': 'central bank',
    'democrat': 'political party member',
    'republican': 'political party member',
    'gop': 'political party',
    'congress': 'legislative body',
    'senate': 'legislative chamber',
    'house of representatives': 'legislative chamber'
  };
  
  let sanitized = text.toLowerCase();
  
  // Replace political terms
  for (const [original, replacement] of Object.entries(politicalReplacements)) {
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    sanitized = sanitized.replace(regex, replacement);
  }
  
  // Capitalize first letter of sentences
  sanitized = sanitized.replace(/(^\w|\.\s*\w)/gm, (match) => match.toUpperCase());
  
  return sanitized;
}

function detectSensitiveContent(text) {
  if (!text) return false;
  
  const sensitiveKeywords = [
    'trump', 'biden', 'harris', 'political', 'election', 'vote', 'democrat', 'republican',
    'gop', 'congress', 'senate', 'war', 'violence', 'terrorism', 'nazi', 'hitler',
    'racism', 'sexism', 'discrimination', 'hate', 'suicide', 'murder', 'death',
    'drugs', 'illegal', 'criminal', 'controversy', 'scandal'
  ];
  
  const lowerText = text.toLowerCase();
  return sensitiveKeywords.some(keyword => lowerText.includes(keyword));
}

function createSafePrompt(originalText, template) {
  // If content is sensitive, create a completely generic alternative
  const safeTopics = [
    'everyday life struggles',
    'work from home experiences', 
    'social media habits',
    'food and cooking',
    'entertainment and movies',
    'technology and gadgets',
    'weather and seasons',
    'exercise and fitness',
    'pets and animals',
    'travel and vacation'
  ];
  
  const randomTopic = safeTopics[Math.floor(Math.random() * safeTopics.length)];
  return `Create a relatable meme about ${randomTopic} that people will find funny and shareable`;
}

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

    // Content moderation check
    const inputText = text || '';
    const isSensitive = detectSensitiveContent(inputText);
    console.log('Content sensitivity check:', { isSensitive, originalLength: inputText.length });

    // Fetch fresh trending data for context
    console.log('🔍 Fetching fresh trending data for meme context...');
    let trendingContext = '';
    try {
      const trendingResponse = await fetch('https://bright-creponne-277f92.netlify.app/.netlify/functions/get-trending');
      const trendingData = await trendingResponse.json();
      if (trendingData.topics && trendingData.topics.length > 0) {
        const topTrends = trendingData.topics.slice(0, 3).map(t => t.topic).join(', ');
        trendingContext = `\n\nCurrent trending topics for context: ${topTrends}`;
        console.log('✅ Fresh trending context added:', topTrends);
      }
    } catch (trendingError) {
      console.log('⚠️ Could not fetch trending data, proceeding without context');
    }

    // Generate enhanced meme text with Claude
    console.log('🤖 Calling Claude API with enhanced prompts...');
    
    // Create template-specific instructions
    const templateInstructions = {
      drake: 'Create two contrasting statements - first something bad/old/rejected (top), then something good/new/preferred (bottom). Format: "LINE 1: [rejected thing] / LINE 2: [preferred thing]"',
      distracted: 'Create a scenario where someone is tempted by something new while ignoring their current situation. Format: "BOYFRIEND: [current situation] / GIRLFRIEND: [what\'s being ignored] / DISTRACTION: [new tempting thing]"',
      brain: 'Create 4 levels of increasingly enlightened thoughts, from basic to galaxy brain. Format: "LEVEL 1: [basic] / LEVEL 2: [smarter] / LEVEL 3: [very smart] / LEVEL 4: [galaxy brain]"',
      button: 'Create a difficult choice between two options that causes stress. Format: "BUTTON 1: [option 1] / BUTTON 2: [option 2] / SWEATING: [why it\'s a hard choice]"',
      stonks: 'Create something about gains, profits, or success with intentional misspelling "stonks". Format: "STONKS: [something going up/succeeding]"',
      woman_yelling: 'Create a misunderstanding or argument scenario. Format: "WOMAN: [angry accusation] / CAT: [confused innocent response]"',
      this_is_fine: 'Create a situation where everything is falling apart but someone pretends it\'s okay. Format: "SITUATION: [disaster happening] / RESPONSE: This is fine"',
      galaxy_brain: 'Create increasingly complex or absurd ways to think about something simple. Format like brain but more extreme and cosmic.'
    };

    const currentTemplate = templateInstructions[template] || 'Create funny meme text appropriate for the format.';

    // Determine the topic to use for meme generation
    let memeInputText = text || 'Use trending topics as inspiration';
    
    // If sensitive content detected, sanitize or create safe alternative
    if (isSensitive) {
      console.log('⚠️ Sensitive content detected, sanitizing...');
      memeInputText = sanitizeContent(inputText) || createSafePrompt(inputText, template);
      console.log('✅ Content sanitized:', memeInputText.substring(0, 100) + '...');
    }

    const enhancedPrompt = `You are an expert meme creator who understands viral internet humor. Create a hilarious, relatable meme for the ${template} format.

MEME FORMAT INSTRUCTIONS:
${currentTemplate}

USER TOPIC: ${memeInputText}
${trendingContext}

VIRAL MEME CHARACTERISTICS TO INCLUDE:
- Relatable everyday situations or current events
- Unexpected twists or ironic observations  
- Pop culture references or internet culture
- Self-deprecating humor or universal struggles
- Absurd but logical progressions
- Current slang and internet language
- Situations people can tag their friends in

QUALITY GUIDELINES:
- Make it genuinely funny, not just random
- Use contemporary references people will understand
- Include subtle humor that rewards careful reading
- Make it shareable and quotable
- Avoid ALL political figures, controversial topics, and sensitive content
- Use conversational, meme-appropriate language
- Keep content family-friendly and non-offensive

SUCCESSFUL MEME EXAMPLES:
- Drake: "Studying for finals / Watching Netflix documentaries about serial killers"
- Distracted boyfriend: "My sleep schedule / 8 hours of sleep / One more episode"  
- Brain: "Using calculator for 2+2 / Doing math in your head / Using fingers under the desk / Counting in another language to confuse yourself"

Return ONLY the meme text in the specified format, no explanations or additional content.`;

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: enhancedPrompt
      }]
    });

    const memeText = claudeResponse.content[0].text;
    console.log('Claude response:', memeText);

    // Generate image with GPT Image 1 - with retry logic for safety blocks
    console.log('=== GPT IMAGE 1 GENERATION START ===');
    console.log('Organization ID:', 'org-2EYm2mphT2Yn21zw5J1DtVJq');
    console.log('API Key prefix:', openaiApiKey?.substring(0, 15) + '...');
    console.log('Request timestamp:', new Date().toISOString());
    console.log('Meme text for image:', memeText);
    console.log('Template:', template);
    
    let imageResponse;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Attempt ${attempts}/${maxAttempts} for image generation...`);
      
      // Progressive sanitization for each attempt
      let promptText = memeText;
      if (attempts === 2) {
        // Second attempt: further sanitize the text
        promptText = sanitizeContent(memeText);
        console.log('🧹 Attempt 2: Using sanitized text:', promptText);
      } else if (attempts === 3) {
        // Third attempt: use completely safe generic prompt
        promptText = `Create a funny, relatable meme about everyday life situations that people find humorous and shareable`;
        console.log('🛡️ Attempt 3: Using safe generic prompt');
      }
      
      // Optimize GPT Image 1 parameters for best compatibility
      const imageRequest = {
        model: "gpt-image-1",
        prompt: `Create a ${template} meme format with the text: "${promptText}". Make it viral-worthy with clear, readable text overlay. High quality meme style. Keep content family-friendly and non-controversial.`,
        n: 1,
        size: "1024x1024", // Only supported size for GPT Image 1
        quality: "medium" // Balanced quality and speed for GPT Image 1
      };
      
      console.log('Image generation request:', JSON.stringify(imageRequest, null, 2));
      console.log('Starting GPT Image 1 generation...');
      
      try {
        imageResponse = await openai.images.generate(imageRequest);
        console.log('✅ GPT Image 1 generation completed successfully on attempt', attempts);
        break; // Success, exit retry loop
        
      } catch (imageError) {
        console.error(`❌ GPT Image 1 error on attempt ${attempts}:`, imageError.message);
        console.error('Error code:', imageError.code);
        console.error('Error type:', imageError.type);
        
        // Check if it's a moderation block
        if (imageError.code === 'moderation_blocked' || imageError.status === 400) {
          console.log('🚫 Content moderation block detected, trying with safer content...');
          
          if (attempts === maxAttempts) {
            console.error('❌ All attempts failed due to content moderation');
            throw new Error('Unable to generate image - content may be too sensitive. Please try a different topic.');
          }
          // Continue to next attempt with safer content
        } else {
          // For non-moderation errors, throw immediately
          console.error('Non-moderation error, not retrying:', imageError);
          throw imageError;
        }
      }
    }

    console.log('=== GPT IMAGE 1 RESPONSE ANALYSIS ===');
    console.log('Response type:', typeof imageResponse);
    console.log('Response constructor:', imageResponse.constructor.name);
    console.log('Response is array:', Array.isArray(imageResponse));
    console.log('Response keys:', Object.keys(imageResponse));
    console.log('Full response:', JSON.stringify(imageResponse, null, 2));
    
    // Detailed data array analysis
    if (imageResponse.data) {
      console.log('Data array exists:', true);
      console.log('Data is array:', Array.isArray(imageResponse.data));
      console.log('Data length:', imageResponse.data.length);
      
      if (imageResponse.data[0]) {
        console.log('First data item keys:', Object.keys(imageResponse.data[0]));
        console.log('First data item:', JSON.stringify(imageResponse.data[0], null, 2));
      }
    } else {
      console.log('No data array found in response');
    }
    
    // Enhanced URL extraction with comprehensive method coverage
    let imageUrl = null;
    
    // Method 1: Standard GPT Image 1 format (data[0].url) - highest priority
    if (imageResponse.data?.[0]?.url && typeof imageResponse.data[0].url === 'string') {
      imageUrl = imageResponse.data[0].url;
      console.log('✅ Found URL using method 1: data[0].url -', imageUrl.substring(0, 100) + '...');
    }
    
    // Method 2: Base64 format (data[0].b64_json) - convert to data URL
    else if (imageResponse.data?.[0]?.b64_json && typeof imageResponse.data[0].b64_json === 'string') {
      imageUrl = 'data:image/png;base64,' + imageResponse.data[0].b64_json;
      console.log('✅ Found base64 using method 2: data[0].b64_json - converted to data URL');
    }
    
    // Method 3: Images array format (images[0].url)
    else if (imageResponse.images?.[0]?.url && typeof imageResponse.images[0].url === 'string') {
      imageUrl = imageResponse.images[0].url;
      console.log('✅ Found URL using method 3: images[0].url -', imageUrl.substring(0, 100) + '...');
    }
    
    // Method 4: Images array base64 format (images[0].b64_json)
    else if (imageResponse.images?.[0]?.b64_json && typeof imageResponse.images[0].b64_json === 'string') {
      imageUrl = 'data:image/png;base64,' + imageResponse.images[0].b64_json;
      console.log('✅ Found base64 using method 4: images[0].b64_json - converted to data URL');
    }
    
    // Method 5: Legacy extraction methods (for backward compatibility)
    else {
      const legacyMethods = [
        { name: 'data[0].image_url', extract: () => imageResponse.data?.[0]?.image_url },
        { name: 'data[0].uri', extract: () => imageResponse.data?.[0]?.uri },
        { name: 'url', extract: () => imageResponse.url },
        { name: 'image_url', extract: () => imageResponse.image_url },
        { name: 'data.url', extract: () => imageResponse.data?.url },
        { name: 'data.image_url', extract: () => imageResponse.data?.image_url }
      ];
      
      for (let i = 0; i < legacyMethods.length; i++) {
        try {
          const url = legacyMethods[i].extract();
          console.log(`Legacy method ${i + 1} (${legacyMethods[i].name}):`, url || 'null/undefined');
          if (url && typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:'))) {
            imageUrl = url;
            console.log(`✅ Found valid URL with legacy method ${i + 1}:`, legacyMethods[i].name);
            break;
          }
        } catch (e) {
          console.log(`Legacy method ${i + 1} (${legacyMethods[i].name}) failed:`, e.message);
        }
      }
    }
    
    console.log('Final extracted image URL:', imageUrl);
    
    if (!imageUrl) {
      console.error('=== URL EXTRACTION FAILED ===');
      console.error('No valid image URL or base64 data found in response');
      console.error('Response structure analysis:');
      console.error('- Response keys:', Object.keys(imageResponse));
      console.error('- Has data array:', !!imageResponse.data);
      console.error('- Data array length:', Array.isArray(imageResponse.data) ? imageResponse.data.length : 'Not an array');
      console.error('- Has images array:', !!imageResponse.images);
      console.error('- Images array length:', Array.isArray(imageResponse.images) ? imageResponse.images.length : 'Not an array');
      
      if (imageResponse.data?.[0]) {
        console.error('- First data item keys:', Object.keys(imageResponse.data[0]));
        console.error('- First data item:', JSON.stringify(imageResponse.data[0], null, 2));
      }
      
      if (imageResponse.images?.[0]) {
        console.error('- First images item keys:', Object.keys(imageResponse.images[0]));
        console.error('- First images item:', JSON.stringify(imageResponse.images[0], null, 2));
      }
      
      console.error('This indicates either:');
      console.error('1. GPT Image 1 response format has changed');
      console.error('2. The response structure is different than expected');
      console.error('3. The image generation failed but returned 200 status');
      console.error('4. The image is in a format we are not handling (e.g., different field names)');
      throw new Error('Image generation succeeded but no URL or base64 data returned');
    }
    
    // Validate the extracted URL/data
    const isValidUrl = imageUrl.startsWith('http');
    const isValidDataUrl = imageUrl.startsWith('data:image/');
    
    if (!isValidUrl && !isValidDataUrl) {
      console.error('=== INVALID IMAGE DATA ===');
      console.error('Extracted value is not a valid URL or data URL:', imageUrl.substring(0, 100));
      throw new Error('Extracted image data is not in a valid format');
    }
    
    console.log('✅ Successfully extracted image data:', isValidUrl ? 'URL' : 'Base64 Data URL');

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
    console.error('=== MEME GENERATION FAILED ===');
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    
    // Specific handling for OpenAI API errors
    if (error.status) {
      console.error('HTTP Status:', error.status);
      console.error('Error code:', error.code);
      console.error('Error type:', error.type);
      
      let errorMessage = 'Failed to generate meme';
      let userFriendlyMessage = '';
      
      switch (error.status) {
        case 401:
          errorMessage = 'OpenAI API authentication failed';
          userFriendlyMessage = 'API key authentication failed. Please check your OpenAI API key configuration.';
          break;
        case 403:
          errorMessage = 'OpenAI API access forbidden';
          userFriendlyMessage = 'Access denied. Your organization may not have access to GPT Image 1 model.';
          break;
        case 404:
          errorMessage = 'GPT Image 1 model not found';
          userFriendlyMessage = 'The GPT Image 1 model is not available. Please verify model access.';
          break;
        case 429:
          errorMessage = 'OpenAI API rate limit exceeded';
          userFriendlyMessage = 'Too many requests. Please wait a moment and try again.';
          break;
        case 500:
          errorMessage = 'OpenAI API server error';
          userFriendlyMessage = 'OpenAI service is experiencing issues. Please try again later.';
          break;
        case 503:
          errorMessage = 'OpenAI API service unavailable';
          userFriendlyMessage = 'OpenAI service is temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = `OpenAI API error (${error.status})`;
          userFriendlyMessage = `Service error (${error.status}). Please try again.`;
      }
      
      console.error('Categorized error:', errorMessage);
      console.error('User message:', userFriendlyMessage);
      
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: errorMessage,
          details: error.message,
          userMessage: userFriendlyMessage,
          status: error.status,
          code: error.code,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Handle timeout errors
    if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
      console.error('Request timeout detected');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Request timeout',
          details: 'GPT Image 1 generation took too long',
          userMessage: 'Image generation is taking longer than expected. Please try again.',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('Network error detected');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Network error',
          details: 'Unable to connect to OpenAI API',
          userMessage: 'Unable to connect to image generation service. Please check your connection.',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Handle content moderation errors with helpful messaging
    if (error.message?.includes('content may be too sensitive')) {
      console.error('Content moderation error detected');
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Content moderation block',
          details: 'Content contains sensitive topics',
          userMessage: 'This topic contains sensitive content that cannot be used for meme generation. Please try a different, more general topic like technology, food, or everyday life situations.',
          suggestions: [
            'Try topics about everyday life struggles',
            'Make memes about technology or social media',
            'Create content about food, pets, or entertainment',
            'Focus on relatable work or school experiences'
          ],
          timestamp: new Date().toISOString()
        })
      };
    }

    // Handle Claude API errors specifically
    if (error.message?.includes('Claude') || error.message?.includes('Anthropic')) {
      console.error('Claude API error detected');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Text generation failed',
          details: error.message,
          userMessage: 'Failed to generate meme text. Please try again.',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Generic error handling
    console.error('Unhandled error type');
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Unexpected error',
        details: error.message,
        userMessage: 'An unexpected error occurred. Please try again.',
        timestamp: new Date().toISOString()
      })
    };
  }
}

function addWatermark(imageUrl) {
  // In production, you'd process the image to add a watermark
  // For now, return the original URL
  return imageUrl;
};