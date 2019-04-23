import {
  Assigned,
  DgraphClient,
  DgraphClientStub,
  Mutation,
  Response
} from 'dgraph-js-http';
import { ReadStream } from 'fs';
import es from 'event-stream';
import * as CliProgress from 'cli-progress';

export enum MutationTypes {
  DeleteJson,
  SetJson
}

export class DgraphAdapter {
  /**
   * Perform async mutation from `ReadStream` collection of records.
   * Prevents race conditions and back pressure by toggling stream during async
   * calls.
   * @param stream - Stream to extract mutatable records.
   * @param batchSize - Maximum of JSON objects to pass in each Dgraph mutation.
   * @param limit - Maximum number of JSON objects to process in total.
   *  Useful for handling streams from massive data sets.
   */
  public static async mutateFromStream({
    stream,
    batchSize = 50,
    limit = 150
  }: {
    stream: ReadStream;
    batchSize?: number;
    limit?: number;
  }) {
    const adapter = new DgraphAdapter();
    let batch: any[] = [];
    let total = 0;
    const bar = new CliProgress.Bar(
      {
        stopOnComplete: true,
        format:
          '{bar} {percentage}% | Elapsed: {duration_formatted} | ETA: {eta_formatted} | {value}/{total} records'
      },
      CliProgress.Presets.shades_classic
    );
    // Start progress bar with maximum of limit.
    bar.start(limit, 0);

    const syncMutation = async (readStream: ReadStream, event?: string) => {
      try {
        // Pause during async.
        readStream.pause();
        // Mutate batch
        const response = await adapter.mutate({ request: batch });
        // Reset batch.
        batch = [];
        // Update progress bar.
        bar.update(total);
        // Resume after async.
        readStream.resume();
      } catch (error) {
        // Stop progress bar.
        bar.stop();
        console.log(error);
      }
    };

    return new Promise((resolve, reject) => {
      stream
        .pipe(es.split())
        .pipe(es.parse())
        .on('data', async function(this: ReadStream, data: any) {
          // Add data to batch and update total count.
          batch.push(data);
          total++;

          if (total >= limit) {
            // Close stream if total exceeds limit.
            this.destroy();
          } else if (batch.length === batchSize) {
            // Synchronously mutate if batch length meets batchSize.
            await syncMutation(this, 'data');
          }
        })
        .on('error', (error: Error) => {
          // Stop progress bar.
          bar.stop();
          console.log(error);
          reject(error);
        })
        .on('close', async function(this: ReadStream) {
          // Synchronously mutate if batch contains any extraneous records.
          if (batch.length > 0) {
            await syncMutation(this, 'close');
          }
          // Stop progress bar.
          bar.stop();
          resolve(`Stream closed, processed ${total} out of ${limit} records.`);
        });
    });
  }

  /**
   * Endpoint URL of Dgraph Alpha server.
   */
  public address = process.env.DGRAPH_ALPHA_URL;

  /**
   * Dgraph client.
   */
  protected client: NonNullable<DgraphClient>;

  /**
   * Dgraph client stub.
   */
  protected clientStub: NonNullable<DgraphClientStub>;

  constructor(address?: string) {
    if (address) {
      this.address = address;
    }
    this.clientStub = new DgraphClientStub(this.address);
    this.client = new DgraphClient(this.clientStub);
  }

  /**
   * Drop all Dgraph database data.
   */
  public async dropAll(): Promise<boolean> {
    try {
      const payload: any = await this.client.alter({ dropAll: true });
      if (payload.data.code && payload.data.code === 'Success') {
        console.info(`All Dgraph data dropped.`);
        return true;
      } else {
        console.info(`Dgraph data drop failed.`);
        return false;
      }
    } catch (error) {
      console.error(`Dgraph data drop failed, error: %s`, error);
      return false;
    }
  }

  /**
   * Alter the Dgraph database schema.
   * @param schema
   */
  public async alterSchema(schema: string): Promise<boolean> {
    try {
      const payload: any = await this.client.alter({ schema });
      if (payload.data.code && payload.data.code === 'Success') {
        console.info(`Dgraph schema altered.`);
        return true;
      } else {
        console.info(`Dgraph schema alteration failed.`);
        return false;
      }
    } catch (error) {
      console.error(`Dgraph schema alteration failed, error: %s`, error);
      return false;
    }
  }

  /**
   * Execute a Dgraph mutation using passed request object.
   * @param request
   * @param mutationType
   * @param commitNow
   */
  public async mutate<T>({
    request,
    mutationType = MutationTypes.SetJson,
    commitNow = false
  }: {
    request: any;
    mutationType?: MutationTypes;
    commitNow?: boolean;
  }): Promise<string[]> {
    if (request === undefined) {
      throw Error(
        `DgraphAdapter.mutate error, payload undefined for request: ${request}`
      );
    }
    const transaction = this.client.newTxn();
    let uids: string[] = [];
    try {
      const mutation: Mutation = {};
      mutation.commitNow = commitNow;
      if (mutationType === MutationTypes.SetJson) {
        mutation.setJson = request;
      } else if (mutationType === MutationTypes.DeleteJson) {
        mutation.deleteJson = request;
      }
      const assigned: Assigned = await transaction.mutate(mutation);
      if (!commitNow) {
        await transaction.commit();
      }
      uids = Object.entries(assigned.data.uids).map(([key, uid]) => uid);
    } catch (e) {
      console.error(
        'DgraphAdapter.mutate, request: %o, mutationType: %o, error: %o',
        request,
        mutationType,
        e
      );
    } finally {
      await transaction.discard();
    }
    return uids;
  }

  /**
   * Execute Dgraph query.
   * @param query
   * @param vars
   */
  public async query<T>(query: string, vars?: object): Promise<any> {
    const transaction = this.client.newTxn();
    let result;
    try {
      // Reduce optional vars to string values only.
      // See: https://github.com/dgraph-io/dgraph-js-http/blob/master/src/txn.ts#L69-L71
      // See: https://github.com/dgraph-io/dgraph-js-http/blob/master/tests/txn.spec.ts#L47-L56
      vars = vars
        ? Object.entries(vars).reduce((accumulator: any, value) => {
            accumulator[value[0]] = value[1].toString();
            return accumulator;
          }, {})
        : vars;
      const response: Response = vars
        ? await transaction.queryWithVars(query, vars)
        : await transaction.query(query);
      result = response.data;
    } catch (error) {
      console.error('DgraphAdapter.query, query: %o, error: %o', query, error);
    } finally {
      await transaction.discard();
    }
    return result;
  }
}
