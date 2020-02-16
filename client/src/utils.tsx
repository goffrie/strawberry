export function delay(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
}

export function shuffle<T>(list: Readonly<ArrayLike<T>>): T[] {
    const array = Array.from(list);
    for (let i = 1; i < array.length; i++) {
        let j = Math.floor(Math.random() * (i + 1));
        if (i !== j) {
            const val = array[i];
            array[i] = array[j];
            array[j] = val;
        }
    }
    return array;
}
