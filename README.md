# Build a modern serverless web application in minutes using the AWS Amplify Framework

<center><img src="./images/voterocket.png" alt="Vote Rocket" width="200px" /></center>

[AWS Amplify](https://aws.amazon.com/amplify/) makes it easy for you to create, configure, and implement scalable mobile and web apps powered by AWS. In this workshop we'll learn how to build the Vote Rocket voting web application with [React](https://reactjs.org/) and the [Amplify Framework](https://aws-amplify.github.io/)

## Topics we'll be covering:

- [Getting Started - Creating the React application](#getting-started---creating-the-react-application)
- [Installing the CLI &amp; initializing a new AWS Amplify project](#installing-the-cli--initializing-a-new-aws-amplify-project)
- [Adding a GraphQL API](#adding-a-graphql-api)
- [Adding custom business logic to the GraphQL API](#adding-custom-business-logic-to-the-graphql-api)
- [Creating the React front-end application](#creating-the-react-front-end-application)
- [Where to from here?](#where-to-from-here)
- [Further reading](#further-reading)

## Note

In case you get stuck or need a reference to compare your implementation with, the full source is available at [https://github.com/awssgr/voterocket](https://github.com/awssgr/voterocket).

## Getting Started - Creating the React application

To get started, we first need to create a new React project & change into the new directory using the [Create React App CLI](https://github.com/facebook/create-react-app).

Create the the React app (the `create-react-app` library has been pre-installed):

```bash
create-react-app voterocket
```

Now change into the new `voterocket` directory & install the AWS Amplify & AWS Amplify React libraries:

```bash
cd voterocket
yarn add aws-amplify aws-amplify-react
```

## Installing the CLI & initializing a new AWS Amplify project

### Installing the CLI

Next, we'll install the AWS Amplify CLI:

```bash
npm install -g @aws-amplify/cli
```

Now we need to configure the CLI with our credentials:

### Initializing A New Project

```bash
$ amplify init
```

You'll be prompted to answer some questions:

- Enter a name for the project `hello`
- Enter a name for the environment `dev`
- Choose your default editor: `None`
- Choose the type of app that you're building `javascript`

Please tell us about your project

- What javascript framework are you using `react`
- Source Directory Path:  `src`
- Distribution Directory Path: `build`
- Build Command:  npm run-script `build`
- Start Command: npm run-script `start`
- Do you want to use an AWS profile? `Yes`
- Please choose the profile you want to use: `default`. Choose `default` - (The `default` profile should already configured correctly.)

The AWS Amplify CLI will initialise a new project inside your React project & you will see a new folder: `amplify`. The files in this folder hold your project configuration.

## Adding a GraphQL API

To add a GraphQL API (AppSync), we can use the following command:

```bash
amplify add api
```

You'll be prompted to answer some questions:

- Please select from one of the above mentioned services `GraphQL`
- Provide API name: `voterocket`
- Choose an authorization type for the API `API key`
- Do you have an annotated GraphQL schema? `N`
- Do you want a guided schema creation? `Y`
- What best describes your project: `Single object with fields (e.g. “Todo” with ID, name, description)`
- Do you want to edit the schema now? (Y/n) `Y`

Voterocket's schema requires we have a `Candidate` with an `id`, `name`, `description` and count of `votes` received.

When prompted (the file is at `amplify/backend/api/voterocket/schema.graphql`), replace the schema with the following:

```graphql
type Candidate @model {
  id: ID!
  name: String!
  description: String
  votes: Int!
}
```

Amplify CLI uses [GraphQL Transform](https://aws-amplify.github.io/docs/cli/graphql?sdk=js), which simplify the process of developing, deploying, and maintaining GraphQL APIs on AWS. Transforms are implemented using [directives](https://medium.com/open-graphql/graphql-directives-3dec6106c384)

This example uses the `@model` directive, which by default will [automatically configure these AWS resources](https://aws-amplify.github.io/docs/cli/graphql#generates).

Next, let's push the configuration to our account:

```bash
amplify push
```

- Do you want to generate code for your newly created GraphQL API `Y`
- Choose the code generation language target: `JavaScript`
- Enter the file name pattern of graphql queries, mutations and subscriptions: `(src/graphql/**/*.js)`
- Do you want to generate/update all possible GraphQL operations - queries, mutations and subscriptions? `Y`

The generated GraphQL (via the `@model` directive can be found in `amplify/backend/api/voterocket/build/schema.graphql`

The generated Javascript source can be found in `./src/graphql/` and provides pre-built queries, mutations and subscriptions that can be imported directly into your React application.

### Using the generated AppSync API.

The generated API can be found at [https://console.aws.amazon.com/appsync](https://console.aws.amazon.com/appsync). Ensure the region is set correctly :-)

![](images/appsync_home.png)

In the AWS AppSync console, open your API & then click on **Queries**.

Paste the following into the console and run it.

```graphql
query AllCandidates {
  listCandidates {
    items {
      id
      name
      description
      votes
    }
  }
}
```

It should return an empty list. This is because there is no data in the underlying DynamoDB database.

### Adding a mutation from within the AWS AppSync Console

Add some `Candidate`s using a _mutation_ as below. This will add four entries and return a result:

```graphql
mutation createCandidates {
  candidate1: createCandidate(input: {name: "Lambda",      description: "Run code without thinking about servers",  votes: 0 }) {id, name, description, votes }
  candidate2: createCandidate(input: {name: "DynamoDB",    description: "Fast and flexible NoSQL database service", votes: 0 }) {id, name, description, votes }
  candidate3: createCandidate(input: {name: "API Gateway", description: "Managed RESTful APIs",                     votes: 0 }) {id, name, description, votes }
  candidate4: createCandidate(input: {name: "AppSync",     description: "Managed GraphQL APIs",                     votes: 0 }) {id, name, description, votes }
}
```

Executing the `AllCandidates` query above will now return the candidates created in the mutation.

We can also filter when querying. This is available because the Amplify CLI generated the transforms as described earlier.

```graphql
query NameContainsLambda {
  listCandidates(filter: {name: {contains: "Lambda"} }) {
    items {
      id
      name
      description
      votes
    }
  }
}
```

Will return only the `Candidate` whose name contains **Lambda**

## Adding custom business logic to the GraphQL API

Because this is a voting application we need to find a way to record a vote for a candidate. While we could use the `updateCandidate` mutation and resolver that was generated for us, this relies on having to increment the value on the client. It can't be guaranteed that all clients will have the same value for the vote count—it's much more robust to do this server-side.[^1]

This is how we would it if this were the AWS CLI:

```bash
aws dynamodb update-item \
    --table-name Candidate \
    --key '{ "id": {"S": "552e120b-3192-4cac-bb13-c8821472e6d6"} }' \
    --update-expression 'set #votesField = #votesField + :i' \
    --expression-attribute-values '{ ":i": { "N": "10"} }' \
    --expression-attribute-names '{ "#votesField": "votes" }'
```

For our GraphQL API to execute a similar `update-item` we need to create a custom resolver[^2].

### Add `castVote` to your GraphQL schema

Add the following to your `schema.graphql`:

```graphql
input CastVoteInput {
  id: ID!
}

type Mutation {
  castVote(input: CastVoteInput!): Candidate
}

type Subscription {
  onCastVote: Candidate
    @aws_subscribe(mutations: ["castVote"])
}
```

This will allow us to call a `castVote` mutation that will increment the vote counter by 1, and enforce an input that has only the ID of the candidate. There is also a subscription type that will "push" real-time updates to a connected client when the mutation is called.

### Add the `castVote` resolver templates:

Copy the two files: 

- `./code/Mutation.castVote.req.vtl` and 
- `./code/Mutation.castVote.res.vtl` 

into your `./amplify/backend/api/voterocket/resolvers` directory.

The `Mutation.castVote.req.vtl` executes the same functionality as the `aws dynamodb update-item` CLI command above.

We also need to tell Amplify to add these resolvers to your API by adding a new resolver resource to the generated CloudFormation templates.

Copy `./code/CustomResources.json` and overwrite the file at `amplify/backend/api/voterocket/build/stacks/CustomResources.json`

Run `amplify push` to provision the custom resolvers.

When you run `amplify push` the custom resolvers will be added to the `amplify/backend/api/voterocket/build/resolvers/` along with the other auto-generated resolvers implied from the `Candidate`'s `@model` directive earlier.

### Test the resolver in the AWS AppSync console

In the AWS AppSync console, open your API & then click on **Queries**.

Paste the following into the console and run it (use an `id` of a valid candidate in your database). You can find a valid `id` (UUID) by running the `listCandidates` GraphQL query as above.

```graphql
mutation CastVote {
  castVote(
    input: {
      id: "put-an-own-uuid-in-here" 
    }
  )
  {
    id
    votes
  }
}
```

Each time you execute the mutation it will increment the `votes` value by 1:

![](./images/cast_vote.png)

## Creating the React front-end application

A boilerplate React app was created in [Getting Started - Creating the React Application](#getting-started---creating-the-react-application)

### Add dependencies

We need to add the [Amplify Framework dependencies](https://aws-amplify.github.io/docs/js/react) to the app. We will also add [Chart.js](https://www.chartjs.org/) and the [React wrapper for Chart.js](https://github.com/jerairrest/react-chartjs-2) to display our vote counts as a chart.

Run `yarn add aws-amplify aws-amplify-react chart.js react-chartjs-2`

### Copy the front-end files

- Copy `samples/code/App.js` into your `./src` folder, overwriting the file generated by `create-react-app`.
- Copy `samples/code/index.html` into your `./public` folder, again overwriting the file generated by `create-react-app`.

### Try out the application

- Run `yarn install` to install the dependencies.
- Run `yarn start` will start the app. It should open your browser to [http://localhost:3000](http://localhost:3000) and you should be able to see the App in action. Pressing a button should cast a vote and the chart should update in real-time.

If you open another browser, or a new window, you should see the same chart update in that window, also in real-time.

![](images/voterocket_front_end.png)

### Examining the App.js file 

Open the `App.js` file you copied in your editor.

Note how the file is set up to use and configure the Amplify Framework:

```javascript
import React, { Component } from 'react';
import Amplify, { API, graphqlOperation } from 'aws-amplify';
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';
import * as subscriptions from './graphql/subscriptions';
import aws_exports from './aws-exports';

Amplify.configure(aws_exports);
```

Note how the code in the `componentDidMount` method of the `App` class will query list of Candidates from the API and load it into the component's state when the page is first loaded.

```javascript
const candidates = await API.graphql(graphqlOperation(queries.listCandidates))
this.setState({
  candidates: candidates.data.listCandidates.items
})
```

The arguments to the `graphqlOperation` method above (in this case `queries.listCandidates`) are managed and generated automatically by the Amplify Framework and were `import`ed from `./graphql/*` at the top of the file.

### Real-time updates using GraphQL API subscriptions

Also note how the `subscribe` method below automatically binds the subscription to our user interface, and will upgrade the counters and chart in real-time.

```javascript
  API.graphql(graphqlOperation(subscriptions.onCastVote)).subscribe({
    next: (voteCasted) => {
      const id = voteCasted.value.data.onCastVote.id
      const votes = voteCasted.value.data.onCastVote.votes
      const candidates = this.state.candidates
      const row = candidates.find( candidate => candidate.id === id );
      row.votes = votes;
      this.setState({ votes: candidates });
      console.log("state:", this.state.candidates)
    }
  })
```

This will update the React state using the GraphQL subscription we added to the `schema.graphql` file [above](#add-castvote-to-your-graphql-schema), and again is updated and managed automatically by the Framework.

## Where to from here?

### Add authentication

- Its really easy to add authentication using Amplify and [Amazon Cognito](https://aws.amazon.com/cognito/). In a [few lines of code](https://aws-amplify.github.io/docs/js/authentication#automated-setup) you will be able to add an authentication step so that only logged-in users can access your application.

### Host using the AWS Amplify Console

- You can also very easily deploy the application using [AWS Amplify Console](https://aws.amazon.com/amplify/console/). Here are some [examples](https://aws.amazon.com/amplify/console/getting-started/) that demonstrate how to do this.

## Further reading

- AWS Amplify framework: [https://aws-amplify.github.io/ ](https://aws-amplify.github.io/)
- AWS Amplify product page: [https://aws.amazon.com/amplify/ ](https://aws.amazon.com/amplify/)
- Awesome AWS Amplify: [https://github.com/dabit3/awesome-aws-amplify ](https://github.com/dabit3/awesome-aws-amplify)
- The AWS AppSync community: [https://github.com/aws/aws-appsync-community ](https://github.com/aws/aws-appsync-community)
- Full code for this lab at [https://github.com/awssgr/voterocket ](https://github.com/awssgr/voterocket)





[^1]: A resolver is a function that converts the GraphQL payload to the underlying storage system protocol and executes if the caller is authorised to invoke it. Resolvers are comprised of **request** and **response mapping** templates, which contain transformation and execution logic. AWS AppSync uses [mapping templates](https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference.html#aws-appsync-resolver-mapping-template-reference), which are written with the [Apache Velocity Template Language (VTL)](https://velocity.apache.org/) and interpreted by AWS AppSync. There is a [resolver mapping template programming guide](https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference-programming-guide.html#aws-appsync-resolver-mapping-template-reference-programming-guide) in the [AWS AppSync Developer Guide](https://docs.aws.amazon.com/appsync/latest/devguide/welcome.html) that covers how to write resolvers in detail.

[^2]: [Amplify Framework Custom Resolvers](https://aws-amplify.github.io/docs/cli/graphql#add-a-custom-resolver-that-targets-a-dynamodb-table-from-model). You also get the benefit of using [DynamoDB atomic counters](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.AtomicCounters)
