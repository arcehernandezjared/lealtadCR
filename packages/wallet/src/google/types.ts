/** Subconjunto del JSON de credenciales de una Service Account de Google Cloud que realmente usamos. */
export interface GoogleServiceAccountKey {
  client_email: string;
  private_key: string;
}
