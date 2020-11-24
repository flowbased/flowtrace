Flowtrace
=========

A `flowtrace` is a persisted record of the execution of an Flow-based Programming (FBP) or dataflow program.
It is used for retroactive (after-the-fact) debugging; to locate, understand and fix bugs. 

The concept is analogous to a 'stacktrace' or 'core dump' for imperative code.

This project provides a data format to store traces in, and provide debugging tools for working with these traces, as well as JavaScript library for recording and producing them.

## Status

In production

* [NoFlo](https://github.com/noflo/noflo) has support for creating flowtraces from 1.3.0 onwards. Can be triggered programmatically, via fbp-protocol, or with the [noflo-nodejs](https://github.com/noflo/noflo-nodejs) command-line tool
* [fbp-spec 0.8](https://github.com/flowbased/fbp-spec) has support for capturing flowtraces of test runs
* Several commandline tools exist for working with flowtraces
* Note: File format not 100% finalized

See [braindump](./doc/braindump.md) for ideas/plans.

## Installing

First make sure you have [Node.js](http://nodejs.org/) with NPM installed.

To install locally in a project. Recommended.

    npm install flowtrace

To install globally on your system

    npm install -g flowtrace

## Display flowtrace on commandline

`flowtrace-show` reads a flowtrace, and renders a human-friendly log output from it.

    npx flowtrace-show mytrace.flowtrace.json

Example output:

```
-> IN repeat CONN
-> IN repeat DATA hello world
-> IN stdout CONN
-> IN stdout DATA hello world
-> IN repeat DISC
-> IN stdout DISC
```

When used in a terminal, supports colors.

## Show a flowtrace in Flowhub

`flowtrace-replay` reads a flowtrace, and then acts as a live FBP runtime. That means it can be used with
any FBP IDEs/client which support the [FBP runtime protocol](http://noflojs.org/documentation/protocol/).

    npx flowtrace-replay mytrace.flowtrace.json

By default this will open [Flowhub](https://app.flowhub.io) in your browser, automatically connect and show you the graph.
To replay the data press the play button. You should then see the data flowing through edges.

![Flowtrace replayed in Flowhub](./doc/flowtrace-replay-flowhub.png)

You can specify which `--ide` to use, and disable automatic opening of browser with `-n`.

    npx flowtrace-replay --ide http://localhost:8888 -n

You can also set the `--host` and `--port`. See `--help` for all options.

## Recording flowtraces in JavaScript

It is possible to use this library for recording and serializing flowtraces. Quick example:

```javascript
const { Flowtrace } = require('flowtrace');

const tracer = new Flowtrace({
  // metadata about this run
});

// Register the main graph you're tracing
tracer.addGraph('example', myGraph, true);
// You should also call addGraph for each subgraph that is running

myProgram.on('packet', (packet) => {
  // Tell Flowtracer about each packet that arrives
  tracer.addNetworkpacket('network:data', packet.src, packet.tgt, 'example', packet.data);
});

myProgram.on('end', () => {
  // Once your program is finished (or errors), you can dump the Flowtrace
  const myTrace = tracer.toJSON();
  fs.writeFile('example.flowtrace.json', myTrace, (err) => {
    // ...
  });
});
```

See the `src/lib/Flowtrace.js` file for more information.
