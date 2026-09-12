import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Small server-side persistence adapter used for local/Bolt preview deployments.
 * It keeps application state off the browser and gives the app one API boundary
 * that can later be replaced with a managed database without rewriting the UI.
 *
 * For production, set PERSISTENCE_FILE to a durable mounted path or replace this
 * adapter with the managed database adapter used by the deployment platform.
 */
export type PersistedState = Record<string, unknown>;

const defaultPath = path.resolve(process.env.PERSISTENCE_FILE || './data/worksphere-state.json');

async function ensureParent(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function readState(filePath = defaultPath): Promise<PersistedState | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as PersistedState;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function writeState(state: PersistedState, filePath = defaultPath): Promise<void> {
  await ensureParent(filePath);
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(state), 'utf8');
  await fs.rename(tempPath, filePath);
}
