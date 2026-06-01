# EventEntryManager 🎟️

EventEntryManager is a robust, high-performance, full-stack platform built to streamline event ticketing, QR-based entry management, and automated email campaigns for events of any size.

## ✨ Features
- **Bulk Attendee Upload**: Instantly import hundreds of attendees via Excel (`.xlsx`) files.
- **Automated QR Generation**: Automatically generates secure, unique QR code tickets for every imported attendee.
- **Email Campaigns**: Built-in bulk email delivery system utilizing background workers. Supports **Resend**, **AWS SES**, and generic **Custom SMTP** (e.g., Gmail App Passwords).
- **Custom Email Templates**: Create and apply highly customizable HTML templates from an intuitive frontend builder.
- **Volunteer Checkpoint Scanning**: Dedicated role-based dashboards (`ENTRY_VOLUNTEER` & `FOOD_VOLUNTEER`) for rapid mobile scanning and real-time attendance tracking.
- **OTP Fallback System**: Seamless OTP generation and verification for attendees who encounter issues scanning their QR codes.
- **Analytics & Audit Logs**: Comprehensive admin dashboard for monitoring real-time scan logs, email delivery statuses, and critical administrative actions.

## 💻 Tech Stack
**Frontend:**
- [React.js](https://reactjs.org/) (Vite)
- [TailwindCSS](https://tailwindcss.com/) for modern, responsive UI design
- Lucide React (Icons)
- React Router (Routing)

**Backend:**
- [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/) (PostgreSQL Database)
- `nodemailer` & `resend` (Email APIs)
- `crypto` & `bcrypt` (Security & Encryption)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sameer200510/EventEntryManagerr.git
   cd EventEntryManagerr
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   ```
   - Create a `.env` file in the `backend` directory based on the configuration logic.
   - Run database migrations: `npx prisma db push`
   - Start the backend: `npm run dev`

3. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. Access the Admin Dashboard via `http://localhost:5173`.

## 🛡️ Security
This platform utilizes advanced AES-256-GCM encryption for securely storing your external SMTP and API credentials. User passwords and roles are strictly managed through encrypted JWT tokens. 

---
_Developed for seamless, large-scale event operations._
