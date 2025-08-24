# Google OAuth Setup with Supabase

## Prerequisites

1. **Install Dependencies**
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```

2. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Wait for the project to be fully provisioned

## Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Google OAuth Client ID (if using Google's pre-built signin)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

To get these values:
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "Project URL" and "anon/public" key

## Google Cloud Configuration

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one

### Step 2: Configure OAuth Consent Screen
1. In Google Cloud Console, navigate to "APIs & Services" > "OAuth consent screen"
2. Choose "External" for user type
3. Fill in the required information:
   - App name: Your app name
   - User support email: Your email
   - Developer contact information: Your email
4. Under "Authorized domains", add your Supabase project domain: `<PROJECT_ID>.supabase.co`
5. Configure scopes (add these):
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`

### Step 3: Create OAuth Client ID
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth Client ID"
3. Choose "Web application"
4. Configure:
   - **Name**: Your app name
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (for development)
     - Your production domain
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback` (for development)
     - `https://<PROJECT_ID>.supabase.co/auth/v1/callback` (Supabase callback)
     - Your production domain + `/auth/callback`

5. Save and copy the Client ID and Client Secret

## Supabase Configuration

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Providers"
3. Find "Google" in the list and click to configure
4. Enable the Google provider
5. Enter your Google OAuth Client ID and Client Secret
6. Set redirect URL to: `https://<PROJECT_ID>.supabase.co/auth/v1/callback`

## Testing the Setup

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Click "Get started" to go to login
4. Click "Login with Google"
5. Complete the Google OAuth flow
6. You should be redirected to `/dashboard` with your user information displayed

## Important Notes

- The `/dashboard` route is protected by middleware and will redirect unauthenticated users to `/login`
- User sessions are automatically managed with cookies
- The middleware handles authentication state across the entire app
- All authentication logic is type-safe and follows Supabase best practices

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI"**: Make sure your redirect URIs in Google Cloud Console match exactly
2. **"Unauthorized origin"**: Ensure your domain is added to authorized JavaScript origins
3. **Environment variables not found**: Make sure `.env.local` is in the project root and variables are correctly named

### Required Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

The setup includes:
- ✅ Server-side authentication with cookie management
- ✅ Protected routes with middleware
- ✅ Clean user data access in dashboard
- ✅ Proper sign-out functionality
- ✅ Type-safe implementation throughout 