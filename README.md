# CircuitTH

CircuitTH is a Vite/React circuit schematic and simulation web app. It can run by itself with local browser storage, or connect to the LabManager REST API to sync circuits between machines.

## Requirements

- Node.js 20 or newer
- npm
- Optional for cloud/LAN sync: LabManager API running on another machine or Docker host

## Install

```powershell
npm.cmd install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

For local API on the same machine:

```env
VITE_LAB_API_URL=http://localhost:4000/api
```

For LAN testing where the server machine IP is `172.17.176.58`:

```env
VITE_LAB_API_URL=http://172.17.176.58:4000/api
```

The `.env` file is local only and must not be uploaded to Git.

## Run On One Machine

Start CircuitTH:

```powershell
npm.cmd run dev
```

Open the URL shown by Vite, usually:

```text
http://localhost:5173
```

## Test With Two Machines On The Same Network

Use this when one computer runs the server and another computer opens the circuit web app.

### 1. Start LabManager On The Server Machine

On the server machine, open PowerShell in the LabManager project:

```powershell
cd C:\Users\Admin\Documents\Codex\2026-05-30\files-mentioned-by-the-user-circuitth\work\LabManager
docker compose up -d --build
```

Check the API:

```text
http://172.17.176.58:4000/api/health
```

Expected response:

```json
{"status":"ok"}
```

### 2. Configure LabManager CORS

In `LabManager\.env`, allow the CircuitTH LAN URL:

```env
CORS_ORIGIN=http://172.17.176.58:5190,http://172.17.176.58:5173,http://172.17.176.58:8080,http://localhost:5173,http://localhost:5190
VITE_API_URL=http://172.17.176.58:4000/api
```

After editing `.env`, rebuild LabManager:

```powershell
docker compose up -d --build
```

### 3. Open Windows Firewall Ports On The Server Machine

Run PowerShell as Administrator:

```powershell
New-NetFirewallRule -DisplayName "LabManager API 4000" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow
New-NetFirewallRule -DisplayName "LabManager Web 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
New-NetFirewallRule -DisplayName "CircuitTH Vite 5190" -Direction Inbound -Protocol TCP -LocalPort 5190 -Action Allow
```

### 4. Start CircuitTH For LAN Access

On the server machine, open PowerShell in this project:

```powershell
cd C:\Users\Admin\Documents\Codex\2026-05-30\files-mentioned-by-the-user-circuitth\work\CircuitTH-main
npm.cmd run dev -- --host 0.0.0.0 --port 5190
```

Vite should print a network URL like:

```text
Network: http://172.17.176.58:5190/
```

### 5. Test From The Second Machine

Open these URLs on the test machine:

```text
http://172.17.176.58:4000/api/health
http://172.17.176.58:5190
```

Then log in, create a circuit, add components, save, refresh, and confirm the circuit is still available.

## Common LAN Issues

If CircuitTH opens but login shows `Failed to fetch`, check these first:

- Open `http://172.17.176.58:4000/api/health` from the test machine.
- Make sure `CircuitTH-main\.env` uses `VITE_LAB_API_URL=http://172.17.176.58:4000/api`, not `localhost`.
- Restart Vite after changing `.env`.
- Rebuild LabManager after changing `LabManager\.env`.
- Make sure Windows Firewall allows ports `4000`, `8080`, and `5190`.

If you see `crypto.randomUUID is not a function`, update to the latest code. CircuitTH now uses a fallback ID generator for LAN HTTP testing.

## Build

```powershell
npm.cmd run build
```

The production output is created in `dist`.
