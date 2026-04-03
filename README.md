# AuthService

[![Runtime](https://img.shields.io/badge/Bun-000?logo=bun&logoColor=fff&color=000)](https://bun.sh)
[![Framework](https://img.shields.io/badge/Fastify-000?logo=fastify&logoColor=000&color=yellow)](https://www.fastify.io)
[![Database](https://img.shields.io/badge/PostgreSQL-000?logo=postgresql&logoColor=000&color=blue)](https://www.postgresql.org)
[![Cache](https://img.shields.io/badge/Redis-000?logo=redis&color=ff0000&logoColor=000)](https://redis.io)
[![Language](https://img.shields.io/badge/TypeScript-000?logo=typescript&color=0f0fff&logoColor=000)](https://www.typescriptlang.org)

## About

`AuthService` is a lightweight authentication microservice built with Fastify, Prisma, and Bun. It provides user registration, login, refresh token rotation, logout, and health-check endpoints. The service is designed for integration with frontend applications, mobile apps, or other backend services that require secure JWT-based authentication.

## Key Features

- User registration with email, password, phone, and gender
- Login with JWT access and refresh tokens
- Refresh token rotation and validation
- Protected logout endpoint with token blacklisting
- Optional TOTP support for multi-factor authentication
- Redis-backed token storage and revocation handling
- PostgreSQL user storage via Prisma
- Email notifications for new registrations
- Structured logging with Winston and daily log rotation

## Tech Stack

- Bun
- TypeScript
- Fastify
- Prisma (PostgreSQL)
- Redis (ioredis)
- JSON Web Tokens (`jsonwebtoken`)
- Bcrypt for password hashing
- Winston + Daily Rotate File for logging
- Nodemailer for outgoing email
- OTP utilities with `otplib`

## Getting Started

### Prerequisites

- Bun installed
- PostgreSQL database
- Redis server
- SMTP credentials for email delivery

### Install Dependencies

```bash
bun install
```

### Environment Variables

Create a `.env` file in the project root and provide the following values:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/authservice
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_SALT_ROUND=10
LOG_LEVEL=debug
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_NAME=AuthService
SMTP_FROM_EMAIL=noreply@authservice.com
```

### Database Setup

Generate Prisma client and apply database schema:

```bash
bun prisma generate
bun prisma db push
```

If you prefer migrations:

```bash
bun prisma migrate deploy
```

### Run the App

#### Development

```bash
bun run dev
```

#### Production

```bash
bun start
```

## API Reference

### Health Check

- `GET /health`
- Response:
  - `success`: `true`
  - `message`: `API is healthy and is running`
  - `timestamp`
  - `uptime`

### Authentication API

Base URL: `/api/v1/auth`

#### Register

- `POST /api/v1/auth/register`
- Request body:
  - `name` (string, required)
  - `email` (string, required)
  - `password` (string, required)
  - `phone` (string, optional)
  - `gender` (string, required)
- Response:
  - `user`
  - `accessToken`
- Notes:
  - A `refreshToken` cookie is set on successful registration
  - Sends a welcome email after registration

#### Login

- `POST /api/v1/auth/login`
- Request body:
  - `email` (string, required)
  - `password` (string, required)
  - `totpToken` (string, optional)
- Response:
  - `user`
  - `accessToken`
- Notes:
  - If TOTP is enabled for the user, the service returns `requireTotp: true`
  - A `refreshToken` cookie is set on successful login

#### Refresh Token

- `POST /api/v1/auth/refresh-token`
- Request body:
  - `refreshToken` (string, optional)
- Response:
  - `accessToken`
- Notes:
  - If no body token is provided, the server attempts to use the `refreshToken` cookie

#### Logout

- `POST /api/v1/auth/logout`
- Authentication: `Authorization: Bearer <accessToken>`
- Response:
  - `success`: `true`
  - `message`: `Logout successful`
- Notes:
  - Invalidates the current access token and clears the `refreshToken` cookie

## Project Structure

- `src/app.ts` — main Fastify app registration and error handling
- `src/index.ts` — server bootstrap, Redis connection, graceful shutdown
- `src/config/` — environment, Fastify server, Redis, logger configuration
- `src/routes/` — API route definitions
- `src/controllers/` — request handlers
- `src/services/` — business logic and authentication flows
- `src/repositories/` — Prisma data access layer
- `src/utils/` — helpers, response wrappers, JWT/TOTP utilities
- `prisma/schema.prisma` — database model definitions

## Contributing

Contributions are welcome! Open issues or submit pull requests for bug fixes, new features, and improvements.

## Contact

- Author: `nishant0320`

- GitHub: [![nishant0320](https://img.shields.io/badge/nishant0320-000?logo=github&color=000&logoColor=fff)](https://github.com/nishant0320)

## Contributors

- `nishur31`

- GitHub: [![nishur31](https://img.shields.io/badge/nishur31-000?logo=github&color=000&logoColor=fff)](https://github.com/nishur31)

## Notes

- This repository is currently configured as `private` in `package.json`.
- There are no automated tests included yet.
- If you add new endpoints, keep route prefixes under `/api/v1/` for backward compatibility.
