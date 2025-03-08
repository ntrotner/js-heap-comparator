# js-heap-comparator
[![Release](https://github.com/ntrotner/js-heap-comparator/actions/workflows/release.yml/badge.svg)](https://github.com/ntrotner/js-heap-comparator/actions/workflows/release.yml)
[![version](https://img.shields.io/npm/v/js-heap-comparator.svg?style=flat-square)](https://www.npmjs.com/package/js-heap-comparator)

> Compare JS heaps from runtimes like V8


## Install

```bash
npm install js-heap-comparator --save-dev
```
or
```bash
yarn add js-heap-comparator --dev
```

## Usage

It's recommended to use the `--max-old-space-size=8192` flag when running the script to avoid memory issues, especially when multiple threads are used.
Outputs are saved in the `presenterFilePath` directory. Any returns from the compare function are not planned due to the excessive use of memory.
- $presenterFilePath/statistics.json: Contains the statistics of the comparison, e.g. the number of objects, the number of objects that are the same, the number of objects that are different, etc.
- $presenterFilePath/perfect-match.json: Contains the objects that are the same in both heap files.
- $presenterFilePath/next-best-match.json: Contains the objects that are similar in both heap files.
- $presenterFilePath/disjunct-nodes.json: Contains the objects that are different in both heap files.


```javascript
import { V8Comparator } from 'js-heap-comparator';

const comparator = new V8Comparator();
heapComparator.initialize({
  activePresenter: {
    statistics: true,
    perfectMatch: false,
    nextBestMatch: false,
    disjunctNodes: false,
  },
  presenterFilePath: '/path/to/output/results',
  nextBestMatchObjectThreshold: 0.7,
  threads: 1
});
heapComparator.compare('current_heapfile.json', 'next_heapfile.json');
```

