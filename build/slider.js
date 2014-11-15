/** @jsx React.DOM */
var Slider = React.createClass({displayName: 'Slider',
  render: function() {
    // Just insert the svg-element and render rest in componentDidMount.
    // Marker location is updated in componentWillReceiveProps using d3.
    return (React.DOM.svg(null));
  },
  shouldComponentUpdate: function() { return false; }, // Never re-render.
  componentDidMount: function() {
    var val = this.props.value;
    var setVal = this.props.setValue;
    var opt = this.props.opt;

    // set defaults for options if not given
    if (!opt.width) opt.width = 200;
    if (!opt.height) opt.height = 20;
    if (!opt.step) {
      opt.round = function(x) { return x; }
    } else {
      opt.round = function(x) { return Math.round(x / opt.step) * opt.step; }
    }
    if (!opt.min) opt.min = opt.round(0);
    if (!opt.max) opt.max = opt.round(1);
    if (opt.min > opt.max) {
      var tmp = opt.min;
      opt.min = opt.max;
      opt.max = tmp;
    }
    if (val > opt.max) setVal(opt.max);
    if (val < opt.min) setVal(opt.min);

    // calculate range
    var markerRadius = opt.height * 0.5;
    var x1 = markerRadius;
    var x2 = opt.width - markerRadius;

    // d3 helpers
    var scale = d3.scale.linear()
                         .domain([opt.min, opt.max])
                         .range([x1, x2]);
    this.scale = scale;
    var setValFromMousePos = function(x) {
      setVal(opt.round(scale.invert(Math.max(x1, Math.min(x2, x)))));
    };
    var dragmove = function() {
      setValFromMousePos(d3.event.x);
    };
    var drag = d3.behavior.drag().on("drag", dragmove);

    // bind d3 events and insert background line and marker
    var svg = d3.select(this.getDOMNode());
    svg.attr("class", "slider")
       .attr("width", opt.width)
       .attr("height", opt.height)
       .on("click", function () { setValFromMousePos(d3.mouse(this)[0]); });
    svg.append("line")
       .attr("x1", x1)
       .attr("x2", x2)
       .attr("y1", "50%")
       .attr("y2", "50%")
       .attr("class", "sliderbg");
    this.marker = svg.append("circle")
                     .attr("cy", "50%")
                     .attr("r", markerRadius)
                     .attr("class", "slidermv")
                     .datum(val)
                     .attr("cx", function (d) { return scale(d); })
                     .call(drag);
  },
  componentWillReceiveProps: function(props) {
    // update the marker location on receiving new props
    var scale = this.scale;
    this.marker.datum(props.value)
               .attr("cx", function (d) { return scale(d); });
  }
});

