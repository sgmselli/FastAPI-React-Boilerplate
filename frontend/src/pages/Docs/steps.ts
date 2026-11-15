import type { ComponentType } from "react";

import { GettingStarted } from "./content/GettingStarted";
import { DatabaseMigrations } from "./content/DatabaseMigrations";
import { EmailDelivery } from "./content/EmailDelivery";
import { GoogleOAuth } from "./content/GoogleOAuth";
import { FileStorage } from "./content/FileStorage";
import { GoogleAnalytics } from "./content/GoogleAnalytics";
import { DigitalOceanAccount } from "./content/DigitalOceanAccount";
import { Infrastructure } from "./content/Infrastructure";
import { ServerProvisioning } from "./content/ServerProvisioning";
import { SecretsAndVariables } from "./content/SecretsAndVariables";
import { CiCd } from "./content/CiCd";
import { FrontendNetlify } from "./content/FrontendNetlify";
import { DomainAndHttps } from "./content/DomainAndHttps";
import { Sentry } from "./content/Sentry";
import { UptimeAndAlerts } from "./content/UptimeAndAlerts";

export interface DocsStepDefinition {
    slug: string;
    title: string;
    subtitle: string;
    content: ComponentType;
}

// The order here is the order of the guide - the sidebar numbers and previous/next follow it
export const docsSteps: DocsStepDefinition[] = [
    {
        slug: "getting-started",
        title: "Getting started",
        subtitle: "Clone the repository and run the app on your machine.",
        content: GettingStarted,
    },
    {
        slug: "database-migrations",
        title: "Database migrations",
        subtitle: "Change the database schema safely with Alembic.",
        content: DatabaseMigrations,
    },
    {
        slug: "email-delivery",
        title: "Email delivery",
        subtitle: "Send transactional emails through Brevo.",
        content: EmailDelivery,
    },
    {
        slug: "google-oauth",
        title: "Google OAuth",
        subtitle: "Let people sign in with their Google account.",
        content: GoogleOAuth,
    },
    {
        slug: "file-storage",
        title: "File storage",
        subtitle: "Store uploads like profile pictures in a private bucket.",
        content: FileStorage,
    },
    {
        slug: "google-analytics",
        title: "Google Analytics",
        subtitle: "Track page visits on your production site.",
        content: GoogleAnalytics,
    },
    {
        slug: "digitalocean-account",
        title: "DigitalOcean account",
        subtitle: "Create the account, access token and SSH key the server needs.",
        content: DigitalOceanAccount,
    },
    {
        slug: "infrastructure",
        title: "Infrastructure",
        subtitle: "Create your server and container registry with Terraform.",
        content: Infrastructure,
    },
    {
        slug: "server-provisioning",
        title: "Server provisioning",
        subtitle: "Install Docker and your production settings with Ansible.",
        content: ServerProvisioning,
    },
    {
        slug: "secrets-and-variables",
        title: "Secrets and variables",
        subtitle: "Give GitHub Actions what it needs to deploy.",
        content: SecretsAndVariables,
    },
    {
        slug: "ci-cd",
        title: "CI/CD pipelines",
        subtitle: "Test every pull request and deploy every merge automatically.",
        content: CiCd,
    },
    {
        slug: "frontend-netlify",
        title: "Frontend on Netlify",
        subtitle: "Host the frontend on Netlify.",
        content: FrontendNetlify,
    },
    {
        slug: "domain-and-https",
        title: "Domain and HTTPS",
        subtitle: "Point your domain at the app and secure it with HTTPS.",
        content: DomainAndHttps,
    },
    {
        slug: "sentry",
        title: "Sentry",
        subtitle: "Track errors and logs from the backend and frontend.",
        content: Sentry,
    },
    {
        slug: "uptime-and-alerts",
        title: "Uptime and alerts",
        subtitle: "Get emailed when the app goes down or the server struggles.",
        content: UptimeAndAlerts,
    },
];

export const docsPath = (slug: string) => `/docs/${slug}`;

export const firstDocsPath = docsPath(docsSteps[0].slug);
