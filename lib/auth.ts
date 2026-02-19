export interface AuthUser {
  userId: string;
  email: string;
  name?: string;
}

export function parseAuthToken(token: string): AuthUser | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

export function createAuthToken(user: AuthUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}
