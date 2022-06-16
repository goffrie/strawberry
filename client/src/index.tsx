import React from 'react';
import { StrictMode } from "react";
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { ConvexProvider, ConvexReactClient } from "convex-dev/react";
import convexConfig from "./convex.json";

const convex = new ConvexReactClient(convexConfig.origin);

const initialRoom = window.location.hash ? window.location.hash.substr(1) : '';

ReactDOM.render(
    <StrictMode>
        <ConvexProvider client={convex}>
            <App initialRoom={initialRoom} />
        </ConvexProvider>
    </StrictMode>,
    document.getElementById('root'),
);

