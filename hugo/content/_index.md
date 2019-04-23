---
author: 'Gabe Wyatt'
date: 2019-04-13T10:42:34-07:00
linktitle: Dgraph Reddit Tutorial
title: Dgraph Reddit Tutorial
weight: 10
---

## Create a Vue CLI Project

Start by globally installing [`@vue/cli`](https://cli.vuejs.org/).

```bash
yarn global add @vue/cli
```

Create a new Vue project. In this tutorial our project will be named `dgraph-reddit`, but you can call your project anything you'd like.

```bash
vue create dgraph-reddit
```

Choose to `Manually select features` and then choose the following options:

- Please pick a preset: **Manually select features**
- Check the features needed for your project: **Babel, TS, Router, Vuex, CSS Pre-processors, Linter**
- Use class-style component syntax? **Yes**
- Use Babel alongside TypeScript for auto-detected polyfills? **Yes**
- Use history mode for router? (Requires proper server setup for index fallback in production) **Yes**
- Pick a CSS pre-processor (PostCSS, Autoprefixer and CSS Modules are supported by default): **Sass/SCSS (with dart-sass)**
- Pick a linter / formatter config: **TSLint**
- Pick additional lint features: **Lint on save**
- Where do you prefer placing config for Babel, PostCSS, ESLint, etc.? **In dedicated config files**

Wait a few moments for the installation to complete then navigate to the project directory and execute `yarn serve` to see that your app is up and running. By default, the dev server is available at [`http://localhost:8080/`](http://localhost:8080/), but `vue-cli-service` may choose a different port if it detects `8080` is in use.

```bash
$ cd dgraph-reddit
$ yarn serve

  App running at:
  - Local:   http://localhost:8080/
  - Network: http://10.0.75.1:8080/
```

You can opt to keep the dev server running once development begins, but for now it's best to terminate it (`Ctrl/Cmd + C`).

## Install Node Packages

Let's also take a moment to install some additional dependencies we'll need to get started, particularly since we'll be using TypeScript.

```bash
yarn add dgraph-js-http gulp gulp-typescript
yarn add -D @babel/polyfill @types/gulp @types/node ts-node cli-progress @types/cli-progress
```

## Prettier & TSLint

We'll be using Prettier and TSLint for our linting needs throughout this guide, but feel free to use whatever setup you prefer. If you wish to use the same solution, you'll want to configure your editor to execute Prettier/linting upon save. That's beyond the scope of this article, but check out the [prettier-vscode](https://github.com/prettier/prettier-vscode) and [Prettier + WebStorm](https://prettier.io/docs/en/webstorm.html) documentation for more details on using some popular editors.

I also recommend adding some additional rules to the project `tslint.json` file to disable the `no-console` and `trailing-comma` rules.

```json
{
  "defaultSeverity": "warning",
  "extends": ["tslint:recommended"],
  "linterOptions": {
    "exclude": ["node_modules/**"]
  },
  "rules": {
    "quotemark": [true, "single"],
    "indent": [true, "spaces", 2],
    "interface-name": false,
    "ordered-imports": false,
    "object-literal-sort-keys": false,
    "no-consecutive-blank-lines": false,
    "no-console": false,
    "trailing-comma": false
  }
}
```

I've also created a `.prettierrc` file in the project root directory with the following content.

```json
{
  "semi": true,
  "singleQuote": true
}
```

## Connecting to Dgraph

With our project configured we're ready to get into playing around with Dgraph and adding some data that our app will use.

### Prerequisites

Make sure you have a Dgraph installation available for use explicitly for this project, as you don't want to risk your existing data. Installing Dgraph takes just a few minutes and can be easily accomplished on the local system or within a Docker container. Check out the [official Get Started](https://docs.dgraph.io/get-started/) documentation for details on that!

Throughout the rest of this tutorial we'll assume you're using a local Dgraph installation at the default URL of `http://localhost:8080`, so please change the address to match your local install if needed.

### Connecting to Dgraph Alpha

To add our Reddit data to Dgraph we'll need to establish a connection to Dgraph's Alpha server which hosts the predicates and indices Dgraph relies on to represent data. Since we're creating a front-end Vue application we'll be using the [`dgraph-js-http`](https://github.com/dgraph-io/dgraph-js-http) library which provides some helper methods for connecting to Dgraph and executing transactions.

1.  Let's start by creating a new directory at `src/dgraph` to hold all our Dgraph code.

    ```bash
    mkdir src/dgraph && cd src/dgraph
    ```

2.  Create a new file call `DgraphAdapter.ts`.

    ```bash
    touch DgraphAdapter.ts
    ```

3.  The `DgraphAdapter` class where we'll establish a connection between our app and Dgraph through the `dgraph-js-http` library. Let's start by importing the `DgraphClient` and `DgraphClientStub` from `dgraph-js-http`, which we'll use to establish a Dgraph connection. We'll also create the `client` and `clientStub` properties, which will hold non-nullable instances of the `DgraphClient` and `DgraphClientStub` objects. The `address` property is just the string pointing to our Dgraph Alpha server endpoint.

    ```ts
    import { DgraphClient, DgraphClientStub } from 'dgraph-js-http';

    export class DgraphAdapter {
      public address = 'http://localhost:8080';
      protected client: NonNullable<DgraphClient>;
      protected clientStub: NonNullable<DgraphClientStub>;
    }
    ```

4.  Let's next add the `constructor` method, which will accept an optional `address?: string` argument.

    ```ts
    constructor(address?: string) {
      if (address) {
        this.address = address;
      }
      this.clientStub = new DgraphClientStub(this.address);
      this.client = new DgraphClient(this.clientStub);
    }
    ```

    This allows us to either use the default Dgraph Alpha address or override the default with our own address during invocation. Otherwise, calling the constructor just creates a new instance of the `DgraphClient` using the `DgraphClientStub` and sets the properties.

    Your `DgraphAdapter.ts` should look like the following.

    ```ts
    import { DgraphClient, DgraphClientStub } from 'dgraph-js-http';

    export class DgraphAdapter {
      public address = 'http://localhost:8080';
      protected client: NonNullable<DgraphClient>;
      protected clientStub: NonNullable<DgraphClientStub>;

      constructor(address?: string) {
        if (address) {
          this.address = address;
        }
        this.clientStub = new DgraphClientStub(this.address);
        this.client = new DgraphClient(this.clientStub);
      }
    }
    ```

5.  Let's leave this for now and quickly setup a way for us to execute arbitrary code that isn't tied directly to our Vue application. We'll be using `Gulp` to handle such tasks.

## Setting Up Gulp

Like the rest of the project we'll be using TypeScript and a number of ES6+ JavaScript features within Gulp. However, the default `tsconfig.json` that the `Vue CLI` created for us is configured to use the `esnext` module, which will cause an error when trying to execute Gulp commands. However, our Vue application has to use the `esnext` module code generation to use all the advanced features it has. The problem is that we effectively need to specify two different sets of TypeScript configurations depending on the execution stack (Vue vs Gulp), so how can we do it? The first inclination might be to pass options to the Node commands we're invoking (such as `gulp` or `yarn serve`), but that runs into complications when we're trying to invoke TypeScript compilation _first_. In particular, most libraries are configured to look for a `tsconfig.json` file in the root directory and overriding that project location is difficult depending on the order of operations.

1.  To solve this issue we need to make a copy the existing `tsconfig.json` since it is pre-configured for our Vue application. We'll call it `tsconfig.vue.json`.

    ```bash
    cp tsconfig.json tsconfig.vue.json
    ```

2.  Now we need to edit the base `tsconfig.json` file and change the `module` property to `commonjs` to ensure it remains compatible with Gulp when it is initially registered with `ts-node/register` upon execution.

    ```json
    {
      "compilerOptions": {
        "target": "esnext",
        "module": "commonjs"
        // ...
      }
    }
    ```

3.  The `ts-node` package will find the default `tsconfig.json` and use it for our Gulp commands that are separate from our Vue application. However, if we run our Vue app again we see a compilation error is now occurring.

    ```bash
    $ yarn serve
    WARNING  Compiled with 2 warnings

    warning  in ./src/components/HelloWorld.vue?vue&type=script&lang=ts&

    "export 'default' (imported as 'mod') was not found in '-!../../node_modules/cache-loader/dist/cjs.js??ref--13-0!../../node_modules/babel-loader/lib/index.js!../../node_modules/ts-loader/index.js??ref--13-2!../../node_modules/cache-loader/dist/cjs.js??ref--0-0!../../node_modules/vue-loader/lib/index.js??vue-loader-options!./HelloWorld.vue?vue&type=script&lang=ts&'

    warning  in ./src/views/Home.vue?vue&type=script&lang=ts&

    "export 'default' (imported as 'mod') was not found in '-!../../node_modules/cache-loader/dist/cjs.js??ref--13-0!../../node_modules/babel-loader/lib/index.js!../../node_modules/ts-loader/index.js??ref--13-2!../../node_modules/cache-loader/dist/cjs.js??ref--0-0!../../node_modules/vue-loader/lib/index.js??vue-loader-options!./Home.vue?vue&type=script&lang=ts&'
    ```

    Even though these are just warnings and compilation completes, it results in a non-functional Vue application.

    As mentioned above, these errors are a result of Vue using the default `tsconfig.json` for TypeScript compilation, which is no longer set to use the `esnext` module for code generation. To fix this we need to tell Vue where to find the `tsconfig.vue.json` configuration when transpiling. Vue CLI apps are built on top of [Webpack](https://webpack.js.org/) by default, so we can modify the Webpack `ts` rule so the `ts-loader` knows where to find the configuration file we want it to use.

4.  Create a `vue.config.js` file in the project root directory and add the following to it.

    ```js
    module.exports = {
      chainWebpack: config => {
        config.module
          .rule('ts')
          .use('ts-loader')
          .loader('ts-loader')
          .tap(options => {
            options.configFile = 'tsconfig.vue.json';
            return options;
          });
      }
    };
    ```

    Webpack configuration is essentially defined as a series of **rules** based on file types. Each rule has its own options that tell Webpack what to do with matching files. In the `vue.config.js` above we're using the [`chainWebpack`](https://cli.vuejs.org/guide/webpack.html#chaining-advanced) property to add a configuration rule for `ts` files to Webpack. It uses the `ts-loader` and then calls the `tap()` method (provided by the [`Tapable`](https://webpack.js.org/api/plugins/#tapable) core utility) to inject a additional build step into the Webpack chain. As you can see, we're merely modifying the `configFile` location so `ts-loader` will use `tsconfig.vue.json`, instead of looking for the default `tsconfig.json` file.

5.  With that configuration added let's try running the Vue dev server again.

    ```bash
    $ yarn serve

    App running at:
      Local:   http://localhost:8080/
      Network: http://10.0.75.1:8080/
    ```

    Sure enough, that does the trick and our Vue app is able to compile without any errors.

    {{% notice "tip" %}} The use of Webpack is beyond the scope of this tutorial, but it's a powerful and popular bundler that warrants learning about. Check out the [official documentation](https://webpack.js.org/concepts) for more details. {{% /notice %}}

## Dropping Dgraph Data

With our Gulp ready to go we can start implementing some business logic into `DgraphAdapter` so it can establish a connection with Dgraph and perform some transactions.

1.  The first thing we want to do is clean out our Dgraph database so we're starting fresh, so let's open the `src/dgraph/DgraphAdapter.ts` file and add a new `dropAll()` method to the class.

    ```ts
    export class DgraphAdapter {
      // ...
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
      // ...
    }
    ```

    This method is rather simple. We're invoking the `alter()` method of the `DgraphClient` instance and passing an argument object of `{ dropAll: true}`, which sends a request to Dgraph to drop all data. We then check the payload result for a `data.code` property indicating a success, otherwise we assume failure.

2.  Open `gulpfile.ts` and let's add the `db:drop` task with the following code.

    ```ts
    import gulp from 'gulp';
    import { DgraphAdapter } from './src/dgraph/DgraphAdapter';

    gulp.task('db:drop', () => {
      try {
        return new DgraphAdapter().dropAll();
      } catch (error) {
        throw error;
      }
    });
    ```

    Gulp allows us to create **tasks** that can then be executed individually, or in combined series with other Gulp tasks. Here we just create an anonymous function that is executed when the `db:drop` Gulp task is invoked. In this function we return the result of our `DgraphAdapter` instance's `dropAll()` method.

    {{% notice "tip" %}} Gulp tasks expect the result of their function call to be a `Promise`, which is what Gulp uses to determine when a given task has completed. In this case, the `DgraphAdapter.dropAll()` method is `async`, which returns a `Promise` by default (though, since we're using TypeScript, we also explicitly specified the return type of `Promise<boolean>`). Check out the [official website](https://gulpjs.com/) for more information on using Gulp and creating custom tasks. {{% /notice %}}

3.  Save the `gulpfile.ts` changes and execute the `db:drop` Gulp task with the following command.

    ```bash
    $ gulp db:drop
    [21:56:56] Requiring external module ts-node/register
    [21:56:58] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
    [21:56:58] Starting 'db:drop'...
    All Dgraph data dropped.
    [21:56:58] Finished 'db:drop' after 438 ms
    ```

    If all goes well you should see Gulp's output similar to the above, indicating that the `db:drop` task executed and that Dgraph data was dropped. You can open the [Dgraph Ratel web UI](http://localhost:8000/?latest) to confirm this is the case. Just navigate to the **Schema** tab and you should see only the default schema predicate entries (which begin with `dgraph.` prefixes).

    {{% notice "info" %}} If you receive a connection error indicating Dgraph is unavailable, double-check that the `DgraphAdapter.address` property matches the Dgraph Alpha server URL in which you have Dgraph installed and running at. {{% /notice %}}

## Adding Environment Variables

Speaking of the Dgraph Alpha server address, it's rather inconvenient to have to manually edit the static URL within the `DgraphAdapter.address` property anytime the Dgraph server changes, so let's remedy this (and many future configuration headaches) by quickly adding environment variable support to our app.

1.  Start by installing the [dotenv](https://www.npmjs.com/package/dotenv) package from NPM.

    ```bash
    yarn add dotenv @types/dotenv
    ```

    This package allows us to create `.env` files in the project root directory that initialize environment variables.

2.  Create a new `.env` file in the project root directory.
3.  Add the following entry to the `.env` file, changing the URL to match your particular setup.

    ```env
    DGRAPH_ALPHA_URL=http://localhost:8080
    ```

4.  Let's add support for this new environment variable in `src/dgraph/DgraphAdapter`. Open that file and default `address` property value to `process.env.DGRAPH_ALPHA_URL`.

    ```ts
    export class DgraphAdapter {
      public address = process.env.DGRAPH_ALPHA_URL;
      // ...
    }
    ```

5.  Now we need to bootstrap the `dotenv` configuration by calling its `config()` method, ideally before the rest of our application executes. Since we have Gulp tasks that are run separately from our Vue app we need to add the bootstrap code at the top of two files: `gulpfile.ts` and `src/main.ts`.

    ```ts
    import dotenv from 'dotenv';
    dotenv.config();
    import gulp from 'gulp';
    import { DgraphAdapter } from './src/dgraph/DgraphAdapter';

    gulp.task('db:drop', () => {
      try {
        return new DgraphAdapter().dropAll();
      } catch (error) {
        throw error;
      }
    });
    ```

    ```ts
    import dotenv from 'dotenv';
    dotenv.config();
    import Vue from 'vue';
    import App from './App.vue';
    import router from './router';
    import store from './store';

    Vue.config.productionTip = false;

    new Vue({
      router,
      store,
      render: h => h(App)
    }).$mount('#app');
    ```

    Any values we add to the `.env` file will now be available in the `process.env` object throughout our app.

6.  With `DgraphAdapter` updated to use our env variable let's test out that our `gulp db:drop` command works.

    ```bash
    $ gulp db:drop
    [22:08:28] Requiring external module ts-node/register
    [22:08:29] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
    [22:08:29] Starting 'db:drop'...
    All Dgraph data dropped.
    [22:08:30] Finished 'db:drop' after 424 ms
    ```

    It should work just as well as before, but now we're not using a static Dgraph Alpha server URL. This will come in handy throughout the app creation process.

## Altering the Dgraph Schema

Now that we can drop data let's alter the schema. As we'll see shortly, it isn't technically necessary to initially generate a schema for Dgraph data since Dgraph will generate predicates for us on the fly. However, we'll probably want to specify at least some predicate schema later on so we can enable additional Dgraph features such as indexing.

1.  Start by opening `src/dgraph/DgraphAdapter.ts` and adding the new `alterSchema()` method.

    ```ts
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
    ```

    This method accepts a new schema `string` and performs an alteration using said schema.

2.  Now go back to the `gulpfile.ts` and let's add a new `db:schema:alter` task.

    ```ts
    gulp.task('db:schema:alter', () => {
      try {
        return new DgraphAdapter().alterSchema(DGRAPH_SCHEMA);
      } catch (error) {
        throw error;
      }
    });
    ```

3.  This task passes an undefined `DGRAPH_SCHEMA` value, so let's initialize that at the top of the `gulpfile.ts`.

    ```ts
    const DGRAPH_SCHEMA = `
    createdAt: dateTime @index(hour) .
    description: string @index(fulltext) @count .
    email: string @index(exact) @upsert .
    name: string @index(hash) @count .
    `;
    ```

    A Dgraph schema defines the data **type** for each given **predicate** using a `predicate: type [@directive(s)]` format. Here we're adding 4 **predicates,** each with an [`index` **directive**](https://docs.dgraph.io/query-language/#indexing). The specifics don't matter for the moment, as we're just using this to test that we're able to alter the schema, so we can update this later as we build out the app.

4.  Our Gulp task is ready so let's try it out.

    ```bash
    $ gulp db:schema:alter
    [01:23:26] Requiring external module ts-node/register
    [01:23:27] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
    [01:23:27] Starting 'db:schema:alter'...
    Dgraph schema altered.
    [01:23:27] Finished 'db:schema:alter' after 77 ms
    ```

    Everything looks good from the console. We can confirm the schema was altered by checking the **Schema** tab of the [Ratel web UI](http://localhost:8000). We should now see the four new predicates, in addition to the baseline `dgraph.` predicates.

    ![Ratel Schema tab](/images/alter-schema.png)

## Adding Dgraph Mutations

The next milestone to add to our app is the ability to perform [mutations](https://docs.dgraph.io/mutations/) within Dgraph. This will allow our app to add or remove data using a simple JSON format.

1.  Open `src/dgraph/DgraphAdapter.ts` and add a `MutationTypes` enum at the top, which we'll use to help us differentiate which type of mutation we're performing.

    ```ts
    export enum MutationTypes {
      DeleteJson,
      SetJson
    }
    ```

2.  Now let's create the `DgraphAdapter.mutate()` method, which will accept a `request` payload, perform the type of mutation we need, and potentially return an `Array` of `uid` values that were created.

    ```ts
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
    ```

    The `mutate` method accepts an object argument with a `request` property which contains the JSON we're mutating. We create a new transaction and instantiate a new `Mutation` object that [comes from `dgraph-js-http`](https://github.com/dgraph-io/dgraph-js-http/blob/master/src/types.ts#L22). This object also shows that it can accept either a `setJson` or `deleteJson` property, which informs `dgraph-js-http` whether we're adding or removing data. The optional `commitNow` property is used to tell Dgraph whether to immediately commit the mutation or not, so we use the passed `commitNow` parameter to alter that behavior.

    After committing the mutation we `.map` the results from the `Assigned` object to the returned `uids` array.

3.  Back in the `gulpfile.ts` let's add a new `db:mutate:test` task to test our new `DgraphAdapter.mutate()` method.

    ```ts
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
    ```

    This Gulp task creates a plain object for our request and passes it to the `request` property of the `mutate()` argument.

4.  Finally, execute the `gulp db:mutate:test` command from a terminal.

    ```bash
    $ gulp db:mutate:test
    [16:54:15] Requiring external module ts-node/register
    [16:54:16] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
    [16:54:16] Starting 'db:mutate:test'...
    [ '0x4ce7d' ]
    [16:54:16] Finished 'db:mutate:test' after 53 ms
    ```

    Sure enough, this works just as expected and the awaited `result` is a `string[]` containing the list of newly-generated `uid` values in Dgraph. Since we only added a single node, we only receive a single `uid` in return. Regardless, we know `DgraphAdapter.mutate()` is ready to go. Time to move onto querying for existing data!

## Querying Dgraph

To perform a Dgraph query we once again need to create a new transaction and pass our query string (and optional arguments) to retrieve some data. We'll add the `query()` method to our `DgraphAdapter` class to help with this.

1.  Open `src/dgraph/DgraphAdapter.ts` and add the following `query` method.

    ```ts
    public async query<T>(query: string, vars?: object): Promise<any> {
      const transaction = this.client.newTxn();
      let result;
      try {
        // Reduce optional vars to string values only.
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
    ```

    Similar to our other `DgraphAdapter` helper methods, `query()` creates a transaction, then passes our `query` string to the `Txn.query()` or `Txn.queryWithVars()` method, depending if we've provided optional `vars` arguments. We extract the resulting data and return that result.

2.  Let's add a simple Gulp task to help test out our queries as well. Inside `gulpfile.ts` add the `db:query:test` task seen below.

    ```ts
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
    ```

    Here we're defining our first [GraphQL+- query](https://docs.dgraph.io/query-language/) string, so let's take a moment to break down the components of the query.

    - `user` is a user-defined and completely arbitrary name for the query block we're defining. Since we're looking at a user record of sorts, a name of `user` seems appropriate.
    - `func: eq(email, "alice@example.com")` - [GraphQL+- functions](https://docs.dgraph.io/query-language/#functions) allow us to filter the results based on specified arguments, such as predicate values. In this case the [`eq` function](https://docs.dgraph.io/query-language/#inequality) accepts a **predicate** and a **value** argument, and filters nodes in which that predicate value _equals_ the passed **value** argument. Therefore, here we're filtering for nodes where the `email` predicate equals `alice@example.com`.
    - `uid` is a special predicate type that is automatically generated and added to every node and uniquely identifies it. While typically represented in base 16 format the underlying value of a `uid` is a `uint64`.
    - `expand(_all_)` - The `expand()` function is a special function that can be used to expand all child predicates passed to it. The `_all_` keyword is a shortcut that stands in for _all_ predicates, so `expand(_all_)` just tells Dgraph to expand and include every child predicate at that level of the node. As you can see above, such blocks can be chained together, so we can expand within another expansion as often as needed.

    {{% notice "tip" %}} Dgraph will ignore extra spacing around the query, so the formatting above is just for readability purposes. That same query could be written in a single line and would function just the same: `{user(func:eq(email,"alice@example.com")){uid expand(_all_) {uid expand(_all_)}}}`. You can learn much more about GraphQL+- query syntax in the [official documentation](https://docs.dgraph.io/design-concepts/#queries). {{% /notice %}}

3.  With our new `gulp db:query:test` task setup let's finally test it out.

    ```bash
    $ gulp db:query:test
    [17:18:27] Requiring external module ts-node/register
    [17:18:28] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
    [17:18:28] Starting 'db:query:test'...
    { user:
      [ { uid: '0x4ce7d',
          email: 'alice@example.com',
          description: 'Hello, this is Alice!',
          createdAt: '2019-04-17T00:15:02.538Z',
          name: 'Alice Jones' } ] }
    [17:18:28] Finished 'db:query:test' after 41 ms
    ```

    Awesome, everything works as expected. We can see that the returned result is a JavaScript `Object` that contains our arbitrary `user` property, which is assigned to an array of objects containing the resulting nodes that matched our query filter. Since our data set only contains a single matching node, only one was returned, but the nature of this data structure allows Dgraph to return arbitrarily-sized data based on the query results.

## Reddit Data Dump

We'll be using data dumps that come directly from Reddit and are provided by the `pushshift.io` project, which can be found [here](http://files.pushshift.io/reddit/). There are a number of subcategories for the data that is available, but this tutorial will be focusing on just two categories: **comments** and **submissions.** If you're familiar with Reddit, every top-level post is a submission, and then each submission can contain many child comments in response to that submission. Therefore, these two types of data will cover the majority of the information seen on the actual Reddit site.

Since these data sets start to get quite huge, we'll just use a small sampling to popular our initial app data. We'll grab daily dumps of both comments and submissions from two arbitrary dates of `2018-02-01` and `2018-02-02`.

- RC_2018-02-01: http://files.pushshift.io/reddit/comments/daily/RC_2018-02-01.xz
- RC_2018-02-02: http://files.pushshift.io/reddit/comments/daily/RC_2018-02-02.xz
- RS_2018-02-01: http://files.pushshift.io/reddit/submissions/daily/RS_2018-02-01.xz
- RS_2018-02-02: http://files.pushshift.io/reddit/submissions/daily/RS_2018-02-02.xz

1.  Create a `src/data` directory and navigate into it.

    ```bash
    mkdir data && cd data
    ```

2.  Execute the following curl commands (or whatever downloader you prefer) to grab the submission and comment data sets.

    ```bash
    curl -O http://files.pushshift.io/reddit/submissions/daily/RS_2018-02-01.xz && curl -O http://files.pushshift.io/reddit/submissions/daily/RS_2018-02-02.xz
    curl -O http://files.pushshift.io/reddit/comments/daily/RC_2018-02-01.xz && curl -O http://files.pushshift.io/reddit/comments/daily/RC_2018-02-02.xz
    ```

3.  Once downloaded, extract the archived contents with the `unxz *.xz` command, which will unzip all `.xz` files in the current directory.

    ```bash
    unxz *.xz
    ```

    {{% notice "info" %}} These files are approximately `6GB` in total size after decompression, so make sure you have appropriate disk space prior to this step. {{% /notice %}}

    With the data extracted we can start adding it to Dgraph.

## Adding Reddit Data to Dgraph

If you look at the content of one of the `RS_` or `RC_` Reddit data dump files, you'll see they are in single-line JSON format.

```json
{
  "archived": false,
  "author": "transcribersofreddit",
  "author_flair_css_class": null,
  "author_flair_text": "Official Bot",
  "brand_safe": false,
  "contest_mode": false,
  "created_utc": 1517443200,
  "distinguished": null,
  "domain": "reddit.com",
  "edited": false,
  "gilded": 0,
  "hidden": false,
  "hide_score": false,
  "id": "7ueit6",
  "is_crosspostable": false,
  "is_reddit_media_domain": false,
  "is_self": false,
  "is_video": false,
  "link_flair_css_class": "unclaimed",
  "link_flair_text": "Unclaimed",
  "locked": false,
  "media": null,
  "media_embed": {},
  "no_follow": true,
  "num_comments": 1,
  "num_crossposts": 0,
  "over_18": false,
  "parent_whitelist_status": null,
  "permalink": "/r/TranscribersOfReddit/comments/7ueit6/toomeirlformeirl_image_toomeirlformeirl/",
  "pinned": false,
  "retrieved_on": 1520467337,
  "score": 1,
  "secure_media": null,
  "secure_media_embed": {},
  "selftext": "",
  "send_replies": true,
  "spoiler": false,
  "stickied": false,
  "subreddit": "TranscribersOfReddit",
  "subreddit_id": "t5_3jqmx",
  "subreddit_type": "public",
  "suggested_sort": null,
  "thumbnail": "default",
  "thumbnail_height": 140,
  "thumbnail_width": 140,
  "title": "TooMeIrlForMeIrl | Image | \"TooMeIrlForMeIrl\"",
  "url": "https://reddit.com/r/TooMeIrlForMeIrl/comments/7ueit3/toomeirlformeirl/",
  "whitelist_status": null
}
```

As we already saw above, Dgraph's GraphQL+- engine can accept JSON data within mutations, so we just need to create a helper function that can efficiently extract this data and push it to a Dgraph mutation. However, as discussed these are rather large files, so we cannot simply load them into memory and try reading their content. The solution? We'll be using [Node Streams](https://nodejs.org/api/stream.html)!

A stream in Node is a rather abstract concept that is used throughout the standard library. Conceptually, a stream is a collection of data similar to an array or object, with one major caveat: Stream data is _temporal_ since it mutates over time. So, in the case of reading the data from our 2+ GB file, we don't have to read it all at once and hold the data in memory, but we'll instead use a stream that will slowly trickle the data in over time in chunks, which we'll then process as needed.

{{% notice "tip" %}} An in-depth guide to Node streams is far beyond the scope of this tutorial, so you might check out some great resources such as [Node Beyond Basics: Streams](https://jscomplete.com/learn/node-beyond-basics/node-streams) and the [Node Stream official docs](https://nodejs.org/api/stream.html#stream_stream). {{% /notice %}}

1.  We'll start by installing the `event-stream` library, which is an extremely popular collection of helper methods for working with Node streams.

    ```bash
    yarn add event-stream && yarn add -D @types/event-stream
    ```

    In this case, we'll be using `event-stream` to split our data by line and format it into JSON objects before we manipulate it with custom code. We'll also be using [`cli-progress`]() to create a progress bar.

2.  Next, open the `src/dgraph/DgraphAdapter.ts` file and add the following `mutateFromStream` method.

    ```ts
    import es from 'event-stream';
    import * as CliProgress from 'cli-progress';
    // ...
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
    ```

    To see what the `mutateFromStream` method is doing start down at the `return new Promise()` line, which begins the process of asynchronously reading data from a `ReadStream` object. As mentioned above, we use `event-stream's` `split()` and `parse()` methods here to first split our data stream by line (the default), then parse that data into a JSON object.

    Each chunk of data passed to the `on('data', ...)` event is a regular JavaScript object. Each data object is added to the `batch` array. We then check if the total number of records processed exceeds the `limit` threshold, in which case we destroy the stream immediately. The `limit` parameter can be used to process a certain number of objects from our data stream, which is useful when dealing with massive data sets like the Reddit dump files. Calling the `.destroy()` method of a `ReadStream` object invokes the `end` event (which we aren't handling) and the `close` event.

    If the current `batch` size equals the `batchSize` parameter (or if the stream is closing and `batch` still contains data) we invoke the `syncMutation` function and await the result. `syncMutation` _synchronously_ pushes the `batch` data to Dgraph via the `DgraphAdapter.mutate` method. It's critical that we explicitly pause the stream while `awaiting` the mutation result, in order to avoid race conditions and prevent building up back pressure (i.e. reading data faster than our Dgraph consumer can process it). Once a `batch` of data has been mutated and a response is receieved we reset the `batch` collection and `resume` the stream as before.

    It's also important to note that the stream always invokes the `close` method at the end of its lifecycle, whether we `.destroy()` it for reaching our record limit, or because it simply processed all available stream data. Thus, we perform a final cleanup in case `batch` contains any extra records that weren't processed within a `batchSize` chunk.

3.  Now that we've got the `mutateFromStream` method we can test it out within a Gulp task. Before we do, however, let's add the command line argument parsing library [minimist](https://github.com/substack/minimist).

    ```bash
    yarn add minimist && yarn add -D @types/minimist
    ```

    This library provides some convenience for reading and handling additional arguments passed to terminal commands, such as Gulp tasks. This will allow us to dynamically provide arguments for `mutateFromStream`, so we can adjust the `batchSize` and `limit`, for example.

4.  In `gulpfile.ts` add the new `db:generate:data` task using the code below.

    ```ts
    gulp.task('db:generate:data', async () => {
      try {
        const args = minimist(process.argv.slice(3), {
          default: {
            batchSize: 250,
            limit: 1000,
            path: './src/data/RS_2018-02-01'
          }
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
    ```

    Here we're creating a `ReadStream` from the `2018-02-01` Reddit submissions data set and then generating an `options` object that contains our `stream` instance. We also specify the `batchSize`, `limit`, and `path` properties, all of which receive default values using the `minimist` library. The `path` property is used to create the `ReadStream`, while the other arguments are passed to `DgraphAdapter.mutateFromStream()`.

5.  Let's test it out by running `gulp db:generate:data` from the command line.

    ```bash
    $ gulp db:generate:data
    [21:47:07] Requiring external module ts-node/register
    [21:47:08] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
    [21:47:08] Starting 'db:generate:data'...
    ████████████████████████████████████████ 100% | Elapsed: 3s | ETA: 0s | 5000/5000 records
    Stream closed, processed 1000 out of 1000 records.
    [21:47:11] Finished 'db:generate:data' after 3.42 s
    ```

    The output should look something like the above. During progression you should notice that the record count is properly increasing by the `batch.length` size of `250`, which means our code is aggregating an `Array` of `250` objects read from the `data` stream event prior to performing a `DgraphAdapter.mutate()` call. We can also see that we're correctly processing only the `limit` number of records (`1000`, by default) before the stream is destroyed and closed.

6.  Let's also confirm that we can override the default `batchSize` and `limit` parameters by providing matching `--arguments` to the `gulp db:generate:data` command. Let's try a `batchSize` of `123` and a `limit` of `2000`

    ```bash
    $ gulp db:generate:data  --batchSize 123 --limit 2000
    [21:52:07] Requiring external module ts-node/register
    [21:52:08] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
    [21:52:08] Starting 'db:generate:data'...
    ████████████████████████████████████████ 100% | Elapsed: 7s | ETA: 0s | 5000/5000 records
    Stream closed, processed 2000 out of 2000 records.
    [21:52:42] Finished 'db:generate:data' after 7.82 s
    ```

    Awesome, both our argument overrides are working as expected. The last thing to do is confirm that the data is showing up in Dgraph as expected.

7.  Open up the Ratel UI (http://localhost:8000/?latest), navigate to **Console > Query** and run the following query. We're explicitly filtering out the, well, explicit content from the query below to ensure this is safe for work, but feel free to remove those filters throughout the tutorial if you want to ensure everything is as accurate as possible.

    ```js
    {
      data(func: has(author), first: 10) @filter(eq(over_18, false)) {
        uid
        expand(_all_) {
          uid
          expand(_all_)
        }
      }
    }
    ```

    You should see a list of the first `10` submissions that contain an `author` predicate.

{{% notice "tip" %}} You can also execute GraphQL+- queries directly from this tutorial within the runnable boxes like the one seen below. If your Dgraph install is located at the default location they should work out of the box, but feel free to alter the Dgraph URL to match your own setup. {{% /notice %}}

<!-- prettier-ignore-start -->
{{< runnable >}}
{
  data(func: has(author), first: 10) @filter(eq(over_18, false)) {
    uid
    expand(_all_) {
      uid
      expand(_all_)
    }
  }
}
{{< /runnable >}}
<!-- prettier-ignore-end -->

Alright, we can improve our import capabilities later on if needed, but for now the `DgraphAdapter.mutateFromStream` and `gulp db:generate:data` task work well to efficiently import data from our Reddit data dump sources, so we can move onto implementing our front-end Vue components to use that data!

### Set Dgraph Schema

Before we add a great deal of data we should take this opportunity to setup a real Dgraph schema so certain predicates are indexed.

1.  Let's start by creating a new file at `src/dgraph/DgraphSchema.ts` and paste the following into it.

    ```ts
    export const DgraphSchema = {
      Comment: `
        author: string @index(hash) @count .
        author_flair_css_class: string @index(hash) .
        author_flair_text: string @index(hash) .
        body: string @index(hash, fulltext) .
        can_gild: bool @index(bool) @count .
        controversiality: int @index(int) @count .
        created_utc: dateTime @index(day) .
        distinguished: string @index(hash) @count .
        edited: bool @index(bool) @count .
        gilded: int @index(int) @count .
        id: string @index(hash) @count .
        is_submitter: bool @index(bool) @count .
        link_id: string @index(hash) @count .
        parent_id: string @index(hash) @count .
        permalink: string @index(hash) .
        retrieved_on: dateTime @index(day) .
        score: int @index(int) @count .
        stickied: bool @index(bool) @count .
        subreddit: string @index(hash) .
        subreddit_id: string @index(hash) .
        subreddit_type: string @index(hash) .
      `,
      Post: `
        archived: bool @index(bool) @count .
        author: string @index(hash) @count .
        brand_safe: bool .
        contest_mode: bool @index(bool) @count .
        created_utc: dateTime @index(day) .
        domain: string @index(hash) .
        edited: bool @index(bool) @count .
        gilded: int @index(int) @count .
        hidden: bool @index(bool) @count .
        hide_score: bool @index(bool) @count .
        id: string @index(hash) .
        is_crosspostable: bool @index(bool) @count .
        is_reddit_media_domain: bool @index(bool) .
        is_self: bool @index(bool) @count .
        is_video: bool @index(bool) @count .
        locked: bool @index(bool) @count .
        no_follow: bool @index(bool) @count .
        num_comments: int @index(int) .
        num_crossposts: int @index(int) .
        over_18: bool @index(bool) @count .
        parent_whitelist_status: string .
        permalink: string @index(hash) .
        pinned: bool @index(bool) .
        post_hint: string @index(hash) .
        preview: uid @count @reverse .
        retrieved_on: dateTime @index(day) .
        score: int @index(int) .
        selftext: string @index(hash, fulltext) .
        send_replies: bool @index(bool) @count .
        spoiler: bool @index(bool) @count .
        stickied: bool @index(bool) @count .
        subreddit: string @index(hash) .
        subreddit_id: string @index(hash) .
        subreddit_type: string @index(hash) .
        thumbnail: string @index(hash) .
        title: string @index(hash, fulltext) .
        url: string @index(hash) .
        whitelist_status: string @index(hash) .
      `
    };
    ```

    We've split the schema into two groups to represent both `Comment` and `Post` nodes. It's worth noting that a handful of the predicates used are shared across both types, but that's a major advantage to a graph database: We don't have to explicitly differentiate between each predicate based on what other predicates it is associated with for a given node. For example, the `subreddit` predicate is used in comment and post nodes, but Dgraph will intelligently associate the `subreddit` predicate value with whatever node we're looking at.

2.  Open up the `gulpfile.ts` and delete the `const DGRAPH_SCHEMA` schema declaration at the top and replace it with an `import` for the exported `DgraphSchema` constant above.

    ```ts
    import { DgraphSchema } from './src/dgraph/DgraphSchema';
    ```

3.  Also in `gulpfile.ts` we need to adjust the `db:schema:alter` Gulp task to use both schema strings we specified in the other file.

    ```ts
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
    ```

    Since `DgraphAdapter.alterSchema()` returns a `Promise` we can use the [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) method and pass it a collection of promises. This ensures that the `db:schema:alter` task only completes after the database has been updated using both schema sets.

4.  Now drop existing data and then update the schema with the `db:schema:alter` command.

    ```bash
    gulp db:drop
    gulp db:schema:alter
    ```

### Regenerate Full Data Set

With our schema setup we can now add some significant data to the system that our Vue app can work with. The following commands will add `10,000` submissions and `50,000` comments from the exported Reddit data sets, but feel free to adjust the `limit` to suit your needs.

```bash
gulp db:generate:data --limit 5000 --path ./src/data/RS_2018-02-01 && gulp db:generate:data --limit 5000 --path ./src/data/RS_2018-02-02
gulp db:generate:data --limit 25000 --path ./src/data/RC_2018-02-01 && gulp db:generate:data --limit 25000 --path ./src/data/RC_2018-02-02
```

This may take a couple minutes to complete, but once that's done you'll have a decently-sized data set to work with for the remainder of the tutorial.

```bash
[22:12:16] Requiring external module ts-node/register
[22:12:18] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
[22:12:18] Starting 'db:generate:data'...
████████████████████████████████████████ 100% | Elapsed: 22s | ETA: 0s | 5000/5000 records
Stream closed, processed 5000 out of 5000 records.
[22:12:40] Finished 'db:generate:data' after 22 s
[22:12:41] Requiring external module ts-node/register
[22:12:42] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
[22:12:42] Starting 'db:generate:data'...
████████████████████████████████████████ 100% | Elapsed: 24s | ETA: 0s | 5000/5000 records
Stream closed, processed 5000 out of 5000 records.
[22:13:06] Finished 'db:generate:data' after 24 s
[22:13:07] Requiring external module ts-node/register
[22:13:08] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
[22:13:08] Starting 'db:generate:data'...
████████████████████████████████████████ 100% | Elapsed: 42s | ETA: 0s | 25000/25000 records
Stream closed, processed 25000 out of 25000 records.
[22:13:50] Finished 'db:generate:data' after 42 s
[22:13:51] Requiring external module ts-node/register
[22:13:53] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
[22:13:53] Starting 'db:generate:data'...
████████████████████████████████████████ 100% | Elapsed: 1m3s | ETA: 0s | 25000/25000 records
Stream closed, processed 25000 out of 25000 records.
[22:14:56] Finished 'db:generate:data' after 1.03 min
```

## Working with Vue

Now that our Dgraph connection is established and we've seeded the database with some initial data it's time to start creating our front-end application pages via Vue.  We'll start by creating the most basic component of a Reddit-like app: the **Post** list.  Below is a rough sketch of what that component should look like when we've created it in HTML and CSS.

![Post List Mockup](/images/PostList-mockup@2x.png)

To help us out we'll use a Vue framework based on Google's [Material Design](https://material.io/design/) specifications called [Vuetify](https://vuetifyjs.com/en/).  Like other front-end frameworks, it provides some out-of-the-box CSS and custom HTML elements we can use to create our app.

### Configuring Vuetify

1.  Add the [Vuetify](https://vuetifyjs.com/en/) material design framework via `Vue CLI`.

    ```bash
    vue add vuetify
    ```

    If you get an error while trying to install the plugin with default settings due to large files in the `src/data` directory try adding `src/data` to your `.gitignore`, then run the Vuetify installer again and select manual configuration using the following settings.

    ```
    ? Choose a preset: Configure (advanced)
    ? Use a pre-made template? (will replace App.vue and HelloWorld.vue) No
    ? Use custom theme? No
    ? Use custom properties (CSS variables)? No
    ? Select icon font Material Icons
    ? Use fonts as a dependency (for Electron or offline)? No
    ? Use a-la-carte components? Yes
    ? Select locale English
    ```

2.  After the install completes edit the `src/plugins/vuetify.ts` file that was automatically added and change the line `import Vuetify from 'vuetify/lib';` to `import Vuetify from 'vuetify';`.

    ```ts
    import Vue from 'vue';
    import Vuetify from 'vuetify';
    import 'vuetify/src/stylus/app.styl';

    Vue.use(Vuetify, {
      iconfont: 'md',
      options: {
        customProperties: true
      },
      theme: {
        primary: '#f96315',
        secondary: '#29b6f6',
        accent: '#ffc046',
        info: '#73e8ff',
        warning: '#c17900',
        error: '#d32f2f',
        success: '#43a047'
      }
    });
    ```

    As of the time of writing there is currently a small bug with TypeScript and the Vuetify plugin installation when trying to access the direct `/lib` directory (types declarations cannot be found). The above change fixes that issue.

    As seen above, we also are overriding the default `theme` property to specify some custom colors, but feel free to play around with those values to get a look you prefer.  The `options.customProperties` value of `true` will allow us to explicitly use CSS properties generated by Vuetify throughout the application, so we can reference theme colors and the like within component CSS.

    You can also opt to use pre-defined colors by adding `import colors from 'vuetify/es5/util/colors';` to the top of the file, then referencing those colors within the custom `theme` property.

3.  It should be added automatically, but make sure the `src/main.ts` imports this new `src/plugins/vuetify.ts` file _after_ the `Vue` import.

    ```ts
    import Vue from 'vue';
    import './plugins/vuetify';
    ```

4.  Finally, open the `public/index.html` file and make sure the following stylesheet links exist, which will import the **Roboto** font and the **Material Icons** set for us.

    ```html
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <!-- ... -->
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Material+Icons"
        />
      </head>
      <!-- ... -->
    </html>
    ```

    With that, Vuetify should be setup and ready for use as we start creating our own components.

### Post Component

Since we're using TypeScript we gain some benefits of using class-based components within Vue.  We can combine the [`vue-class-component`](https://github.com/vuejs/vue-class-component) library with the [`vue-property-decorator`](https://github.com/kaorun343/vue-property-decorator) library to dramatically reduce the lines of code required in our components by using assorted decorators.

{{% notice "tip" %}} We'll be using [Single File Vue Components](https://vuejs.org/v2/guide/single-file-components.html) throughout this project, which provide a number of benefits over globally defined components by placing all the HTML, CSS, and JavaScript for a given component within a single `.vue` file.  The biggest advantage for us is separation of concerns, so each component is self-contained and can be used anywhere we need it throughout the app.   Check out the [official documentation](https://vuejs.org/v2/guide/single-file-components.html) for far more details on Single File Components. {{% /notice %}}

1.  Start by installing both the `vue-class-component` and `vue-property-decorator` libraries.

    ```bash
    yarn add vue-class-component vue-property-decorator
    ```

2.  Create a new `src/components/Post.vue` file and add the following template outline.

    ```vue
    <template></template>

    <script lang="ts">
    import { Component, Prop, Vue } from 'vue-property-decorator';

    @Component
    export default class Post extends Vue {
      @Prop() private id!: string;
    }
    </script>

    <style scoped lang="scss"></style>
    ```

    These three sections are what makeup a `.vue` single file component.  The top section contains the HTML template, the middle contains the JavaScript, and the bottom contains the CSS styling.  As you can see, by adding the `lang="ts"` property to the `<script>` element we can tell our editor and parser that we're using TypeScript.  Similarly, the `lang="scss"` tells the parser our styling will use [Sass](https://sass-lang.com/).

    {{% notice "tip" %}} [Sass](https://sass-lang.com/) is a mature and powerful CSS extension that works with any normal CSS, but provides a number of useful features such as variables, nesting, and mixins.  Check out the [full guide](https://sass-lang.com/guide) for more information on using Sass. {{% /notice %}}

    The `@Component` decorator that precedes our `Post` class declaration is provided by the `vue-class-component` library.  It allows us to define parts of our component more succinctly than normal.  For example, a normal Vue component would register state `data` by returning an object with child properties.  

    ```ts
    export default {
      data () {
        return {
          id: 1234,
          name: 'Alice'
        }
      },
      // ...
    }
    ```

    Similarly, **computed** properties that provide complex logic to otherwise normal component properties are defined within a `computed` object.

    ```ts
    export default {
      computed: {
        lowercaseName () {
          return this.name.toUpperCase();
        }
      },
      // ...
    }
    ```

    However, with the `@Component` decorator on a Vue class component we can simplify `data` and `computed` property declarations.

    ```ts
    @Component
    export default class extends Vue {
      id = 1234;
      name = 'Alice';

      get lowercaseName () {
        return this.name.toUpperCase();
      }
    }
    ```

    As you can see, `data` properties are now defined by declaring class members and `computed` properties are class getter methods!  Generally, most aspects of Vue component definitions are simplified through the use of `vue-class-decorator` and `vue-property-decorator`.

#### Post Component HTML

Since we'll be reusing the `Post.vue` component we want to define the HTML so it looks like a single row from our Post List mockup image.

![Post List Mockup](/images/PostList-mockup@2x.png)

We'll be using [Vuetify's grid system](https://vuetifyjs.com/en/framework/grid), which is based on the standard CSS [flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout/Basic_Concepts_of_Flexbox).  This allows us to split our layout into a series of responsive columns (12 of them in this case).

1.  We'll start by adding the `<v-layout>` element within the root `<template>` element.

    ```html
    <template>
      <v-layout class="post" row wrap my-2>
      </v-layout>
    </template>
    ```

    The grid system uses a progressive series of elements:

    - `<v-container>` - The base element of a grid system.  Should contain one or more `<v-layout>` elements.
    - `<v-layout>` - Similar to a `<v-container>`, but multiple `<v-layout>` can exist within a single `<v-container>`, providing the ability for grids _within_ other grids.
    - `<v-flex>` - The "content holder" element of a grid.  The underlying [`flex`](https://developer.mozilla.org/en-US/docs/Web/CSS/flex) CSS property of a `<v-flex>` is set to `1`, which means a series of `<v-flex>` elements will attempt to responsively fill out the space they are given within their parent `<v-layout>`.

    We'll actually specify the parent `<v-container>` element in another component further up the chain, since we don't want each individual `Post` element to be a container unto itself.  The `<v-layout>` `row` class ensures we're flexing across rows (not columns).  We also want children to be able to wrap if needed.  Finally, we'll make heavy use of `margin` and/or `padding` throughout this component by using the Vuetify CSS [spacing classes](https://vuetifyjs.com/en/framework/spacing).  So, the `my-2` class translates into `margin: 2px 0;` since we want a 2-pixel margin along the y-axis (top and bottom).

2.  Our `Post` layout has three distinct horizontal sections: Voting, thumbnail image, and post content.  Therefore, we'll split each of those sections into their own `<v-flex>` element.  Let's start by adding the **voting** flexbox.

    ```html
    <template>
      <v-layout class="post" row wrap my-2>
        <v-flex class="votes" xs1 px-1 mx-1>
          <v-icon class="arrow up accentuated">arrow_upward</v-icon>
          <span class="score">1234</span>
          <v-icon class="arrow down accentuated">arrow_downward</v-icon>
        </v-flex>
      </v-layout>
    </template>
    ```

    We're making use of the **Material Icons** pack that is part of the library, in addition to adding some helper classes we'll use later.
    
    {{% notice "info" %}} The `xs1` CSS class helper seen in the `<v-flex>` element above works like many other responsive frameworks.  `xs` is one of Vuetify's [display](https://vuetifyjs.com/en/framework/display) options and it sets a breakpoint for viewports under `600px`.  We don't really want to worry about viewports for this tutorial, so using the `xs` extreme lets us effectively not have a breakpoint to worry about (since all displays should meet that criteria).  The `1` following `xs` is the number of columns our flexbox is spanning.  {{% /notice %}}

3.  Next, let's add another flexbox as a sibling to the `.votes` flexbox with the `.thumbnail` class.

    ```html
    <template>
      <v-layout class="post" row wrap my-2>
        <v-flex class="votes" xs1 px-1 mx-1>
          <v-icon class="arrow up accentuated">arrow_upward</v-icon>
          <span class="score">1234</span>
          <v-icon class="arrow down accentuated">arrow_downward</v-icon>
        </v-flex>
        <v-flex class="thumbnail" xs1 px-1 mx-1>
          <a href="#">
            <v-img
              :src="`https://lorempixel.com/70/70`"
              :lazy-src="`https://dummyimage.com/70x70/f5f5f5/f96515&text=D`"
              aspect-ratio="1"
              height="70"
              width="70"
            />
          </a>
        </v-flex>
      </v-layout>
    </template>
    ```

    We're pulling some placeholder images for now and setting their size to `70x70` pixels.  The special `:lazy-src` `<v-img>` property is helpful when you want to display a temporary image while the full, normal image loads in the background.

4.  Our third flexbox is the `.content` class.

    ```html
    <template>
      <v-layout class="post" row wrap my-2>
        <v-flex class="votes" xs1 px-1 mx-1>
          <v-icon class="arrow up accentuated">arrow_upward</v-icon>
          <span class="score">1234</span>
          <v-icon class="arrow down accentuated">arrow_downward</v-icon>
        </v-flex>
        <v-flex class="thumbnail" xs1 px-1 mx-1>
          <a href="#">
            <v-img
              :src="`https://lorempixel.com/70/70`"
              :lazy-src="`https://dummyimage.com/70x70/f5f5f5/f96515&text=D`"
              aspect-ratio="1"
              height="70"
              width="70"
            />
          </a>
        </v-flex>
        <v-flex class="content" xs10 px-1 mx-1>
          <span class="title">
            <a href="#" class="text--primary"
              >Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent eu
              maximus sem. Aliquam erat volutpat. Aliquam maximus efficitur ligula
              eu vestibulum.</a
            >
            <span class="domain text--secondary caption ml-1 font-weight-bold"
              >(<a href="/r/AskReddit" class="text--secondary accentuated"
                >self.AskReddit</a
              >)</span
            >
          </span>
          <span class="tagline caption">
            submitted 5 hours ago by
            <a class="accentuated" href="/user/JustSomeGuy">JustSomeGuy</a> to
            <a class="accentuated" href="/r/AskReddit">r/AskReddit</a>
          </span>
          <ul class="buttons font-weight-medium">
            <li class="comment">
              <a href="#" class="text--secondary accentuated">75 comments</a>
            </li>
            <li class="share">
              <a href="#" class="text--secondary accentuated">share</a>
            </li>
            <li class="save">
              <a href="#" class="text--secondary accentuated">save</a>
            </li>
            <li class="toggle">
              <a href="#" class="text--secondary accentuated">hide</a>
            </li>
            <li class="award">
              <a href="#" class="text--secondary accentuated">give award</a>
            </li>
            <li class="report">
              <a href="#" class="text--secondary accentuated">report</a>
            </li>
            <li class="crosspost">
              <a href="#" class="text--secondary accentuated">crosspost</a>
            </li>
          </ul>
        </v-flex>
      </v-layout>
    </template>
    ```

    We want the content to take up the majority of the remaining space, so we set the flexbox width to `xs10` to take up 10 out of the 12 total columns.  The `text--primary` and `text--secondary` classes are references to theme CSS properties.  It's helpful to use such classes wherever possible so that we can change the look of the entire app with just a few color changes to the theme.

    We're also playing with the font weighting for a number of elements, just to make things appear more like they do in the actual Reddit.

#### Post Component CSS

Alright, we've got our rough HTML layout but we need to add some additional custom styling beyond the helper classes we used from Vuetify.

Update the `<style></style>` section of `src/components/Post.vue` to look like the following.

```css
<style scoped lang="scss">
.post {
  .votes {
    max-width: 40px;
    text-align: center;

    * {
      display: block;
    }
  }

  .thumbnail {
    max-width: 70px;
  }

  .content {
    a {
      text-decoration: none;
    }

    .buttons {
      display: block;
      list-style-type: none;
      padding: 1px 0;

      li {
        display: inline-block;
        line-height: 1.5em;
        padding-right: 0.33em;
      }
    }

    .title {
      display: block;
      font-weight: bold;
    }
  }
}
</style>
```

We won't go into much detail here since most of this is basic CSS, but it's worth mentioning that the use of Sass lets us _nest_ our CSS selectors.  This means that rules inside `.post { .votes { ... } }` will _only_ apply to `.votes` found within `.post`, but not elsewhere.  It also helps to visually mimic the hierarchical structure found in the HTML.

#### Post Component Script

At this point, we aren't actually implementing any logic into the `Post` component, so the script section can be left as is.  We'll come back to it shortly once we have our layout looking like we want.  For now, let's move up the chain and create the `PostList` component that will use instances of our `Post` component.

### PostList Component

Create a new `src/components/PostList.vue` file and add the following to it.

```vue
<template>
  <v-container grid-list-xs>
    <Post v-for="i of 20" :key="i"></Post>
  </v-container>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Post from '@/components/Post.vue';

@Component({
  components: { Post }
})
export default class PostList extends Vue {
  @Prop() private posts!: Post;
}
</script>

<style scoped lang="scss"></style>
```

As mentioned before, here is where we've added the `<v-container>` element that specifies we want a grid list.  Within that container we're using a [`v-for`](https://vuejs.org/v2/guide/list.html#Mapping-an-Array-to-Elements-with-v-for) loop to render a list of `Post` elements.  Normally `v-for` would be used to render a collection of objects from data, but for testing purposes we're just using a collection of numbers.  As with `React` and other frameworks, we must ensure we pass a unique `:key` property value when iterating through a list.

The script is fairly simple and similar to what we saw in the `Post` component, but we're passing an object to the `@Component` directive and specifying that our `components` property contains the `Post` component.  Now all we have to do is get our app to render the `PostList` component and we'll be in business!

#### Handling Global Sass Variables

We need a convenient way to inject custom CSS throughout the app, which we can do by modifying the CSS Webpack loader.

1.  Create a `src/assets/css/main.scss` file and add the following Sass.

    ```scss
    .accentuated {
      &:hover {
        color: var(--v-accent-base) !important;
      }
    }
    ```

    Notice that we're using the `--v-accent-base` variable, which is generated automatically because we passed `options.customProperties` to the Vuetify declaration in [Configuring Vuetify](#configuring-vuetify).

    We'll use this file for global CSS that we need access to throughout the app. However, in order for `scoped` CSS within a `.vue` file to have access to the global `src/assets/css/main.scss` file we need to modify the Webpack loader `css` settings so it'll import the file automatically.

2.  Open `vue.config.js` and add the following `css: { ... }` property.

    ```js
    module.exports = {
      // ...
      css: {
        loaderOptions: {
          sass: {
            data: `@import "~@/assets/css/main.scss";`
          }
        }
      }
    };
    ```

    Now in the `src/components/Post.vue` component where we use the `accentuated` class we'll see `:hover` effects using the accent base color specified in our Vuetify theme.

    {{% notice "warning" %}} Unfortunately, Vuetify defaults to using the `!important` flag for a number of its generated CSS classes.  Therefore, if you notice custom CSS changes aren't taking affect you may have to resort to adding the `!important` flag to your own CSS rules intended to take precedence. {{% /notice %}}

### Updating the App and Home Components

The default Vue layout looks neat and all, but we obviously need to get rid of that starter stuff so our app functions like we want.

1.  Delete the `src/views/About.vue` file.

    ```bash
    rm src/views/About.vue
    ```

2.  Open `src/App.vue` and change the contents to the following.

    ```html
    <template>
      <v-app>
        <v-navigation-drawer app>
          <router-link to="/">Home</router-link>
        </v-navigation-drawer>
        <v-toolbar app></v-toolbar>
        <v-content>
          <v-container fluid>
            <router-view></router-view>
          </v-container>
        </v-content>
        <v-footer app></v-footer>
      </v-app>
    </template>

    <style lang="scss"></style>
    ```

    This gives us a basic app layout with a navigation bar, a footer, a toolbar, and our primary content section.

3.  Open `src/views/Home.vue` and modify the contents to the following.

    ```vue
    <template>
      <PostList />
    </template>

    <script lang="ts">
    import { Component, Vue } from 'vue-property-decorator';
    import PostList from '@/components/PostList.vue';

    @Component({
      components: {
        PostList
      }
    })
    export default class Home extends Vue {}
    </script>

    <style lang="scss"></style>
    ```

    This should look familiar as the structure is almost identical to what we saw in the `PostList` component.

4.  That's it!  Now just run the dev server with `yarn serve` to launch the updated app.

    ```bash
    yarn serve
    ```

    ![Post List Initial Layout](/images/PostList-initial.png)

    It should look something like the above screenshot.

#### PostList Branch Snapshot

At certain milestones throughout the development there will be branches of the project snapshotted and deployed for public viewing, so you can see the apps current running state in action even if you aren't following along with the code on your machine.

Check out what the app currently looks like at the URL below.

- [Added PostList Branch Snapshot](https://added-postlist.dgraph-reddit.pingpub.dev/)

### Querying Dgraph

Now that our `PostList` component is configured it's time to populate it with actual data from Dgraph.

#### Managing State With the Vuex Library

As is common practice with Vue applications we'll be using the [`vuex` library](https://vuex.vuejs.org/) which provides common statement management patterns similar to those found in React/Redux and the like.  Similar to Redux, Vuex uses a combination of **actions** and **mutations** to perform one-way transactions.  An action never _modifies_ the state and, instead, merely provides instruction for a mutation to perform actual state changes.

{{% notice "tip" %}} This tutorial will cover the basics of Vuex and its state management pattern, but you're encouraged to check out the [official documentation](https://vuex.vuejs.org/) for a lot more information about what Vuex can do. {{% /notice %}}

1.  Vuex will already be installed if you used the same configuration found in [Create a Vue CLI Project](#create-a-vue-cli-project).  However, if not, feel free to add it manually via npm or yarn.

    ```bash
    yarn add vuex
    ```

2.  We're going to store everything about our state management in the `src/state` directory, so create that now if needed.

    ```bash
    mkdir state
    ```

3.  Add the following `import` to your `src/main.ts` file.

    ```ts
    import { store } from '@/state/store';
    ```

    This file will be the entry point for all Vuex store management.

4.  Create the following files within the `src/state` directory.

    - `actions.ts`
    - `index.ts`
    - `mutations.ts`
    - `state.ts`
    - `store.ts`
    - `types.ts`

5.  Open `src/state/store.ts` and add the following code to it.

    ```ts
    import Vuex from 'vuex';
    import Vue from 'vue';
    import { Actions } from '@/state/actions';
    import { Mutations } from '@/state/mutations';
    import { State } from '@/state/state';

    Vue.use(Vuex);

    export const store = new Vuex.Store({
      actions: Actions,
      mutations: Mutations,
      state: State
    });
    ```

    This file instantiates a new `Vuex.Store` instance and sets the three critical properties to exported values that we'll define in a moment.

6.  Open the `src/state/types.ts` file and paste the following into it.

    ```ts
    export const Types = {
      Action: {
        Post: {
          Get: {
            Paginated: 'Post.Get.Paginated'
          }
        }
      },
      Mutation: {
        Post: {
          Set: {
            Paginated: 'Post.Set.Paginated'
          }
        }
      }
    };
    ```

    Vuex expects a given **action** or **mutation** to be defined by a unique `string` value key.  However, it is useful to use enumerations or other static options to define these keys so you don't need to manually remember and enter the names of the actions or mutations you're performing.  That's what the `types.ts` file above accomplishes.  It will allow us to reference potentially complex action or mutation names through values the editor will verify.

7.  Open `src/state/actions.ts` and add the following code.

    ```ts
    import { Types } from '@/state/types';
    import { DgraphAdapter } from '@/dgraph/DgraphAdapter';

    export const Actions = {
      async [Types.Action.Post.Get.Paginated](
        { commit }: { commit: any },
        { first = 50, offset = 0 }: { first?: number; offset?: number }
      ) {
        const { data } = await new DgraphAdapter().query(
          `query posts($first: int, $offset: int) {
              data(func: has(domain), first: $first, offset: $offset)
                @filter((not has(crosspost_parent)) and eq(over_18, false)) {
                uid
                expand(_all_) {
                  uid
                  expand(_all_)
                }
              }
            }`,
          { $first: first, $offset: offset }
        );

        commit(Types.Mutation.Post.Set.Paginated, { posts: data });
      }
    };
    ```

    Here is where we're defining the actual actions that we want to be able to dispatch.  The `Actions` object is just a collection of functions and we're naming them using the pre-defined `Types` found in the `src/state/types.ts` file.  In this case, we've defined an `async` action named the value of `Types.Action.Post.Get.Paginated`.

    Vuex [actions](https://vuex.vuejs.org/guide/actions.html) pass a `context` parameter which allows us to access the state (`context.state`) or commit a mutation (`context.commit`).  Here, we only need access to the `commit` function, so we're destructuring it in the parameter definition (which is a common pattern when using Vuex).  We're also accepting a second set of custom arguments which we'll use to adjust the logic of the action.  Remember, actions can be asynchronous but _cannot_ modify the state, but should just commit a mutation informing the state of a potential change.

    This GraphQL+- query we're performing defines two [GraphQL Variables](https://docs.dgraph.io/query-language/#graphql-variables) (`$first` and `$offset`), which allows us to pass arguments to Dgraph to dynamically modify the query.  Both `first` and `offset` filters are part of the built-in [pagination](https://docs.dgraph.io/query-language/#pagination) options.  Thus, the default values of `50` and `0`, respectively, will return the first `50` posts.  The extra `@filter` directives used here are just to narrow the search down so we don't get any crossposts, nor anything that might be NSFW.

    If you have Dgraph running locally you can test that query below.

    <!-- prettier-ignore-start -->
    {{< runnable >}}
    query posts($first: int, $offset: int) {
      data(func: has(domain), first: 50, offset: 0)
        @filter((not has(crosspost_parent)) and eq(over_18, false)) {
        uid
        expand(_all_) {
          uid
          expand(_all_)
        }
      }
    }
    {{< /runnable >}}
    <!-- prettier-ignore-end -->

    As you may recall from [Querying Dgraph](#querying-dgraph) the call to `DgraphAdapter().query()` lets us pass optional arguments, and if they exist it will invoke the `txn.queryWithVars()` method from the `dgraph-js-http` library.

    Once the result of our query has returned we finish by calling the `commit()` method to invoke the appropriate mutation.  Since the action name was `Post.Get.Paginated` to invoke a retrieval of posts that we pass as the payload argument to our mutation, the mutation we'll commit is `Post.Set.Paginated`.  We could name these anything we want and may want to change them in the future, but this seems like an appropriate name for a mutation that _changes_ the paginated post list.

8.  Speaking of mutations, open `src/state/mutations.ts` and paste the following into it.

    ```ts
    import { Types } from '@/state/types';

    export const Mutations = {
      [Types.Mutation.Post.Set.Paginated](state: any, { posts }: { posts: any[] }) {
        state.posts = posts;
      }
    };
    ```

    As with the `Actions` object exported from `src/state/actions.ts`, the `Mutations` object is a collection of mutation methods.  The first parameter provided by Vuex is the current state, which is required and will be used to update or _mutate_ the state within the handler function.  We've also opted to pass an optional second argument that contains custom data used to process this mutation.  Here we're destructuring the `posts` property that was passed via the `commit()` method in our action, and setting the `state.posts` value to it.

9.  The final step is to open `src/state/state.ts` and set the _initial_ state values for any state properties we'll be using.  In this case, we just have the `posts` property used above.

    ```ts
    export const State = {
      posts: []
    };
    ```

### Using State in the PostList Component

Now that our state is configured and we can extract some paginated post data we need to add that functionality to our `src/components/PostList.vue` component.

1.  Open `src/components/PostList.vue` and add the following `getPosts()` computed property and `created()` lifecycle method to the `PostList` class.  Don't forget the new `{ Types }` `import` as well.

    ```ts
    <script lang="ts">
    import { Component, Prop, Vue } from 'vue-property-decorator';
    import Post from '@/components/Post.vue';
    import { Types } from '@/state';

    @Component({
      components: { Post }
    })
    export default class PostList extends Vue {
      @Prop() private posts!: Post;

      get getPosts() {
        return this.$store.state.posts;
      }

      public async created() {
        // Get post list.
        await this.$store.dispatch(Types.Action.Post.Get.Paginated, {
          first: 100,
          offset: 0
        });
      }
    }
    </script>
    ```

    Vue has a number of component [lifecycle hooks](https://vuejs.org/v2/guide/instance.html#Instance-Lifecycle-Hooks), one of which is `created`.  The [`vue-class-component`](https://github.com/vuejs/vue-class-component) library lets us add run code during these lifecycle hooks by declaring class methods with the matching names and passing functions that should be executed during those hooks.  Thus, the `public async create()` method fires after the `PostList` component instance is created.  In it we await the result dispatching the `Post.Get.Paginated` action with extra optional arguments.  As we saw above, this will retrieve the data from Dgraph and then commit a mutation to update the state.

    The `getPosts` getter is a _computed_ property, which means that Vue will intelligently evaluate the value of this property and dynamically re-render any components that rely on this property when the value changes.  Therefore, when the `state.posts` property changes, the value of the `getPosts` property is also updated.

2.  To make use of `getPosts` let's update the `PostList.vue` HTML section as seen below.

    ```html
    <template>
      <v-container grid-list-xs>
        <Post v-for="post in getPosts" :key="post.id" v-bind="post"></Post>
      </v-container>
    </template>
    ```

    Vue provides a number of helper directives which are HTML attributes that begin with `v-`.

    - [`v-for`](https://vuejs.org/v2/guide/list.html) - Loops over a collection.  We used this before to loop over a collection of numbers for dummy data, but here we're using it to iterate over the collection returned by the `getPosts` computed property seen above.
    - [`v-bind`](https://vuejs.org/v2/api/#v-bind) - Dynamically binds an attribute to a value.  Typically this is written in the form of `v-bind:attr-name="value"`, but if we exclude the attribute name then Vue will automatically pass (i.e. `bind`) every property of the object in question to the component.
    - `:key` - `v-bind` also has a shorthand syntax that lets us avoid typing the `v-bind` prefix.  By using just the colon followed by the attribute we can replicate a binding, so here we're binding the `key` attribute to the value of `post.id`.

The `PostList` component is updated and is properly passing data to the `Post` instances it creates, but we need to update the `Post` component to actually display that data.

### Binding Data in the Post Component

1.  Open `src/components/Post.vue` and change the `<script>` section to the following.

    ```ts
    <script lang="ts">
    import { Component, Prop, Vue } from 'vue-property-decorator';

    @Component
    export default class Post extends Vue {
      @Prop(String) private id!: string;
      @Prop(String) private author!: string;
      @Prop(String) private created_utc!: Date;
      @Prop(String) private domain!: string;
      @Prop(Boolean) private is_self!: boolean;
      @Prop(Number) private num_comments!: number;
      @Prop(String) private permalink!: string;
      @Prop(Number) private score!: number;
      @Prop(String) private subreddit!: string;
      @Prop(String) private thumbnail!: string;
      @Prop({ default: 70 }) private thumbnail_height!: number;
      @Prop({ default: 70 }) private thumbnail_width!: number;
      @Prop(String) private title!: string;
      @Prop(String) private url!: string;

      get authorUrl() {
        return `/user/${this.author}`;
      }

      get domainUrl() {
        if (this.is_self) {
          return this.subredditUrl;
        } else {
          return `/domain/${this.domain}`;
        }
      }

      get fullUrl() {
        return this.is_self ? this.permalink : this.url;
      }

      get hasAuthor() {
        return this.author !== '[deleted]';
      }

      get subredditUrl() {
        return `/r/${this.subreddit}`;
      }

      get thumbnailUrl() {
        if (this.thumbnail === 'self') {
          return require('../assets/images/thumbnail-self.png');
        } else if (this.thumbnail === 'default') {
          return require('../assets/images/thumbnail-default.png');
        } else {
          return this.thumbnail;
        }
      }
    }
    </script>
    ```

    This may look a bit overwhelming at first, but really we've just added two types of data to the `Post` component: properties and computed properties.  Let's start with the properties list.

    ```ts
    @Prop(String) private id!: string;
    @Prop(String) private author!: string;
    @Prop(String) private created_utc!: Date;
    @Prop(String) private domain!: string;
    @Prop(Boolean) private is_self!: boolean;
    @Prop(Number) private num_comments!: number;
    @Prop(String) private permalink!: string;
    @Prop(Number) private score!: number;
    @Prop(String) private subreddit!: string;
    @Prop(String) private thumbnail!: string;
    @Prop({ default: 70 }) private thumbnail_height!: number;
    @Prop({ default: 70 }) private thumbnail_width!: number;
    @Prop(String) private title!: string;
    @Prop(String) private url!: string;
    ```

    These properties are defined using the `@Prop` decorator to specify their types, name, default values, and so forth.  The names are taken directly from the properties of our Dgraph predicates used by a Post node.

    As mentioned before, computed properties are specified by a getter method within the class component, so we're using such computed properties to "calculate" additional logic.  We won't go over them all, but `thumbnailUrl()` is a good example as it allows us to return the proper post thumbnail URL based on the possible values found in the database.

    {{% notice "tip" %}} The `thumbnailUrl()` property references two custom thumbnail images which you can download and add to your `src/assets/images/` directory to include them in your own project.  They can be found in the [src/assets/images](https://github.com/GabeStah/dgraph-reddit/tree/master/src/assets/images) directory of the GitHub [repository](https://github.com/GabeStah/dgraph-reddit). {{% /notice %}}

2.  Next, let's update the HTML section of the `Post.vue` component.  We'll go through each of the three `v-flex` elements one at time.

    ```html
    <v-flex class="votes" xs1 px-1 mx-1>
      <v-icon class="arrow up accentuated">arrow_upward</v-icon>
      <span class="score">{{ score }}</span>
      <v-icon class="arrow down accentuated">arrow_downward</v-icon>
    </v-flex>
    ```

    The only change here is to use the actual `score` property passed to the `Post` component instance.  Vue's [text interpolation](https://vuejs.org/v2/guide/syntax.html#Interpolations) syntax merely requires surrounding a property value with double curly braces (aka "mustaches").  This syntax is used all the time within Vue templates, so you'll see it frequently.

3.  The second flexbox section should be updated as seen below.

    ```html
    <v-flex class="thumbnail" xs1 px-1 mx-1>
      <a :href="fullUrl">
        <v-img
          :src="thumbnailUrl"
          :lazy-src="thumbnailUrl"
          aspect-ratio="1"
          height="70"
          width="70"
        />
      </a>
    </v-flex>
    ```

    We're no longer using static URL strings, but instead are binding `:href`, `:src`, and `:lazy-src` attributes to computed property functions.

4.  The last flexbox should look like the following.

    ```html
    <v-flex class="content" xs10 px-1 mx-1>
      <span class="title">
        <a :href="fullUrl" class="text--primary">{{ title }}</a>
        <span class="domain text--secondary caption ml-1 font-weight-bold"
          >(<a :href="domainUrl" class="text--secondary accentuated">{{
            domain
          }}</a
          >)</span
        >
      </span>
      <span class="tagline caption">
        submitted {{ created_utc | moment('from') }} by
        <a class="accentuated" :href="authorUrl" v-if="hasAuthor">{{
          author
        }}</a>
        <span v-else>{{ author }}</span>
        to
        <a class="accentuated" :href="subredditUrl">r/{{ subreddit }}</a>
      </span>
      <ul class="buttons font-weight-medium">
        <li class="comment">
          <a :href="permalink" class="text--secondary accentuated"
            >{{ num_comments }} comments</a
          >
        </li>
        <li class="share">
          <a href="#" class="text--secondary accentuated">share</a>
        </li>
        <li class="save">
          <a href="#" class="text--secondary accentuated">save</a>
        </li>
        <li class="toggle">
          <a href="#" class="text--secondary accentuated">hide</a>
        </li>
        <li class="award">
          <a href="#" class="text--secondary accentuated">give award</a>
        </li>
        <li class="report">
          <a href="#" class="text--secondary accentuated">report</a>
        </li>
        <li class="crosspost">
          <a href="#" class="text--secondary accentuated">crosspost</a>
        </li>
      </ul>
    </v-flex>
    ```

    Quite a lot has changed here, but the same rules as techniques used in the previous sections apply.  The first notable addition is `submitted {{ created_utc | moment('from') }}`.  The pipe character indicates a Vue [filter function](https://vuejs.org/v2/guide/filters.html), which simplifies text formatting within Vue templates.  In this case, we're using a special `moment()` filter function to transform the `created_utc` date into a human-readable "X seconds ago" format.

    The other unknown addition is just below that in which we use the `v-if` and `v-else` directives to determine if the post has a valid author.  If so, a `<a>` link element is added to link to the author URL.  Otherwise, no link is set and the author is printed in plain text.  This mimics the Reddit behavior of `[deleted]` users who no longer have a user page, but may still have active comments or posts.

5.  The last step is to add the [`vue-moment` library](https://www.npmjs.com/package/vue-moment), which provides a filter function we can use in Vue that behaves similar to [`Moment.js`](http://momentjs.com/).

    ```bash
    yarn add vue-moment
    ```

    Open the `src/main.ts` file and add the following code to import and use `vue-moment`.

    ```ts
    import VueMoment from 'vue-moment';
    Vue.use(VueMoment);
    ```

Alright, our `Post` component is updated and ready to display the data it receives from the parent `PostList` component.  Save everything and run `yarn serve` to check out the new post list, which will show the first `100` post records in the database.

![Post List with Dgraph Data](/images/PostList-data.png)

## Query Only Comments

```js
{
  data(func: has(link_id)) {
    count(uid)
  }
}
```

```js
{
  data(func: has(author)) @filter(has(body)) {
    count(uid)
  }
}
```

## Query Only Posts

```js
{
  data(func: has(domain)) @filter(not has(crosspost_parent)) {
    count(uid)
  }
}
```

## Query Only Posts > Crossposts

```js
{
  data(func: has(crosspost_parent)) {
    count(uid)
  }
}
```