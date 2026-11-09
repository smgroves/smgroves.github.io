# Pluto notebook server on Google Cloud Run

The live Pluto notebooks on /notebooks/ (`julia/*.jl`) are served by PlutoSliderServer
running on Cloud Run. `.github/workflows/pluto-cloud-run.yml` builds `cloud-run/Dockerfile`,
checks the notebooks run, and deploys on every push that changes a notebook, the
Dockerfile or `pluto-deployment-environment/`. It can also be run by hand from the
Actions tab ("Run workflow").

The service scales to zero when idle, so the first visitor after a quiet spell waits
about a minute while it starts. It is capped at one instance, so it stays within the
free tier for this kind of traffic.

## One-time setup

1. **Google Cloud account and project.** Sign in at https://console.cloud.google.com with a
   personal Google account (a university Workspace account may block public services).
   Create a project, e.g. `smgroves-pluto`, and note its project ID.
2. **Billing.** Billing > Link a billing account (a card is required even for the free tier).
3. **Budget alert.** Billing > Budgets & alerts > Create budget: $1 for this project, with
   email alerts at 50%, 90% and 100%.
4. **Run the setup script.** Open Cloud Shell (the `>_` icon, top right), upload
   `cloud-run/setup.sh` (three-dot menu > Upload), then run:

       bash setup.sh YOUR_PROJECT_ID

   It enables the APIs, creates the image repository and two service accounts, and lets
   GitHub Actions for this repository deploy without a stored key. It prints three values.
5. **GitHub variables.** In the repository: Settings > Secrets and variables > Actions >
   Variables > New repository variable, add `GCP_PROJECT`, `GCP_WIF_PROVIDER` and
   `GCP_SERVICE_ACCOUNT` with the printed values.
6. **Deploy.** Actions > "deploy Pluto notebooks to Cloud Run" > Run workflow. The last
   line of the log is the service URL (`https://pluto-notebooks-....run.app`); put it in
   `pluto_server_url` in `_config.yml`.
