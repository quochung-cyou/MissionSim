# MissionSim Backend

Python/FastAPI backend for MissionSim - provides LLM proxy with automatic model rotation and session history management.

## Architecture

The backend follows a layered architecture:

- **Core Layer**: Configuration, security, database initialization
- **Models Layer**: Pydantic schemas for request/response validation
- **Repositories Layer**: Data access abstraction over SQLite
- **Services Layer**: Business logic (Qwen API client, model rotation, session management)
- **Routes Layer**: FastAPI route handlers (controllers)
- **Utils Layer**: HTTP client, logging

## Setup

1. **Install dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env and set ADMIN_PASSWORD
   ```

3. **Run the server**:
   ```bash
   python main.py
   ```
   Or with uvicorn directly:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 3001 --reload
   ```

The server will start on `http://localhost:3001`.

## API Documentation

Once running, visit `http://localhost:3001/docs` for interactive API documentation (Swagger UI).

## First-Time Setup

The backend starts with an empty model registry. You must configure it before use:

1. **Set the Qwen API key** (optional if set via env var):
   ```bash
   curl -X POST http://localhost:3001/api/admin/config \
     -u admin:your_password \
     -H "Content-Type: application/json" \
     -d '{"qwenApiKey": "sk-..."}'
   ```

2. **Add models to the registry**:
   ```bash
   curl -X POST http://localhost:3001/api/admin/models \
     -u admin:your_password \
     -H "Content-Type: application/json" \
     -d '{"name": "qwen-plus"}'
   ```

   Add multiple models in priority order:
   ```bash
   curl -X PUT http://localhost:3001/api/admin/models \
     -u admin:your_password \
     -H "Content-Type: application/json" \
     -d '{"models": ["qwen-max", "qwen-plus", "qwen-turbo"]}'
   ```

## API Endpoints

### Chat (LLM Proxy)

**POST /api/v1/chat**

Proxy chat requests to Qwen Cloud with automatic model rotation on 403/429 errors.

Request:
```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "enable_thinking": false
}
```

Response:
```json
{
  "content": "Generated response...",
  "model": "qwen-plus"
}
```

### Admin (Protected by Basic Auth)

**GET /api/admin/config**
Check if Qwen API key is configured.

**POST /api/admin/config**
Update configuration (e.g., set Qwen API key).

**GET /api/admin/models**
Get the current model registry in priority order.

**POST /api/admin/models**
Add a model to the end of the registry.

**PUT /api/admin/models**
Replace the entire model registry.

**DELETE /api/admin/models/{model_name}**
Delete a model from the registry.

### Sessions (No Auth Required)

**GET /api/sessions**
Get all sessions ordered by updated_at DESC.

**POST /api/sessions/{session_id}/records**
Save a game record to a session (creates session if needed).

Request:
```json
{
  "id": "record-123",
  "result": "win",
  "durationMs": 120000,
  "recordJson": "{...full record JSON...}"
}
```

**GET /api/sessions/{session_id}/records**
Get all records for a session, ordered by created_at DESC.

## Model Rotation Behavior

When calling `/api/v1/chat`:

1. The backend picks the first model in the registry (lowest `sort_order`).
2. If Qwen returns **403 or 429**, that model is automatically deleted from the registry and the next model is tried.
3. Other errors (401, 400, 5xx, network failure) do **not** drop the model.
4. If all models fail, returns `503 Service Unavailable` with an error message.

This ensures the backend automatically adapts to rate limits and quota issues.

## Database

SQLite database stored at `data/app.db`. Schema:

- `config`: Key-value configuration storage
- `models`: Model registry with priority ordering
- `sessions`: Session metadata
- `records`: Game records linked to sessions

The database is automatically initialized on first startup.

## Development

Run with auto-reload:
```bash
python main.py
```

Or:
```bash
uvicorn main:app --reload
```

## Production

For production deployment:

1. Set `ADMIN_PASSWORD` and `QWEN_API_KEY` as environment variables
2. Configure CORS origins appropriately in `main.py`
3. Use a production ASGI server like gunicorn with uvicorn workers:
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:3001
   ```
4. Consider using a reverse proxy (nginx) for SSL termination
