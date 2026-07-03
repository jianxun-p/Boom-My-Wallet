import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

let client: SecretManagerServiceClient | null = null;
const cache = new Map();

let gcpProjectId: string;

export async function init() {
  if (process.env['GCP_CREDENTIALS_JSON']) {
    const credentials = JSON.parse(process.env['GCP_CREDENTIALS_JSON']);
    const projectId = process.env['GCP_PROJECT_ID'] || credentials.project_id;
    client = new SecretManagerServiceClient({
      credentials,
      projectId,
    });
  } else {
    /*
     * app is running in an environment which supports Application Default Credentials
     * @see https://docs.cloud.google.com/docs/authentication/application-default-credentials
     */
    client = new SecretManagerServiceClient({
      projectId: process.env['GCP_PROJECT_ID'],
    });
  }
  gcpProjectId = await client.getProjectId();
  console.log('Initialized secrets');
}

export async function get(secretName: string) {
  const cachedVal = cache.get(secretName);
  if (cachedVal) {
    return cachedVal;
  } else if (client === null) {
    throw Error("Secrets not ready yet");
  }
  const [accessResponse] = await client.accessSecretVersion({
    name: `projects/${gcpProjectId}/secrets/${secretName}/versions/latest`,
  });
  const val = JSON.parse((accessResponse.payload?.data ?? 'null').toString('utf8'));
  cache.set(secretName, val);
  return val;
}

export async function clearCache() {
  cache.clear();
}
