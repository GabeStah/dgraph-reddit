import * as fs from 'fs';
import es, { MapStream } from 'event-stream';
import '@babel/polyfill';
import { DgraphAdapter, MutationTypes } from './DgraphAdapter';

export async function resetDatabase() {
  const adapter = new DgraphAdapter();
  await adapter.dropAll();
}

export enum REDDIT_DATA_TYPE {
  COMMENT,
  SUBMISSION
}

export interface GenerateDataParameters {
  type?: REDDIT_DATA_TYPE;
  quantity?: number;
}

const CHUNK_SIZE = 20;
const MAX_RECORDS = 100;

export async function generateData() {
  let collection: any[] = [];
  let total = 0;
  const adapter = new DgraphAdapter();
  // Create a stream from some character device.
  return new Promise((resolve, reject) => {
    const stream = fs
      .createReadStream('./src/data/50.submissions', { flags: 'r' })
      .pipe(es.split())
      .pipe(es.parse())
      .on('data', async (data: any) => {
        collection.push(data);
        if (collection.length === CHUNK_SIZE) {
          // Update total.
          total += collection.length;
          // Pause while perform async.
          stream.pause();
          console.log(`on: write, collection.length: ${collection.length}`);
          // Mutate collection
          const response = await adapter.mutate({ request: collection });
          console.log(`on: write, response.length: ${response.length}`);
          // Reset collection.
          collection = [];
          // Resume after async.
          stream.resume();
        }
      })
      .on('error', (error: Error) => {
        console.log(error);
        reject(error);
      })
      .on('end', async () => {
        if (collection.length > 0) {
          // Pause while perform async.
          stream.pause();
          console.log(`on: end, collection.length: ${collection.length}`);
          // Mutate collection
          const response = await adapter.mutate({ request: collection });
          console.log(`on: end, response.length: ${response.length}`);
          // Reset collection.
          collection = [];
          // Resume after async.
          stream.resume();
        }
        resolve('success');
      });
  });
}
