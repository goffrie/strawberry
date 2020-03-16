let pinnedNixpkgs = (import <nixpkgs> {}).fetchFromGitHub {
  owner = "NixOS";
  repo = "nixpkgs";
  rev = "730453919bdc191496eb5dda04d69c4c99c724b9";
  sha256 = "195chqa3q8lxgy8was6kbwh44rvh7v2qnpcyfcmlf1glbq9zlxyk";
};
in { pkgs ? import pinnedNixpkgs {} }:
let
  client = import ./client { inherit pkgs; };
  server = import ./server { inherit pkgs; };
in
(pkgs.linkFarm "strawberry" [
  { name = "client"; path = client; }
  { name = "server"; path = server; }
]) // { inherit client server; }
