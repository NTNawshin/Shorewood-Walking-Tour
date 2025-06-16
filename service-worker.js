// service-worker.js
const CACHE_NAME = 'audio-cache-v1';
const AUDIO_FILES = [
  '/audio/A_RainBarrels.mp3',
  '/audio/10.0_PermeablePavement.mp3',
  '/audio/09.1_Walk.mp33',
  '/audio/09.0_StreamGauge.mp3',
  '/audio/08.1_Walk.mp3',
  '/audio/08.0_Gabions.mp3',
  '/audio/07.2_Walk.mp3',
  '/audio/07.1_Walk.mp3',
  '/audio/07.0_NatureCorridor.mp3',
  '/audio/06.1_Walk.mp3',
  '/audio/06.0_RainGarden.mp3',
  '/audio/05.2_Walk.mp3',
  '/audio/05.1_Walk.mp3',
  '/audio/05.0_StormwaterTrees.mp3',
  '/audio/04.3_Walk.mp3',
  '/audio/04.2_Walk.mp3',
  '/audio/04.1_Walk.mp3',
  '/audio/04.0_BioinfiltrationStructures.mp3',
  '/audio/03.1_Walk.mp3',
  '/audio/03.0_UrbanGardenUrbanFarm.mp3',
  '/audio/02.0_Bioswale.mp3',
  '/audio/01.2_Walk.mp3',
  '/audio/01.1_Walk.mp3',
  '/audio/01.0_PlanterBox.mp3',
  '/audio/00_StartingPoint.mp3',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(AUDIO_FILES);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/audio/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
  }
});
