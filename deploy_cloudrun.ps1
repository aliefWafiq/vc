# Interactive deployment script for VibeCloset to Google Cloud Run
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   VibeCloset Google Cloud Run Deployer  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Check if gcloud is installed
$gcloudCheck = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudCheck) {
    Write-Host "[ERROR] 'gcloud' CLI is not installed on your system." -ForegroundColor Red
    Write-Host "Please install the Google Cloud SDK first: https://cloud.google.com/sdk/docs/install-sdk" -ForegroundColor Yellow
    Write-Host "Once installed, restart your terminal and run this script again." -ForegroundColor Yellow
    Exit 1
}

# 2. Login
Write-Host "Logging in to Google Cloud..." -ForegroundColor Green
gcloud auth login

# 3. Prompt for Project ID
$projectId = Read-Host "Enter your GCP Project ID"
if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "Project ID cannot be empty. Exiting." -ForegroundColor Red
    Exit 1
}
gcloud config set project $projectId

# 4. Enable APIs
Write-Host "Enabling necessary APIs (run.googleapis.com, cloudbuild.googleapis.com)..." -ForegroundColor Green
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# 5. Prompt for environment variables for the Backend
$databaseUrl = Read-Host "Enter your DATABASE_URL (Supabase/PostgreSQL Connection String)"
$geminiApiKey = Read-Host "Enter your GEMINI_API_KEY"
$jwtSecret = Read-Host "Enter your JWT_SECRET (press Enter to generate a secure secret automatically)"
if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
    $jwtSecret = [guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()
    Write-Host "Generated JWT Secret: $jwtSecret" -ForegroundColor Yellow
}

# 6. Deploy Backend to Cloud Run using Google Cloud Build
Write-Host "Deploying Backend to Google Cloud Run..." -ForegroundColor Green
cd backend
gcloud run deploy vibe-backend `
  --source . `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars "DATABASE_URL=$databaseUrl,GEMINI_API_KEY=$geminiApiKey,JWT_SECRET=$jwtSecret,GEMINI_MODEL=gemini-2.5-flash"
cd ..

# 7. Get Backend URL
$backendUrl = (gcloud run services describe vibe-backend --platform managed --region us-central1 --format "value(status.url)")
Write-Host "Backend URL is: $backendUrl" -ForegroundColor Yellow

# 8. Deploy Frontend to Cloud Run using Google Cloud Build (passing backend URL as build argument)
Write-Host "Deploying Frontend to Google Cloud Run..." -ForegroundColor Green
cd frontend
gcloud run deploy vibe-frontend `
  --source . `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --build-arg "NEXT_PUBLIC_API_URL=$backendUrl"
cd ..

$frontendUrl = (gcloud run services describe vibe-frontend --platform managed --region us-central1 --format "value(status.url)")

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   Deployment Completed Successfully!    " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Backend Service URL:  $backendUrl" -ForegroundColor Yellow
Write-Host "Frontend Service URL: $frontendUrl" -ForegroundColor Yellow
Write-Host "Open the Frontend URL in your browser to access VibeCloset!" -ForegroundColor Green
