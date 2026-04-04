# 2FA + Magic Link Flow Guide (`authservice`)

This file explains **how your current code works** for:

- TOTP 2FA
- WhatsApp 2FA
- Passkey (WebAuthn) 2FA
- Passwordless Magic Link (`passless`)

I’ll show the exact routes, controller/service methods, and request/response examples.

---

## 0) Quick architecture

Every auth request follows this chain:

1. Route in `src/routes/v1/authRoutes.ts`
2. Controller in `src/controllers/authController.ts`
3. Service logic in `src/services/authService.ts`
4. Helpers/repositories (Redis, Prisma, WhatsApp API, WebAuthn)

So: `Route -> Controller -> Service -> DB/Redis/API -> Response`

---

## 1) Login flow (entry point for 2FA)

### Route

- `POST /login`

### Methods

- Controller: `login()`
- Service: `login(email, password, totpToken?)`

### What `authService.login()` does

1. Finds user by email
2. Verifies password with `bcrypt.compare`
3. Reads active second factor using:

```ts
const activeTwoFactor = user.twoFactorMethod || (user.isTotpEnabled ? "TOTP" : "NONE");
```

4. Branches:

- `TOTP` -> expects `totpToken`
- `WHATSAPP` -> sends OTP and returns verification session
- `PASSKEY` -> returns WebAuthn challenge/options + verification session
- `NONE` -> login success directly

### Possible login responses

