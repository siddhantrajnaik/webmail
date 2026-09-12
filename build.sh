#!/bin/bash
set -e
echo "Building frontend..."
cd /opt/render/project/src
npm run build

echo "Building backend..."
cd server
npm install
npm run build

echo "Copying frontend to server dist/public..."
cp -r ../dist dist/public
echo "Build complete"
