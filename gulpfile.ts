import dotenv from 'dotenv';
dotenv.config();
import gulp from 'gulp';
import { DgraphAdapter } from './src/dgraph/DgraphAdapter';
import { DgraphSchema } from './src/dgraph/DgraphSchema';
import minimist from 'minimist';
import { generateData } from './src/dgraph';
import * as fs from 'fs';
import es from 'event-stream';

gulp.task('db:drop', () => {
  try {
    return new DgraphAdapter().dropAll();
  } catch (error) {
    throw error;
  }
});

gulp.task('db:schema:alter', () => {
  try {
    return Promise.all([
      new DgraphAdapter().alterSchema(DgraphSchema.Comment),
      new DgraphAdapter().alterSchema(DgraphSchema.Post)
    ]);
  } catch (error) {
    throw error;
  }
});

gulp.task('db:mutate:test', async () => {
  try {
    const request = {
      createdAt: new Date(),
      description: 'Hello, this is Alice!',
      email: 'alice@example.com',
      name: 'Alice Jones'
    };
    const result = await new DgraphAdapter().mutate({
      request
    });
    console.log(result);
  } catch (error) {
    throw error;
  }
});

gulp.task('db:query:test', async () => {
  try {
    const query = `
    {
      user(func: eq(email, "alice@example.com")) {
        uid
        expand(_all_) {
          uid
          expand(_all_)
        }
      }
    }
    `;
    const result = await new DgraphAdapter().query(query);
    console.log(result);
  } catch (error) {
    throw error;
  }
});

gulp.task('db:generate:data', async () => {
  try {
    const args = minimist(process.argv.slice(3), {
      default: { batchSize: 250, limit: 1000, path: './src/data/RS_2018-02-01' }
    });
    const stream = fs.createReadStream(args.path, {
      flags: 'r'
    });
    // Include optional command line arguments in options.
    const result = await DgraphAdapter.mutateFromStream(
      Object.assign(
        {
          stream
        },
        args
      )
    );
    console.log(result);
  } catch (error) {
    throw error;
  }
});

gulp.task('db:regenerate', gulp.series('db:drop', 'db:generate:data'));
