#!/bin/bash

echo "🎿 OpenRacer Setup Script"
echo "=========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please download and install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo ""

# Create assets directory
echo "📁 Creating assets directory..."
mkdir -p assets

# Create placeholder icon files message
echo "📝 NOTE: You'll need to add icon files to the assets/ directory:"
echo "   - assets/icon.png (512x512 for Linux)"
echo "   - assets/icon.ico (for Windows)"
echo "   - assets/icon.icns (for macOS)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "🚀 Quick commands:"
    echo "   npm run dev        - Run in development mode"
    echo "   npm start          - Run in production mode"
    echo "   npm run build:win  - Build for Windows"
    echo "   npm run build:mac  - Build for macOS"
    echo "   npm run build:linux - Build for Linux"
    echo ""
    echo "🎯 Next steps:"
    echo "   1. Add icon files to assets/ directory"
    echo "   2. Update YOUR_USERNAME in README.md with your GitHub username"
    echo "   3. Run 'npm run dev' to start developing"
    echo ""
else
    echo "❌ Installation failed!"
    exit 1
fi