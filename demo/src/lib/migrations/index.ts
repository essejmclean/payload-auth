import * as migration_20251120_225725_init from './20251120_225725_init';
import * as migration_20251205_205932 from './20251205_205932';

export const migrations = [
  {
    up: migration_20251120_225725_init.up,
    down: migration_20251120_225725_init.down,
    name: '20251120_225725_init',
  },
  {
    up: migration_20251205_205932.up,
    down: migration_20251205_205932.down,
    name: '20251205_205932'
  },
];
