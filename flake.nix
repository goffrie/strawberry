{
  description = "a game about strawberries";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    rust-overlay.inputs.nixpkgs.follows = "nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, rust-overlay, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };
      in with pkgs; {
        packages.client = import ./client { inherit pkgs; };
        packages.server = import ./server { inherit pkgs; };

        devShells.default = mkShell rec {
          buildInputs = [
            # Rust
            (rust-bin.stable.latest.default.override {
              extensions = [ "rust-src" ]; # for rust-analyzer
              targets = [ "x86_64-unknown-linux-musl" ];
            })
          ];

          LD_LIBRARY_PATH = "${lib.makeLibraryPath buildInputs}";
        };
      }) // {
        nixosModules.default = args@{ pkgs, ... }:
          import ./service.nix {
            inherit (self.packages."${pkgs.stdenv.targetPlatform.system}") client server;
          } args;
      };
}
