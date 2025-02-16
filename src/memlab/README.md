# Memlab

Partially copies structures from [Memlab](https://github.com/facebook/memlab) without forking the repository.

## Modification

To make an upgrade to a newer version easier parts that are modified of the code are marked as follows:


Single line:
```
- Original code
const value = JSON.stringify(obj);


+ Modified code
// CUSTOM: reason to comment out
// const value = JSON.stringify(obj);
const value = hash(obj) <- single line after comment should have custom change
```

Multiple lines:
```
// START CUSTOM: reason
...
// END CUSTOM: reason
```
