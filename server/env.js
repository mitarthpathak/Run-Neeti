import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load server/.env regardless of the directory the process was started from
// (on Vercel the variables come from the project settings instead).
// Imported first by index.js so every other module sees the variables.
const serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(serverDir, '.env'), quiet: true });
