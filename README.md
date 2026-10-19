# 🚗 ParkBandhu - Parking Space Management & KYC System

A full-stack web application for managing parking spaces with integrated KYC (Know Your Customer) verification system. Built with React, Node.js, MongoDB, and Express.

## 🌟 Features

- **Parking Space Management**: Browse, book, and manage parking spaces with real-time availability
- **User Authentication**: Secure login and registration with JWT tokens
- **KYC Verification System**: 
  - Document upload (identity proof & address proof)
  - Admin dashboard for KYC review and approval
  - Email notifications for all KYC actions
- **Admin Dashboard**: Manage parking spaces, users, and KYC requests
- **Real-time Updates**: Socket.io integration for live booking updates
- **Interactive Maps**: Google Maps JavaScript API with parking locations and directions
- **Responsive Design**: Tailwind CSS for mobile-friendly interface

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** (v6 or higher)
- **MongoDB** (local installation or MongoDB Atlas account)
- **Git**

## ⚙️ Environment Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Parking-Project
```

### 2. Server Environment Configuration

Navigate to the server directory and create a `.env` file:
```bash
cd server
cp .env.example .env
```

Edit `.env` and fill in your values:
```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=YourApp

# JWT Secret (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Google Sign-In: use the same Web OAuth client ID in server/.env and client/.env
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@parkbandhu.com

# Admin Email
ADMIN_EMAIL=admin@example.com
```

### 3. Client Environment Configuration

Navigate to the client directory:
```bash
cd ../client
```

Create a `.env` file:
```env
REACT_APP_API_URL=http://localhost:5001
REACT_APP_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
REACT_APP_GOOGLE_MAP_ID=DEMO_MAP_ID
```

### 4. Google Maps Setup

Google Maps uses a separate browser API key; it is not the Google Sign-In client ID. In Google Cloud Console, enable **Maps JavaScript API**, create an API key, and restrict it to your website origins (`http://localhost:3000/*` for local development and your deployed site for production). Restrict the key to the Maps JavaScript API. Add it as `REACT_APP_GOOGLE_MAPS_API_KEY` in `client/.env`, then restart the client. `DEMO_MAP_ID` is a development default; you can set your own map ID with `REACT_APP_GOOGLE_MAP_ID`.

Google Maps Platform requires a billing account and usage can be chargeable. Review the [current Maps JavaScript API pricing](https://developers.google.com/maps/billing-and-pricing/pricing) and set usage quotas and billing alerts in Google Cloud before production use.

### 5. Google Sign-In Setup

Create a Web application OAuth client ID in Google Cloud Console and add `http://localhost:3000` as an authorized JavaScript origin. For a deployed client, add its origin too. Put the same client ID in `server/.env` as `GOOGLE_CLIENT_ID` and `client/.env` as `REACT_APP_GOOGLE_CLIENT_ID`, then restart both servers. The API verifies Google's ID token before signing in or creating a user account.

## 📦 Installation

### Install Server Dependencies
```bash
cd ../server
npm install
```

### Install Client Dependencies
```bash
cd ../client
npm install
```

## 🚀 Running the Project

You'll need two terminal windows/tabs for this:

### Terminal 1 - Start the Server
```bash
cd server
npm start
```
The server will run on **http://localhost:5001**

### Terminal 2 - Start the Client
```bash
cd client
npm start
```
The client will run on **http://localhost:3000**

The application will automatically open in your default browser at `http://localhost:3000`

## 🔧 Available Scripts

### Server Scripts
```bash
npm start    # Start the server (production)
npm run dev  # Start with hot reload using nodemon
npm test     # Run tests
```

### Client Scripts
```bash
npm start       # Start development server
npm run build   # Create production build
npm test        # Run tests
npm run eject   # Eject from create-react-app (irreversible)
```

## 📁 Project Structure

```
Parking-Project/
├── server/                    # Node.js Express backend
│   ├── src/
│   │   ├── config/           # Database configuration
│   │   ├── controllers/      # Route controllers
│   │   ├── middleware/       # Custom middleware
│   │   ├── models/           # MongoDB schemas
│   │   ├── routes/           # API routes
│   │   └── utils/            # Utility functions
│   ├── scripts/              # Helper scripts (createAdmin.js)
│   ├── uploads/              # KYC file uploads directory
│   ├── .env                  # Environment variables
│   ├── server.js             # Express app entry point
│   └── package.json
│
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   │   └── admin/       # Admin dashboard components
│   │   │   └── ui/          # UI components
│   │   ├── pages/           # Page components
│   │   ├── context/         # Context API state management
│   │   ├── api/             # API client utilities
│   │   ├── data/            # Static data
│   │   ├── lib/             # Helper functions
│   │   ├── App.js           # Main App component
│   │   └── index.js         # React entry point
│   ├── public/
│   └── package.json
│
└── README.md                # This file
```

## 🔐 Default Admin Account (Working upon it right now)

After setup, create an admin user using the provided script:
```bash
cd server
node scripts/createAdmin.js
```

Or register through the UI and manually elevate the user role in MongoDB.

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Parking Spaces
- `GET /api/parking` - Get all parking spaces
- `POST /api/parking` - Create parking space (admin)
- `PUT /api/parking/:id` - Update parking space (admin)
- `DELETE /api/parking/:id` - Delete parking space (admin)

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### KYC Verification
- `POST /api/kyc/upload` - Upload KYC documents
- `GET /api/kyc/status` - Get KYC status
- `GET /api/kyc/admin/pending` - Get pending KYC requests (admin)
- `PUT /api/kyc/admin/approve/:userId` - Approve KYC (admin)
- `PUT /api/kyc/admin/reject/:userId` - Reject KYC (admin)

## 🛠️ Troubleshooting

### Port Already in Use
If port 5001 or 3000 is already in use, you can change the port:

**Server**: Edit `PORT` in `.env`
**Client**: Set `PORT=3001 npm start`

### MongoDB Connection Issues
- Ensure MongoDB URI is correct in `.env`
- Check if MongoDB Atlas is allowing connections from your IP
- Verify username and password are correct

## 📚 Technologies Used

**Frontend:**
- React 18
- React Router v7
- Tailwind CSS
- Axios
- Google Maps JavaScript API
- Framer Motion
- Socket.io Client

**Backend:**
- Node.js & Express
- MongoDB & Mongoose
- JWT Authentication
- Bcrypt
- Nodemailer
- Socket.io
- Multer (file uploads)

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## ❓ Support & Documentation

For more detailed documentation:
- Check `KYC_IMPLEMENTATION_SUMMARY.md` for KYC system details
- Review `DEPLOYMENT_CHECKLIST.md` for deployment guidelines
- See `QUICK_REFERENCE.md` for quick command reference

## 🎯 Roadmap

- [ ] Payment integration (Stripe/PayPal)
- [ ] Real-time notifications (Push notifications)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] User reviews and ratings

---

**Happy Parking! 🚗**
