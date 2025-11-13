# Environment Setup Guide

This guide explains how to configure environment variables for the Plant Health Monitor application.

## Quick Start

### 1. Create `.env.local` file

Create a `.env.local` file in the root directory with the following variables:

```env
# Groq AI API Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_API_ENDPOINT=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=moonshotai/kimi-k2-instruct-0905

# Flask Backend Configuration
FLASK_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_FLASK_BACKEND_URL=http://localhost:5000
FLASK_BACKEND_TIMEOUT=10000

# Environment
NODE_ENV=development
```

### 2. Get Your API Keys

**Groq API Key:**
1. Visit [Groq Console](https://console.groq.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste into `.env.local`

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GROQ_API_KEY` | Groq AI API key for chatbot functionality | `gsk_...` |
| `GROQ_API_ENDPOINT` | Groq API endpoint URL | `https://api.groq.com/openai/v1/chat/completions` |
| `FLASK_BACKEND_URL` | Backend service URL (server-side) | `http://localhost:5000` |
| `NEXT_PUBLIC_FLASK_BACKEND_URL` | Backend URL (client-side) | `http://localhost:5000` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_MODEL` | AI model to use | `moonshotai/kimi-k2-instruct-0905` |
| `FLASK_BACKEND_TIMEOUT` | Request timeout in ms | `10000` |
| `NODE_ENV` | Environment mode | `development` |

## API Endpoints That Use These Variables

| Endpoint | Method | Description | Required Env Vars |
|----------|--------|-------------|-------------------|
| `/api/chat` | POST | Main chatbot endpoint | `GROQ_API_KEY`, `GROQ_API_ENDPOINT` |
| `/api/groq-chat` | POST | Groq-powered chat (proxied) | `GROQ_API_KEY`, `GROQ_API_ENDPOINT` |
| `/api/predict` | GET | Get sensor predictions from Flask | `FLASK_BACKEND_URL`, `FLASK_BACKEND_TIMEOUT` |
| `/api/voice-chat` | GET | Voice chat interface | Uses `/api/groq-chat` |

## Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use environment-specific files**:
   - `.env.local` for local development
   - `.env.production` for production builds
3. **Rotate API keys** regularly
4. **Use server-side routes** for API calls to keep keys secret
5. **Validate environment variables** at startup

## Troubleshooting

### Chatbot Not Responding
- Verify `GROQ_API_KEY` is set correctly
- Check API key is valid at [Groq Console](https://console.groq.com/)
- Ensure no extra spaces in `.env.local`

### Flask Backend Connection Failed
- Verify Flask backend is running on port 5000
- Check `FLASK_BACKEND_URL` matches your Flask server
- Try running: `python scripts/flask_backend.py`

### Environment Variables Not Loading
- Restart the Next.js dev server after changing `.env.local`
- Verify file is named exactly `.env.local` (not `.env.local.txt`)
- Check for syntax errors in `.env.local`

## Running the Application

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. (Optional) Start Flask backend:
```bash
python scripts/flask_backend.py
```

4. Visit http://localhost:3000

## Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Groq API Documentation](https://console.groq.com/docs)
- [Flask Documentation](https://flask.palletsprojects.com/)
