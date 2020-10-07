/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const common = require('./common');

const debug = require('debug')('flowtrace:performance');


const svg = {
  node(type, attributes, children) {
    let attrs = "";
    for (let k in attributes) {
      const v = attributes[k];
      attrs += `${k}=\"${v}\"\n`;
    }
    return `<${type} \n${attrs} >${children}</${type}>`;
  },
  line(x0, y0, width, height) {
    return `m ${x0},${y0} ${width},${height}`;
  }
};

const extractFlows = function(graph) {
  // PERF: consider keeping around the process-sorted-connections
  const targetConnections = name => graph.connections.filter(c => // IIPs don't count
  c.src.process && c.tgt.process === name);
  const sourceConnections = name => graph.connections.filter(c => // IIPs don't count
  (c.src != null ? c.src.process : undefined) === name);

  // XXX: pretty sure this has serious bugs
  var walkConnectionGraph = function(start, collect, flow) {
    if (flow == null) { flow = []; }
    const outs = sourceConnections(start);
    debug('w', start, outs.length, flow.length);
    for (let c of Array.from(outs)) {
      const tgt = c.tgt.process;
      const subs = walkConnectionGraph(tgt, collect, flow);
      if (subs.length === 0) {
        // end of a flow, collect and reset
        if (collect) { collect(flow); }
        flow = [];
      } else {
        flow.unshift(c);
      }
    }

    return outs;
  };

  const flows = [];

  // find starting points
  for (let process in graph.processes) {
    const data = graph.processes[process];
    const ins = targetConnections(process);
    const outs = sourceConnections(process);
    //debug 'c', process, ins.length, outs.length
    const startProcess = ins.length === 0;
    if (!startProcess) { continue; }

    walkConnectionGraph(process, flow => flows.push(flow));
  }

  return flows;
};

// Notes on graphs and color 
// http://www.perceptualedge.com/articles/visual_business_intelligence/rules_for_using_color.pdf

const renderFlow = function(flow, times) {
  let conn, p;
  let objects = [];

  const style = {
    baseHeight: 20,
    dividerHeightFraction: 0.2,
    divider: "stroke:#000000;stroke-opacity:1",
    rect: "fill:#77cdb8;fill-opacity:1",
    unitSeconds: 100
  };
  style.dividerHeight = style.baseHeight*(1+style.dividerHeightFraction);


  // XXX: should times be based on process.port combo instead of just process?

  // calculate total and weights
  const weights = {};
  let totalTime = 0;
  for (conn of Array.from(flow)) {
    totalTime += times[conn.src.process];
  }
  
  debug('total time', totalTime);

  for (conn of Array.from(flow)) {
    p = conn.src.process;
    weights[p] = times[p]/totalTime;
  }

  let xPos = 0;
  const yPos = 0;
  const rects = [];
  const dividers = [];
  const labels = [];
  for (conn of Array.from(flow)) {
    p = conn.src.process;
    const weight = weights[p];
    debug('weight', p, weight);

    const width = times[p] * style.unitSeconds;
    const height = style.baseHeight;
    const nextPos = xPos + width;
    const rect = svg.node('rect', { x: xPos, y: yPos, width, height, style: style.rect });
    const dHeight = style.dividerHeight;
    const dBase = yPos-((style.baseHeight*style.dividerHeightFraction)/2);
    const divider = svg.node('path', {d: svg.line(nextPos, dBase, 0, dHeight), style: style.divider});

    const midX = (xPos+nextPos)/2;

    const timeMs = (times[p]*1000).toFixed(0);
    const percent = (weights[p]*100).toFixed(1);
    const t = "rotate(-270)"; // flips X and Y
    const label = svg.node('text', { transform: t, y: -midX, x: yPos+10 }, `${p}: ${timeMs} ms (${percent}%)`);

    rects.push(rect);
    dividers.push(divider);
    labels.push(label);
    xPos = nextPos;
  }

  // need to take care of order so clipping is right
  objects = objects.concat(rects);
  objects = objects.concat(dividers);
  objects = objects.concat(labels);

  return objects;
};

// Render timelines of a FBP flow, with size of each process proportional to the time spent in that process
// TODO: also render secondary flows
// MAYBE: render forks and joins
// MAYBE: support average and variance? Or perhaps this should be done by the tool before. Percentile is also interesting
const renderTimeline = function(graph, times) {
  let objects = [];

  debug('processes', Object.keys(graph.processes));

  let flows = extractFlows(graph);
  flows = flows.sort((a, b) => a.length > b.length);
  const flow = flows[0]; // longest


  const pretty = flow.map(c => `${c.src.process}.${c.src.port} -> ${c.tgt.process}.${c.tgt.port}`);
  debug('rendering flow', pretty);

  objects = objects.concat(renderFlow(flow, times));

  const output = `<svg>${objects.join('\n')}</svg>`;

  return output;
};

const main = function() {
  const [_node, _script, graphfile] = Array.from(process.argv);

  // TODO: accept times on commandline
  const times = {
    'pre': 1.00,
    'queue': 2.50,
    'download': 0.50,
    'scale': 0.50,
    'calc': 2.50,
    'load': 2.50,
    'save': 0.20,
    'uploadOutput': 0.2
  };

  const callback = function(err, result) {
    if (err) {
      console.error(err);
      if (err.stack) { console.error(err.stack); }
      return process.exit(2);
    } else {
      debug('output\n', result.length);
      console.log(result);
      return process.exit(0);
    }
  };

  return common.readGraphFile(graphfile, {}, function(err, graph) {
    if (err) { return callback(err); }
    const out = renderTimeline(graph, times);
    return callback(null, out);
  });
};

if (!module.parent) { main(); }
