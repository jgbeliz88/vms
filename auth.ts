import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

async function refreshAccessToken(token: Record<string, unknown>) {
  try {
    const url = `https://login.microsoftonline.com/${process.env.AUTH_AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AUTH_AZURE_AD_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      // Azure rotates the refresh token on each use — take the new one if provided
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AUTH_AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_AZURE_AD_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: "openid profile email offline_access",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  jwt: {
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const roles = (profile as { roles?: string[] }).roles ?? [];
        const p = profile as { oid?: string; name?: string; preferred_username?: string; email?: string };
        return {
          ...token,
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          expiresAt: account.expires_at!,
          roles,
          oid: p.oid ?? token.sub ?? "",
          // Azure does not return the "name" claim by default — fall back to
          // preferred_username (email) so session.user.name is always populated.
          // NextAuth automatically maps token.name → session.user.name behind the scenes.
          name: p.name ?? p.preferred_username ?? p.email ?? "",
        };
      }

      // Access token still valid (60s buffer avoids mid-request expiry)
      if (Date.now() < (token.expiresAt as number) * 1000 - 60_000) {
        return token;
      }

      return refreshAccessToken(token as Record<string, unknown>);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      session.user ??= {};
      session.user.oid = token.oid;
      session.user.roles = token.roles ?? [];
      // Local testing escape hatch: grant extra app roles the Azure account does not
      // have, e.g. DEV_EXTRA_ROLES=vms_cdn_page. Hard-gated on NODE_ENV so a
      // production build ignores the variable entirely even if it is set.
      if (process.env.NODE_ENV === "development" && process.env.DEV_EXTRA_ROLES) {
        const extra = process.env.DEV_EXTRA_ROLES.split(",")
          .map((role) => role.trim())
          .filter(Boolean);
        session.user.roles = [...new Set([...session.user.roles, ...extra])];
      }
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  pages: { signIn: "/login" },
});
