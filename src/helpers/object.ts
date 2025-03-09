/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import hash from 'object-hash';

/**
 * Hash object loosely with some post-processing to arrays and functions.
 *
 * @param input
 */
export function hashObjectLoosely(input: hash.NotUndefined): string {
  return hash(input, {
    respectFunctionProperties: false,
    respectFunctionNames: false,
    respectType: false,
    unorderedArrays: true,
    ignoreUnknown: true,
  });
}

/**
 * Clean circular references from an object.
 *
 * @param rootObject
 * @param replacementValue
 */
export function cleanCircularReferences(rootObject: Record<string, any>, replacementValue: any): any {
  const set = new WeakSet([rootObject]);
  const objectsToIterate = [rootObject];

  while (objectsToIterate.length > 0) {
    const inspectedObject = objectsToIterate.shift() ?? {};

    for (const key of Object.keys(inspectedObject)) {
      if (Array.isArray(inspectedObject[key])) {
        set.add(inspectedObject[key]);

        for (let i = 0; i < inspectedObject[key].length; i++) {
          if (typeof inspectedObject[key][i] !== 'object') {
            continue;
          }

          if (set.has(inspectedObject[key][i])) {
            inspectedObject[key][i] = replacementValue;
          } else {
            set.add(inspectedObject[key][i]);
            objectsToIterate.push(inspectedObject[key][i]);
          }
        }
      } else if (typeof inspectedObject[key] === 'object') {
        if (set.has(inspectedObject[key])) {
          inspectedObject[key] = replacementValue;
        } else {
          set.add(inspectedObject[key]);
          objectsToIterate.push(inspectedObject[key]);
        }
      }
    }
  }
}
