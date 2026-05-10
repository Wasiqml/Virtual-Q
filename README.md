# Virtual Q - Digital Queue Management System

Virtual Q is a beginner-friendly MVP for managing bank queues. Bank staff can log in to an admin dashboard, call the next customer, complete tokens, and share a QR code so customers can join the queue from their phones.

## Project Structure

```text
backend/
  src/
    config/
    models/
    routes/
    socket/
    utils/
frontend/
  src/
    components/
    pages/
    services/
    styles/
```

## Features

- Admin login with username and password
- Join queue using a branch QR code
- Real-time queue updates with Socket.io
- Show token number, position, and estimated wait time
- Admin analytics for day, week, month, and average service time
- Admin history table for previous customers
- Admin option to add walk-in customers manually
- Customer reminder settings with a default 5 minute alert
- Optional customer-side alarm that is off by default
- Leave queue and rejoin after completion or cancellation
- Mark current customer as completed
- Mobile responsive customer page

## Backend Setup

1. Open a terminal in `backend`.
2. Copy `.env.example` to `.env`.
3. Install packages:

```bash
npm install
```

If PowerShell blocks `npm`, use `npm.cmd` instead:

```bash
npm.cmd install
```

4. Make sure MongoDB is running locally.
5. Seed the default admin:

```bash
npm run seed
```

6. Start the backend server:

```bash
npm run dev
```

On PowerShell, you can also run:

```bash
npm.cmd run seed
npm.cmd run dev
```

The backend will run on `http://localhost:5000`.

## Frontend Setup

1. Open another terminal in `frontend`.
2. Copy `.env.example` to `.env`.
3. Install packages:

```bash
npm install
```

If needed on PowerShell:

```bash
npm.cmd install
```

4. Start the frontend:

```bash
npm run dev
```

Or on PowerShell:

```bash
npm.cmd run dev
```

The frontend will run on `http://localhost:5173`.

## Default Admin Login

- Username: `admin`
- Password: `admin123`

## Main API Endpoints

- `POST /api/join-queue`
- `GET /api/queue-status/:tokenId`
- `POST /api/next`
- `POST /api/complete`
- `POST /api/leave-queue`
- `POST /api/auth/login`
- `GET /api/branch/:branchId`
- `GET /api/branch/:branchId/qr`

## How It Works

1. The admin opens the dashboard and logs in.
2. The dashboard shows the current active token, live queue, customer history, and branch analytics.
3. Customers scan the QR code and open the customer page for a branch.
4. When the customer taps `Join Queue`, a token is created in MongoDB.
5. Socket.io pushes updates to the dashboard and the customer's device.
6. When a token becomes `called`, the customer sees a turn message.
7. Customers can turn on browser notifications and choose how many minutes before their turn they want a reminder.
8. Admins can also add walk-in customers manually from the dashboard.

## Notes

- This project keeps authentication simple for MVP use.
- Estimated wait time is calculated as `5 minutes x number of waiting customers ahead`.
- Reminder notifications work best when the customer keeps the page open and allows browser notifications.
- Branch IDs are simple strings such as `branch-001`.
