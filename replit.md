# PALS - Patient Access and Logging System

## Overview
PALS is a medical kit application that allows patients to manage their medical records and prescriptions, while enabling doctors to access patient information based on privacy settings.

**Current State**: Successfully imported and configured for Replit environment.

## Project Architecture

### Backend (Node.js/Express)
- **Framework**: Express.js v5.1.0
- **Database**: MongoDB Atlas (cloud-hosted)
- **File Storage**: Cloudinary for images and prescriptions
- **Port**: 5000 (configured for Replit)
- **Host**: 0.0.0.0 in development, localhost in production

### Frontend
- **Type**: Static HTML/CSS/JavaScript
- **Pages**:
  - `index.html` - Patient login
  - `register.html` - Patient registration
  - `dashboard.html` - Patient dashboard
  - `prescription.html` - Prescription management
  - `document_form.html` - Document forms
  - `history.html` - Doctor visit history
  - `manage.html` - Privacy settings management
  - `log.html` - Doctor login
  - `reg.html` - Doctor registration
  - `dash.html` - Doctor dashboard

### Key Features
1. **Patient Management**: Registration, login, profile management
2. **Prescription System**: Upload prescriptions via file or camera
3. **Privacy Controls**: Patients control what doctors can see
4. **Doctor Portal**: Search patients by code, view authorized data
5. **Visit History**: Track which doctors accessed patient records

### Database Collections
- `users` - Patient information
- `doctors` - Doctor accounts
- `patientData` - Prescriptions and medical records
- `visibilityData` - Privacy settings per patient
- `visitHistory` - Doctor access logs

## Recent Changes (November 29, 2025)
- Configured for Replit environment
- Updated all API endpoints to use relative URLs
- Moved hardcoded credentials to environment variables with fallbacks
- Changed server port from 3000 to 5000 for Replit compatibility
- Configured server to bind to 0.0.0.0 in development
- Added npm start script
- Created .gitignore for Node.js
- Set up workflow for automatic server start

## Environment Variables
The following environment variables can be configured (fallback values are in place):
- `MONGO_URI` - MongoDB connection string
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (production/development)

## Dependencies
- **express** (v5.1.0) - Web framework
- **mongoose** (v8.18.2) - MongoDB ODM
- **bcryptjs** (v3.0.2) - Password hashing
- **multer** (v2.0.2) - File upload handling
- **cloudinary** (v2.7.0) - Image storage
- **cors** (v2.8.5) - Cross-origin resource sharing
- **body-parser** (v2.2.0) - Request body parsing

## Development
- Run `npm start` to start the server
- Access the application at the provided Replit URL
- Frontend automatically proxied through the Express server

## User Preferences
None specified yet.
