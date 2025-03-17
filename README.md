# js-heap-comparator
[![Release](https://github.com/ntrotner/js-heap-comparator/actions/workflows/release.yml/badge.svg)](https://github.com/ntrotner/js-heap-comparator/actions/workflows/release.yml)
[![version](https://img.shields.io/npm/v/js-heap-comparator.svg?style=flat-square)](https://www.npmjs.com/package/js-heap-comparator)

<p align="center">
  <img src="/docs/assets/i-guess-we-doin-different-runtimes-now.png" alt="Factory worker questioning why someone would compare heaps from different runtimes" width="350">
</p>

> Compare JS heaps from engines like V8, where the heaps are sourced from different runtimes.

Compatible with heap outputs from Chrome Developer Tools and parsing techniques from [Memlab](https://facebook.github.io/memlab/)

## Install

```bash
npm install js-heap-comparator --save-dev
```
or
```bash
yarn add js-heap-comparator --dev
```

## Usage

Check out [examples/compare-heaps.js](examples/compare-heaps.js) for a quick-start.

It's recommended to use the `--max-old-space-size=8192` flag when running the script to avoid memory issues, especially when multiple threads are used.

### Option: `presenterFilePath`
Outputs are saved in the `presenterFilePath` directory. Any returns from the compare function are not planned due to the excessive use of memory.
- `$presenterFilePath/statistics.json`: Contains the statistics of the comparison, e.g. the number of objects, the number of objects that are the same, the number of objects that are different, etc.
- `$presenterFilePath/perfect-match.json`: Contains the objects that are the same in both heap files.
- `$presenterFilePath/next-best-match.json`: Contains the objects that are similar in both heap files.
- `$presenterFilePath/disjunct-nodes.json`: Contains the objects that are different in both heap files.

### Option: `activePresenter`
Toggles the type of presenter to output. The least memory intensive is `statistics`, as only the metadata is saved.
The presenter `disjunctNodes` outputs all nodes that couldn't be matches with one another.
Presenters `perfectMatch` and `nextBestMatch` are bound to change to output matches in an efficient way.

```javascript
activePresenter: {
  statistics: true,
  perfectMatch: false,
  nextBestMatch: false,
  disjunctNodes: false,
}
```

### Option: `nextBestMatchObjectThreshold`
Input value between `0.0` and `1.0`. Defines threshold for next best match algorithm, which ranks the similarity of serializable objects.
It's recommended to stay above `0.5` for large heaps.

### Option: `nextBestMatchObjectPropertyThreshold`
Input value between `1` and `Infinity`. Defines the amount of properties to compare in the next best match algorithm.
This allows for optimized comparison times, as serialized objects can be deeply nested and cause unnecessary long execution times.
For larger disjunct sets it's recommended to set it between `2500` and `5000`.

### Option: `threads`
Input value `>= 1`. Used to parallelize next best match algorithm. Adds large memory overhead due to inter-process communication.
It's recommended to keep it low between `1` and `4`.


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
  nextBestMatchObjectPropertyThreshold: 10000,
  threads: 1
});
heapComparator.compare('current_heapfile.json', 'next_heapfile.json');
```

