import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const initialUsername = localStorage.getItem('username');

ReactDOM.render(<App initialUsername={initialUsername} />, document.getElementById('root'));

