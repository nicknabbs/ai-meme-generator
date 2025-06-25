# OpenAI API Test Scripts

This directory contains test scripts to verify your OpenAI API key and organization ID functionality, specifically for testing the GPT Image 1 model that your meme generator uses.

## Test Scripts Overview

### 1. `quick-test.js` - Fast Basic Test
A simple, quick test that checks:
- API key authentication
- Model access (including GPT Image 1 availability)
- Basic chat completion
- Basic image generation (if GPT Image 1 is available)

**Usage:**
```bash
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here node quick-test.js
```

### 2. `test-openai-api.js` - Comprehensive Test Suite
A detailed test suite that checks:
- Authentication and configuration
- Multiple standard models (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo)
- GPT Image 1 functionality with detailed debugging
- Generates a detailed JSON report

**Usage:**
```bash
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here node test-openai-api.js
```

### 3. `run-api-test.sh` - Test Runner Script
A bash script that runs the comprehensive test with environment validation.

**Usage:**
```bash
export REACT_APP_OPENAI_API_KEY="your_openai_api_key_here"
./run-api-test.sh
```

## Configuration Details

The tests use the following configuration:
- **Organization ID**: `org-2EYm2mphT2Yn21zw5J1DtVJq`
- **API Key**: Set via `REACT_APP_OPENAI_API_KEY` environment variable
- **Timeout**: 30 seconds for standard tests, 5 minutes for image generation

## What the Tests Check

### Authentication Issues
- ✅ API key validity
- ✅ Organization access
- ✅ Model availability

### Standard Model Access
- ✅ GPT-4 access
- ✅ GPT-4 Turbo access  
- ✅ GPT-3.5 Turbo access

### GPT Image 1 Specific Tests
- ✅ Model availability in your organization
- ✅ Image generation functionality
- ✅ Response format validation
- ✅ URL extraction from response
- 🔍 Detailed debugging output for troubleshooting

## Common Issues and Solutions

### 500 Internal Server Error
This usually indicates:
1. **Invalid API Key**: The key is wrong or expired
2. **Organization Access**: Your organization doesn't have access to the requested model
3. **Billing Issues**: Account has insufficient credits or billing problems
4. **Rate Limiting**: Too many requests in a short time

### GPT Image 1 Not Available
If GPT Image 1 is not available:
1. Check if your organization has been granted access to the model
2. Verify billing is set up correctly
3. Contact OpenAI support about GPT Image 1 access

### Timeout Errors
Image generation can take several minutes:
- The tests use appropriate timeouts (5 minutes for images)
- Your Netlify function should also have adequate timeout settings

## Output Files

The comprehensive test generates:
- `openai-api-test-report.json` - Detailed JSON report with all test results

## Troubleshooting 500 Errors in Your Meme Generator

Based on the test results, you can identify:

1. **Authentication Problems**: If basic auth fails, fix your API key
2. **Model Access Issues**: If GPT Image 1 isn't available, contact OpenAI or use a different model
3. **Response Format Issues**: The tests show exactly how GPT Image 1 responses are structured
4. **Timeout Problems**: Adjust your Netlify function timeout settings

## Example Test Output

```
🔍 Quick OpenAI API Test
========================

🔑 API Key: sk-1234567...
🏢 Organization: org-2EYm2mphT2Yn21zw5J1DtVJq

1️⃣ Testing model access...
✅ Success! Found 45 models
📸 GPT Image 1 available: Yes

2️⃣ Testing chat completion...
✅ Chat response: "API test successful"

3️⃣ Testing GPT Image 1 (this may take a few minutes)...
GPT Image 1 Response Structure:
- Response type: object
- Has data array: true
- Data length: 1
- First item keys: ['url', 'revised_prompt']
✅ Image generated: https://oaidalleapiprodscus.blob.core.windows...

🎉 Quick test completed!
```

## Next Steps

1. Run the quick test first to identify obvious issues
2. If problems persist, run the comprehensive test for detailed diagnostics
3. Use the test results to fix your meme generator function
4. Check the generated JSON report for specific error details