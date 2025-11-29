#!/bin/bash

# ProSpaces CRM Test Runner
# Run this script to execute all tests and check for regressions

echo "🧪 ProSpaces CRM - Running Test Suite"
echo "======================================"
echo ""

# Check if vitest is installed
if ! command -v vitest &> /dev/null; then
    echo "❌ Vitest not found. Installing dependencies..."
    npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
fi

echo "Running all tests..."
echo ""

# Run tests
npx vitest run

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo ""
    echo "Next steps:"
    echo "- Run 'npx vitest --coverage' for coverage report"
    echo "- Run 'npx vitest --watch' for watch mode"
else
    echo ""
    echo "❌ Some tests failed. Please review the output above."
    exit 1
fi
