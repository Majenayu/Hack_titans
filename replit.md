# PALS - Patient Access and Logging System

## Overview
PALS is a comprehensive medical kit application that allows patients to manage their medical records and prescriptions with detailed health information, while enabling doctors to access patient information based on privacy settings. Features AI-powered emergency assistance and intelligent prescription data extraction.

**Current State**: Fully configured and running in Replit environment with structured prescription format, enhanced UI, emergency medical assistance, and AI-powered data extraction.

## Project Architecture

### Backend (Node.js/Express)
- **Framework**: Express.js v5.1.0
- **Database**: MongoDB Atlas (cloud-hosted)
- **File Storage**: Cloudinary for images and prescriptions
- **AI Integration**: OpenAI GPT-5 for emergency recommendations and prescription data extraction
- **Port**: 5000 (configured for Replit)
- **Host**: 0.0.0.0 in development, localhost in production

### Frontend
- **Type**: Static HTML/CSS/JavaScript with modern responsive design
- **Pages**:
  - `index.html` - Patient login with emergency link
  - `register.html` - Patient registration
  - `dashboard.html` - Patient dashboard with emergency access button
  - `document_form.html` - Structured prescription form with AI data extraction
  - `prescription.html` - View all prescriptions with detailed cards
  - `manage.html` - Privacy settings with columnar table layout
  - `history.html` - Doctor visit history
  - `log.html` - Doctor login with emergency link
  - `reg.html` - Doctor registration
  - `dash.html` - Doctor dashboard with emergency button
  - `emergency.html` - Emergency medical assistance

### Key Features
1. **Patient Management**: Registration, login, profile management with photo upload
2. **Structured Prescription System**: 
   - Hospital information (name, report number, date)
   - Vital signs (BP, pulse, temperature)
   - Lab results (blood sugar, cholesterol)
   - Disease checkboxes with stages
   - Medical history and diagnosis
   - Prescribed medication
   - Doctor's notes
   - Prescription image upload
3. **AI-Powered Data Extraction**: Upload prescription image → AI automatically extracts and fills form fields
4. **Privacy Controls**: Patients control what doctors can see with easy toggle interface
5. **Doctor Portal**: Search patients by code, view authorized data in structured format
6. **Visit History**: Track which doctors accessed patient records
7. **Emergency Medical Assistance**:
   - No login required for emergency access
   - Enter patient code to fetch medical history
   - Select from 5 critical emergency types
   - AI-powered recommendations considering patient's existing conditions
   - Drug interaction warnings and safe first aid guidance
   - Available from patient dashboard, doctor dashboard, and login pages

### Prescription Data Extraction
Upload a prescription image and the AI will automatically extract:
- Hospital name, report number, date
- Vitals (BP, pulse, temperature)
- Lab results (blood sugar, cholesterol)
- Medication information
- Doctor name
- Form fields auto-populate for quick editing

### Emergency Feature
Available from:
- Patient dashboard (Emergency Assistance card)
- Doctor dashboard (Emergency Assistance button)
- Login page (Emergency Access button)

5 Emergency Types:
- Heart Attack
- Cardiac Arrest
- Severe Bleeding
- Anaphylaxis (Severe Allergic Reaction)
- Seizure/Epilepsy

### Diseases with Stages
- Diabetes, Hypertension, Cancer, Heart Disease, Kidney Disease, Liver Disease, Asthma, COPD, Arthritis, Thyroid Disorder, Alzheimer's, Parkinson's (with detailed stage options)

### Database Collections
- `users` - Patient information
- `doctors` - Doctor accounts
- `patientData` - Prescriptions with structured fields
- `visibilityData` - Privacy settings
- `visitHistory` - Doctor access logs
- `emergencyLogs` - Emergency access tracking

## Recent Changes (November 29, 2025)
- Added Emergency buttons to patient and doctor dashboards
- Added Emergency Access link to login pages
- Added AI-powered prescription image extraction
- Image upload now includes "Extract Data from Image" button
- AI analyzes prescription images and auto-fills form fields
- Emergency feature works with or without OpenAI API key (basic recommendations as fallback)
- **NEW**: Registration page now has prescription upload feature that automatically reads and extracts medical information from prescription images
- Added new user fields: medicalConditions, currentMedications (stored and used in emergency features)
- Updated emergency patient data to include user's stored medical conditions and medications
- **NEW**: Prescription form now has AI-powered auto-fill at the TOP of the form
  - Upload a prescription image and it automatically extracts and fills all fields
  - Automatically checks disease checkboxes based on detected conditions (Diabetes, Hypertension, etc.)
  - Sets the correct stage/type for each disease
  - Works with drag-and-drop or click to upload

## Environment Variables
- `MONGO_URI` - MongoDB connection string
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - Cloudinary credentials
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode
- `OPENAI_API_KEY` - OpenAI API key (optional, enables AI extraction and intelligent emergency recommendations)

## Dependencies
- **express**, **mongoose**, **bcryptjs**, **multer**, **cloudinary**, **cors**, **body-parser**, **openai**

## Development
- Run `npm start` to start the server
- Access at the provided Replit URL
- Emergency feature works without API key (basic mode)
- Prescription extraction requires OpenAI API key for full AI capabilities

## User Preferences
None specified yet.
