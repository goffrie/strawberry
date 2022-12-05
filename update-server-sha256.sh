#!/bin/sh
OLD_SHA256=$(nix eval --raw --impure --expr '(import ./build.nix {}).server.cargoSha256')
NEW_SHA256=$(nix-shell -p nix-prefetch --command 'nix-prefetch -E "(import ./build.nix {}).serverCargoDeps"')
if [[ $OLD_SHA256 != $NEW_SHA256 ]]; then
    printf "changing %s -> %s\n" "$OLD_SHA256" "$NEW_SHA256"
    sed -i "s/$OLD_SHA256/$NEW_SHA256/g" server/default.nix
fi
