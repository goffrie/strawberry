{ pkgs ? import <nixpkgs> {} }:

let
rustPkgs = pkgs // import (pkgs.fetchFromGitHub {
  owner = "oxalica";
  repo = "rust-overlay";
  rev = "784981a9feeba406de38c1c9a3decf966d853cca";
  hash = "sha256-as0I9xieJUHf7kiK2a9znDsVZQTFWhM1pLivII43Gi0=";
}) rustPkgs pkgs;
rustc = rustPkgs.rust-bin.stable."1.82.0".default.override { targets = ["x86_64-unknown-linux-musl"]; };
in
(pkgs.rustPlatform.buildRustPackage.override { inherit rustc; }) {
  pname = "globby";
  version = "0.1.0";
  src = pkgs.linkFarm "globby-src" [
    { name = "Cargo.toml"; path = "${./Cargo.toml}"; }
    { name = "Cargo.lock"; path = "${./Cargo.lock}"; }
    { name = "src"; path = "${./src}"; }
  ];
  cargoLock.lockFile = ./Cargo.lock;
  checkPhase = "true";
  target = "x86_64-unknown-linux-musl";
}
