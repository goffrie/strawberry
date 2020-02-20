import React from 'react';

export const FRUIT: readonly string[] = ['🍓', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🥝'];
export const FRUIT_NAMES: readonly string[] = ['Strawberry', 'Grape', 'Melon', 'Watermelon', 'Tangerine', 'Lemon', 'Banana', 'Pineapple', 'Mango', 'Apple', 'Apple', 'Pear', 'Peach', 'Cherry', 'Kiwi'];
export const FruitEmojiContext = React.createContext(FRUIT[0]);