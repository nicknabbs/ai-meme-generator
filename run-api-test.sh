#!/bin/bash

echo "🔧 OpenAI API Test Runner"
echo "========================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if the test script exists
if [ ! -f "test-openai-api.js" ]; then
    echo "❌ Test script 'test-openai-api.js' not found"
    exit 1
fi

# Check for environment variables
if [ -z "$REACT_APP_OPENAI_API_KEY" ]; then
    echo "⚠️  REACT_APP_OPENAI_API_KEY environment variable not set"
    echo "Please set it before running the test:"
    echo "export REACT_APP_OPENAI_API_KEY=your_openai_api_key_here"
    echo ""
    echo "Or run with the key inline:"
    echo "REACT_APP_OPENAI_API_KEY=your_key_here ./run-api-test.sh"
    echo ""
    exit 1
fi

echo "✅ Environment check passed"
echo "🔑 API Key: ${REACT_APP_OPENAI_API_KEY:0:10}..."
echo "🏢 Organization: org-2EYm2mphT2Yn21zw5J1DtVJq"
echo ""

echo "🚀 Starting API tests..."
echo "This may take several minutes, especially for image generation tests."
echo ""

# Run the test
node test-openai-api.js

echo ""
echo "✅ Test completed. Check the console output above and the generated report file."