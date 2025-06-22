#!/usr/bin/env node

/**
 * Automated Claude Code MCP Configuration Script
 * Automatically configures Enhanced Browser MCP for Claude Code
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getClaudeConfigPath() {
  const platform = os.platform();
  
  switch (platform) {
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
    case 'darwin':
      return path.join(os.homedir(), '.config', 'claude-code', 'claude_desktop_config.json');
    case 'linux':
      return path.join(os.homedir(), '.config', 'claude-code', 'claude_desktop_config.json');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

function ensureDirectoryExists(filePath) {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`✅ Created directory: ${directory}`);
  }
}

function updateClaudeConfig() {
  try {
    const configPath = getClaudeConfigPath();
    const currentDir = __dirname;
    const indexPath = path.join(currentDir, 'dist', 'index.js');
    
    // Ensure the config directory exists
    ensureDirectoryExists(configPath);
    
    // Read existing config or create new one
    let config = {};
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configContent);
        console.log('📖 Found existing Claude Code configuration');
      } catch (error) {
        console.log('⚠️  Invalid JSON in existing config, creating new one');
        config = {};
      }
    } else {
      console.log('📝 Creating new Claude Code configuration');
    }
    
    // Ensure mcpServers exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    
    // Add or update Enhanced Browser MCP configuration
    config.mcpServers['enhanced-browser-mcp'] = {
      command: 'node',
      args: [indexPath],
      env: {
        BROWSER_WS_ENDPOINT: 'ws://localhost:8080/ws'
      }
    };
    
    // Write updated config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log('🚀 Enhanced Browser MCP configured successfully!');
    console.log(`📍 Configuration saved to: ${configPath}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Restart Claude Code to load the enhanced MCP server');
    console.log('2. Load the browser extension (browser-mcp-extension folder)');
    console.log('3. Start automating websites without token limits!');
    
  } catch (error) {
    console.error('❌ Error configuring Claude Code:', error.message);
    console.log('');
    console.log('📋 Manual configuration required:');
    console.log(`Add the following to your Claude Code config at: ${getClaudeConfigPath()}`);
    console.log('');
    console.log(JSON.stringify({
      mcpServers: {
        'enhanced-browser-mcp': {
          command: 'node',
          args: [path.join(__dirname, 'dist', 'index.js')],
          env: {
            BROWSER_WS_ENDPOINT: 'ws://localhost:8080/ws'
          }
        }
      }
    }, null, 2));
  }
}

// Check if this is being run directly
console.log('🔧 Setting up Enhanced Browser MCP for Claude Code...');
console.log('');
updateClaudeConfig();

export { updateClaudeConfig, getClaudeConfigPath };