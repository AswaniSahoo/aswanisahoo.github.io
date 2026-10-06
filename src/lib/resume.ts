import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { profile } from '../data/profile';

/**
 * The résumé link, or null while the PDF is not in public/. Checked at build time, so the
 * résumé buttons appear with the first build after the file is added and never point at a
 * missing file.
 */
export const resumeHref: string | null = existsSync(join(process.cwd(), 'public', profile.resume)) ? profile.resume : null;
