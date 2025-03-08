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
  threads: 3
});

comparator.compare('base.json', 'next.json');
