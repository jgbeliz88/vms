// Typed shape of the Entra ID session returned by NextAuth (see /auth.ts callbacks)
export interface EntraSession {
  accessToken: string;
  error?: string;
  expires: string;
  user: {
    oid: string;
    name: string;
    email: string;
    roles: string[];
  };
}
