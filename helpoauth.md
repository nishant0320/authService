```
1. USER CLICKS "LOGIN WITH GOOGLE"
   ↓
   GET /oauth/google
   └─ Server generates random state
   └─ Return Google Auth URL with: clientId, scope, state, redirect_uri
   └─ Browser redirects to Google with these params

2. USER LOGS IN AT GOOGLE
   ↓
   Google verifies user, shows consent screen
   └─ If approved, Google redirects to your callback URL with: code, state

3. CALLBACK RECEIVED
   ↓
   GET /oauth/google/callback?code=xxx&state=yyy
   └─ Verify state matches (prevents CSRF attacks)
   └─ If state invalid → Reject

4. EXCHANGE CODE FOR TOKEN
   ↓
   Server makes backend request to Google Token Endpoint:
   POST https://oauth2.googleapis.com/token
   Body: {
     code: xxx,
     clientId: your_client_id,
     clientSecret: your_client_secret,
     grant_type: "authorization_code",
     redirect_uri: your_callback_url
   }
   └─ Google returns: { accessToken, idToken, refreshToken, ... }

5. GET USER PROFILE
   ↓
   Using accessToken, request user info:
   GET https://www.googleapis.com/oauth2/v2/userinfo
   Headers: Authorization: Bearer {accessToken}
   └─ Returns: { id, email, name, picture, ... }

6. LOGIN/CREATE USER
   ↓
   Create or update User with OAuth account:
   └─ Check if OAuthAccount exists with provider="google", sub=id
   └─ If exists → Return user (already linked)
   └─ If not exists → Create new User or link to existing email
   └─ Create OAuthAccount record
   └─ Generate JWT tokens & send to client
```

**Your code flow:**

```typescript
googleLogin()
  → generates state
  → returns Google Auth URL

googleCallback(code, state)
  → verifies state matches cookie
  → calls authService.loginWithGoogleCode(code)
    → exchanges code for tokens (step 4)
    → fetches user profile (step 5)
    → creates/updates user & OAuth account (step 6)
  → sets refresh token cookie
  → returns user + accessToken
```
