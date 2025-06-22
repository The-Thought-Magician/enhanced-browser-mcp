#!/bin/bash

# Enhanced Browser MCP Installation Script
# This script installs and configures the Enhanced Browser MCP server for Claude Code

set -e

echo "🚀 Installing Enhanced Browser MCP..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed. Please install Node.js first."
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building Enhanced Browser MCP..."
npm run build

# Make the dist files executable
chmod +x dist/*.js

# Get the current directory
CURRENT_DIR="$(pwd)"

echo "✅ Enhanced Browser MCP installed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Start the browser extension (load the browser-mcp-extension folder as an unpacked extension)"
echo "2. Add the following configuration to your Claude Code MCP settings:"
echo ""
echo "   Linux/Mac: ~/.config/claude-code/claude_desktop_config.json"
echo "   Windows: %APPDATA%\\Claude\\claude_desktop_config.json"
echo ""
echo "   Configuration to add:"
echo '   {'
echo '     "mcpServers": {'
echo '       "enhanced-browser-mcp": {'
echo '         "command": "node",'
echo "         \"args\": [\"$CURRENT_DIR/dist/index.js\"],"
echo '         "env": {'
echo '           "BROWSER_WS_ENDPOINT": "ws://localhost:8080/ws"'
echo '         }'
echo '       }'
echo '     }'
echo '   }'
echo ""
echo "3. Restart Claude Code to load the enhanced MCP server"
echo ""
echo "🎯 Ready to automate ANY website without token limits!"