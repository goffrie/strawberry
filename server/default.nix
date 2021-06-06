{ pkgs ? import <nixpkgs> {} }:

let
rustPkgs = pkgs // import (pkgs.fetchFromGitHub {
  owner = "oxalica";
  repo = "rust-overlay";
  rev = "26d7210f4801d9dc8f48b5d8bc34df1cf41284c8";
  sha256 = "0pggczamd1ilbs9aid5w6nxlww6cbvv6ibaxj7x3vk4185xbd16s";
}) rustPkgs pkgs;
rustc = rustPkgs.rust-bin.stable."1.52.1".default.override { targets = ["x86_64-unknown-linux-musl"]; };
in
(pkgs.rustPlatform.buildRustPackage.override { inherit rustc; }) {
  pname = "globby";
  version = "0.1.0";
  src = pkgs.linkFarm "globby-src" [
    { name = "Cargo.toml"; path = "${./Cargo.toml}"; }
    { name = "Cargo.lock"; path = "${./Cargo.lock}"; }
    { name = "src"; path = "${./src}"; }
  ];
  cargoSha256 = "1456rgp8d2gfscbphzi7j5slzdjrw8ysm9yy8blzi5p6dbxln1p3";
  cargoSha256Version = 2;
  checkPhase = "true";
  target = "x86_64-unknown-linux-musl";
}
