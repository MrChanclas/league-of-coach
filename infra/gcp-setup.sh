#!/usr/bin/env bash
# One-time GCP bootstrap for League of Coach.
#
# Run this yourself (not from CI) after `gcloud auth login`. It is meant to
# be read and run section by section the first time -- some resources
# (Cloud SQL) take several minutes to provision. Safe to re-run: most
# commands are idempotent (`|| true` on ones that aren't, e.g. `create`).
#
# What it sets up, and why (good ACE/PCA exam review):
#   1. Project + billing link
#   2. APIs required by the stack
#   3. Artifact Registry repo for Docker images
#   4. Cloud SQL for PostgreSQL (private IP + Cloud SQL Auth Proxy socket)
#   5. Secret Manager entries (DATABASE_URL, CLERK_SECRET_KEY, RIOT_API_KEY)
#   6. Runtime service account (what Cloud Run *becomes* at runtime)
#   7. Deployer service account (what GitHub Actions *acts as* to deploy)
#   8. Workload Identity Federation (GitHub Actions <-> GCP, no JSON keys)
#
# After running, copy the "OUTPUT FOR GITHUB ACTIONS" values at the bottom
# into your repo's Settings > Secrets and variables > Actions.

set -euo pipefail

### 0. Variables — edit these ################################################

PROJECT_ID="league-of-coach-prod"          # must be globally unique; gcloud will error if taken
BILLING_ACCOUNT_ID="XXXXXX-XXXXXX-XXXXXX"  # gcloud billing accounts list
REGION="us-central1"
AR_REPO="loc"
SQL_INSTANCE="loc-db"
DB_NAME="leagueofcoach"
DB_USER="loc_app"
DB_PASSWORD="$(openssl rand -base64 24)"   # generated for you, printed at the end
GITHUB_REPO="MrChanclas/league-of-coach"   # owner/repo, must match your GitHub remote

RUNTIME_SA="loc-runtime"
DEPLOYER_SA="loc-deployer"
WIF_POOL="github-pool"
WIF_PROVIDER="github-provider"

### 1. Project + billing ######################################################

gcloud projects create "$PROJECT_ID" --name="League of Coach" || true
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT_ID"
gcloud config set project "$PROJECT_ID"

### 2. Enable APIs #############################################################

gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  sts.googleapis.com \
  compute.googleapis.com

### 3. Artifact Registry ########################################################

gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="League of Coach images" || true

### 4. Cloud SQL for PostgreSQL #################################################

gcloud sql instances create "$SQL_INSTANCE" \
  --database-version=POSTGRES_16 \
  --edition=ENTERPRISE \
  --tier=db-f1-micro \
  --region="$REGION" \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=07:00 || true

gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" || true

gcloud sql users create "$DB_USER" \
  --instance="$SQL_INSTANCE" \
  --password="$DB_PASSWORD" || true

CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')"

# Cloud Run reaches Cloud SQL over a unix socket at /cloudsql/<connection-name>,
# mounted automatically when the service is deployed with --add-cloudsql-instances.
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"

### 5. Secret Manager ###########################################################

printf '%s' "$DATABASE_URL" | gcloud secrets create loc-database-url --data-file=- || \
  printf '%s' "$DATABASE_URL" | gcloud secrets versions add loc-database-url --data-file=-

echo "Enter your Clerk secret key (sk_live_... from the Clerk dashboard, input hidden not guaranteed in this shell):"
read -r CLERK_SECRET_KEY
printf '%s' "$CLERK_SECRET_KEY" | gcloud secrets create loc-clerk-secret-key --data-file=- || \
  printf '%s' "$CLERK_SECRET_KEY" | gcloud secrets versions add loc-clerk-secret-key --data-file=-

echo "Enter your Riot API key (input hidden not guaranteed in this shell):"
read -r RIOT_API_KEY
printf '%s' "$RIOT_API_KEY" | gcloud secrets create loc-riot-api-key --data-file=- || \
  printf '%s' "$RIOT_API_KEY" | gcloud secrets versions add loc-riot-api-key --data-file=-

### 6. Runtime service account (identity Cloud Run runs as) ####################

gcloud iam service-accounts create "$RUNTIME_SA" \
  --display-name="League of Coach Cloud Run runtime" || true

RUNTIME_SA_EMAIL="${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

for role in roles/cloudsql.client roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
    --role="$role" --condition=None
done

### 7. Deployer service account (identity GitHub Actions authenticates as) #####

gcloud iam service-accounts create "$DEPLOYER_SA" \
  --display-name="GitHub Actions deployer" || true

DEPLOYER_SA_EMAIL="${DEPLOYER_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

for role in roles/run.admin roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
    --role="$role" --condition=None
done

# Least privilege: grant "actAs" only on the one runtime SA the deployer needs
# to attach to Cloud Run services/jobs, not on every SA in the project.
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA_EMAIL" \
  --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

### 8. Workload Identity Federation (no downloaded JSON keys) ##################

gcloud iam workload-identity-pools create "$WIF_POOL" \
  --location=global \
  --display-name="GitHub Actions pool" || true

gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
  --location=global \
  --workload-identity-pool="$WIF_POOL" \
  --display-name="GitHub provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com" || true

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
WIF_POOL_ID="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}"

gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_POOL_ID}/attribute.repository/${GITHUB_REPO}"

### Output ######################################################################

cat <<EOF

=================== SAVE THESE ===================
Cloud SQL connection name: ${CONNECTION_NAME}
DB password (also stored in Secret Manager): ${DB_PASSWORD}

--- GitHub repo variables (Settings > Secrets and variables > Actions > Variables) ---
GCP_PROJECT_ID=${PROJECT_ID}
GCP_REGION=${REGION}
AR_REPO=${AR_REPO}
CLOUDSQL_CONNECTION_NAME=${CONNECTION_NAME}
RUNTIME_SA_EMAIL=${RUNTIME_SA_EMAIL}
VITE_CLERK_PUBLISHABLE_KEY=<pk_live_... from the Clerk dashboard>  # public by design, not a secret

--- GitHub repo secrets (Settings > Secrets and variables > Actions > Secrets) ---
WIF_PROVIDER=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/providers/${WIF_PROVIDER}
DEPLOYER_SA_EMAIL=${DEPLOYER_SA_EMAIL}
====================================================
EOF
