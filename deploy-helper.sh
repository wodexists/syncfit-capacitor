#!/bin/bash

# Helper script for deployment

# Build the application
echo "Building application..."
npm run build

# Display deployment instructions
echo ""
echo "===== DEPLOYMENT INSTRUCTIONS ====="
echo "1. When deploying in Replit:"
echo "   - Build command: npm install && npm run build"
echo "   - Run command: npm run start"
echo ""
echo "2. Firebase Configuration:"
echo "   - Add your .replit.app domain to Firebase Console → Authentication → Settings → Authorized domains"
echo "   - Add https://yourdomain.replit.app/__/auth/handler to the Google Sign-in method authorized redirect URIs"
echo ""
echo "3. See DEPLOYMENT.md for detailed instructions"
echo "====================================="
echo ""

echo "Deployment preparation complete! You can now deploy your application."