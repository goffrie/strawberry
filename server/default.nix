{ pkgs ? import <nixpkgs> {} }:

pkgs.rustPlatform.buildRustPackage {
  pname = "globby";
  version = "0.1.0";
  src = ./.;
  cargoSha256 = "03wkm0y60rr3kb6g4j2llbwm2hbdzc4vmi5icciv9kq35wxw8sj6";
  cargoSha256Version = 2;
  checkPhase = "true";
}
