let pinnedNixpkgs = (import <nixpkgs> {}).fetchFromGitHub {
  owner = "NixOS";
  repo = "nixpkgs";
  rev = "52e3e80afff4b16ccb7c52e9f0f5220552f03d04";
  sha256 = "FqZ7b2RpoHQ/jlG6JPcCNmG/DoUPCIvyaropUDFhF3Q=";
};
in { pkgs ? import pinnedNixpkgs {} }:
let
  client = import ./client { inherit pkgs; };
  server = import ./server { inherit pkgs; };
in
(pkgs.linkFarm "strawberry" [
  { name = "client"; path = client; }
  { name = "server"; path = server; }
]) // {
  inherit client server;
  # For nix-prefetch
  serverCargoDeps = { sha256 }: server.cargoDeps.overrideAttrs (_: { inherit sha256; });
}
