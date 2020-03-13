import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { SpectraEditor, FN } from 'react-spectra-editor';

import { saveFileInit } from '../actions/action_file';
import { predictInit, predictToWriteInit } from '../actions/action_predict';
import { updateDesc } from '../actions/action_desc';
import { RmDollarSign } from '../utils/helper';

const titleStyle = {
  backgroundColor: '#f5f5f5',
  border: '2px solid #e3e3e3',
  borderRadius: '10px',
  height: 250,
  lineHeight: '250px',
  marginTop: 100,
  textAlign: 'center',
};

const txtStyle = {
  lineHeight: '200px',
};

const containerStyle = {
  margin: '5px 0 0 0',
};

const editorStyle = {
  border: '1px solid',
  borderRadius: '8px',
  margin: '5px 0 0 60px',
};

const renderTitle = () => (
  <div style={titleStyle}>
    <h1 style={txtStyle}>
      Welcome to ChemSpectra
    </h1>
  </div>
);

class Content extends React.Component {
  constructor(props) {
    super(props);

    this.writeMpy = this.writeMpy.bind(this);
    this.writePeak = this.writePeak.bind(this);
    this.formatPks = this.formatPks.bind(this);
    this.formatMpy = this.formatMpy.bind(this);
    this.checkWriteOp = this.checkWriteOp.bind(this);
    this.saveOp = this.saveOp.bind(this);
    this.predictOp = this.predictOp.bind(this);
    // this.updatInput = this.updatInput.bind(this);
    this.buildOpsByLayout = this.buildOpsByLayout.bind(this);
    this.buildForecast = this.buildForecast.bind(this);
  }

  formatPks({
    peaks, layout, shift, isAscend, decimal, isIntensity,
  }) {
    const { fileSt } = this.props;
    const { entity } = FN.buildData(fileSt.jcamp);
    const { features } = entity;
    const { maxY, minY } = Array.isArray(features) ? {} : (features.editPeak || features.autoPeak);
    const boundary = { maxY, minY };
    const body = FN.peaksBody({
      peaks, layout, decimal, shift, isAscend, isIntensity, boundary,
    });
    const wrapper = FN.peaksWrapper(layout, shift);
    const desc = RmDollarSign(wrapper.head) + body + wrapper.tail;
    return desc;
  }

  formatMpy({
    multiplicity, integration, shift, isAscend, decimal, layout,
  }) {
    // obsv freq
    const { fileSt } = this.props;
    const { entity } = FN.buildData(fileSt.jcamp);
    const { features } = entity;
    const { observeFrequency } = Array.isArray(features)
      ? features[0]
      : (features.editPeak || features.autoPeak);
    const freq = observeFrequency;
    const freqStr = freq ? `${parseInt(freq, 10)} MHz, ` : '';
    // multiplicity
    const { refArea, refFactor } = integration;
    const shiftVal = multiplicity.shift;
    const ms = multiplicity.stack;
    const is = integration.stack;

    const macs = ms.map((m) => {
      const { peaks, mpyType, xExtent } = m;
      const { xL, xU } = xExtent;
      const it = is.filter(i => i.xL === xL && i.xU === xU)[0] || { area: 0 };
      const area = it.area * refFactor / refArea;
      const center = FN.calcMpyCenter(peaks, shiftVal, mpyType);
      return Object.assign({}, m, { area, center });
    }).sort((a, b) => (isAscend ? a.center - b.center : b.center - a.center));
    const str = macs.map((m) => {
      const c = m.center;
      const type = m.mpyType;
      const it = Math.round(m.area);
      const js = m.js.map(j => `J = ${j.toFixed(decimal)} Hz`).join(', ');
      const atomCount = layout === '1H' ? `, ${it}H` : '';
      const xs = m.peaks.map(p => p.x).sort((a, b) => a - b);
      const location = type === 'm' ? `${xs[0].toFixed(decimal)}–${xs[xs.length - 1].toFixed(decimal)}` : `${c.toFixed(decimal)}`;
      return m.js.length === 0
        ? `${location} (${type}${atomCount})`
        : `${location} (${type}, ${js}${atomCount})`;
    }).join(', ');
    const { label, value, name } = shift.ref;
    const solvent = label ? `${name.split('(')[0].trim()} [${value.toFixed(decimal)} ppm], ` : '';
    return `${layout} NMR (${freqStr}${solvent}ppm) δ = ${str}.`;
  }

