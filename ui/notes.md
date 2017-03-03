
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
- Show data not associated with any groups
- Show data by matching on data payload
- As new data comes in, query results should update

Testing

- See start/end markers of test runs
- See how a particular test run failed. Compare actual values on edge, with expected
- Compare edge data for two different test runs

Data recording

- Ability to control which edges data is being collected on
- Ability to configure data-breakpoints on edge, triggered by runtime

# Minimum for Flowhub 0.15 parity

* Can add selected edged to timeline
* Can remove an edge from timeline
* Timeline can show when data packets happen
* Can scroll viewport of timeline forward and backwards
* Packets are shown in real-time as they come in, if viewport is not looking at past
* Can see the data of two different edges simultaniously, for comparison
* (maybe) short data is shown as text inline in timeline?
* (maybe) can clear the data manually. 

Maybe add/remove should be "favoriting", ie it puts the trace up top of timeline results. But other traces still visible further down.
In future it might be nice to control "recording" state separately.

# Datastructure

Viewport
  width: pixels
  height: pixels
  start: Date
  end: Date

DataSeries
  events: [ Event ], sorted in time
  edge: FbpEdge
  favorite: true/false

Event
  type: 'data'|'endgroup'|'begingroup'
  payload: ...

Config:
  datadot.width
  series.height

In
  series: [ DataSeries ]
  viewport: Viewport
  config: Config

# Validation

* Show data without groups. Highly probable to be bug in concurrent NoFlo graphs


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
- Additional markers should be possible to inject by analysis tools.
Examples: 

## Graph

- should be able to show current/filtered data directly on edge.
HACK: overlay it by inspecting the positions of nodes.

## Details

## Visualization plugins

* Registration of plugin by declaring ability to handle a given 'datatype'
and capabilities: 'view', 'diff', 'edit'
* Put datatype of data into network:data packets.
Datatype can be URL to (JSON) schema.
Ideally they would be in NoFlo IP packets also. Or rather, they would have to be?
* A JSON schema can also register visualizer plugin(s), by providing URLs to them
* noflo-ui should bundle a super-basic set of plugins. 'string', 'number', 'object' and array-of these
* Component libraries can/should specify plugins for their particular datatypes
* Plugins should be served as offline-capable
* Dimensions/styling passed in via URL params
* Plugin loaded as iframe using registered URL
* Plugin<->host communication over `postMessage`?
* TODO: check for prior art, existing libraries/frameworks
* Should be reusable outside flowtrace/noflo-ui, ideally also outside FBP
* Plugins should also be able to provide custom text-renderers.
* `flowtrace-show` etc should be able to use these, but also noflo-ui. Both for inline/small-viz,
and in case this is only visualizer provided.


# UX ideas

## Semi-modal 'context' overlays.
Foreground/primary view goes from 100% to maybe 50%,
'context/secondary' - but all main info stays in view.
To be feasible, need to keep aspect ratio of main view.
For instance, by using 33% horizontal top/bottom-bar + 33% vertical sidebar.

Example usage: bring up tests or component view around graph/timeline

## Forward/backward propagation

Select edge, and a particular 'run'/data on that edge. For instance an error
Will then show all the data which belongs *to that particular execution*,
directly on the edges in the graph. Both before (dependencies) and after (consequences).
Requires reconstructing from scope/groups/brackets?

