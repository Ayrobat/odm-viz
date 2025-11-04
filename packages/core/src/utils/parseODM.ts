export interface Shot {
  filename: string;
  x: number;
  y: number;
  z: number;
  omega: number;
  phi: number;
  kappa: number;
  camera: string;
}

interface RawShotData {
  [key: string]: Omit<Shot, 'filename'> & { filename?: string };
}

export async function parseShots(json: RawShotData): Promise<Shot[]> {
  return Object.entries(json).map(([filename, shot]) => ({
    ...shot,
    filename: shot.filename || filename,
  }));
}

export function sampleShots(shots: Shot[], every: number = 3): Shot[] {
  return shots.filter((_, i) => i % every === 0);
}
