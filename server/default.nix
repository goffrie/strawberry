{ pkgs ? import <nixpkgs> {} }:

pkgs.rustPlatform.buildRustPackage {
  pname = "globby";
  version = "0.1.0";
  src = ./.;
  cargoSha256 = "1r6mid8pbd9w0v31wcil2zfjs5vaab4p2s2lj3d3ky9zbzwvyg24";
  cargoSha256Version = 2;
  checkPhase = "true";
}
