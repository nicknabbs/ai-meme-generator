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
      quality: "standard" // Use standard quality instead of low for better results
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
    
    // Try multiple extraction methods
    let imageUrl = null;
    const extractionMethods = [
      () => imageResponse.data?.[0]?.url,
      () => imageResponse.data?.[0]?.image_url,
      () => imageResponse.data?.[0]?.uri,
      () => imageResponse.url,
      () => imageResponse.image_url,
      () => imageResponse.images?.[0]?.url,
      () => imageResponse.data?.url,
      () => imageResponse.data?.image_url
    ];
    
    for (let i = 0; i < extractionMethods.length; i++) {
      try {
        const url = extractionMethods[i]();
        console.log(`Extraction method ${i + 1}:`, url || 'null/undefined');
        if (url && typeof url === 'string' && url.startsWith('http')) {
          imageUrl = url;
          console.log(`✅ Found valid URL with method ${i + 1}:`, imageUrl);
          break;
        }
      } catch (e) {
        console.log(`Extraction method ${i + 1} failed:`, e.message);
      }
    }
    
    console.log('Final extracted image URL:', imageUrl);
    
    if (!imageUrl) {
      console.error('=== URL EXTRACTION FAILED ===');
      console.error('No valid image URL found in response');
      console.error('This indicates either:');
      console.error('1. GPT Image 1 response format has changed');
      console.error('2. The response structure is different than expected');
      console.error('3. The image generation failed but returned 200 status');
      throw new Error('Image generation succeeded but no URL returned');
    }

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