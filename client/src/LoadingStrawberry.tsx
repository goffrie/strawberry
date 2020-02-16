import React from 'react';

function LoadingStrawberry() {
    return <span role='img' aria-label='loading' className='loadingStrawberry'>🍓</span>
}

function WrappedLoadingStrawberry() {
    // Loading strawberry that is centered
    return <div className='wrappedLoadingStrawberry'><LoadingStrawberry /></div>
}

function SuperWrappedLoadingStrawberry() {
    // Loading strawberry that is SUPER centered
    return <div style={{width: '100%', height: '100vh'}}><WrappedLoadingStrawberry /></div>
}

export {LoadingStrawberry, WrappedLoadingStrawberry, SuperWrappedLoadingStrawberry};
