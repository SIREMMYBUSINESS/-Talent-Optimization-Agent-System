# Talent Optimization Agent System

A modular, privacy-first backend and frontend system for streaming audit logs, managing talent workflows, and integrating securely with external platforms like Workday and Auth0.

## 🧠 Overview

This system is designed to:
- Stream live audit logs via SSE with JWT-based access control
- Provide a responsive admin dashboard for monitoring and insights
- Enforce rate limits and connection caps using Redis
- Integrate with Auth0 for secure authentication
- Harden CI/CD pipelines with Alembic migration retries
- Export metrics for observability via Prometheus or OpenTelemetry

## 📦 Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | React, Vite, Tailwind CSS, Zustand  |
| Backend      | FastAPI, Python, Redis, Alembic     |
| Auth         | Auth0 (JWT + JWKS)                  |
| CI/CD        | GitHub Actions                      |
| Observability| Prometheus (optional), Redis        |

## 🚀 Features

- ✅ JWT-authenticated SSE stream at `/admin/audit-logs/stream`
- 📊 Redis-backed metrics aggregation and rate limiting
- 🔐 Configurable fail-open vs fail-closed behavior for Redis
- 🧪 CI retries for Alembic migrations and DB readiness
- 🖥️ Admin dashboard with login flow and live stream viewer
- 🌐 Modular frontend with Tailwind and React Router

## 🛠️ Setup

### 1. Clone the Repo

```bash
git clone https://github.com/your-username/talent-optimization-agent-system.git
cd talent-optimization-agent-system
