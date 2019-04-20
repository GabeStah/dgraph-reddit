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
yarn add -D @babel/polyfill @types/gulp @types/node ts-node
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
    public async query<T>(query: string, vars?: any): Promise<any> {
      const transaction = this.client.newTxn();
      let result;
      try {
        // Check for optional vars.
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
{"archived":false,"author":"transcribersofreddit","author_flair_css_class":null,"author_flair_text":"Official Bot","brand_safe":false,"contest_mode":false,"created_utc":1517443200,"distinguished":null,"domain":"reddit.com","edited":false,"gilded":0,"hidden":false,"hide_score":false,"id":"7ueit6","is_crosspostable":false,"is_reddit_media_domain":false,"is_self":false,"is_video":false,"link_flair_css_class":"unclaimed","link_flair_text":"Unclaimed","locked":false,"media":null,"media_embed":{},"no_follow":true,"num_comments":1,"num_crossposts":0,"over_18":false,"parent_whitelist_status":null,"permalink":"/r/TranscribersOfReddit/comments/7ueit6/toomeirlformeirl_image_toomeirlformeirl/","pinned":false,"retrieved_on":1520467337,"score":1,"secure_media":null,"secure_media_embed":{},"selftext":"","send_replies":true,"spoiler":false,"stickied":false,"subreddit":"TranscribersOfReddit","subreddit_id":"t5_3jqmx","subreddit_type":"public","suggested_sort":null,"thumbnail":"default","thumbnail_height":140,"thumbnail_width":140,"title":"TooMeIrlForMeIrl | Image | \"TooMeIrlForMeIrl\"","url":"https://reddit.com/r/TooMeIrlForMeIrl/comments/7ueit3/toomeirlformeirl/","whitelist_status":null}
{"archived":false,"author":"ChineseToTheBone","author_flair_css_class":null,"author_flair_text":null,"brand_safe":true,"contest_mode":false,"created_utc":1517443200,"distinguished":null,"domain":"timedotcom.files.wordpress.com","edited":false,"gilded":0,"hidden":false,"hide_score":false,"id":"7ueit7","is_crosspostable":false,"is_reddit_media_domain":false,"is_self":false,"is_video":false,"link_flair_css_class":null,"link_flair_text":null,"locked":false,"media":null,"media_embed":{},"no_follow":false,"num_comments":21,"num_crossposts":0,"over_18":false,"parent_whitelist_status":"all_ads","permalink":"/r/WarshipPorn/comments/7ueit7/electromagnetic_railgun_prototype_on_a_type/","pinned":false,"post_hint":"image","preview":{"enabled":true,"images":[{"id":"mnTR7sMg1LvUV1SaPwqTMtE1hn0QaOoB8slCBSnVGlM","resolutions":[{"height":60,"url":"https://i.redditmedia.com/r-rXD7r_Fm-oQf2xayPEwWW5o_a8rYkGteHwnE34GwY.jpg?fit=crop&amp;crop=faces%2Centropy&amp;arh=2&amp;w=108&amp;fm=jpg&amp;s=860648187a15d64e23b4e26ec9f73450","width":108},{"height":121,"url":"https://i.redditmedia.com/r-rXD7r_Fm-oQf2xayPEwWW5o_a8rYkGteHwnE34GwY.jpg?fit=crop&amp;crop=faces%2Centropy&amp;arh=2&amp;w=216&amp;fm=jpg&amp;s=44c73232a1cbe7939206633afca6e0e6","width":216},{"height":180,"url":"https://i.redditmedia.com/r-rXD7r_Fm-oQf2xayPEwWW5o_a8rYkGteHwnE34GwY.jpg?fit=crop&amp;crop=faces%2Centropy&amp;arh=2&amp;w=320&amp;fm=jpg&amp;s=ca7e78f1f179ae6827ffcc75469a04c5","width":320},{"height":360,"url":"https://i.redditmedia.com/r-rXD7r_Fm-oQf2xayPEwWW5o_a8rYkGteHwnE34GwY.jpg?fit=crop&amp;crop=faces%2Centropy&amp;arh=2&amp;w=640&amp;fm=jpg&amp;s=523767d80539666ab2695cdfee811909","width":640},{"height":540,"url":"https://i.redditmedia.com/r-rXD7r_Fm-oQf2xayPEwWW5o_a8rYkGteHwnE34GwY.jpg?fit=crop&amp;crop=faces%2Centropy&amp;arh=2&amp;w=960&amp;fm=jpg&amp;s=11227a7dad425381fdb0f3ba1386b203","width":960},{"height":607,"url":"https://i.redditmedia.com/r-rXD7r_Fm-oQf2xayPEwWW5o_a8rYkGteHwnE34GwY.jpg?fit=crop&amp;crop=faces%2Centropy&amp;arh=2&amp;w=1080&amp;fm=jpg&amp;s=cffddfeb4780f5303a86707177b2b87f","width":1080}],"source":{"height":1080,"url":"https://i.redditmedia.com/r-rXD7r_Fm-oQf2xayPEwWW5o_a8rYkGteHwnE34GwY.jpg?fm=jpg&amp;s=f591b4d38b2544fc7a94d43b993ec5db","width":1920},"variants":{}}]},"retrieved_on":1520467337,"score":144,"secure_media":null,"secure_media_embed":{},"selftext":"","send_replies":true,"spoiler":false,"stickied":false,"subreddit":"WarshipPorn","subreddit_id":"t5_2tg3p","subreddit_type":"public","suggested_sort":null,"thumbnail":"https://b.thumbs.redditmedia.com/1TaGs8QGKSK4Ko7jGn_iTwWXFRdQc1TF6Iv1it-Y47Y.jpg","thumbnail_height":78,"thumbnail_width":140,"title":"Electromagnetic Railgun Prototype on a Type 072III-Class Landing Ship [1920 \u00d7 1080]","url":"https://timedotcom.files.wordpress.com/2018/01/railgun-1.jpg","whitelist_status":"all_ads"}
{"archived":false,"author":"Rainewood","author_flair_css_class":null,"author_flair_text":null,"brand_safe":true,"contest_mode":false,"created_utc":1517443200,"distinguished":null,"domain":"self.AskReddit","edited":false,"gilded":0,"hidden":false,"hide_score":false,"id":"7ueit9","is_crosspostable":false,"is_reddit_media_domain":false,"is_self":true,"is_video":false,"link_flair_css_class":null,"link_flair_text":null,"locked":false,"media":null,"media_embed":{},"no_follow":false,"num_comments":9,"num_crossposts":0,"over_18":false,"parent_whitelist_status":"all_ads","permalink":"/r/AskReddit/comments/7ueit9/redditors_who_have_a_chronic_pain/","pinned":false,"retrieved_on":1520467337,"score":3,"secure_media":null,"secure_media_embed":{},"selftext":"","send_replies":true,"spoiler":false,"stickied":false,"subreddit":"AskReddit","subreddit_id":"t5_2qh1i","subreddit_type":"public","suggested_sort":null,"thumbnail":"self","thumbnail_height":null,"thumbnail_width":null,"title":"Redditors who have a chronic pain disorder/invisible disability, what event led to your diagnosis? Did you struggle with medical professionals not believing you?","url":"https://www.reddit.com/r/AskReddit/comments/7ueit9/redditors_who_have_a_chronic_pain/","whitelist_status":"all_ads"}
{"archived":false,"author":"GEEpeachProductions","author_flair_css_class":null,"author_flair_text":null,"brand_safe":false,"contest_mode":false,"created_utc":1517443200,"distinguished":null,"domain":"vimeo.com","edited":false,"gilded":0,"hidden":false,"hide_score":false,"id":"7ueita","is_crosspostable":false,"is_reddit_media_domain":false,"is_self":false,"is_video":false,"link_flair_css_class":null,"link_flair_text":null,"locked":false,"media":{"oembed":{"author_name":"Georgia Pearce","author_url":"https://vimeo.com/geepeach","description":"This short independent film focusses on the life of George Singleton, currently living on the streets of London, who cleans the canals tirelessly everyday, in a bit to reduce the plastic and waste pollution in our water ways. The film touches upon homelessness, veganism and pollution in our waters.","height":338,"html":"&lt;iframe class=\"embedly-embed\" src=\"https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fplayer.vimeo.com%2Fvideo%2F253329987&amp;dntp=1&amp;url=https%3A%2F%2Fvimeo.com%2F253329987&amp;image=https%3A%2F%2Fi.vimeocdn.com%2Fvideo%2F680407880_1280.jpg&amp;key=2aa3c4d5f3de4f5b9120b660ad850dc9&amp;type=text%2Fhtml&amp;schema=vimeo\" width=\"600\" height=\"338\" scrolling=\"no\" frameborder=\"0\" allowfullscreen&gt;&lt;/iframe&gt;","provider_name":"Vimeo","provider_url":"https://vimeo.com/","thumbnail_height":720,"thumbnail_url":"https://i.embed.ly/1/image?url=https%3A%2F%2Fi.vimeocdn.com%2Fvideo%2F680407880_1280.jpg&amp;key=b1e305db91cf4aa5a86b732cc9fffceb","thumbnail_width":1280,"title":"bridge 32","type":"video","version":"1.0","width":600},"type":"vimeo.com"},"media_embed":{"content":"&lt;iframe class=\"embedly-embed\" src=\"https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fplayer.vimeo.com%2Fvideo%2F253329987&amp;dntp=1&amp;url=https%3A%2F%2Fvimeo.com%2F253329987&amp;image=https%3A%2F%2Fi.vimeocdn.com%2Fvideo%2F680407880_1280.jpg&amp;key=2aa3c4d5f3de4f5b9120b660ad850dc9&amp;type=text%2Fhtml&amp;schema=vimeo\" width=\"600\" height=\"338\" scrolling=\"no\" frameborder=\"0\" allowfullscreen&gt;&lt;/iframe&gt;","height":338,"media_domain_url":"https://www.redditmedia.com/mediaembed/7ueita","scrolling":false,"width":600},"no_follow":true,"num_comments":0,"num_crossposts":0,"over_18":false,"parent_whitelist_status":null,"permalink":"/r/oceans/comments/7ueita/george_lives_on_the_streets_of_london_and/","pinned":false,"retrieved_on":1520467337,"score":1,"secure_media":{"oembed":{"author_name":"Georgia Pearce","author_url":"https://vimeo.com/geepeach","description":"This short independent film focusses on the life of George Singleton, currently living on the streets of London, who cleans the canals tirelessly everyday, in a bit to reduce the plastic and waste pollution in our water ways. The film touches upon homelessness, veganism and pollution in our waters.","height":338,"html":"&lt;iframe class=\"embedly-embed\" src=\"https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fplayer.vimeo.com%2Fvideo%2F253329987&amp;dntp=1&amp;url=https%3A%2F%2Fvimeo.com%2F253329987&amp;image=https%3A%2F%2Fi.vimeocdn.com%2Fvideo%2F680407880_1280.jpg&amp;key=2aa3c4d5f3de4f5b9120b660ad850dc9&amp;type=text%2Fhtml&amp;schema=vimeo\" width=\"600\" height=\"338\" scrolling=\"no\" frameborder=\"0\" allowfullscreen&gt;&lt;/iframe&gt;","provider_name":"Vimeo","provider_url":"https://vimeo.com/","thumbnail_height":720,"thumbnail_url":"https://i.embed.ly/1/image?url=https%3A%2F%2Fi.vimeocdn.com%2Fvideo%2F680407880_1280.jpg&amp;key=b1e305db91cf4aa5a86b732cc9fffceb","thumbnail_width":1280,"title":"bridge 32","type":"video","version":"1.0","width":600},"type":"vimeo.com"},"secure_media_embed":{"content":"&lt;iframe class=\"embedly-embed\" src=\"https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fplayer.vimeo.com%2Fvideo%2F253329987&amp;dntp=1&amp;url=https%3A%2F%2Fvimeo.com%2F253329987&amp;image=https%3A%2F%2Fi.vimeocdn.com%2Fvideo%2F680407880_1280.jpg&amp;key=2aa3c4d5f3de4f5b9120b660ad850dc9&amp;type=text%2Fhtml&amp;schema=vimeo\" width=\"600\" height=\"338\" scrolling=\"no\" frameborder=\"0\" allowfullscreen&gt;&lt;/iframe&gt;","height":338,"media_domain_url":"https://www.redditmedia.com/mediaembed/7ueita","scrolling":false,"width":600},"selftext":"","send_replies":true,"spoiler":false,"stickied":false,"subreddit":"oceans","subreddit_id":"t5_2s7su","subreddit_type":"public","suggested_sort":null,"thumbnail":"default","thumbnail_height":78,"thumbnail_width":140,"title":"George lives on the streets of London, and everyday tirelessly cleans the canals in a bid to reduce the pollution in our water ways. The film touches upon homelessness, veganism and plastic pollution. Please watch, and if you can, a donation would be hugely appreciated! Thank you","url":"https://vimeo.com/253329987?ref=fb-share&amp;1","whitelist_status":null}
{"archived":false,"author":"CalligraBot","author_flair_css_class":null,"author_flair_text":null,"brand_safe":true,"contest_mode":false,"created_utc":1517443200,"distinguished":null,"domain":"self.Calligraphy","edited":false,"gilded":0,"hidden":false,"hide_score":false,"id":"7ueitb","is_crosspostable":false,"is_reddit_media_domain":false,"is_self":true,"is_video":false,"link_flair_css_class":"post-recurring","link_flair_text":"WotD","locked":false,"media":null,"media_embed":{},"no_follow":false,"num_comments":5,"num_crossposts":0,"over_18":false,"parent_whitelist_status":"all_ads","permalink":"/r/Calligraphy/comments/7ueitb/word_of_the_day_january_31_2018_astringent/","pinned":false,"retrieved_on":1520467337,"score":11,"secure_media":null,"secure_media_embed":{},"selftext":"# Word of the day: Astringent\n\nSynonyms: Sullen, Bitter\n\n\n\nSpanish: Astringente, Acerbo, Acre\n\nGerman: Adstringens, Adstringierend, Bei\u00dfend\n\nGreek (Modern): \u0394\u03c1\u03b9\u03bc\u03cd\u03c2, \u03a3\u03c4\u03c5\u03c0\u03c4\u03b9\u03ba\u03cc\u03c2\n\n1: A substance which draws tissue together thus restricting the flow of blood.\n\n2: a substance which draws tissue together\n\n *^I ^am ^a ^bot, ^and ^this ^action ^was ^performed ^automatically. ^Please ^contact ^the ^moderators ^of ^this ^subreddit ^if ^you ^have ^any ^questions ^or ^concerns.* \n\n *^Want ^to ^suggest ^new ^words? ^PM ^/u/Maxindigo*","send_replies":true,"spoiler":false,"stickied":false,"subreddit":"Calligraphy","subreddit_id":"t5_2rkjt","subreddit_type":"public","suggested_sort":null,"thumbnail":"self","thumbnail_height":null,"thumbnail_width":null,"title":"Word of the Day - January 31, 2018 - Astringent","url":"https://www.reddit.com/r/Calligraphy/comments/7ueitb/word_of_the_day_january_31_2018_astringent/","whitelist_status":"all_ads"}
```

As we already saw above, Dgraph's GraphQL+- engine can accept JSON data within mutations, so we just need to create a helper function that can efficiently extract this data and push it to a Dgraph mutation. However, as discussed these are rather large files, so we cannot simply load them into memory and try reading their content. The solution? We'll be using [Node Streams](https://nodejs.org/api/stream.html)!

A stream in Node is a rather abstract concept that is used throughout the standard library. Conceptually, a stream is a collection of data similar to an array or object, with one major caveat: Stream data is _temporal_ since it mutates over time. So, in the case of reading the data from our 2+ GB file, we don't have to read it all at once and hold the data in memory, but we'll instead use a stream that will slowly trickle the data in over time in chunks, which we'll then process as needed.

{{% notice "tip" %}} An in-depth guide to Node streams is far beyond the scope of this tutorial, so you might check out some great resources such as [Node Beyond Basics: Streams](https://jscomplete.com/learn/node-beyond-basics/node-streams) and the [Node Stream official docs](https://nodejs.org/api/stream.html#stream_stream). {{% /notice %}}

1.  We'll start by installing the `event-stream` library, which is an extremely popular collection of helper methods for working with Node streams.

    ```bash
    yarn add event-stream && yarn add -D @types/event-stream
    ```

    In this case, we'll be using `event-stream` to split our data by line and format it into JSON objects before we manipulate it with custom code.

2.  Next, open the `src/dgraph/DgraphAdapter.ts` file and add the following `mutateFromStream` method.

    ```ts
    import es from 'event-stream';
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

      const syncMutation = async (readStream: ReadStream, event?: string) => {
        // Pause during async.
        readStream.pause();
        console.log(
          `DgraphAdapter.mutateFromStream, event: ${event}, batch.length: ${
            batch.length
          }`
        );
        // Mutate batch
        const response = await adapter.mutate({ request: batch });
        console.log(
          `DgraphAdapter.mutateFromStream, event: ${event}, response.length: ${
            response.length
          }`
        );
        // Reset batch.
        batch = [];
        // Resume after async.
        readStream.resume();
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
              // Close stream if total meets limit.
              this.destroy();
            } else if (batch.length === batchSize) {
              // Synchronously mutate if batch length meets batchSize.
              await syncMutation(this, 'data');
            }
          })
          .on('error', (error: Error) => {
            console.log(error);
            reject(error);
          })
          .on('close', async function(this: ReadStream) {
            // Synchronously mutate if batch contains any extraneous records.
            if (batch.length > 0) {
              await syncMutation(this, 'close');
            }
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

    Here we're creating a `ReadStream` from the `2018-02-01` Reddit submissions data set and then generating an `options` object that contains our `stream` instance. We also specify the `batchSize`, `limit`, and `path` properties, all of which recieve default values using the `minimist` library. The `path` property is used to create the `ReadStream`, while the other arguments are passed to `DgraphAdapter.mutateFromStream()`.

5.  Let's test it out by running `gulp db:generate:data` from the command line.

    ```bash
    $ gulp db:generate:data
    [21:47:07] Requiring external module ts-node/register
    [21:47:08] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
    [21:47:08] Starting 'db:generate:data'...
    DgraphAdapter.mutateFromStream, event: data, batch.length: 250
    DgraphAdapter.mutateFromStream, event: data, response.length: 1267
    DgraphAdapter.mutateFromStream, event: data, batch.length: 250
    DgraphAdapter.mutateFromStream, event: data, response.length: 1415
    DgraphAdapter.mutateFromStream, event: data, batch.length: 250
    DgraphAdapter.mutateFromStream, event: data, response.length: 1414
    DgraphAdapter.mutateFromStream, event: close, batch.length: 250
    DgraphAdapter.mutateFromStream, event: close, response.length: 1264
    Stream closed, processed 1000 out of 1000 records.
    [21:47:11] Finished 'db:generate:data' after 3.42 s
    ```

    The output should look something like the above. We included some extra logging messages for now just to confirm everything is working correctly, but so far it looks good. Our `batch.length` size is accurately using the default of `250`, which means our code is aggregating an `Array` of `250` objects read from the `data` stream event prior to performing a `DgraphAdapter.mutate()` call. The `response.length` after each batch is pushed shows the number of nodes that were generated from that batch. We can also see that we're correctly processing only the `limit` number of records (`1000`, by default) before the stream is destroyed and closed.

6.  Let's also confirm that we can override the default `batchSize` and `limit` parameters by providing matching `--arguments` to the `gulp db:generate:data` command. Let's try a `batchSize` of `123` and a `limit` of `10000`

    ```bash
    $ gulp db:generate:data  --batchSize 123 --limit 10000
    [21:52:07] Requiring external module ts-node/register
    [21:52:08] Using gulpfile D:\work\dgraph\projects\dgraph-reddit\gulpfile.ts
    [21:52:08] Starting 'db:generate:data'...
    DgraphAdapter.mutateFromStream, event: data, batch.length: 123
    DgraphAdapter.mutateFromStream, event: data, response.length: 805
    DgraphAdapter.mutateFromStream, event: data, batch.length: 123
    DgraphAdapter.mutateFromStream, event: data, response.length: 666
    DgraphAdapter.mutateFromStream, event: data, batch.length: 123
    DgraphAdapter.mutateFromStream, event: data, response.length: 700
    DgraphAdapter.mutateFromStream, event: data, batch.length: 123
    DgraphAdapter.mutateFromStream, event: data, response.length: 729
    DgraphAdapter.mutateFromStream, event: data, batch.length: 123
    DgraphAdapter.mutateFromStream, event: data, response.length: 700
    DgraphAdapter.mutateFromStream, event: close, batch.length: 37
    DgraphAdapter.mutateFromStream, event: close, response.length: 174
    Stream closed, processed 10000 out of 10000 records.
    [21:52:42] Finished 'db:generate:data' after 34 s
    ```

    Awesome, both our argument overrides are working as expected. The last thing to do is confirm that the data is showing up in Dgraph as expected.

7.  Open up the Ratel UI (http://localhost:8000/?latest), navigate to **Console > Query** and run the following query.

    ```js
    {
      data(func: has(author), first: 10) {
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
  data(func: has(author), first: 10) {
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

### Regenerate Full Data Set

With our schema setup we can now add some significant data to the system that our Vue app can work with. The following commands will `drop` the Dgraph database and then add `10,000` submissions and `50,000` comments from the exported Reddit data sets.

```bash
gulp db:drop
gulp db:generate:data --limit 5000 --path ./src/data/RS_2018-02-01 && gulp db:generate:data --limit 5000 --path ./src/data/RS_2018-02-02
gulp db:generate:data --limit 25000 --path ./src/data/RC_2018-02-01 && gulp db:generate:data --limit 25000 --path ./src/data/RC_2018-02-02
```

## Creating a Vue

```bash
yarn add vuex
```

```ts
// src/main.ts
import Vuex from 'vuex';
Vue.use(Vuex);
```

- Delete the pre-build `src/store.ts` file.

```bash
yarn add https://github.com/foxbenjaminfox/vue-async-computed#types
```

```
Copy `index.d.ts` to `src/@types`.
```

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

![Post List Mockup](/images/PostList-mockup@2x.png)

Add Vuetify via `Vue CLI`.`

```bash
vue add vuetify
```

Add FontAwesome to `public.index.html`.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- -->
    <link
      rel="stylesheet"
      href="https://use.fontawesome.com/releases/v5.8.1/css/all.css"
      integrity="sha384-50oBUHEmvpQ+1lW4y57PTFmhCaXp0ML5d60M1M7uH2+nqUivzIebhndOJK28anvf"
      crossorigin="anonymous"
    />
  </head>
</html>
```
