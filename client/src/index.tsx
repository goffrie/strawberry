import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const initialRoom = window.location.hash ? window.location.hash.substr(1) : '';

ReactDOM.render(<App initialRoom={initialRoom} />, document.getElementById('root'));

