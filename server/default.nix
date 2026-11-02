{ pkgs ? import <nixpkgs> {
  overlays = [
    (import ((import <nixpkgs> { }).fetchFromGitHub {
      owner = "oxalica";
      repo = "rust-overlay";
      rev = "c85ccd343087c57da6021cafa1647142ad03e32e";
      hash = "sha256-vHPjEGxtV+StSLW9DJpa3c3gt0UD0s1q4nC98AZ0N0c=";
    }))
  ];
} }:

let
  rustc = pkgs.rust-bin.stable."1.99.1".default.override {
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
