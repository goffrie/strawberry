import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const initialRoom = window.location.hash ? window.location.hash.substr(1) : '';

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App initialRoom={initialRoom} />);

