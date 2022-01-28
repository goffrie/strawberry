{ pkgs ? import <nixpkgs> {} }:

pkgs.mkYarnPackage {
  name = "client";
  src = ./.;
  packageJSON = ./package.json;
  yarnLock = ./yarn.lock;
  nativeBuildInputs = [ pkgs.jq ];
  buildPhase = ''
    mkdir deps/client/node_modules_2
    ln -s $(realpath node_modules)/{*,.bin} deps/client/node_modules_2/
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
