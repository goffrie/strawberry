let pinnedNixpkgs = (import <nixpkgs> {}).fetchFromGitHub {
  owner = "NixOS";
  repo = "nixpkgs";
  rev = "6d1934ae67198fda888f01d1642d8bd3cbe14bbb";
  sha256 = "0vp8mmdlhzpbjr75n4rfr9d6f4zy860d2avrcj6kd30zwz6aywsz";
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
