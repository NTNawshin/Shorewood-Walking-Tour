const base = self.location.pathname.replace(/\/service-worker\.js$/, '');

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('gm').then((cache) => {
            return cache.addAll([
                `${base}/audio/00_StartingPoint.mp3`,
                `${base}/audio/01.0_PlanterBox.mp3`,
                `${base}/audio/01.1_Walk.mp3`,
                `${base}/audio/01.2_Walk.mp3`,
                `${base}/audio/02.0_Bioswale.mp3`,
                `${base}/audio/02.1_Walk up Driveway.mp3`,
                `${base}/audio/03.0_UrbanGardenUrbanFarm.mp3`,
                `${base}/audio/03.1_Walk.mp3`,
                `${base}/audio/04.0_BioinfiltrationStructures.mp3`,
                `${base}/audio/04.1_Walk.mp3`,
                `${base}/audio/04.2_Walk.mp3`,
                `${base}/audio/04.3_Walk.mp3`,
                `${base}/audio/05.0_StormwaterTrees.mp3`,
                `${base}/audio/05.1_Walk.mp3`,
                `${base}/audio/05.2_Walk.mp3`,
                `${base}/audio/06.0_RainGarden.mp3`,
                `${base}/audio/06.1_Walk.mp3`,
                `${base}/audio/07.0_NatureCorridor.mp3`,
                `${base}/audio/07.1_Walk.mp3`,
                `${base}/audio/07.2_Walk.mp3`,
                `${base}/audio/08.0_Gabions.mp3`,
                `${base}/audio/08.1_Walk.mp3`,
                `${base}/audio/09.0_StreamGauge.mp3`,
                `${base}/audio/09.1_Walk.mp3`,
                `${base}/audio/10.0_PermeablePavement.mp3`,
                `${base}/audio/10.1_Walk_PermeableDriveway.mp3`,
                `${base}/audio/10.2_Walk_DownspoutsAndSS.mp3`,
                `${base}/audio/10.3_EndofTour.mp3`,
                `${base}/audio/10.4_FunTask.mp3`,
                `${base}/audio/10.5_EndTour.mp3`,
                `${base}/audio/A_RainBarrels.mp3`
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })            
    );
});