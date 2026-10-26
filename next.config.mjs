import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse'],
  // Keep tracing scoped to this app when a parent folder has another lockfile.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
};
export default nextConfig;
