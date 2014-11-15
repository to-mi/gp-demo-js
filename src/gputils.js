/** @jsx React.DOM */
var tePointsX = numeric.linspace(-5, 5, numeric.dim(distmatTe)[0]);
var randn = d3.random.normal();
function randnArray(size){
  var zs = new Array(size);
  for (var i = 0; i < size; i++) {
    zs[i] = randn();
  }
  return zs;
}

// ids must be in order of the array
var cfs = [
  {'id': 0,
   'name': 'Exponentiated quadratic',
   'f': function(r, params) {
     return numeric.exp(numeric.mul(-0.5 / (params[0] * params[0]), numeric.pow(r, 2)));
   }
  },
  {'id': 1,
   'name': 'Exponential',
   'f': function(r, params) {
     return numeric.exp(numeric.mul(-0.5 / params[0], r));
   }
  },
  {'id': 2,
   'name': 'Matern 3/2',
   'f': function(r, params) {
     var tmp = numeric.mul(Math.sqrt(3.0) / params[0], r);
     return numeric.mul(numeric.add(1.0, tmp), numeric.exp(numeric.neg(tmp)));
   }
  },
  {'id': 3,
   'name': 'Matern 5/2',
   'f': function(r, params) {
     var tmp = numeric.mul(Math.sqrt(5.0) / params[0], r);
     var tmp2 = numeric.div(numeric.mul(tmp, tmp), 3.0);
     return numeric.mul(numeric.add(numeric.add(1, tmp), tmp2), numeric.exp(numeric.neg(tmp)));
   }
  },
  {'id': 4,
   'name': 'Rational quadratic (alpha=1)',
   'f': function(r, params) {
     return numeric.pow(numeric.add(1.0, numeric.div(numeric.pow(r, 2), 2.0 * params[0] * params[0])), -1);
   }
  },
  {'id': 5,
   'name': 'Piecewise polynomial (q=0)',
   'f': function(r, params) {
     var tmp = numeric.sub(1.0, numeric.div(r, params[0]));
     var dims = numeric.dim(tmp);
     for (var i = 0; i < dims[0]; i++){
       for (var j = 0; j < dims[1]; j++){
         tmp[i][j] = tmp[i][j] > 0.0 ? tmp[i][j] : 0.0;
       }
     }
     return tmp;
   }
  },
  {'id': 6,
   'name': 'Piecewise polynomial (q=1)',
   'f': function(r, params) {
     var tmp1 = numeric.div(r, params[0]);
     var tmp = numeric.sub(1.0, tmp1);
     var dims = numeric.dim(tmp);
     for (var i = 0; i < dims[0]; i++){
       for (var j = 0; j < dims[1]; j++){
         tmp[i][j] = tmp[i][j] > 0.0 ? tmp[i][j] : 0.0;
       }
     }
     return numeric.mul(numeric.pow(tmp, 3), numeric.add(numeric.mul(3.0, tmp1), 1.0));
   }
  },
  {'id': 7,
   'name': 'Periodic (period=pi)',
   'f': function(r, params) {
     return numeric.exp(numeric.mul(-2.0/(params[0]*params[0]), numeric.pow(numeric.sin(r), 2)));
   }
  },
  {'id': 8,
   'name': 'Periodic (period=1)',
   'f': function(r, params) {
     return numeric.exp(numeric.mul(-2.0/(params[0]*params[0]), numeric.pow(numeric.sin(numeric.mul(Math.PI, r)), 2)));
   }
  }
];

function GP(cf, params, id, dmTr, dmTeTr, trY) {
  var M = numeric.dim(distmatTe)[1];

  this.z = randnArray(M);
  this.p = randnArray(M);
  this.cf = cf;
  this.params = params;
  this.id = id;

  this.Kte = cfs[this.cf].f(distmatTe, params);

  var tmp = computeProjection(this.Kte, this.cf, this.params, dmTr, dmTeTr, trY);
  this.proj = tmp.proj;
  this.mu = tmp.mu;
  this.sd95 = tmp.sd95;
}


