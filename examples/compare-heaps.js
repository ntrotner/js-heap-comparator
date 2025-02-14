import { V8Comparator } from '../lib/index.js';

var comparator = new V8Comparator();
comparator.initialize({presenterFilePath: '~/presenterOutput'});
comparator.compare('base.json', 'next.json');
