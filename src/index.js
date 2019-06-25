import React from 'react';
import ReactDOM from 'react-dom';

import { ChemSpectraClient } from './lib/index';

import './style/svg.css';

// - - - DOM - - -
ReactDOM.render(
  <ChemSpectraClient />,
  document.getElementById('root'),
);
