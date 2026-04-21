/**
 * zudoku.config.tsx — Forest River API Platform Demo
 *
 * Place this file at: docs/zudoku.config.tsx
 * (alongside your SubscribePage.tsx at docs/src/SubscribePage.tsx)
 *
 * Prerequisites:
 *   1. Enable the API Key Service in your Zuplo project (portal.zuplo.com → Services)
 *   2. Set up an Auth0 or Okta app for portal login (OpenID Connect)
 *   3. Update the three placeholders marked TODO below
 *
 * Local dev:
 *   npm run docs   →  http://localhost:9200
 */

import { type ZudokuConfig } from "zudoku";
import { createApiIdentityPlugin } from "zudoku/plugins";
import { SubscribePage } from "./src/SubscribePage";

const config: ZudokuConfig = {
  // ─── Site Branding ──────────────────────────────────────────────────────────
  site: {
    title: "Forest River Developer Portal",
    // Drop your logo files into docs/public/
    // logo: {
    //   src: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
    //   width: "140px",
    // },
    banner: {
      message: "🚧 Demo environment — not connected to production systems.",
      color: "caution",
      dismissible: true,
    },
  },

  // ─── Authentication (Auth0 or Okta — pick one) ───────────────────────────────
  // TODO: Replace with your IdP's client ID and issuer URL.
  //
  // Auth0 example:
  //   clientId: "abc123xyz"
  //   issuer:   "https://your-tenant.us.auth0.com"
  //
  // Okta example:
  //   clientId: "0oa..."
  //   issuer:   "https://your-org.okta.com/oauth2/default"
  authentication: {
    type: "openid",
    clientId: "TODO_YOUR_CLIENT_ID",
    issuer: "TODO_YOUR_ISSUER_URL",
    scopes: ["openid", "profile", "email"],
  },

  // ─── API Reference ───────────────────────────────────────────────────────────
  // TODO: Replace with your actual OpenAPI spec path or URL.
  // For the demo, drop a spec file at docs/openapi.json (or .yaml).
  apis: {
    type: "file",
    input: "./openapi.json",
    path: "/api",
  },

  // ─── Navigation ──────────────────────────────────────────────────────────────
  navigation: [
    // Getting started docs (put .md files in docs/pages/)
    {
      type: "category",
      label: "Documentation",
      icon: "book-open",
      items: [
        {
          type: "doc",
          file: "pages/introduction",
          label: "Introduction",
        },
        {
          type: "doc",
          file: "pages/quickstart",
          label: "Quickstart",
        },
        {
          type: "doc",
          file: "pages/authentication",
          label: "Authentication",
        },
      ],
    },

    // Live API reference (generated from OpenAPI spec)
    {
      type: "link",
      to: "/api",
      label: "API Reference",
      icon: "code",
    },

    // Subscription flow — only visible when signed in
    {
      type: "custom-page",
      path: "/subscribe",
      label: "API Access",
      icon: "key",
      element: <SubscribePage initialView="plans" />,
      display: "auth", // hidden until logged in
    },
    {
      type: "custom-page",
      path: "/my-subscriptions",
      label: "My Subscriptions",
      icon: "layers",
      element: <SubscribePage initialView="subscriptions" />,
      display: "auth",
    },
  ],

  // ─── API Playground Identity ──────────────────────────────────────────────────
  // Automatically passes the signed-in user's OAuth token to the API playground.
  // Works for both Client Credentials and Auth Code + PKCE flows (scenario 3.3).
  plugins: [
    createApiIdentityPlugin({
      getIdentities: async (context) => [
        {
          id: "oauth-token",
          label: "My OAuth Token",
          authorizeRequest: (request) => {
            return context.authentication?.signRequest(request);
          },
        },
      ],
    }),
  ],

  // ─── Docs location ───────────────────────────────────────────────────────────
  docs: {
    files: "/pages/**/*.{md,mdx}",
  },
};

export default config;
