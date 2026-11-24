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
      () => require('./tr/c09.json'),
      () => require('./tr/c10.json'),
      () => require('./tr/c11.json'),
      () => require('./tr/c12.json'),
      () => require('./tr/c13.json'),
      () => require('./tr/c14.json'),
      () => require('./tr/c15.json'),
      () => require('./tr/c16.json'),
      () => require('./tr/c17.json'),
      () => require('./tr/c18.json'),
      () => require('./tr/c19.json'),
      () => require('./tr/c20.json'),
      () => require('./tr/c21.json'),
    ],
  },
};