function computeProjection(Kte, cf, params, dmTr, dmTeTr, trY) {
  var Mtr = numeric.dim(dmTr)[0];
  var Mte = numeric.dim(distmatTe)[0];

  if (Mtr > 0){
    var Kxx_p_noise = cfs[cf].f(dmTr, params);
    for (var i = 0; i < Mtr; i++){
      Kxx_p_noise[i][i] += params[1];
    }

    var svd1 = numeric.svd(Kxx_p_noise);
    for (var i = 0; i < Mtr; i++){
      if (svd1.S[i] > numeric.epsilon){
        svd1.S[i] = 1.0/svd1.S[i];
      } else {
        svd1.S[i] = 0.0;
      }
    }

    var tmp = numeric.dot(cfs[cf].f(dmTeTr, params), svd1.U);
    // there seems to be a bug in numeric.svd: svd1.U and transpose(svd1.V) are not always equal for a symmetric matrix
    var mu = numeric.dot(tmp, numeric.mul(svd1.S, numeric.dot(numeric.transpose(svd1.U), trY)));
    var cov = numeric.dot(tmp, numeric.diag(numeric.sqrt(svd1.S)));
    cov = numeric.dot(cov, numeric.transpose(cov));
    cov = numeric.sub(Kte, cov);
    var svd2 = numeric.svd(cov);
    for (var i = 0; i < Mte; i++){
      if (svd2.S[i] < numeric.epsilon){
        svd2.S[i] = 0.0;
      }
    }
    var proj = numeric.dot(svd2.U, numeric.diag(numeric.sqrt(svd2.S)));
    var sd95 = numeric.mul(1.98, numeric.sqrt(numeric.getDiag(numeric.dot(proj, numeric.transpose(proj)))));
  } else {
    var sd95 = numeric.mul(1.98, numeric.sqrt(numeric.getDiag(Kte)));
    var svd = numeric.svd(Kte);
    var proj = numeric.dot(svd.U, numeric.diag(numeric.sqrt(svd.S)));
    var mu = numeric.rep([Mte], 0);
  }

  return { proj: proj, mu: mu, sd95: sd95 };
}

function recomputeProjections(GPs, dmTr, dmTeTr, trY) {
  for (var gpi = 0; gpi < GPs.length; gpi++){
    var gp = GPs[gpi];
    var tmp = computeProjection(gp.Kte, gp.cf, gp.params, dmTr, dmTeTr, trY);
    gp.proj = tmp.proj;
    gp.mu = tmp.mu;
    gp.sd95 = tmp.sd95;
    GPs[gpi] = gp;
  }

  return GPs;
}

function computeDistanceMatrix(xdata1, xdata2) {
  var dm = numeric.rep([xdata1.length,xdata2.length], 0);
  for (var i = 0; i < xdata1.length; i++){
    for (var j = 0; j < xdata2.length; j++){
      var val = Math.abs(xdata2[j] - xdata1[i]);
      dm[i][j] = val;
    }
  }
  return dm;
}

