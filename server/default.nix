{ pkgs ? import <nixpkgs> {} }:

let
rustPkgs = import (pkgs.fetchFromGitHub {
  owner = "mozilla";
  repo = "nixpkgs-mozilla";
  rev = "e912ed483e980dfb4666ae0ed17845c4220e5e7c";
  sha256 = "08fvzb8w80bkkabc1iyhzd15f4sm7ra10jn32kfch5klgl0gj3j3";
}) rustPkgs pkgs;
rustc = rustPkgs.rustChannelOfTargets "1.42.0" null ["x86_64-unknown-linux-musl"];
in
(pkgs.rustPlatform.buildRustPackage.override { inherit rustc; }) {
  pname = "globby";
  version = "0.1.0";
  src = pkgs.linkFarm "globby-src" [
    { name = "Cargo.toml"; path = "${./Cargo.toml}"; }
    { name = "Cargo.lock"; path = "${./Cargo.lock}"; }
    { name = "src"; path = "${./src}"; }
  ];
  cargoSha256 = "19qgrminbjfn57dbihjs66w3smynm1vpszywc6fphwyhha1h6976";
  cargoSha256Version = 2;
  checkPhase = "true";
  target = "x86_64-unknown-linux-musl";
}
