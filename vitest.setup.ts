import { config } from 'dotenv';
import path from 'path';

// next dev/build chargent .env.local automatiquement ; vitest non — on le fait nous-mêmes,
// sans écraser des variables déjà définies (utile si un CI les fournit autrement).
config({ path: path.resolve(__dirname, '.env.local') });
