{ pkgs ? import <nixpkgs> {
  overlays = [
    (import ((import <nixpkgs> { }).fetchFromGitHub {
      owner = "oxalica";
      repo = "rust-overlay";
      rev = "77265d2dc1e61b2abfd3b1d6609dbb66fe75e0a5";
      hash = "sha256-bhk4lawR4ZnFhPtamB5WkCyvfgyZmsEUbWfT/3FRxFY=";
    }))
  ];
} }:

let
  rustc = pkgs.rust-bin.stable."1.95.0".default.override {
    targets = [ "x86_64-unknown-linux-musl" ];
  };
in (pkgs.rustPlatform.buildRustPackage.override { inherit rustc; }) {
  pname = "globby";
  version = "0.1.0";
  src = pkgs.linkFarm "globby-src" [
    {
      name = "Cargo.toml";
      path = "${./Cargo.toml}";
    }
    {
      name = "Cargo.lock";
      path = "${./Cargo.lock}";
    }
    {
      name = "src";
      path = "${./src}";
    }
  ];
  cargoLock.lockFile = ./Cargo.lock;
  checkPhase = "true";
  target = "x86_64-unknown-linux-musl";
}
