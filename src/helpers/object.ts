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
