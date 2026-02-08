# Weather App

Production-ready full-stack weather app with secure backend proxy, JWT auth, and a modern responsive dashboard UI.

## Tech
- Frontend: React + Vite (responsive, mobile-first)
- Backend: Node.js, Express, MongoDB (Mongoose)
- API: OpenWeatherMap (server-side only)
- Security: Helmet, rate limiting, input validation, JWT auth

## Quick Start
1. Install backend dependencies:

```bash
cd /Users/riyadebnathdas/Desktop/Projects/Weather\ App/server
npm install
```

2. Install frontend dependencies:

```bash
cd /Users/riyadebnathdas/Desktop/Projects/Weather\ App/client
npm install
```

3. Configure environment:

Update `OPENWEATHER_API_KEY`, `JWT_SECRET`, and `MONGO_URI` in `/Users/riyadebnathdas/Desktop/Projects/Weather App/server/.env`.

4. Run in development:

```bash
# terminal 1
cd /Users/riyadebnathdas/Desktop/Projects/Weather\ App/server
npm run dev

# terminal 2
cd /Users/riyadebnathdas/Desktop/Projects/Weather\ App/client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Production build

```bash
cd /Users/riyadebnathdas/Desktop/Projects/Weather\ App/client
npm run build
```

Then start the server and open [http://localhost:5001](http://localhost:5001). The server serves `/Users/riyadebnathdas/Desktop/Projects/Weather App/client/dist`.

## Notes
- The backend uses OpenWeatherMap geocoding to support world city names.
- Favorites/history responses are `Cache-Control: no-store` to avoid stale data.
- Auth endpoints are POST only. `GET /api/auth/*` returns 405.

## API
- `GET /api/weather?city=cityName` (current weather + hourly + daily forecast summary)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/user/history` (requires auth)
- `GET /api/user/favorites` (requires auth)
- `POST /api/user/favorites` (requires auth, body: `{ "city": "Dhaka", "country": "BD" }`)
- `DELETE /api/user/favorites/:id` (requires auth)

## Auth
Send a token using either header:
- `Authorization: Bearer <token>`
- `x-auth-token: <token>`
