#!/usr/bin/env bash
# One-time Google Cloud setup for the Pluto notebook server (see cloud-run/SETUP.md).
# Run in Google Cloud Shell:  bash setup.sh YOUR_PROJECT_ID
set -euo pipefail

PROJECT=${1:?usage: bash setup.sh PROJECT_ID}
REGION=us-east4
GITHUB_REPO=smgroves/smgroves.github.io
DEPLOYER=github-deployer@$PROJECT.iam.gserviceaccount.com
RUNTIME=pluto-runtime@$PROJECT.iam.gserviceaccount.com

gcloud config set project "$PROJECT"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  iamcredentials.googleapis.com sts.googleapis.com

# Image storage; keep only the two newest images so storage stays near the free 0.5 GB
gcloud artifacts repositories create pluto --repository-format=docker --location=$REGION
cat > /tmp/cleanup.json <<'EOF'
[
  {"name": "keep-newest", "action": {"type": "Keep"}, "mostRecentVersions": {"keepCount": 2}},
  {"name": "delete-old", "action": {"type": "Delete"}, "condition": {"olderThan": "1d"}}
]
EOF
gcloud artifacts repositories set-cleanup-policies pluto --location=$REGION \
  --policy=/tmp/cleanup.json --no-dry-run

# Service account the server runs as (no permissions needed)
gcloud iam service-accounts create pluto-runtime --display-name="Pluto notebook server"

# Service account GitHub Actions deploys as
gcloud iam service-accounts create github-deployer --display-name="GitHub Actions deployer"
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$DEPLOYER" \
  --role=roles/run.admin --condition=None
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$DEPLOYER" \
  --role=roles/artifactregistry.writer --condition=None
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME" \
  --member="serviceAccount:$DEPLOYER" --role=roles/iam.serviceAccountUser

# Let GitHub Actions in this one repository sign in as the deployer (no keys to store)
gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc smgroves-site --location=global \
  --workload-identity-pool=github --display-name="smgroves.github.io" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository == '$GITHUB_REPO'"
POOL=$(gcloud iam workload-identity-pools describe github --location=global --format='value(name)')
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/$POOL/attribute.repository/$GITHUB_REPO"
PROVIDER=$(gcloud iam workload-identity-pools providers describe smgroves-site --location=global \
  --workload-identity-pool=github --format='value(name)')

echo
echo "Done. Add these as GitHub repository variables (Settings > Secrets and variables > Actions > Variables):"
echo "  GCP_PROJECT          $PROJECT"
echo "  GCP_WIF_PROVIDER     $PROVIDER"
echo "  GCP_SERVICE_ACCOUNT  $DEPLOYER"
