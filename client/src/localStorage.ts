import { useState } from 'react';

export function useLocalStorage(key: string): [string | null, (newValue: string | null) => void] {
    const [value, setValue] = useState(window.localStorage.getItem(key));
    return [value, (newValue) => {
        if (newValue != null) {
            window.localStorage.setItem(key, newValue);
        } else {
            window.localStorage.removeItem(key);
        }
        setValue(newValue);
    }];
}