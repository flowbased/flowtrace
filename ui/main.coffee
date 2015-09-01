flowtrace = require 'flowtrace/src/index' if not flowtrace

React = window.React

# fbp-spec UI library
widgets = {} # TEMP: move into own file

# List of tests
{ div, label, span, textarea } = React.DOM
class DetailsClass
  render: () ->
    textarea { className: 'data', readOnly: true, spellcheck: false }, JSON.stringify @props.selection.payload, null, 2

widgets.Details = React.createFactory DetailsClass

class TimelineClass
  render: () ->
    (div {}, [
      label { className: 'name' }, 'test'
    ])
widgets.Timeline = React.createFactory TimelineClass

getEvents = (trace, predicate) ->
  trace.events.filter predicate


# DOM helpers
id = (name) ->
  document.getElementById name

# Main
main = () ->
  console.log 'main'

  onChange = (app) ->
    React.render (widgets.Timeline {trace: app.trace}), id('timeline')
    React.render (widgets.Details {trace: app.trace, selection: app.selection}), id('details')
    console.log 'render'

  url = '/115731-28179-v85af2.json'
  loadTrace = () ->
    flowtrace.trace.loadHttp url, (err, trace) ->
      console.log 'load', err, Object.keys(trace)
      dataEvents = getEvents(trace, (e) -> e.command == 'data')
      app =
        trace: trace
        selection: dataEvents[dataEvents.length-1]
      onChange app

  setTimeout loadTrace, 100
  console.log 'main done'

main()