#### A) Direct login success

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "email": "..." },
    "accessToken": "..."
  }
}
```

#### B) TOTP required

```json
{
  "success": true,
  "message": "TOTP required",
  "data": {
    "requireTotp": true,
    "userId": "user-id"
  }
}
```

#### C) WhatsApp required

```json
{
  "success": true,
  "message": "WHATSAPP verification required",
  "data": {
    "require2fa": true,
    "userId": "user-id",
    "method": "WHATSAPP",
    "sessionId": "2fa-session-id",
    "destination": "+91xxxxxxxxxx"
  }
}
```

#### D) Passkey required

```json
{
  "success": true,
  "message": "PASSKEY verification required",
  "data": {
    "require2fa": true,
    "userId": "user-id",
    "method": "PASSKEY",
    "sessionId": "2fa-session-id",
    "options": { "challenge": "...", "rpId": "localhost", "allowCredentials": [] }
  }
}
```

---

## 2) TOTP flow (enable -> verify -> login -> disable)

### Enable setup

- Route: `POST /totp/enable` (auth required)
- Controller: `enableTotp()`
- Service: `enableTotp(userId, password)`

### Inside service

- Verifies password
- Generates secret via `generateTotpSecret()`
- Generates QR code via `generateTotpQrCode()`
- Updates user:
  - `totpSecret = secret`
  - `isTotpEnabled = false` (still pending verify)
  - `twoFactorMethod = "TOTP"`

### Response

```json
{
  "success": true,
  "data": {
    "secret": "BASE32SECRET",
    "qrCode": "data:image/png;base64,..."
  }
}
```

### Verify and activate

- Route: `POST /totp/verify` (auth required)
- Controller: `verifyTotp()`
- Service: `verifyAndActivateTotp(userId, token)`

Service verifies OTP with `verifyTotpToken(token, user.totpSecret)`, then sets:

- `isTotpEnabled = true`
- `twoFactorMethod = "TOTP"`

### Disable

- Route: `POST /totp/disable` (auth required)
- Controller: `disableTotp()`
- Service: `disableTotp(userId, password)`

Clears TOTP and sets method to `NONE` if current method is `TOTP`.

---

## 3) WhatsApp 2FA flow

## 3.1 Enable WhatsApp 2FA

### Step 1: send verification code

- Route: `POST /whatsapp/enable` (auth required)
- Controller: `whatsappEnable()`
- Service: `enableWhatsappTwoFactor(userId, password)`

Checks:

- correct account password
- user has phone number
- WhatsApp env config exists (`isWhatsAppConfigured()`)

Then:

- creates 6-digit code (`generateNumericCode()`)
- hashes code (`hashTwoFactorCode()`)
- stores temporary session in Redis (`createTwoFactorLoginSession(... purpose: "enable")`)
- sends code via `sendWhatsAppVerificationCode(phone, code, user.name)`

#### Important method you highlighted

`sendWhatsAppVerificationCode(...)` is the method that actually calls WhatsApp Cloud API and sends OTP message.

### Step 2: verify code and activate

- Route: `POST /whatsapp/enable/verify` (auth required)
- Controller: `whatsappEnableVerify()`
- Service: `verifyWhatsappTwoFactor(userId, sessionId, code)`

Service:

- loads Redis session (`getTwoFactorSession`)
- validates session ownership + method
- compares OTP with hash (`verifyTwoFactorCode`)
- deletes session (`deleteTwoFactorSession`)
- updates user:
  - `isWhatsappEnabled = true`
  - `isTotpEnabled = false`
  - `twoFactorMethod = "WHATSAPP"`

## 3.2 Login with WhatsApp 2FA

### Step 1

Call `POST /login` with email/password.
If method is WhatsApp, you get `sessionId`.

### Step 2

- Route: `POST /whatsapp/login/verify`
- Controller: `whatsappLoginVerify()`
- Service: `verifyWhatsappLogin(sessionId, code)`

On success:

- login completed
- refresh token cookie set
- access token returned

## 3.3 Disable WhatsApp 2FA

- Route: `POST /whatsapp/disable` (auth required)
- Controller: `whatsappDisable()`
- Service: `disableWhatsappTwoFactor(userId, password)`

Sets `isWhatsappEnabled = false` and method to `NONE` when applicable.

---

## 4) Passkey (WebAuthn) flow

Passkey uses `@simplewebauthn/server` + your DB table `PasskeyCredential`.

## 4.1 Register passkey

### Step 1: begin registration

- Route: `POST /passkey/register` (auth required)
- Controller: `passkeyRegister()`
- Service: `beginPasskeyRegistration(userId)`

Service generates WebAuthn registration options:

- `generateRegistrationOptions({...})`
- stores challenge in Redis 2FA session (`purpose: "enable"`)
- returns `sessionId + options`

### Step 2: verify registration

- Route: `POST /passkey/register/verify` (auth required)
- Controller: `passkeyRegisterVerify()`
- Service: `verifyPasskeyRegistration(userId, sessionId, response)`

Service:

- validates Redis session/challenge
- verifies client response with `verifyRegistrationResponse(...)`
- stores credential in `passkey_credentials`
- activates passkey mode:
  - `twoFactorMethod = "PASSKEY"`
  - disables TOTP/WhatsApp active flags

## 4.2 Login with passkey

### Step 1

Call `POST /login` with email/password.
If method is passkey, backend returns:

- `sessionId`
- WebAuthn `options` from `generateAuthenticationOptions(...)`

### Step 2

Frontend signs challenge using browser WebAuthn and sends result to:

- Route: `POST /passkey/login/verify`
- Controller: `passkeyLoginVerify()`
- Service: `verifyPasskeyLogin(sessionId, response)`

Service:

- loads session challenge from Redis
- fetches credential from DB by `response.id`
- verifies with `verifyAuthenticationResponse(...)`
- updates authenticator counter in DB
- finishes login + returns tokens

## 4.3 Disable passkey

- Route: `POST /passkey/disable` (auth required)
- Controller: `passkeyDisable()`
- Service: `disablePasskey(userId)`

Deletes user passkeys and resets method to `NONE` if passkey was active.

---

## 5) Passwordless magic link flow (`passless`)

This is separate from TOTP/WhatsApp/Passkey, but still auth flow.

## 5.1 Create magic link

- Route: `POST /magic`
- Controller: `passless()`
- Service: `passless(email)`

Service creates short JWT token containing user identity.
Controller builds URL:

```text
/api/v1/auth/magic/verify?token=...
```

Then emails it via `sendPasswordlessLoginEmail(...)`.

## 5.2 Verify magic link

- Route: `GET /magic/verify`
- Controller: `passlessVerify()`
- Service: `passlessVerify(token)`

Service:

- verifies token signature
- validates user id/email/role match DB
- issues normal auth tokens

Controller:

- sets refresh token cookie
- returns user + access token

## Test magic flow

Also available:

- `GET /test/magic`
- `GET /test/magic/verify`

Using `testPassless()` / `testPasslessVerify()` with the test user object.

---

## 6) Redis role in this design

Redis stores temporary 2FA sessions/challenges:

- prefix in helper: `2fa:session:{sessionId}`
- data includes method, purpose, userId, codeHash/challenge
- used by WhatsApp and Passkey verification steps

This prevents trusting client-side state and keeps OTP/challenge server-owned.

---

## 7) End-to-end examples

## Example A: WhatsApp login

1. `POST /login` with email/password
2. response says `require2fa.method = "WHATSAPP"`, gives `sessionId`
3. user enters OTP from WhatsApp
4. `POST /whatsapp/login/verify` with `{ sessionId, code }`
5. success -> cookie + access token

## Example B: Passkey login

1. `POST /login` with email/password
2. response says `require2fa.method = "PASSKEY"`, gives `sessionId` + `options`
3. frontend uses WebAuthn API with `options`
4. send assertion to `POST /passkey/login/verify`
5. success -> cookie + access token

## Example C: TOTP login

1. `POST /login` with email/password (no totpToken)
2. response says `requireTotp = true`
3. user opens authenticator app, enters code
4. `POST /login` again with `totpToken`
5. success -> cookie + access token

---

## 8) Required env for these flows

Set these in `.env`:

```env
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_ORIGIN=http://localhost:3000

WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_API_VERSION=v22.0
```

Without them:

- passkey methods fail at `assertWebAuthnConfig()`
- WhatsApp enable/login OTP send fails in `sendWhatsAppVerificationCode()`

---

## 9) File map (where to read what)

- Routes: `src/routes/v1/authRoutes.ts`
- Controllers: `src/controllers/authController.ts`
- Main logic: `src/services/authService.ts`
- Redis session helper: `src/utils/helpers/twoFactor.ts`
- WhatsApp API helper: `src/utils/helpers/whatsapp.ts`
- Passkey DB access: `src/repositories/passkeyRepository.ts`
- Prisma models: `prisma/schema.prisma`

---

If you want, next I can add a second file `2fa-client.md` with **frontend-only steps** (React/Next code snippets for WebAuthn browser APIs + exact fetch calls).