  writeMpy({
    layout, shift, isAscend, decimal,
    multiplicity, integration,
  }) {
    if (['1H', '13C', '19F'].indexOf(layout) < 0) return;
    const desc = this.formatMpy({
      multiplicity, integration, shift, isAscend, decimal, layout,
    });
    const { updateDescAct } = this.props;
    updateDescAct(desc);
  }

  writePeak({
    peaks, layout, shift, isAscend, decimal, isIntensity,
  }) {
    const desc = this.formatPks({
      peaks, layout, shift, isAscend, decimal, isIntensity,
    });
    const { updateDescAct } = this.props;
    updateDescAct(desc);
  }

  checkWriteOp({
    peaks, layout, shift, isAscend, decimal,
  }) {
    const {
      predictToWriteInitAct, molSt, fileSt,
    } = this.props;
    const molfile = molSt.src;
    const cleanPeaks = FN.rmShiftFromPeaks(peaks, shift);
    predictToWriteInitAct({
      molfile,
      layout,
      shift,
      isAscend,
      decimal,
      peaks: cleanPeaks,
      spectrum: fileSt.src,
    });
  }

  saveOp({
    peaks, shift, scan, thres, analysis, integration, multiplicity,
  }) {
    const {
      saveFileInitAct, molSt,
    } = this.props;
    const { mass } = molSt;
    const fPeaks = FN.rmRef(peaks, shift);
    const peakStr = FN.toPeakStr(fPeaks);
    const predict = JSON.stringify(analysis);

    saveFileInitAct({
      peakStr,
      shift,
      mass,
      scan,
      thres,
      predict,
      integration: JSON.stringify(integration),
      multiplicity: JSON.stringify(multiplicity),
    });
  }

  predictOp({ peaks, layout, shift }) {
    const { predictInitAct, molSt, fileSt } = this.props;
    const molfile = molSt.src;

    predictInitAct({
      molfile, peaks, layout, shift, spectrum: fileSt.src,
    });
  }

  // updatInput(e) {
  //   const molecule = e.target.value;
  //   this.setState({ molecule });
  // }

  buildForecast() {
    const { molSt, predictSt } = this.props;

    const predictObj = {
      molecule: molSt.src ? molSt.src.name : '',
      predictions: predictSt,
    };
    return predictObj;
  }

  buildOpsByLayout(entity, editorOnly) {
    let ops = [
      { name: 'write peaks', value: this.writePeak },
      { name: 'save', value: this.savePeaks },
    ];
    if (!editorOnly) {
      ops = [
        ...ops,
        { name: 'predict', value: this.predictOp },
      ];
    }
    if (['1H', '13C', '19F'].indexOf(entity.layout) >= 0) {
      ops = [
        { name: 'write multiplicity', value: this.writeMpy },
        ...ops,
      ];
    }
    return ops;
    // { name: 'check & write', value: this.checkWriteOp },
  }

  render() {
    const { fileSt, descSt, editorOnly } = this.props;
    if (!fileSt) return renderTitle();

    const {
      entity, xLabel, yLabel, isExist,
    } = FN.buildData(fileSt.jcamp);
    if (!isExist) return renderTitle();

    const operations = this.buildOpsByLayout(entity, editorOnly);
    const forecast = this.buildForecast();

    return (
      <div style={containerStyle}>
        <SpectraEditor
          entity={entity}
          xLabel={xLabel}
          yLabel={yLabel}
          forecast={forecast}
          operations={operations}
          editorOnly={editorOnly}
        />
        <textarea
          rows="2"
          cols="180"
          placeholder="peaks"
          style={editorStyle}
          value={descSt}
          readOnly
        />
      </div>
    );
  }
}

const mapStateToProps = (state, props) => ( // eslint-disable-line
  {
    molSt: state.mol,
    fileSt: state.file,
    predictSt: state.predict,
    descSt: state.desc,
  }
);

const mapDispatchToProps = dispatch => (
  bindActionCreators({
    saveFileInitAct: saveFileInit,
    predictInitAct: predictInit,
    predictToWriteInitAct: predictToWriteInit,
    updateDescAct: updateDesc,
  }, dispatch)
);

Content.propTypes = {
  molSt: PropTypes.object.isRequired,
  fileSt: PropTypes.object.isRequired,
  predictSt: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.bool,
  ]).isRequired,
  descSt: PropTypes.string.isRequired,
  saveFileInitAct: PropTypes.func.isRequired,
  predictInitAct: PropTypes.func.isRequired,
  predictToWriteInitAct: PropTypes.func.isRequired,
  updateDescAct: PropTypes.func.isRequired,
  editorOnly: PropTypes.bool.isRequired,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Content);
