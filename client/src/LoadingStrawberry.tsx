import React, { useContext } from 'react';
import { FruitEmojiContext } from './Fruit';

function LoadingStrawberry() {
    const fruitEmoji = useContext(FruitEmojiContext);
    return <span role='img' aria-label='loading' className='loadingStrawberry'>{fruitEmoji}</span>
}

function WrappedLoadingStrawberry() {
    // Loading strawberry that is centered
    return <div className='flexCenterContainer'><LoadingStrawberry /></div>
}

function SuperWrappedLoadingStrawberry() {
    // Loading strawberry that is SUPER centered
    return <div style={{width: '100%', height: '100vh'}}><WrappedLoadingStrawberry /></div>
}

export {LoadingStrawberry, WrappedLoadingStrawberry, SuperWrappedLoadingStrawberry};
