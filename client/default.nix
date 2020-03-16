{ pkgs ? import <nixpkgs> {}
, yarn2nix ? import (pkgs.fetchFromGitHub {
    owner = "moretea";
    repo = "yarn2nix";
    rev = "9e7279edde2a4e0f5ec04c53f5cd64440a27a1ae";
    sha256 = "0zz2lrwn3y3rb8gzaiwxgz02dvy3s552zc70zvfqc0zh5dhydgn7";
  }) { inherit pkgs; },
}:

yarn2nix.mkYarnPackage {
  name = "client";
  src = ./.;
  packageJSON = ./package.json;
  yarnLock = ./yarn.lock;
  nativeBuildInputs = [ pkgs.jq ];
  buildPhase = ''
    mkdir deps/client/node_modules_2
    ln -s $(realpath deps/client/node_modules)/{*,.bin} deps/client/node_modules_2/
    rm deps/client/node_modules
    mv deps/client/node_modules_2 deps/client/node_modules

    yarn build
  '';
  installPhase = ''
    mkdir $out
    cp -r deps/client/build/{index.html,favicon*.ico,robots.txt,static} $out/
    for map in deps/client/build/static/js/*.map; do
      jq -c '.sources |= map (sub(".*/node_modules"; "node_modules"))' < $map > $out/static/js/$(basename $map)
    done
  '';
  distPhase = ''
    true
  '';
}
