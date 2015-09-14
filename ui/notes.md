
# Usecases/requirements

Grouped by functional area. Ordered roughly in order of importance (within groups, between groups).
Many of these overlap strongly with the general needs when developing and debugging.

General

- See start/end of network runs, over time
- See connect/disconnect on an edges, over time
- Select data on edge at particular time, introspect/view details
- Ability to select which edges of graph is being looked at. Persistent between view changes

Data visualization

- Generic support for showing any FBP/JSON data
- Ability to have specific visualizations for particular data-structures

Subgraphs

- When navigating down into subgraph, timeline changes to show data from this graph.
- Some way of tracing data . Is keeping the cursor on same time/object enough?

Comparisons

- Compare data on edge at two different times (possibly from different testrun/request etc)
- Compare data on two different edges. Maybe latest with-respect to timeline cursor

Search & filter

- Show only data associated with a particular group
- Show data not only associated with any groups
- Show data by matching on data payload
- As new data comes in, 

Testing

- See start/end markers of test runs
- See how a particular test run failed. Compare actual values on edge, with 
- Compare edge data for two different test runs

Breakpoints

- Ability to configure data-breakpoints on edge, triggered by runtime
- 



# Implementation

## Architecture

- UI split into two major pieces
* Timeline. Time-centric view of whole network activity. Markers for data/groups/connect netstart/netstop
* Data details. Visualizes the selected data, or compares two selected pieces of data

## Timeline

- Network change markers should support metadata.
Especially useful is a short 'reason', and a 'shortlog' describing the changes.
Possibility of linking to a 'diff view' for details of change.
Example: a change in the testsuite, or a change in a component causing test to re-run

## Visualization plugins

* Registration of plugin by declaring ability to handle a given 'datatype'
and capabilities: 'view', 'diff', 'edit'
* Put datatype of data into network:data packets.
Datatype can be URL to (JSON) schema, which can also register visualizer plugin(s)
* noflo-ui provides a super-basic set of plugins. 'string', 'number', 'object' and array-of these
* Component libraries can/should specify plugins for their particular datatypes
* Plugins should be served as offline-capable
* Dimensions/styling passed in via URL params
* Plugin loaded as iframe using registered URL
* Plugin<->host communication over `postMessage`?
* TODO: check for prior art, existing libraries/frameworks
* Should be reusable outside flowtrace/noflo-ui, ideally also outside FBP


# UX ideas

- Semi-modal 'context' overlays.
Foreground/primary view goes from 100% to maybe 50%,
'context/secondary' - but all main info stays in view.
To be feasible, need to keep aspect ratio of main view.
For instance, by using 33% horizontal top/bottom-bar + 33% vertical sidebar.

Example usage: bring up tests or component view around graph/timeline


