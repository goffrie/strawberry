{ pkgs ? import <nixpkgs> {} }:

pkgs.rustPlatform.buildRustPackage {
    pname = "globby";
    version = "0.1.0";
    src = ./.;
    cargoSha256 = "063sz8a5pk8b8ly63gl3a6l953l3cyb7fhym0cg78883im7wq08w";
    cargoSha256Version = 2;
}