var GPAxis = React.createClass({
  render: function() {
    return (<svg></svg>);
  },
  shouldComponentUpdate: function() { return false; },
  drawTrPoints: function(pointsX, pointsY) {
    var x = this.scales.x; 
    var y = this.scales.y;
    var p = this.trPoints.selectAll("circle.trpoints")
                         .data(d3.zip(pointsX, pointsY))
                         .attr("cx", function(d) { return x(d[0]); })
                         .attr("cy", function(d) { return y(d[1]); });
    p.enter().append("circle")
             .attr("class", "trpoints")
             .attr("r", 2)
             .attr("cx", function(d) { return x(d[0]); })
             .attr("cy", function(d) { return y(d[1]); });
    p.exit().remove();
  },
  animationId: 0,
  componentWillReceiveProps: function(props) {
    // bind events
    if (props.state.addTrPoints) {
      d3.select(this.getDOMNode()).on("click", this.addTrPoint);
    } else {
      d3.select(this.getDOMNode()).on("click", null);
    }
    // redraw training points
    this.drawTrPoints(props.state.trPointsX, props.state.trPointsY);

    this.drawMeanAndVar(props);

    if (this.props.state.showSamples !== props.state.showSamples){
      this.drawPaths(props);
    }

    if (this.props.state.samplingState !== props.state.samplingState){
      clearInterval(this.animationId);
      if (props.state.samplingState === 1){
        this.animationId = setInterval((function() { this.updateState(); this.drawPaths(); }).bind(this), 500);
      } else if (props.state.samplingState === 2){
        this.animationId = setInterval((function() { this.contUpdateState(); this.drawPaths(); }).bind(this), 50);
      }
    }
  },
  addTrPoint: function() {
    var mousePos = d3.mouse(this.getDOMNode());
    var x = this.scales.x;
    var y = this.scales.y;

    // x is transformed to a point on a grid of 200 points between -5 and 5
    this.props.addTrPoint(Math.round((x.invert(mousePos[0]-50)+5)/10*199)/199*10-5, y.invert(mousePos[1]-50));
  },
  updateState: function() {
    var M = numeric.dim(distmatTe)[1];
    for (var i = 0; i < this.props.state.GPs.length; i++){
      var gp = this.props.state.GPs[i];
      gp.z = randnArray(M);
    }
  },
  stepState: 0,
  contUpdateState: function() {
    var M = numeric.dim(distmatTe)[1];
    var alfa = 1.0-this.props.state.alfa;
    var n_steps = this.props.state.NSteps;
    var t_step = this.props.state.stepSize / n_steps;
    this.stepState = this.stepState % n_steps;

    for (var i = 0; i < this.props.state.GPs.length; i++){
      var gp = this.props.state.GPs[i];

      // refresh momentum: p = alfa * p + sqrt(1 - alfa^2) * randn(size(p))
      if (this.stepState == (n_steps-1))
        gp.p = numeric.add(numeric.mul(alfa, gp.p), numeric.mul(Math.sqrt(1 - alfa*alfa), randnArray(M)));

      var a = gp.p.slice(0),
          b = gp.z.slice(0),
          c = numeric.mul(-1, gp.z.slice(0)),
          d = gp.p.slice(0);

      gp.z = numeric.add(numeric.mul(a, Math.sin(t_step)), numeric.mul(b, Math.cos(t_step)));
      gp.p = numeric.add(numeric.mul(c, Math.sin(t_step)), numeric.mul(d, Math.cos(t_step)));
    }
    this.stepState = this.stepState + 1;
  },
  drawMeanAndVar: function(props) {
    var gpline = this.gpline;
    if (props.state.showMeanAndVar){
      var gps = props.state.GPs;
    } else {
      var gps = [];
    }

    var paths = this.meanLines.selectAll("path").data(gps, function (d) { return d.id; })
                          .attr("d", function (d) {
                            var datay = d.mu;
                            return gpline(d3.zip(tePointsX, datay));
                          });
    paths.enter().append("path").attr("d", function (d) {
                                   var datay = d.mu;
                                   return gpline(d3.zip(tePointsX, datay));
                                 })
                                .attr("class", function(d) {
                                   return "muline line line"+d.id;
                                 });
    paths.exit().remove();

    var pathsUp = this.upSd95Lines.selectAll("path").data(gps, function (d) { return d.id; })
                          .attr("d", function (d) {
                            var datay = numeric.add(d.mu, d.sd95);
                            return gpline(d3.zip(tePointsX, datay));
                          });
    pathsUp.enter().append("path").attr("d", function (d) {
                                   var datay = numeric.add(d.mu, d.sd95);
                                   return gpline(d3.zip(tePointsX, datay));
                                 })
                                .attr("class", function(d) {
                                   return "sdline line line"+d.id;
                                 });
    pathsUp.exit().remove();

    var pathsDown = this.downSd95Lines.selectAll("path").data(gps, function (d) { return d.id; })
                          .attr("d", function (d) {
                            var datay = numeric.sub(d.mu, d.sd95);
                            return gpline(d3.zip(tePointsX, datay));
                          });
    pathsDown.enter().append("path").attr("d", function (d) {
                                   var datay = numeric.sub(d.mu, d.sd95);
                                   return gpline(d3.zip(tePointsX, datay));
                                 })
                                .attr("class", function(d) {
                                   return "sdline line line"+d.id;
                                 });
    pathsDown.exit().remove();
  },
  drawPaths: function(props) {
    if (!props) var props = this.props;
    var gpline = this.gpline;
    if (props.state.showSamples){
      var gps = props.state.GPs;
    } else {
      var gps = [];
    }
    var paths = this.lines.selectAll("path").data(gps, function (d) { return d.id; })
                          .attr("d", function (d) {
                            var datay = numeric.add(numeric.dot(d.proj, d.z), d.mu);
                            return gpline(d3.zip(tePointsX, datay));
                          });
    paths.enter().append("path").attr("d", function (d) {
                                   var datay = numeric.add(numeric.dot(d.proj, d.z), d.mu);
                                   return gpline(d3.zip(tePointsX, datay));
                                 })
                                .attr("class", function(d) {
                                   return "line line"+d.id;
                                 });
    paths.exit().remove();
  },
  scales: { x: null, y: null },
  componentDidMount: function() {
    var svg = d3.select(this.getDOMNode());
    var height = svg.attr("height"),
        width  = svg.attr("width");
    if (!height) {
      height = 300;
      svg.attr("height", height);
    }
    if (!width) {
      width = 500;
      svg.attr("width", width);
    }
    var margin = 50;
    svg = svg.append("g")
             .attr("transform", "translate("+margin+","+margin+")");
    this.svg = svg;
    var fig_height = height - 2*margin,
        fig_width  = width  - 2*margin;

    // helper functions
    var x = d3.scale.linear().range([0, fig_width]).domain([-5, 5]);
    var y = d3.scale.linear().range([fig_height, 0]).domain([-3, 3]);
    this.scales.x = x;
    this.scales.y = y;
    var xAxis = d3.svg.axis()
                      .scale(x)
                      .orient("bottom");
    var yAxis = d3.svg.axis()
                      .scale(y)
                      .orient("left");
    this.gpline = d3.svg.line()
                        .x(function(d) { return x(d[0]); })
                        .y(function(d) { return y(d[1]); });

    // axes
    svg.append("g")
       .attr("class", "x axis")
       .attr("transform", "translate(0,"+fig_height+")")
       .call(xAxis);

    svg.append("g")
       .attr("class", "y axis")
       .call(yAxis);

    this.meanLines = svg.append("g");
    this.upSd95Lines = svg.append("g");
    this.downSd95Lines = svg.append("g");
    this.lines = svg.append("g");
    this.trPoints = svg.append("g");
    this.drawTrPoints(this.props.state.trPointsX, this.props.state.trPointsY);
    this.drawPaths();
  }
});


var GPList = React.createClass({
  render: function() {
    var delGP = this.props.delGP;
    var gplist = this.props.GPs.map(function (gp) {
      return (<tr key={gp.id}>
                <td className={"tr"+gp.id}>{gp.id}</td><td>{cfs[gp.cf].name}</td><td>{gp.params[0].toFixed(2)}</td><td>{gp.params[1].toFixed(2)}</td><td><button onClick={delGP(gp.id)}>remove</button></td>
              </tr>);
    });
    return (<tbody>{gplist}</tbody>);
  }
});
