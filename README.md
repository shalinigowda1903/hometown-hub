# Hometown Hub

A community app with a static HTML/CSS/JavaScript frontend and an Express API.

## Requirements

- Node.js 18 or newer

## Run the backend

From the project directory:

```powershell
cd backend
npm.cmd install
npm.cmd start
```

The API runs at `http://localhost:5000`. Check that it is available at
`http://localhost:5000/api/health`.

## Run the frontend

Open the `frontend` folder with a static web server, such as the VS Code Live
Server extension, and open `index.html`. The frontend calls the local API at
`http://localhost:5000/api` by default.

## Local data

The API creates `backend/src/data/store.json` when it first receives data.
This file is intentionally ignored by Git because it contains local account
and community data. The JSON file is a simple prototype store, not a production
database.

Passwords created by the API are stored as scrypt hashes. Existing local
plaintext-password records are upgraded to hashes after a successful login.

## Tests

```powershell
cd backend
npm.cmd test
```
