let pinnedNixpkgs = (import <nixpkgs> {}).fetchFromGitHub {
  owner = "NixOS";
  repo = "nixpkgs";
  rev = "e0da498ad77ac8909a980f07eff060862417ccf7";
  hash = "sha256-evZzmLW7qoHXf76VCepvun1esZDxHfVRFUJtumD7L2M=";
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
