{ config, pkgs, ... }:
with pkgs.lib;
let
  cfg = config.services.strawberry;
  build = import ./build.nix {};
in {
  options.services.strawberry = {
    listen = mkOption {
      type = types.str;
      example = "127.0.0.1:8080";
      description = "The address on which to listen";
    };
  };
  config.environment.etc."strawberry/client".source = "${build.client}";
  config.systemd.services.strawberry = {
    description = "Strawberry";
    after = [ "network.target" ];
    wantedBy = [ "multi-user.target" ];
    environment.RUST_BACKTRACE = "1";
    serviceConfig = {
      ExecStart = "${build.server}/bin/globby ${cfg.listen} /etc/strawberry/client /var/lib/strawberry";
      StandardOutput = "syslog";
      StandardError = "syslog";
      SyslogIdentifier = "strawberry";
      DynamicUser = true;
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
      StateDirectory = "strawberry";
    };
  };
}
