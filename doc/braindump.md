
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

Q

* Should it be possible to store traces of multiple networks in one trace?
Usecases: subgraphs, multiple top-level networks in one program

## Triggering mechanisms

* Manual, local on system. Unix signal
* Remote over network. FBP network protocol / messagequeue
Can be used to trigger manually, or to implement external triggers, for instance by a service monitoring system.
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

## Event store

Flowtraces are currently serialized files of one or more network execution of a single runtime.
However, in order to fully utilize the data in them, being able to store them all in a query-able
database would be beneficial.
This is especially for analysis which require data from different traces:
across multiple network invocations, different machines and versions of the software.

It should be possible to stream the data directly to such an event store from production machines.
However the store should probably be the primary interface for analysis, with flowtrace files
being imported in before doing non-trivial analysis on it.

### Usecases

* Allow to lookup data for any production failure. Look at it, compare it against cases which did not fail.
* Deduplicate production failures reported into a single bug, by finding which follow a common pattern.
Also to estimate the impact of a single bug.
* Do performance analytics. Both coarse-grained and fine-grained. Find hotspots and hickups.
* (maybe) allow to perform invariant-based testing of components, by searching
for input/output data in DB, and checking preconditions/postconditions.
* (maybe) automatically generating minimal testcases

Traces are *primarily meta-data* about the execution of an FBP system.
However, such an event store may also be used to store *data* from the system.
For instance to store sensor data, computation results and analytics.

### Possible SQL representation

SQL has the advantage that many very scalable solutions and techniques exists for it.
Thanks to IndexedDB one can also use it in the browser, which is interesting for interactive exploration and analysis.

Events table

    id: UUID | identifier for this event
    time: DateTime | When the event was created
    event: string | Type of event. Typically "data"

    runtime: UUID | id of the FBP runtime this event comes from
    component: string | component (or subgraph) this event originated in
    networkpath: string | Path of the network (@component instance) from top-level of @runtime. Ex: "subsystem.mymodule.performfoo"
    sourcenode: string | Name of node @data was sent *from*
    sourceport: string | Port the @data was sent *from*
    targetnode: string | Name of node @data twas sent *to*
    targetport: string | Port the @data was sent *to*

    json: JSON | data in JSON representation
    blob: Blob | data as a binary blob, if it cannot be represented as JSON

    # TODO: specify versioning information

There should also be some versioning information.
Possibly this could be some hash (git SHA?) on the runtime level.
Would then have to lookup details on component/dependency version

