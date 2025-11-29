# PALS - Patient Access and Logging System

## Overview
PALS is a comprehensive medical kit application that allows patients to manage their medical records and prescriptions with detailed health information, while enabling doctors to access patient information based on privacy settings. Now includes an AI-powered emergency assistance feature.

**Current State**: Fully configured and running in Replit environment with structured prescription format, enhanced UI, and emergency medical assistance feature.

## Project Architecture

### Backend (Node.js/Express)
- **Framework**: Express.js v5.1.0
- **Database**: MongoDB Atlas (cloud-hosted)
- **File Storage**: Cloudinary for images and prescriptions
- **AI Integration**: OpenAI GPT-5 for emergency recommendations
- **Port**: 5000 (configured for Replit)
- **Host**: 0.0.0.0 in development, localhost in production

### Frontend
- **Type**: Static HTML/CSS/JavaScript with modern responsive design
- **Pages**:
  - `index.html` - Patient login
  - `register.html` - Patient registration
  - `dashboard.html` - Patient dashboard with stats and quick actions
  - `document_form.html` - Structured prescription form with disease checkboxes
  - `prescription.html` - View all prescriptions with detailed cards
  - `manage.html` - Privacy settings with columnar table layout
  - `history.html` - Doctor visit history
  - `log.html` - Doctor login
  - `reg.html` - Doctor registration
  - `dash.html` - Doctor dashboard with patient search
  - `emergency.html` - Emergency medical assistance (NEW)

### Key Features
1. **Patient Management**: Registration, login, profile management with photo upload
2. **Structured Prescription System**: 
   - Hospital information (name, report number, date)
   - Vital signs (BP, pulse, temperature)
   - Lab results (blood sugar, cholesterol)
   - Disease checkboxes with stages (Cancer, Diabetes, Heart Disease, etc.)
   - Medical history and diagnosis
   - Prescribed medication
   - Doctor's notes
   - Prescription image upload
3. **Privacy Controls**: Patients control what doctors can see with easy toggle interface
4. **Doctor Portal**: Search patients by code, view authorized data in structured format
5. **Visit History**: Track which doctors accessed patient records
6. **Emergency Medical Assistance (NEW)**:
   - No login required for emergency access
   - Enter patient code to fetch medical history
   - Select from 5 critical emergency types
   - AI-powered recommendations considering patient's existing conditions
   - Drug interaction warnings
   - Safe first aid guidance

### Emergency Feature
The emergency feature allows nearby people or doctors to:
1. Enter a patient's 4-digit code
2. Select from 5 emergency types:
   - Heart Attack
   - Cardiac Arrest
   - Severe Bleeding
   - Anaphylaxis (Severe Allergic Reaction)
   - Seizure/Epilepsy Emergency
3. Get AI-powered recommendations that:
   - Consider patient's existing diseases
   - Check for medication conflicts
   - Provide safe first aid guidance
   - Warn about drug interactions

### Prescription Fields
- **Hospital Info**: Hospital name, Report number, Date
- **Vitals**: Blood Pressure, Pulse Rate, Temperature
- **Lab Results**: Blood Sugar, Cholesterol
- **Medical Details**: Medical History, Diseases & Conditions (with stages), Medication
- **Doctor Info**: Doctor name, Doctor's notes
- **Attachment**: Prescription image

### Diseases with Stages
The system supports the following diseases with stage selection:
- Diabetes (Type 1, Type 2, Prediabetes)
- Hypertension (Stage 1, Stage 2, Crisis)
- Cancer (Stage 1-4)
- Heart Disease (Mild, Moderate, Severe)
- Kidney Disease (Stage 1-5)
- Liver Disease (Mild, Moderate, Severe, Cirrhosis)
- Asthma (Intermittent, Mild Persistent, Moderate, Severe)
- COPD (Mild, Moderate, Severe, Very Severe)
- Arthritis (Early, Moderate, Severe)
- Thyroid Disorder (Hypothyroidism, Hyperthyroidism, Goiter)
- Alzheimer's (Early, Middle, Late)
- Parkinson's (Stage 1-5)

### Database Collections
- `users` - Patient information
- `doctors` - Doctor accounts
- `patientData` - Prescriptions and medical records with structured fields
- `visibilityData` - Privacy settings per patient per field
- `visitHistory` - Doctor access logs
- `emergencyLogs` - Emergency access tracking (NEW)

## Recent Changes (November 29, 2025)
- Added AI-powered emergency medical assistance feature
- Emergency page accessible without login
- 5 critical emergency types with AI recommendations
- Drug interaction and contraindication warnings
- Emergency access logging for audit
- Added emergency links to login pages

## Environment Variables
The following environment variables can be configured (fallback values are in place):
- `MONGO_URI` - MongoDB connection string
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (production/development)
- `OPENAI_API_KEY` - OpenAI API key for AI-powered emergency recommendations (optional)

## Dependencies
- **express** (v5.1.0) - Web framework
- **mongoose** (v8.18.2) - MongoDB ODM
- **bcryptjs** (v3.0.2) - Password hashing
- **multer** (v2.0.2) - File upload handling
- **cloudinary** (v2.7.0) - Image storage
- **cors** (v2.8.5) - Cross-origin resource sharing
- **body-parser** (v2.2.0) - Request body parsing
- **openai** - OpenAI API client for AI recommendations

## Development
- Run `npm start` to start the server
- Access the application at the provided Replit URL
- Frontend automatically served through the Express server
- Emergency feature works with or without OpenAI API key (fallback to basic recommendations)

## User Preferences
None specified yet.
