#!/bin/bash

# Deployment script for Inventory Management System
# This script builds and deploys both frontend and backend

set -e  # Exit on any error

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js version check passed: $(node --version)"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the root directory of the inventory project"
    exit 1
fi

# Create deployment directory
DEPLOY_DIR="./deploy"
mkdir -p "$DEPLOY_DIR"

print_status "Installing root dependencies..."
npm install concurrently --save-dev --silent

# Build frontend
print_status "Building frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install --silent
fi

print_status "Running frontend build..."
npm run build

if [ ! -d "dist" ]; then
    print_error "Frontend build failed - no dist directory found"
    exit 1
fi

print_status "Frontend build completed successfully"

# Copy frontend build to deployment directory
cp -r dist/* "../$DEPLOY_DIR/"
cd ..

# Prepare backend
print_status "Preparing backend..."
cd backend

if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm install --silent
fi

print_status "Backend preparation completed"

# Copy backend files to deployment directory
mkdir -p "../$DEPLOY_DIR/api"
cp -r src/* "../$DEPLOY_DIR/api/"
cp package*.json "../$DEPLOY_DIR/api/"

# Copy environment files if they exist
if [ -f ".env" ]; then
    cp .env "../$DEPLOY_DIR/api/"
fi

cd ..

# Update backend server to serve frontend files
print_status "Configuring backend to serve frontend..."

cat > "$DEPLOY_DIR/api/static-config.js" << 'EOF'
// Configuration to serve frontend files
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function setupStaticFiles(app) {
  // Serve frontend files
  app.use(express.static(join(__dirname, '..')));

  // Handle client-side routing
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(join(__dirname, '..', 'index.html'));
  });
}
EOF

print_status "Creating production start script..."

cat > "$DEPLOY_DIR/start.sh" << 'EOF'
#!/bin/bash
cd api
echo "Starting Inventory Management System..."
echo "Backend API: http://localhost:3001/api"
echo "Frontend: http://localhost:3001"
echo "Health Check: http://localhost:3001/health"
npm start
EOF

chmod +x "$DEPLOY_DIR/start.sh"

# Create simple deployment package
print_status "Creating deployment package..."
cd "$DEPLOY_DIR"
tar -czf "../inventory-app-$(date +%Y%m%d-%H%M%S).tar.gz" .
cd ..

print_status "✅ Deployment build completed successfully!"
echo ""
echo "📦 Deployment files are in: $DEPLOY_DIR/"
echo "🚀 To start the application:"
echo "   cd $DEPLOY_DIR && ./start.sh"
echo ""
echo "🌐 After starting, access the application at:"
echo "   Frontend: http://localhost:3001"
echo "   API: http://localhost:3001/api"
echo "   Health: http://localhost:3001/health"
echo ""
echo "📋 Deployment package created: inventory-app-$(date +%Y%m%d-%H%M%S).tar.gz"