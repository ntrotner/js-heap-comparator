import { V8Comparator } from '../lib/index.js';

var comparator = new V8Comparator();
comparator.initialize({
  activePresenter: {
    statistics: true,
    perfectMatch: false,
    nextBestMatch: false,
    disjunctNodes: false,
  },
  presenterFilePath: '/presenterOutput',
  nextBestMatchObjectThreshold: 0.7,
  nextBestMatchObjectPropertyThreshold: 10000,
  threads: 1
});

comparator.compare('base.json', 'next.json');
