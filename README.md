# Cyber Risk Assessment and Management Dashboard

A deployable full-stack college project using React + Vite, Node.js, Express, MongoDB, Mongoose, JWT and bcrypt.

## Features
- Sign up, sign in and logout
- Demo Mode works without a backend and stores demo records in browser localStorage
- Full-Stack Mode uses the Express API and MongoDB
- Asset CRUD
- Threat and vulnerability CRUD
- Risk assessment CRUD with score = likelihood × impact
- Dashboard summary, severity breakdown, searchable tables and CSV export
- Responsive dark cybersecurity UI

> Demo Mode is only for demonstrations. Browser storage is editable and is not secure authentication. Real accounts and persistent shared data require the backend and MongoDB.

## Requirements
- Node.js LTS (Node 20+ recommended)
- npm
- MongoDB local installation OR MongoDB Atlas account
- VS Code

## 1. Run locally on Windows
Extract this ZIP, then open the `cyber-risk-dashboard` folder in VS Code.

Open Terminal > New Terminal.

### Start the backend
```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```
Edit `backend/.env` and set `MONGODB_URI`. For MongoDB Atlas, use your Atlas connection string and replace `<db_password>` with the database user's password. Do not commit `.env`.

Example:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/cyber_risk_dashboard
JWT_SECRET=replace-this-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
```

### Start the frontend (in a second terminal)
```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```
Open the URL Vite prints, normally `http://localhost:5173`.

The frontend starts in Demo Mode by default. Use the mode selector in the app to switch to Full-Stack Mode after the backend is running.

## 2. MongoDB Atlas
1. Create a free cluster at https://www.mongodb.com/atlas.
2. Create a database user and a strong password.
3. In Network Access, allow your deployment host (for learning only, temporary `0.0.0.0/0` can be used if you understand the security trade-off).
4. Copy the driver connection string and replace the password placeholder.
5. Put it in `backend/.env` as `MONGODB_URI`.
6. Keep the URI and `JWT_SECRET` only on the backend. Never put them in frontend variables.

## 3. Deploy the backend (Render example)
1. Push the project to a GitHub repository.
2. Create a new Web Service on https://render.com and select the repository.
3. Set **Root Directory** to `backend`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables:
   - `MONGODB_URI` = your Atlas connection string
   - `JWT_SECRET` = a long random secret
   - `CLIENT_URL` = your deployed frontend URL (for example, `https://your-site.vercel.app`)
   - `NODE_ENV` = `production`
   - `PORT` is provided by Render automatically; leave it unset unless needed.
7. Deploy and test `https://your-api.onrender.com/api/health`.

## 4. Deploy the frontend (Vercel or Netlify)
### Vercel
1. Import the same GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable `VITE_API_URL=https://your-api.onrender.com/api` (no trailing slash).
6. Deploy.

### Netlify
1. Import the repository; set base directory `frontend`, build command `npm run build`, publish directory `dist`.
2. Add `VITE_API_URL=https://your-api.onrender.com/api`.
3. Deploy.

After deployment, update the backend's `CLIENT_URL` to the exact deployed frontend origin and redeploy the backend. If your frontend host uses a different origin, CORS must allow that origin.

## 5. Frontend-only deployment
You can deploy only the `frontend` folder. The site will still open and Demo Mode will support adding, editing, deleting, and viewing demo records in that browser. Sign-up/sign-in in Demo Mode are local demonstration flows, not secure account authentication. Switching to Full-Stack Mode requires a deployed API and MongoDB.

## Security notes
- Passwords are hashed with bcrypt.
- JWT secret and database URI stay on the backend.
- API routes require a valid bearer token.
- Records are scoped to the authenticated user.
- For a production system, add rate limiting, email verification, password reset, audit logs, stronger validation, HTTPS-only deployment, and security review.
