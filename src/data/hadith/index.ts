// AUTOMATISCH ERZEUGT von scripts/build-hadith-data.mjs – nicht von Hand bearbeiten.
import type { HadithChunk, HadithIndex } from '@/lib/hadith/types';

export const hadithLoaders: Record<'de' | 'tr', { index: () => HadithIndex; chunks: (() => HadithChunk)[] }> = {
  de: {
    index: () => require('./de/index.json'),
    chunks: [
      () => require('./de/c00.json'),
      () => require('./de/c01.json'),
      () => require('./de/c02.json'),
      () => require('./de/c03.json'),
      () => require('./de/c04.json'),
      () => require('./de/c05.json'),
      () => require('./de/c06.json'),
    ],
  },
  tr: {
    index: () => require('./tr/index.json'),
    chunks: [
      () => require('./tr/c00.json'),
      () => require('./tr/c01.json'),
      () => require('./tr/c02.json'),
      () => require('./tr/c03.json'),
      () => require('./tr/c04.json'),
      () => require('./tr/c05.json'),
      () => require('./tr/c06.json'),
      () => require('./tr/c07.json'),
      () => require('./tr/c08.json'),
    ],
  },
};
