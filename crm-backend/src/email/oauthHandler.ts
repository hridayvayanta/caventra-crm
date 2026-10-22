import crypto from 'node:crypto';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface StoredOAuthCredentials {
  senderEmail: string;
  refreshToken: string;
  scope: string;
  authorizedAt: string;
}

// Memory or Secret Store for OAuth state nonce verification
const pendingStates = new Map<string, { createdAt: number; founderEmail: string }>();

/**
 * Minimum required Google OAuth scopes for Caventra Gmail Outreach:
 * 1. gmail.send - Send cold outreach emails via authorized account
 * 2. gmail.readonly - Read mailbox history for reply and bounce detection
 */
export const REQUIRED_GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

/**
 * Generates an unguessable CSRF state token and builds the Google OAuth 2.0 authorization URL
 */
export function generateOAuthConsentUrl(config: OAuthConfig, founderEmail: string): { url: string; state: string } {
  const state = crypto.randomBytes(24).toString('hex');
  pendingStates.set(state, { createdAt: Date.now(), founderEmail });

  // Clean expired pending states (> 15 minutes)
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [s, data] of pendingStates.entries()) {
    if (data.createdAt < cutoff) pendingStates.delete(s);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: REQUIRED_GMAIL_SCOPES.join(' '),
    access_type: 'offline', // Demands refresh_token
    prompt: 'consent',     // Forces consent prompt so refresh_token is guaranteed
    state,
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    state,
  };
}

/**
 * Validates the state parameter from the OAuth callback to prevent CSRF attacks
 */
export function validateOAuthState(state: string): { valid: boolean; founderEmail?: string } {
  const entry = pendingStates.get(state);
  if (!entry) {
    return { valid: false };
  }
  pendingStates.delete(state);
  if (Date.now() - entry.createdAt > 15 * 60 * 1000) {
    return { valid: false };
  }
  return { valid: true, founderEmail: entry.founderEmail };
}

/**
 * Exchanges authorization code for tokens and verifies sender identity
 */
export async function handleOAuthCallback(
  code: string,
  state: string,
  config: OAuthConfig
): Promise<{ success: boolean; senderEmail?: string; refreshToken?: string; error?: string }> {
  // 1. Verify CSRF state
  const stateCheck = validateOAuthState(state);
  if (!stateCheck.valid) {
    return { success: false, error: 'Invalid or expired OAuth state parameter (CSRF protection failed).' };
  }

  // 2. Token exchange with Google
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    return { success: false, error: `Token exchange rejected by Google: ${errBody}` };
  }

  const tokenData: any = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;

  if (!refreshToken) {
    return {
      success: false,
      error: 'Google did not return a refresh token. Please re-authorize with prompt=consent.',
    };
  }

  // 3. Verify sender email by querying Gmail profile
  const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    return { success: false, error: 'Could not fetch authorized Gmail profile.' };
  }

  const profileData: any = await profileRes.json();
  const senderEmail = profileData.emailAddress;

  // Never return access token or client secret to client
  return {
    success: true,
    senderEmail,
    refreshToken,
  };
}
