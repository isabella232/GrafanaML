/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface AzureMLSecureJsonData {
    authToken?: string;
    clientSecret?: string;
}