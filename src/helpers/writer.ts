import {
  type Writable,
} from 'node:stream';

/**
 * Orchestrates the write operation and notifies on success
 *
 * @param stream
 * @param data
 */
export async function writeToStream(stream: Writable, data: string): Promise<boolean> {
  return new Promise(resolve => {
    const isFlushed = stream.write(data);
    if (isFlushed) {
      resolve(true);
    }

    stream.once('drain', () => {
      resolve(true);
    });
  });
}
