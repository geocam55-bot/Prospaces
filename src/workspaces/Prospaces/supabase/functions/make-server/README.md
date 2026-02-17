# Make Server - Supabase Edge Function

Backend-centric OAuth flow for Nylas and Azure integrations.

## Structure

- `index.ts` - Main Hono server entrypoint with routing and middleware
- `nylas-oauth.ts` - Nylas OAuth routes for email and calendar
- `azure-oauth.ts` - Azure/Microsoft OAuth routes
- `config.toml` - Function configuration (JWT verification disabled for OAuth)

## Environment Variables Required

Set these in your Supabase project:

```bash
# Nylas Configuration
NYLAS_API_KEY=your_nylas_api_key
NYLAS_CLIENT_ID=your_nylas_client_id
NYLAS_CLIENT_SECRET=your_nylas_client_secret

# Azure Configuration (Optional)
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=common  # or your specific tenant ID

# Supabase (automatically available)
SUPABASE_URL=auto
SUPABASE_SERVICE_ROLE_KEY=auto
SUPABASE_ANON_KEY=auto
```

## Deployment

From the project root (in GitHub Codespace):

```bash
# Deploy the function
npx supabase functions deploy make-server --no-verify-jwt

# Or if you need to set environment variables first:
npx supabase secrets set NYLAS_API_KEY=your_key
npx supabase secrets set NYLAS_CLIENT_ID=your_client_id
npx supabase secrets set NYLAS_CLIENT_SECRET=your_secret

# Then deploy
npx supabase functions deploy make-server --no-verify-jwt
```

## Endpoints

### Health Checks
- `GET /make-server/health` - General health check
- `GET /make-server/nylas-health` - Nylas-specific health check (for frontend probing)

### Nylas OAuth (Email)
- `POST /make-server/nylas-init` - Initialize OAuth flow
- `POST /make-server/nylas-token-exchange` - Exchange code for token

### Nylas OAuth (Calendar)
- `POST /make-server/calendar-init` - Initialize calendar OAuth
- `POST /make-server/calendar-token-exchange` - Exchange calendar code for token

### Azure OAuth
- `POST /make-server/azure-init` - Initialize Azure OAuth flow
- `POST /make-server/azure-token-exchange` - Exchange Azure code for token
- `POST /make-server/azure-refresh-token` - Refresh Azure access token

## Testing

After deployment, test the health endpoint:

```bash
curl https://usorqldwroecyxucmtuw.supabase.co/functions/v1/make-server/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-17T...",
  "service": "make-server"
}
```

## Troubleshooting

### 401 Errors
- Ensure `verify_jwt = false` in config.toml
- Deploy with `--no-verify-jwt` flag
- Check that NYLAS_API_KEY and other secrets are set

### Token Exchange Failures
- Verify redirect_uri matches exactly between init and exchange
- Check Nylas/Azure dashboard for correct redirect URIs
- Review Edge Function logs: `npx supabase functions logs make-server`

### Frontend Connection
The frontend probes these endpoints to find the active function:
1. `server/nylas-health`
2. `make-server-8405be07/nylas-health`
3. `make-server/nylas-health`

This function responds to `make-server/nylas-health`.
