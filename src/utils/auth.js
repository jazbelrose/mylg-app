import { fetchAuthSession } from 'aws-amplify/auth';

export async function getAccessToken() {
  try {
    const session = await fetchAuthSession();
    if (!session?.tokens?.accessToken) throw new Error('No access token');
    return session.tokens.accessToken.toString();
  } catch (e) {
    console.error('Failed to get access token', e);
    return null;
  }
}