{ pkgs ? import <nixpkgs> {} }:

pkgs.rustPlatform.buildRustPackage {
    pname = "globby";
    version = "0.1.0";
    src = ./.;
    cargoSha256 = "0pj7bww4bl12bmsf3025i1va5sbn6wvl5hzx8qpr5irkd1h7dnrh";
    cargoSha256Version = 2;
}
