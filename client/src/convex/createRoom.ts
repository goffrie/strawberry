import { mutation } from "convex-dev/server";

const FRUITS = [
    "acai",
    "apple",
    "apricot",
    "banana",
    "bergamot",
    "blackberry",
    "blueberry",
    "boysenberry",
    "breadfruit",
    "cantaloupe",
    "cherimoya",
    "cherry",
    "citron",
    "clementine",
    "cloudberry",
    "coconut",
    "conkerberry",
    "crabapple",
    "cranberry",
    "currant",
    "date",
    "dragonfruit",
    "durian",
    "elderberry",
    "etrog",
    "fig",
    "goji",
    "gooseberry",
    "grape",
    "grapefruit",
    "guava",
    "hackberry",
    "hawthorn",
    "honeydew",
    "honeysuckle",
    "huckleberry",
    "jackfruit",
    "jujube",
    "kabosu",
    "kiwano",
    "kiwi",
    "kumquat",
    "lemon",
    "lime",
    "lingonberry",
    "mandarin",
    "mango",
    "mangosteen",
    "melon",
    "mulberry",
    "nectarine",
    "orange",
    "papaya",
    "passionfruit",
    "peach",
    "pear",
    "persimmon",
    "pineapple",
    "plum",
    "pomegranate",
    "pomelo",
    "quince",
    "rambutan",
    "raspberry",
    "satsuma",
    "snowberry",
    "soursop",
    "starfruit",
    "strawberry",
    "tamarind",
    "tangelo",
    "tangerine",
    "teaberry",
    "ugli",
    "watermelon",
    "yuzu",
];

function generateRoomName(): string {
    const randomWord = () => FRUITS[Math.floor(Math.random() * FRUITS.length)];
    return `${randomWord()}.${randomWord()}.${randomWord()}`;
}

export default mutation(async ({ db }, initialState: string, _randomSeed: number) => {
    while (true) {
        const name = generateRoomName();
        const conflict = await db.table("rooms").filter(q => q.eq(q.field("name"), name)).first();
        if (conflict != null) continue;
        await db.insert("rooms", {
            name,
            value: initialState,
            version: 0,
        });
        return name;
    }
});