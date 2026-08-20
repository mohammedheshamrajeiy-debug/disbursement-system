# Disbursement & Inventory Management System

A full-stack web application (React + Express) for managing disbursement requests, inventory, customers, devices, returns, and defects — with built-in Arabic/English support (i18n).

## Features

- **Authentication** – user login and protected routes
- **Requests** – create, edit, and track disbursement requests
- **Inventory Management** – manage stock, device imports (carton/customer import), and device details
- **Customers** – manage customer records and linked devices
- **Activation** – device activation workflow
- **Invoices** – generate invoices with file attachments
- **Returns & Defects** – handle returned devices and defect reports
- **Financial Module** – track disbursement and financial data
- **Activity Log** – audit log of system actions
- **File Uploads** – attach and store documents (PDF/images) per request
- **Multi-language** – Arabic and English UI via i18next

## Tech Stack

**Frontend:** React 18, Vite, react-i18next
**Backend:** Node.js, Express, Multer (file uploads), i18next-http-middleware
**Data:** JSON-based file storage (no external database required)

## Project Structure

```
JS_version2.1/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── components/
│       ├── screens/
│       └── locales/
├── server/          # Express backend
│   └── src/
│       ├── routes/
│       ├── services/
│       ├── locales/
│       └── data/    # JSON data store (gitignored)
└── package.json     # root scripts
```

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation

Clone the repo and install dependencies for both client and server:

```bash
git clone <your-repo-url>
cd JS_version2.1
npm run setup
```

### Running in Development

This runs the client and server together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:server   # starts Express server on http://localhost:4000
npm run dev:client   # starts Vite dev server
```

### Production Build

```bash
npm run build --prefix client
npm start
```

In production, the Express server serves the built client from `client/dist`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port the server runs on | `4000` |
| `NODE_ENV` | Set to `production` to serve the built client | — |

## Notes

- Uploaded files are stored in `server/uploads/` (gitignored).
- Application data is stored as JSON in `server/data/` (gitignored) — this keeps the repo clean of runtime data.

## License

This project is private and not licensed for public distribution.
