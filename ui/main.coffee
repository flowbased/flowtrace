flowtrace = require 'flowtrace/src/index' if not flowtrace

React = window.React

# fbp-spec UI library
widgets = {} # TEMP: move into own file

# List of tests
{ div, label, span } = React.DOM
class DetailsClass
  render: () ->
    (div {className: 'details'}, [
      label { className: 'name' }, 'test'
    ])
widgets.Details = React.createFactory DetailsClass

class TimelineClass
  render: () ->
    (div {}, [
      label { className: 'name' }, 'test'
    ])
widgets.Timeline = React.createFactory TimelineClass


# DOM helpers
id = (name) ->
  document.getElementById name

# Main
main = () ->
  console.log 'main'

  onChange = (app) ->
    React.render (widgets.Timeline {trace: app.trace}), id('timeline')
    React.render (widgets.Details {trace: app.trace}), id('details')
    console.log 'render'

  url = '/115731-28179-v85af2.json'
  loadTrace = () ->
    flowtrace.trace.loadHttp url, (err, trace) ->
      console.log 'load', err, Object.keys(trace)
      app =
        trace: trace
      onChange app

  setTimeout loadTrace, 100
  console.log 'main done'

main()
