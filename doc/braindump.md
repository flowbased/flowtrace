
## Trace dataformat

* Should contain everything needed to reproduce an issue.
Graph, data, components/runtime version identification.
* Should contain information about what caused the dump? (trigger)
* Should have a formal definition/schema
* Should reuse exiting FBP dataformats as much as possible. They are mostly JSON-oriented.
* Should be possible to stream
* Should be easy to support with any FBP runtime. Same tools used by all runtimes.
* Should be easy to manipulate in any language
* Maybe support compression, to keep dump size down?

## Triggering mechanisms

* Manual. Unix signal + FBP network protocol?
Can also be used to implement external triggers, for instance by a service monitoring system.
* Automatic. On exceptions, uncaught errors.
* Batch. Set up that network execution will be dumped beforehand.
* Data-breakpoints

## Data-breakpoints

A functionality that imperative debuggers have is to set breakpoints,
as a marker on a particular instruction/line, potentially with a predicate/expression
for when to trigger.
An analog for FBP/dataflow would be data-breakpoints, where one could set marker
a particular connection/edge. The trigger predicates would be evaluated against.
It may be possible to reuse [fbp-spec assertions](https://github.com/flowbased/fbp-spec) for that, 
or a similar format (should be declarative, runtime independent and serializable).

The data-breakpoint could be used to trigger a flowtrace dump when ran non-interactively.
When having opened a flowtrace dump, it should also be possible to set other breakpoints in the UI.
Such interactive exploration might be seen more as searching/filtering.

Triggering on breakpoints should be handled by the runtime, and setting them up
part of the FBP protocol (as its own capability).

## Buffering

For a long-running network, it is generally not feasible to keep the entire state
since beginning of time around (it case it might be needed).
So it should be possible to specify the (rotating) buffer which is kept.
Ideally both as maximum size usage (in RAM, on disk) and in retention (in seconds/minutes/hours).

Some networks will have huge data payloads traveling through edges.
It might be desirable to drop the payloads first, but keep the information
that something happened on the edge (at given time). 

When data has been truncated or abbreviated, it might be nice with some markers to denote this.


## Relation to stacktrace

As the majority of FBP/dataflow programs have components implemented in
imperative code. So flowtrace is not a substitute for stacktraces.

Hopefully for debugging things on the FBP "level" which sits above,
and what the FBP application developer deals with most of the time,
it will mostly be enough.

Sometimes a combination of flow and stacktraces/coredumps would be useful though.
When debugging issues that occur *inside* a component, as opposed to in the FBP graph.
And especially when components are fairly 'fat' (contains lots of code).

Unlike typical stacktraces, flowtraces can keep 'history', that is to
keep information about events which happened seconds or minutes before.

