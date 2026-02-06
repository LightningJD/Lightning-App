# Chrome DevTools MCP Setup Instructions

## ✅ Fixed Configuration

The `mcp.json` file has been updated to use `chrome-devtools-mcp@0.9.0` (the latest working version). The latest version (0.10.2) has a broken dependency.

## How to Use Chrome DevTools MCP

### Option 1: Let MCP Start Chrome Automatically (Recommended)

The MCP server will automatically launch Chrome with remote debugging enabled. No additional setup needed!

### Option 2: Connect to Existing Chrome Instance

If you want to use an already running Chrome instance:

1. **Start Chrome with remote debugging:**
   ```bash
   # Windows
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

   # Or find your Chrome path:
   where chrome
   ```

2. **Update mcp.json to connect to existing instance:**
   ```json
   {
     "mcpServers": {
       "chrome-devtools": {
         "command": "npx",
         "args": [
           "-y",
           "chrome-devtools-mcp@0.9.0",
           "--browserUrl",
           "http://127.0.0.1:9222"
         ]
       }
     }
   }
   ```

## Testing the Fixes

Once Chrome DevTools MCP is working, you can test all 12 UI/UX fixes:

1. **Sign Up Link** - Check `/sign-in` page
2. **Message Input Spacing** - Test new message dialog
3. **Message Preview Alignment** - Check conversation list
4. **Timestamp Positioning** - View messages in chat
5. **Edit Profile Backdrop** - Open Edit Profile modal
6. **Help Center Search** - Type in search bar
7. **New Message Placeholder** - Check "To:" field
8. **Online/Offline Indicator** - View chat header
9. **Change Picture Modal** - Click "Change Profile Picture"
10. **HTML Entity Decoding** - Send message with apostrophe
11. **Message Filter Validation** - Try messaging restricted user
12. **Share Testimony Button** - Hover and click button

## Troubleshooting

If Chrome DevTools MCP still doesn't work:

1. **Restart Cursor** - MCP servers are loaded on startup
2. **Check Cursor Logs** - Look for MCP-related errors
3. **Verify Chrome is installed** - The MCP needs Chrome/Chromium
4. **Check port 9222** - Make sure it's not blocked by firewall

## Current Configuration

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@0.9.0"
      ]
    }
  }
}
```

This configuration will automatically start Chrome when needed.




