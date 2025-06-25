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
    console.log('=== GPT IMAGE 1 GENERATION START ===');
    console.log('Organization ID:', 'org-2EYm2mphT2Yn21zw5J1DtVJq');
    console.log('API Key prefix:', openaiApiKey?.substring(0, 15) + '...');
    console.log('Request timestamp:', new Date().toISOString());
    console.log('Meme text for image:', memeText);
    console.log('Template:', template);
    
    // Optimize GPT Image 1 parameters for best compatibility
    const imageRequest = {
      model: "gpt-image-1",
      prompt: `Create a ${template} meme format with the text: "${memeText}". Make it viral-worthy with clear, readable text overlay. High quality meme style.`,
      n: 1,
      size: "1024x1024", // Only supported size for GPT Image 1
      quality: "medium" // Balanced quality and speed for GPT Image 1
    };
    
    console.log('Image generation request:', JSON.stringify(imageRequest, null, 2));
    console.log('Starting GPT Image 1 generation...');
    
    let imageResponse;
    try {
      imageResponse = await openai.images.generate(imageRequest);
      console.log('GPT Image 1 generation completed successfully');
    } catch (imageError) {
      console.error('=== GPT IMAGE 1 ERROR DETAILS ===');
      console.error('Error type:', typeof imageError);
      console.error('Error constructor:', imageError.constructor.name);
      console.error('Error message:', imageError.message);
      console.error('Error status:', imageError.status);
      console.error('Error code:', imageError.code);
      console.error('Error type property:', imageError.type);
      console.error('Full error object:', JSON.stringify(imageError, null, 2));
      
      if (imageError.response) {
        console.error('Response status:', imageError.response.status);
        console.error('Response headers:', imageError.response.headers);
        console.error('Response data:', imageError.response.data);
      }
      
      throw imageError; // Re-throw to be caught by outer catch
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
    
    // Method 1: Standard DALL-E format (data[0].url) - highest priority
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