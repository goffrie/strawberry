{ pkgs ? import <nixpkgs> {} }:
pkgs.linkFarm "strawberry" [
  { name = "client"; path = import ./client { inherit pkgs; }; }
  { name = "server"; path = import ./server { inherit pkgs; }; }
]