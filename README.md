# BoomMyWallet

For explanation (e.g. What's special about this project?), please visit site:

[https://jianxun-p.github.io/boom-my-wallet.html](https://jianxun-p.github.io/boom-my-wallet.html)

## Usage

Need to setup a Project on Google Cloud Platform.

### OAuth 2.0 and APIs

Go to `APIs & Services`, then `Credentials`. Create a new OAuth 2.0 Client ID with the correct authorized redirect URIs (e.g. `http://localhost:5000/oauth/google/callback`).

Save the client secrets.

Ensure the following APIs are enabled:

- `Google Sheets API`
- `Google Drive API`
- `Secret Manager API` (If using Secrete Manager for the storing secrets)
- `Cloud Firestore API`	(If using Firestore for the database)
- `Artifact Registry` (If using GCP for deployment)
- `App Engine Admin API` (If using GCP for deployment)

### Service Account

Only if you are using any of the Google Cloud Services (App Engine, Secret Manager, Firestore, etc...).

Go to `APIs & Services`, then `Credentials`. Create a new service account with appropriate permissions. Go to `Keys`, create a new key then save the key as JSON.

### Secrets

Create a secret called `secrets`.

The value would be a JSON string:

```json
{
    "service_account": THE_JSON_OBJECT_FOR_THE_SERVICE_ACCOUNT_KEY_YOU_HAVE_SAVED,
    "google_oauth": THE_JSON_OBJECT_FOR_THE_CLIENT_SECRET_YOU_HAVE_SAVED,
    "refresh_token_encryption_key": BASE64_ENCODED_RANDOMLY_GENERATED_32_BYTES
}
```

### Deploy to App Engine (Google Cloud Platform)

Install the [Google Cloud CLI](https://docs.cloud.google.com/sdk/docs/install-sdk). 

Set up Google Cloud CLI (account, project, etc...).

```bash
gcloud auth application-default login
```

```bash
gcloud app deploy
```

### Deploy with Docker Compose

Switch to the `web` directory.

Copy `.env.example` to `.env`, and replace the values.


```bash
docker compose up --build -d
```

### Develop

Switch to the `web` directory.

Copy `.env.example` to `.env`, and replace the values.

```bash
npm install
npm run dev
```

