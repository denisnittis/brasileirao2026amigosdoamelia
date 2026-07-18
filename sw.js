/**
 * sw.js — Service Worker do PWA "Amigos do Amélia".
 *
 * Só cuida do "shell" do app (o próprio HTML e os ícones), pra permitir
 * instalar como app e abrir rápido mesmo com internet ruim. Chamadas pro
 * backend (Apps Script) e pros escudos dos times (ESPN) NÃO passam por
 * aqui — vão direto pra rede, sem cache, porque são dados que mudam o
 * tempo todo (placares, palpites, ranking).
 *
 * Bump o CACHE_NAME (v1 -> v2 -> ...) sempre que quiser forçar todo mundo
 * a buscar a versão nova do app na próxima vez que abrir.
 */
const CACHE_NAME = "amigos-do-amelia-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves.filter((chave) => chave !== CACHE_NAME).map((chave) => caches.delete(chave))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Só intercepta pedidos do próprio domínio (o "shell" do site). Tudo que
  // for pra outro domínio (backend do Apps Script, escudos da ESPN, fontes
  // do Google Fonts) passa direto, sem cache — é dado vivo, não estático.
  if (url.origin !== self.location.origin) return;

  // Estratégia "network-first com fallback pro cache": tenta buscar a
  // versão mais nova da rede; se não conseguir (sem internet), usa o que
  // já tiver salvo. Assim o app sempre abre, mesmo offline.
  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return resposta;
      })
      .catch(() => caches.match(event.request))
  );
});
