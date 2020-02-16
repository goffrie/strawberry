import React from 'react';

function LoadingStrawberry() {
    return <span role='img' aria-label='loading' className='loadingStrawberry'>🍓</span>
}

function WrappedLoadingStrawberry() {
    // Loading strawberry that is centered
    return <div className='wrappedLoadingStrawberry'><LoadingStrawberry/></div>
}

export {LoadingStrawberry, WrappedLoadingStrawberry};
