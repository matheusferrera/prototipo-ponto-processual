import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O hotspot do iPhone entrega IP por DHCP: o Mac cai em `.2` num dia e `.6`
  // no outro, e um IP fixo aqui faz o Next bloquear a origem sem avisar na
  // tela — o assets de dev não carregam, o botão não hidrata e o clique morre
  // em silêncio. A faixa inteira do hotspot evita o retrabalho.
  allowedDevOrigins: [
    '172.20.10.*',
    // Wi-Fi de casa/escritório: a mesma armadilha do hotspot, faixa diferente.
    '192.168.*.*',
    '10.*.*.*',
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
    '*.ngrok.app',
    '*.ngrok.io',
  ],
};

export default nextConfig;
