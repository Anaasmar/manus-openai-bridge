# Manus OpenAI Bridge

Vercel API bridge.

- `GET /api/health`: public health check.
- `GET /api/verify`: requires header `x-bridge-token` matching `BRIDGE_API_TOKEN`, checks Manus and OpenAI API connectivity.

Configure `MANUS_API_KEY`, `OPENAI_API_KEY`, `BRIDGE_API_TOKEN` in Vercel Production environment. Never commit secrets.

Task orchestration and native ChatGPT integration are not yet implemented.
