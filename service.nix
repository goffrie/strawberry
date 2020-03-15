{ config, lib, pkgs, ... }:
with lib;
let
  cfg = config.services.strawberry;
  client = import ./client { inherit pkgs; };
  server = import ./server { inherit pkgs; };
in {
  options.services.strawberry = {
    enable = mkOption {
      type = types.bool;
      default = false;
    };
    listen = mkOption {
      type = types.str;
      example = "127.0.0.1:8080";
      description = "The address on which to listen";
    };
  };
  config = mkIf cfg.enable {
    systemd.services.strawberry = {
      description = "Strawberry";
      after = [ "network.target" ];
      wantedBy = [ "multi-user.target" ];
      environment.RUST_BACKTRACE = "1";
      serviceConfig = {
        ExecStart = "${server}/bin/globby ${cfg.listen} ${client}";
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
    };
  };
}
