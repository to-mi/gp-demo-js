Gaussian process regression demo in Javascript
==============================================

This repository contains code for a Gaussian process regression demonstration in Javascript. See http://www.tmpl.fi/gp/ for the live version.

The code depends on the following javascript libraries, which are not included in this repository:

 * [React](http://facebook.github.io/react/)
 * [D3.js](http://d3js.org)
 * [Numeric.js](http://www.numericjs.com/)


Simulation of continuous trajectories
-------------------------------------

Continuous trajectories are simulated using Hamiltonian Monte Carlo (HMC) with partial momentum refreshment and analytically solved dynamics for the Gaussian posterior distribution.

For an excellent HMC reference, see: Radford M. Neal, _MCMC using Hamiltonian dynamics_. [arXiv:1206.1901](http://arxiv.org/abs/1206.1901), 2012.

Contact
-------

E-mail: tomi.peltola@aalto.fi

License
-------

MIT. See `LICENSE`.
