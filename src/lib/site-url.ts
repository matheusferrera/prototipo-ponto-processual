const LOCAL_SITE_URL = 'http://localhost:3000';

function toUrl(value: string): URL {
  const normalized = value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `https://${value}`;

  return new URL(normalized);
}

export function getSiteUrl(): URL {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    LOCAL_SITE_URL;

  try {
    return toUrl(siteUrl);
  } catch {
    return new URL(LOCAL_SITE_URL);
  }
}

export function getAbsoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}
