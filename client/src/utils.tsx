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

// good enough for json
export function deepEqual(x: any, y: any): boolean {
    if (x === y) return true;
    if (x == null || y == null) return false;
    if (typeof x == "object" && typeof y == "object") {
        if (Array.isArray(x) && Array.isArray(y)) {
            if (x.length !== y.length) return false;
            for (let i = 0; i < x.length; i++) {
                if (!deepEqual(x[i], y[i])) return false;
            }
            return true;
        } else if (!Array.isArray(x) && !Array.isArray(y)) {
            let xk = Object.keys(x);
            let yk = Object.keys(y);
            if (xk.length !== yk.length) return false;
            for (const key of xk) {
                if (!Object.prototype.hasOwnProperty.call(y, key)) return false;
                if (!deepEqual(x[key], y[key])) return false;
            }
            return true;
        }
    }
    return false;
}

export function mapNth<T>(xs: readonly T[], index: number, f: (arg: T) => T): T[] {
    return xs.map((item, i) => i === index ? f(item) : item);
}