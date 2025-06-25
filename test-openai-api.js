const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  organization: "org-2EYm2mphT2Yn21zw5J1DtVJq",
  timeout: 30000 // 30 seconds for most tests
};

// Test results storage
const results = {
  authentication: null,
  standardModels: [],
  gptImage1: null,
  summary: {
    passed: 0,
    failed: 0,
    errors: []
  }
};

// Initialize OpenAI client
let openai = null;

function logTest(testName, status, details = '') {
  const timestamp = new Date().toISOString();
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`[${timestamp}] ${statusIcon} ${testName}: ${status}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
  console.log('');
}

function updateResults(testType, testName, status, details = '', error = null) {
  const result = {
    test: testName,
    status,
    details,
    error: error ? error.message : null,
    timestamp: new Date().toISOString()
  };

  if (testType === 'auth') {
    results.authentication = result;
  } else if (testType === 'standard') {
    results.standardModels.push(result);
  } else if (testType === 'image') {
    results.gptImage1 = result;
  }

  if (status === 'PASS') {
    results.summary.passed++;
  } else if (status === 'FAIL') {
    results.summary.failed++;
    if (error) {
      results.summary.errors.push({
        test: testName,
        error: error.message,
        details
      });
    }
  }
}

async function testAuthentication() {
  console.log('🔐 Testing Authentication & Configuration...\n');
  
  try {
    // Check environment variables
    if (!CONFIG.apiKey) {
      throw new Error('REACT_APP_OPENAI_API_KEY environment variable is not set');
    }

    // Initialize OpenAI client
    openai = new OpenAI({
      apiKey: CONFIG.apiKey,
      organization: CONFIG.organization,
      timeout: CONFIG.timeout
    });

    // Test authentication by making a simple API call
    const models = await openai.models.list();
    
    logTest('API Key Authentication', 'PASS', `Successfully authenticated. Found ${models.data.length} available models.`);
    
    // Check if organization ID is working
    const hasGptImage1 = models.data.some(model => model.id === 'gpt-image-1');
    const orgStatus = hasGptImage1 ? 'Organization has access to GPT Image 1' : 'Organization may not have access to GPT Image 1';
    
    logTest('Organization ID Validation', hasGptImage1 ? 'PASS' : 'WARN', `Organization: ${CONFIG.organization}. ${orgStatus}`);
    
    updateResults('auth', 'Authentication & Configuration', 'PASS', 
      `API Key valid, ${models.data.length} models available, GPT Image 1 access: ${hasGptImage1}`);
    
    return true;
  } catch (error) {
    logTest('Authentication', 'FAIL', error.message);
    updateResults('auth', 'Authentication & Configuration', 'FAIL', error.message, error);
    return false;
  }
}

async function testStandardModels() {
  console.log('🤖 Testing Standard Models...\n');
  
  const modelsToTest = [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
  ];

  for (const model of modelsToTest) {
    try {
      console.log(`Testing ${model.name} (${model.id})...`);
      
      const completion = await openai.chat.completions.create({
        model: model.id,
        messages: [
          { role: 'user', content: 'Say "Hello, this is a test!" and nothing else.' }
        ],
        max_tokens: 20,
        temperature: 0
      });

      const response = completion.choices[0].message.content;
      const isValid = response && response.trim().length > 0;
      
      if (isValid) {
        logTest(`${model.name} Model`, 'PASS', `Response: "${response}"`);
        updateResults('standard', `${model.name} Model`, 'PASS', `Response received: "${response}"`);
      } else {
        logTest(`${model.name} Model`, 'FAIL', 'Empty or invalid response');
        updateResults('standard', `${model.name} Model`, 'FAIL', 'Empty or invalid response');
      }
    } catch (error) {
      logTest(`${model.name} Model`, 'FAIL', error.message);
      updateResults('standard', `${model.name} Model`, 'FAIL', error.message, error);
    }
  }
}

async function testGptImage1() {
  console.log('🎨 Testing GPT Image 1 Model...\n');
  
  try {
    console.log('Attempting to generate image with GPT Image 1...');
    console.log('Note: This test may take several minutes due to model processing time.');
    
    // Set longer timeout for image generation
    const imageOpenai = new OpenAI({
      apiKey: CONFIG.apiKey,
      organization: CONFIG.organization,
      timeout: 300000 // 5 minutes for image generation
    });

    const imageResponse = await imageOpenai.images.generate({
      model: "gpt-image-1",
      prompt: "A simple test image: a red circle on a white background. Minimalist style.",
      n: 1,
      size: "1024x1024",
      quality: "low" // Use low quality for faster processing
    });

    console.log('Raw GPT Image 1 Response Structure:');
    console.log('- Response keys:', Object.keys(imageResponse));
    console.log('- Response.data type:', typeof imageResponse.data);
    console.log('- Response.data length:', Array.isArray(imageResponse.data) ? imageResponse.data.length : 'Not an array');
    
    if (imageResponse.data && Array.isArray(imageResponse.data) && imageResponse.data.length > 0) {
      console.log('- First data item keys:', Object.keys(imageResponse.data[0]));
    }

    // Try to extract image URL from different possible locations
    const possibleUrls = [
      imageResponse.data?.[0]?.url,
      imageResponse.url,
      imageResponse.images?.[0]?.url,
      imageResponse.data?.url
    ];

    const imageUrl = possibleUrls.find(url => url && typeof url === 'string');
    
    if (imageUrl) {
      logTest('GPT Image 1 Model', 'PASS', `Image generated successfully. URL: ${imageUrl.substring(0, 50)}...`);
      updateResults('image', 'GPT Image 1 Model', 'PASS', `Image URL received: ${imageUrl.substring(0, 100)}...`);
    } else {
      logTest('GPT Image 1 Model', 'FAIL', 'Image generation succeeded but no URL found in response');
      updateResults('image', 'GPT Image 1 Model', 'FAIL', 'No image URL in response', 
        new Error('Image URL not found in response structure'));
    }
    
    // Log the full response for debugging
    console.log('Full GPT Image 1 Response (for debugging):');
    console.log(JSON.stringify(imageResponse, null, 2));
    
  } catch (error) {
    console.log('GPT Image 1 Error Details:');
    console.log('- Error type:', error.constructor.name);
    console.log('- Error message:', error.message);
    console.log('- Error status:', error.status);
    console.log('- Error code:', error.code);
    
    if (error.response) {
      console.log('- Response status:', error.response.status);
      console.log('- Response data:', error.response.data);
    }
    
    logTest('GPT Image 1 Model', 'FAIL', error.message);
    updateResults('image', 'GPT Image 1 Model', 'FAIL', error.message, error);
  }
}

async function generateReport() {
  console.log('📊 Test Results Summary\n');
  console.log('=' * 50);
  
  const report = {
    timestamp: new Date().toISOString(),
    configuration: {
      apiKey: CONFIG.apiKey ? `${CONFIG.apiKey.substring(0, 10)}...` : 'NOT SET',
      organization: CONFIG.organization,
      timeout: CONFIG.timeout
    },
    summary: results.summary,
    authentication: results.authentication,
    standardModels: results.standardModels,
    gptImage1: results.gptImage1
  };

  console.log(`✅ Tests Passed: ${results.summary.passed}`);
  console.log(`❌ Tests Failed: ${results.summary.failed}`);
  console.log(`📈 Success Rate: ${((results.summary.passed / (results.summary.passed + results.summary.failed)) * 100).toFixed(1)}%`);
  
  if (results.summary.errors.length > 0) {
    console.log('\n🚨 Error Summary:');
    results.summary.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
      if (error.details) {
        console.log(`   Details: ${error.details}`);
      }
    });
  }

  // Save detailed report to file
  const reportPath = path.join(__dirname, 'openai-api-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Generate recommendations
  console.log('\n💡 Recommendations:');
  
  if (!results.authentication || results.authentication.status === 'FAIL') {
    console.log('- Fix API key authentication issues first');
  }
  
  if (results.standardModels.some(m => m.status === 'FAIL')) {
    console.log('- Some standard models are not accessible - check organization permissions');
  }
  
  if (results.gptImage1 && results.gptImage1.status === 'FAIL') {
    console.log('- GPT Image 1 access issues detected - verify organization has access to this model');
    console.log('- Check if billing is set up correctly for image generation');
  }
  
  console.log('- Review the detailed JSON report for more information');
}

async function runAllTests() {
  console.log('🚀 OpenAI API Test Suite\n');
  console.log('Testing configuration:');
  console.log(`- API Key: ${CONFIG.apiKey ? 'Present' : 'MISSING'}`);
  console.log(`- Organization: ${CONFIG.organization}`);
  console.log(`- Timeout: ${CONFIG.timeout}ms`);
  console.log('\n');

  try {
    // Test 1: Authentication and Configuration
    const authSuccess = await testAuthentication();
    
    if (authSuccess) {
      // Test 2: Standard Models
      await testStandardModels();
      
      // Test 3: GPT Image 1
      await testGptImage1();
    } else {
      console.log('❌ Skipping model tests due to authentication failure.\n');
    }
    
    // Generate final report
    await generateReport();
    
  } catch (error) {
    console.error('❌ Test suite failed with error:', error.message);
    console.error('Full error:', error);
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testAuthentication,
  testStandardModels,
  testGptImage1
};