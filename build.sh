#!/usr/bin/env bash
# Exit on error
set -e

echo "📦 Installing client dependencies..."
cd client
npm install

echo "⚡ Building client production bundle..."
npm run build

echo "📦 Installing server dependencies..."
cd ../server
npm install

echo "✅ Build completed successfully!"
