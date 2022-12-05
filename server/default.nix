{ pkgs ? import <nixpkgs> {} }:

let
rustPkgs = pkgs // import (pkgs.fetchFromGitHub {
  owner = "oxalica";
  repo = "rust-overlay";
  rev = "18823e511bc85ed27bfabe33cccecb389f9aa92d";
  sha256 = "uuKbbv0L+QoXiqO7METP9BihY0F7hJqGdKn7xDVfyFw=";
}) rustPkgs pkgs;
rustc = rustPkgs.rust-bin.stable."1.65.0".default.override { targets = ["x86_64-unknown-linux-musl"]; };
in
(pkgs.rustPlatform.buildRustPackage.override { inherit rustc; }) {
  pname = "globby";
  version = "0.1.0";
  src = pkgs.linkFarm "globby-src" [
    { name = "Cargo.toml"; path = "${./Cargo.toml}"; }
    { name = "Cargo.lock"; path = "${./Cargo.lock}"; }
    { name = "src"; path = "${./src}"; }
  ];
  cargoSha256 = "hbYB/WiIvyViEITlvSLvlCdgBZxb8Q5Sw23wqtOQIqE=";
  cargoSha256Version = 2;
  checkPhase = "true";
  target = "x86_64-unknown-linux-musl";
}
