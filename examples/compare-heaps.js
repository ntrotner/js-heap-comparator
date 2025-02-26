import { V8Comparator } from '../lib/index.js';

var comparator = new V8Comparator();
comparator.initialize({presenterFilePath: '~/presenterOutput', nextBestMatchObjectThreshold: 0.7, threads: 2});
comparator.compare('base.json', 'next.json');
