import { Configuration, OpenAIApi } from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.REACT_APP_CLAUDE_API_KEY || 'placeholder',
});

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY || 'placeholder',
}));

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { text, template, user_id } = JSON.parse(event.body);

    // Generate meme text with Claude
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Generate a funny meme text for the ${template} meme format. Topic: ${text || 'something trending'}. Keep it short, punchy, and viral-worthy. Return only the meme text, no explanation.`
      }]
    });

    const memeText = claudeResponse.content[0].text;

    // Generate image with the specified model
    const imageResponse = await openai.createImage({
      model: "gpt-image-1",
      prompt: `A ${template} meme with the text: "${memeText}". High quality, viral meme style.`,
      n: 1,
      size: "1024x1024",
    });

    const imageUrl = imageResponse.data.data[0].url;

    // Add watermark for free users
    const finalImageUrl = !user_id ? addWatermark(imageUrl) : imageUrl;

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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate meme' })
    };
  }
}

function addWatermark(imageUrl) {
  // In production, you'd process the image to add a watermark
  // For now, return the original URL
  return imageUrl;
}