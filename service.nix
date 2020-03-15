{ pkgs, listen }:
with pkgs.lib;
let
  client = import ./client { inherit pkgs; };
  server = import ./server { inherit pkgs; };
in {
  description = "Strawberry";
  after = [ "network.target" ];
  wantedBy = [ "multi-user.target" ];
  environment.RUST_BACKTRACE = "1";
  serviceConfig = {
    ExecStart = "${server}/bin/globby ${listen} ${client}";
    StandardOutput = "syslog";
    StandardError = "syslog";
    SyslogIdentifier = "strawberry";
    DynamicUser = true;
    PermissionsStartOnly = true;
    ProtectSystem = "strict";
    ProtectHome = true;
    PrivateDevices = true;
    PrivateUsers = true;
    PrivateTmp = true;
    ProtectKernelTunables = true;
    ProtectKernelModules = true;
    ProtectControlGroups = true;
    RestrictAddressFamilies = "AF_INET AF_INET6";
    Restart = "always";
    RestartSec = "5s";
  };
}
