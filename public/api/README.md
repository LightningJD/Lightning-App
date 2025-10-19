# API Routes for Lightning App

## Testimony Generation API

### Endpoint: `/api/generate-testimony`

**Method:** POST

**Request Body:**
```json
{
  "name": "User's display name",
  "question1": "Answer to: How was your life like before you were saved?",
  "question2": "Answer to: What led you to salvation or your own personal relationship with God?",
  "question3": "Answer to: Was there a specific moment where you encountered God?",
  "question4": "Answer to: What do you do now and what is your current mission or calling?",
  "userId": "username",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "testimony": "Generated testimony text using the 4-paragraph framework...",
  "success": true
}
```

## Implementation Notes

### Backend Setup Required

This API endpoint needs to be implemented on your backend server. Here's what you'll need:

1. **Server Framework** (Choose one):
   - Node.js/Express
   - Python/Flask
   - Python/FastAPI
   - Next.js API Routes

2. **AI Service Integration**:
   - OpenAI API
   - Anthropic Claude API
   - Custom AI model

3. **4-Paragraph Framework Structure**:

   **Paragraph 1: Impact-First Opening**
   - Start with current state/mission
   - Create contrast with "But this wasn't always my story"
   - Use variety mechanisms for different openings

   **Paragraph 2: Crisis Depth**
   - Detailed background from question 1
   - Show the weight and struggle
   - Build tension

   **Paragraph 3: Pivotal Moment**
   - What led to salvation (question 2)
   - Specific encounter with God (question 3)
   - The transformation moment

   **Paragraph 4: Full-Circle Closing**
   - Current mission/calling (question 4)
   - How past pain fuels present purpose
   - Complete the narrative arc

### Example Implementation (Node.js/Express)

```javascript
// server.js or api/generate-testimony.js

const express = require('express');
const OpenAI = require('openai');

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post('/api/generate-testimony', async (req, res) => {
  try {
    const { name, question1, question2, question3, question4 } = req.body;

    const prompt = `
You are a professional testimony writer for a faith-based social network.
Create a compelling testimony using the 4-paragraph framework:

Paragraph 1 (Impact-First Opening): Start with their current state: "${question4}"
Then create contrast with "But this wasn't always my story."

Paragraph 2 (Crisis Depth): Detail their background: "${question1}"
Show the struggle and weight they carried.

Paragraph 3 (Pivotal Moment): Describe what led to salvation: "${question2}"
Include the specific encounter: "${question3}"

Paragraph 4 (Full-Circle): Connect back to current mission: "${question4}"
Show how past pain fuels present purpose.

Write in first person, use ${name}'s voice, be authentic and compelling.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    res.json({
      testimony: completion.choices[0].message.content,
      success: true
    });

  } catch (error) {
    console.error('Error generating testimony:', error);
    res.status(500).json({
      error: 'Failed to generate testimony',
      success: false
    });
  }
});

module.exports = router;
```

### CORS Configuration

Make sure to enable CORS if your frontend and backend are on different domains:

```javascript
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173', // Your Vite dev server
  credentials: true
}));
```

### Environment Variables

Create a `.env` file:
```
OPENAI_API_KEY=your_api_key_here
PORT=3001
```

### Testing

The current implementation in App.jsx will fall back to a demo mode if the API fails, so you can test the UI without a backend first.
