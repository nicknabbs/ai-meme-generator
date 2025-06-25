#!/usr/bin/env node

// Quick OpenAI API Test
// Usage: REACT_APP_OPENAI_API_KEY=your_key node quick-test.js

const OpenAI = require('openai');

async function quickTest() {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  const organization = "org-2EYm2mphT2Yn21zw5J1DtVJq";

  console.log('🔍 Quick OpenAI API Test');
  console.log('========================');
  console.log('');

  // Check API key
  if (!apiKey) {
    console.log('❌ REACT_APP_OPENAI_API_KEY not found');
    console.log('Usage: REACT_APP_OPENAI_API_KEY=your_key node quick-test.js');
    process.exit(1);
  }

  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`🏢 Organization: ${organization}`);
  console.log('');

  const openai = new OpenAI({
    apiKey: apiKey,
    organization: organization,
    timeout: 30000
  });

  try {
    // Test 1: List models
    console.log('1️⃣ Testing model access...');
    const models = await openai.models.list();
    console.log(`✅ Success! Found ${models.data.length} models`);
    
    const hasGptImage1 = models.data.some(m => m.id === 'gpt-image-1');
    console.log(`📸 GPT Image 1 available: ${hasGptImage1 ? 'Yes' : 'No'}`);
    console.log('');

    // Test 2: Simple chat completion
    console.log('2️⃣ Testing chat completion...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "API test successful"' }],
      max_tokens: 10
    });
    
    const response = completion.choices[0].message.content;
    console.log(`✅ Chat response: "${response}"`);
    console.log('');

    // Test 3: GPT Image 1 (if available)
    if (hasGptImage1) {
      console.log('3️⃣ Testing GPT Image 1 (this may take a few minutes)...');
      try {
        const imageResponse = await openai.images.generate({
          model: "gpt-image-1",
          prompt: "A simple red circle",
          n: 1,
          size: "1024x1024",
          quality: "low"
        });

        console.log('GPT Image 1 Response Structure:');
        console.log('- Response type:', typeof imageResponse);
        console.log('- Has data array:', Array.isArray(imageResponse.data));
        console.log('- Data length:', imageResponse.data?.length || 0);
        
        if (imageResponse.data?.[0]) {
          console.log('- First item keys:', Object.keys(imageResponse.data[0]));
          const url = imageResponse.data[0].url;
          if (url) {
            console.log(`✅ Image generated: ${url.substring(0, 50)}...`);
          } else {
            console.log('❌ No URL found in response');
          }
        }
      } catch (imageError) {
        console.log(`❌ GPT Image 1 error: ${imageError.message}`);
        if (imageError.status) {
          console.log(`   Status: ${imageError.status}`);
        }
      }
    } else {
      console.log('3️⃣ Skipping GPT Image 1 test (model not available)');
    }

    console.log('');
    console.log('🎉 Quick test completed!');

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    if (error.status) {
      console.log(`   HTTP Status: ${error.status}`);
    }
    if (error.code) {
      console.log(`   Error Code: ${error.code}`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  quickTest().catch(console.error);
}