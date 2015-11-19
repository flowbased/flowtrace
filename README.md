
# Flowtrace

A `flowtrace` is a persisted record of the execution of an Flow-based Programming (FBP) or dataflow program.
It is used for retroactive (after-the-fact) debugging; to locate, understand and fix bugs. 

The concept is analogous to a 'stacktrace' or 'core dump' for imperative code.

This project will define a data format to store traces in,
and provide debugging tools for working with these traces.

## Status
Prototype

* File format not finalized
* NoFlo has experimental support for storing `.flowtrace.json` files
* Some commandline tools exist for working with flowtraces
* Some not-yet-useful UI prototypes exist

See [braindump](./doc/braindump.md) and [UI notes](./ui/notes.md) for ideas/plans.


## Commandline tools

    flowtrace-show: Read a .flowtrace file, show its contents in a human-friendly way

    flowtrace-replay: Read a .flowtrace, play back the events over FBP runtime protocol as if it was a live runtime

