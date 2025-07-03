(function () {

    let map, route, stops, locationMarker, circle, currentStop = 1, tourLength = 0, center = false, played = [];
    let audioStartTime = 0;
    //styling variables
    let routeColor = "#2d862d",
        // route2Color = "#ffd300", 
        activeStopFill = "#525252",
        activeStopOutline = "#f0f0f0",
        activeMainStopFill = "#007F3F",
        activeMainStopOutline = "#99d8c9",
        inactiveStopFill = "#f0f0f0",
        inactiveStopOutline = "#525252",
        inactiveMainStopFill = "#7adfa1",
        inactiveMainStopOutline = "#007F3F"
    //starting position
    let startPosition = [43.0877073, -87.88484659]

    let isLargeFont = false;
    let currentAudio = null;
    const homeAudioWidget = document.getElementById("homeAudioWidget");

    let stop = document.getElementById('stop-modal'),
        stopModal = new bootstrap.Modal(stop);

    // Track dark mode state
    let isDarkMode = false;


    function createMap() {
        map = L.map("map", {
            center: startPosition,
            zoom: 18,
            maxZoom: 22,
            minZoom: 12
        });

        map.getContainer().addEventListener("touchstart", function () {
            window.scrollTo(0, 0);
        });


        //add north indicator
        var northArrow = L.Control.extend({
            options: {
                position: "topright"
            },
            onAdd: function () {
                // create the control container with a particular class name
                var container = L.DomUtil.create('div', 'north-arrow');

                container.innerHTML = '<p style="color: grey; font-size: 20px; font-family: Lato, sans-serif; padding-right: 0.75em; ">N<span style="font-size: 32px;">&#11014;</span></p>';
                return container;
            }
        });

        L.control.scale({ position: 'topright' }).addTo(map);

        map.addControl(new northArrow());

        let lightMode = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        let darkMode = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '',
            subdomains: 'abcd',
            maxZoom: 20
        });

        map.on('locationfound', onLocationFound);

        let currentLayer = lightMode;

        // Add event listener for the button
        document.querySelector("#toggle-dark-mode").addEventListener("click", () => {
            let northArrowText = document.querySelector(".north-arrow p"); // Select the <p> inside the north-arrow div

            if (currentLayer === lightMode) {
                map.removeLayer(lightMode);
                map.addLayer(darkMode);
                currentLayer = darkMode;

                // Change North Arrow text color to WHITE in dark mode
                if (northArrowText) {
                    northArrowText.style.color = "#808080";
                }
            } else {
                map.removeLayer(darkMode);
                map.addLayer(lightMode);
                currentLayer = lightMode;

                // Change North Arrow text color to BLACK in light mode
                if (northArrowText) {
                    northArrowText.style.color = "#808080";
                }
            }
        });

        document.querySelector("#center").addEventListener("click", getLocation)

        buffers = L.layerGroup().addTo(map);

        addRoute();
        addStops();
        addWarnings();

        //activate location at a regular interval
        window.setInterval(function () {
            map.locate({
                setView: false,
                enableHighAccuracy: true
            });
        }, 2500);
        //getLocation();
    }

    function onLocationFound(e) {
        console.log("Location Found");
        let radius = e.accuracy / 2;
        //removes marker and circle before adding a new one
        if (locationMarker) {
            map.removeLayer(circle);
            map.removeLayer(locationMarker);
        }
        //adds location and accuracy information to the map
        if (e.accuracy < 90) {
            circle = L.circle(e.latlng, { radius: radius, interactive: false }).addTo(map);
            locationMarker = L.marker(e.latlng, { interactive: false }).addTo(map);
        }

        for (let layer of stops.getLayers()) {
            let stopLatLng = layer.getLatLng();
            let stopRadius = layer.options.radius;
            let distance = map.distance(e.latlng, stopLatLng);

            if (distance <= stopRadius && !played.includes(layer.feature.properties.id)) {
                played.push(layer.feature.properties.id);

                if (currentAudio) 
                {
                    if (currentAudio.querySelector('source').getAttribute('src').split('/').pop() == layer.feature.properties.audio) {
                        audioStartTime = currentAudio.currentTime + 1
                    }
                    else {
                        currentAudio.pause();
                        currentAudio.currentTime = 0;
                        audioStartTime = 0;
                    }
                }
                else{
                    audioStartTime = 0;
                }
                
                openModal(layer.feature.properties);
                break;
            }
        }
    }

    //location findinging function
    function getLocation() {
        map.locate({ setView: true, enableHighAccuracy: true });
    }

    function addRoute() {
        fetch("data/Route_new3.geojson")
            .then(res => res.json())
            .then(data => {
                route = L.geoJson(data, {
                    style: {
                        color: routeColor,
                        weight: 3.5
                    }
                }).addTo(map)
            })

        fetch("data/Route_acc_alt4.geojson")
            .then(res => res.json())
            .then(data => {
                route = L.geoJson(data, {
                    style: {
                        color: routeColor,
                        dashArray: "5 10",
                        weight: 3.5
                    }
                }).addTo(map)
            })
    }

    function addStops() {

        fetch("data/temp.csv")
            .then(res => res.text())
            .then(data => {
                //parse csv
                data = Papa.parse(data, {
                    header: true
                }).data;
                //create geojson
                let geojson = {
                    type: "FeatureCollection",
                    name: "Sites",
                    features: []
                }
                //populate geojson
                data.forEach(function (feature, i) {
                    //add to total length
                    if (!feature.hidden)
                        tourLength++;

                    //create empty object
                    let obj = {};
                    //set feature
                    obj.type = "Feature";
                    //add geometry
                    obj.geometry = {
                        type: "Point",
                        coordinates: [Number(feature.lon), Number(feature.lat)]
                    }
                    //add properties
                    obj.properties = feature;
                    //add object to geojson
                    geojson.features.push(obj)
                })
                //add geojson to map
                stops = L.geoJson(geojson, {
                    pointToLayer: function (feature, latlng) {
                        //open tooltip if first stop
                        if (feature.properties.id == 1) {
                            var popup = L.popup()
                                .setLatLng(latlng)
                                .setContent('<div style="text-align: center; font-family: Lato, sans-serif; font-size: 18px;">You started here! <br>Now, close this pop-up and <br>let\'s head to Stop 1</div>')
                                .openOn(map);
                        }
                        //set point styling
                        let options = {
                            radius: feature.properties.radius,
                            color: stopOutlineColor(feature.properties),
                            opacity: setOpacity(feature.properties),
                            fillColor: stopColor(feature.properties),
                            fillOpacity: setOpacity(feature.properties),
                            pane: "markerPane"
                        }
                        //function to hide hidden stops
                        function setOpacity(props) {
                            return props.hidden == "TRUE" ? 0 : 1;
                        }

                        if (feature.properties.stop != "0") {
                            // Create a div icon with the number at the center
                            let numberIcon = L.divIcon({
                                html: '<div style="display: flex; justify-content: center; align-items: center; width: ' +
                                    (feature.properties.radius * 2) + 'px; height: ' +
                                    (feature.properties.radius * 2) + 'px;">' +
                                    feature.properties.stop + '</div>',
                                className: 'number-icon',
                                iconSize: [feature.properties.radius * 2, feature.properties.radius * 2],
                                iconAnchor: [feature.properties.radius, feature.properties.radius]
                            });

                            // Create a marker with the number icon and add it to the map
                            L.marker(latlng, { icon: numberIcon, interactive: false }).addTo(map);
                        }

                        if (feature.properties.id == 34) {
                            let numberIcon = L.divIcon({
                                html: '<div style="display: flex; justify-content: center; align-items: center; width: ' +
                                    (feature.properties.radius * 2) + 'px; height: ' +
                                    (feature.properties.radius * 2) + 'px;">' +
                                    "A" + '</div>',
                                className: 'number-icon',
                                iconSize: [feature.properties.radius * 2, feature.properties.radius * 2],
                                iconAnchor: [feature.properties.radius, feature.properties.radius]
                            });

                            // Create a marker with the number icon and add it to the map
                            L.marker(latlng, { icon: numberIcon, interactive: false }).addTo(map);
                        }

                        return L.circleMarker(latlng, options);
                    },
                    onEachFeature: function (feature, layer) {
                        //open modal if layer is not hidden
                        layer.on('click', function () {
                            if (feature.properties.hidden != "true") {
                                // If audio is playing, log the current time
                                if (currentAudio) {
                                    if (currentAudio.querySelector('source').getAttribute('src').split('/').pop() == feature.properties.audio) {
                                        audioStartTime = currentAudio.currentTime + 1
                                    }
                                    else {
                                        audioStartTime = 0;
                                    }
                                }
                                openModal(feature.properties)
                            }
                        })
                    }
                }).addTo(map);
            })
    }

    function addWarnings() {
        fetch("data/warnings.csv")
            .then(res => res.text())
            .then(data => {
                // Parse CSV
                data = Papa.parse(data, {
                    header: true
                }).data;

                // Create GeoJSON
                let geojson = {
                    type: "FeatureCollection",
                    name: "Sites",
                    features: []
                };

                // Populate GeoJSON
                data.forEach(function (feature) {
                    // Create empty object
                    let obj = {};
                    // Set feature type
                    obj.type = "Feature";
                    // Add geometry
                    obj.geometry = {
                        type: "Point",
                        coordinates: [Number(feature.lon), Number(feature.lat)]
                    };
                    // Add properties
                    obj.properties = feature;
                    // Add object to geojson
                    geojson.features.push(obj);
                });

                // Define custom icon
                let customIcon1 = L.icon({
                    iconUrl: 'assets/alert40_red.png', // Replace with the path to your image
                    iconSize: [25, 25], // Adjust icon size as needed
                    iconAnchor: [12, 25], // Adjust anchor point as needed
                    popupAnchor: [0, -25] // Adjust popup anchor if needed
                });

                let customIcon2 = L.icon({
                    iconUrl: 'assets/information.png', // Replace with the path to your image
                    iconSize: [25, 25], // Adjust icon size as needed
                    iconAnchor: [12, 25], // Adjust anchor point as needed
                    popupAnchor: [0, -25] // Adjust popup anchor if needed
                });

                // Add GeoJSON to map with custom markers and popups
                warnings = L.geoJson(geojson, {
                    pointToLayer: function (feature, latlng) {
                        if (feature.properties.id == 1) {
                            return L.marker(latlng, { icon: customIcon1 });
                        }
                        else {
                            return L.marker(latlng, { icon: customIcon2 });
                        }

                    },
                    onEachFeature: function (feature, layer) {
                        // Bind the popup with a custom class for styling
                        if (feature.properties.id == 1) {
                            layer.bindPopup(feature.properties.text, { className: 'danger-popup' });
                        }
                        else {
                            layer.bindPopup(feature.properties.text, { className: 'service-popup' });
                        }
                    }
                }).addTo(map);
            });
    }

    //set stop color
    function stopColor(props) {

        if (props.id == 34) {
            return props.id == currentStop ? activeMainStopFill : inactiveMainStopFill
        }
        else {
            if (props.stop == 0) {
                return props.id == currentStop ? activeStopFill : inactiveStopFill;
            }
            else {
                return props.id == currentStop ? activeMainStopFill : inactiveMainStopFill;
            }
        }
    }
    function stopOutlineColor(props) {
        if (props.id == 34) {
            return props.id == currentStop ? activeMainStopOutline : inactiveMainStopOutline
        }
        else {
            if (props.stop == 0) {
                return props.id == currentStop ? activeStopOutline : inactiveStopOutline;
            }
            else {
                return props.id == currentStop ? activeMainStopOutline : inactiveMainStopOutline;
            }
        }
    }
    //update stop stype
    function updateStopColor() {
        stops.eachLayer(function (layer) {
            layer.setStyle({
                color: stopOutlineColor(layer.feature.properties),
                fillColor: stopColor(layer.feature.properties)
            })
        })
    }

    //open modal
    function openModal(props) {

        let existingCarousel = document.getElementById("carouselExampleIndicators");
        if (existingCarousel) {
            existingCarousel.remove();
        }

        //set current stop
        currentStop = (Number(props.id) + 1) > tourLength ? Number(props.id) : Number(props.id) + 1;
        updateStopColor();

        //clear body
        document.querySelector("#stop-image").innerHTML = "";
        document.querySelector("#stop-body").innerHTML = "";
        document.querySelector("#title-container").innerHTML = "";

        //add title if it exists
        if (props.name) {
            let title = document.createElement("h1");
            title.className = "modal-title text-center";
            title.id = "stop-title";
            title.textContent = props.name;
            title.style.fontSize = "28px"
            document.querySelector("#title-container").appendChild(title);
        }

        let space = document.createElement("p");
        document.querySelector("#title-container").appendChild(space);

        // Ensure audio does not autoplay when modal is manually opened
        if (props.audio) {
            playAudio(props.audio); // Pass `false` so audio does not autoplay
        }

        // Create a wrapper div for centering
        let buttonWrapper = document.createElement("div");
        buttonWrapper.className = "modal-button-container  text-center"; // Add class for styling

        // **New Paragraph Before Back to Map Button**
        let infoParagraph = document.createElement("p");
        infoParagraph.textContent = "";
        buttonWrapper.appendChild(infoParagraph);

        // Create "Go back to Map" button
        let closeButton = document.createElement("button");
        closeButton.textContent = "Back to Map";
        closeButton.className = "btn btn-secondary"; // Bootstrap styling
        closeButton.style.fontSize = "22px";
        closeButton.style.backgroundColor = "#2e8f58"; // Button color (green)

        // Close modal when clicked
        closeButton.addEventListener("click", function () {
            stopModal.hide(); // Close the modal
        });

        // Append button to the wrapper
        buttonWrapper.appendChild(closeButton);

        // Insert the wrapper into the stop modal
        document.querySelector("#title-container").appendChild(buttonWrapper);


        //add image if image exists
        if (props.image) {
            let html = `<div id="carouselExampleIndicators" class="carousel slide" data-bs-interval="false">
                <div class="carousel-indicators">`;

            for (let i = 1; i <= props.image; i++) {
                html += `<button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="${i - 1}" 
                    ${i === 1 ? 'class="active" aria-current="true"' : ''} aria-label="Slide ${i}"></button>`;
            }

            html += `</div><div id="carousel-counter" style=" position: absolute; top: 10px; right: 10px; background: rgba(100, 100, 100, 0.6); color: white; padding: 4px 8px; border-radius: 5px; font-size: 14px; z-index: 10;">1/${props.image}</div>
    
            <div class="carousel-inner">`;

            for (let i = 1; i <= props.image; i++) {
                html += `<div class="carousel-item ${i === 1 ? 'active' : ''}">
                    <img src="assets/id${props.id}/${i}.png" class="d-block w-100" alt="Slide ${i}" 
                    style="max-height: 500px; object-fit: contain; margin: auto;">
                </div>`;
            }

            html += `</div>
                <button class="carousel-control-prev" type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Previous</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Next</span>
                </button>
            </div>`;

            document.querySelector("#stop-image").insertAdjacentHTML("beforeend", html);
        }

        // Inject video for a specific stop ID
        if (props.id == "16") {
            let videoHTML = `
                <div style="text-align: center; margin-top: 20px;">
                    <video controls style="max-width: 100%;">
                        <source src="assets/id16/GhostTrain.mp4" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;
            document.querySelector("#stop-image").insertAdjacentHTML("beforeend", videoHTML);
        }

        document.getElementById("stop-modal").addEventListener("shown.bs.modal", function () {
            const carouselEl = document.querySelector("#carouselExampleIndicators");

        // Initialize the Bootstrap Carousel
        const myCarousel = new bootstrap.Carousel(carouselEl, {
            interval: false,
            wrap: true
        });

    // Add image number counter logic
    carouselEl.addEventListener('slid.bs.carousel', function (e) {
        const items = carouselEl.querySelectorAll('.carousel-item');
        const totalSlides = items.length;
        const activeIndex = Array.from(items).findIndex(item => item.classList.contains('active'));
        const counterEl = document.getElementById("carousel-counter");

        if (counterEl) {
            counterEl.textContent = `${activeIndex + 1}/${totalSlides}`;
        }
    });
});

        let para = document.createElement("p");
        para.textContent = "";
        document.querySelector("#stop-body").appendChild(para);

        let fontncolorbuttonWrapper = document.createElement("div");
        fontncolorbuttonWrapper.className = "modal-button-container";
        fontncolorbuttonWrapper.id = "button-container-stop";

        // Create "Font Control" button
        let fontControl = document.createElement("button");
        fontControl.textContent = "Font Size";
        fontControl.id = "toggle-font-size-stop"
        fontControl.className = "btn btn-secondary";
        //fontControl.style.fontSize = "20px";
        //fontControl.style.backgroundColor = "#808080"; // Button color (grey)

        // Close modal when clicked
        fontControl.addEventListener("click", function () {
            toggleFontSize();
        });

        fontncolorbuttonWrapper.appendChild(fontControl);
        //document.querySelector("#stop-body").appendChild(fontControl);


        // Create "Color Mode" button
        let colorControl = document.createElement("button");
        colorControl.textContent = "Color Mode";
        colorControl.className = "btn btn-secondary";
        colorControl.id = "toggle-color-mode-stop"
        //colorControl.style.fontSize = "20px";
        //colorControl.style.backgroundColor = "#808080";

        // Add event listener
        colorControl.addEventListener("click", function () {
            toggleColorMode();
        });

        // Append button inside wrapper
        fontncolorbuttonWrapper.appendChild(colorControl);

        // Append wrapper to the stop modal
        document.querySelector("#stop-body").appendChild(fontncolorbuttonWrapper);


        if (props.text) {
            let p = "<p id='stop-text'>" + props.text + "</p>";
            document.querySelector("#stop-body").insertAdjacentHTML("beforeend", p)
        }
        //add listeners for closing modal if previous button or x is pressed
        document.querySelectorAll(".close").forEach(function (elem) {
            elem.addEventListener("click", function () {
                if (elem.id == "prev") {
                    currentStop = props.id - 1 < 1 ? props.id : 1;
                }
                if (elem.id == "x") {
                    currentStop = props.id;
                }
                updateStopColor();
            })
        })

        stopModal.show();
    }

    function playAudio(audioFile = null) {

        let audio;

        if (audioFile) {
            // Stop the home audio widget if it's playing
            if (!homeAudioWidget.paused) {
                homeAudioWidget.pause();
                homeAudioWidget.currentTime = 0; // Reset to the beginning
            }

            // Create a wrapper div for centering
            let audioWrapper = document.createElement("div");
            audioWrapper.className = "audio-modal-container text-center"; // Add class for styling

            //Create a new audio element for modal audio
            audio = document.createElement("audio");
            audio.controls = true;
            audio.src = 'audio/' + audioFile;

            // Append the audio to the wrapper
            audioWrapper.appendChild(audio); 

            // Custom Audio Player Container
            audioWrapper.innerHTML = `
            <div class="custom-audio-container">
                <button class="icon-btn play-toggle">▶</button>
                <input type="range" class="progress-bar" value="0" min="0" step="0.1">
                <span class="time-display">0:00 / 0:00</span>
                <select class="speed-control">
                <option value="0.75">0.75x</option>
                <option value="1" selected>1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
                </select>
            </div>
            <audio class="custom-audio-widget">
                <source src="audio/${audioFile}" type="audio/mpeg">
            </audio>
            `;

            document.querySelector("#title-container").appendChild(audioWrapper);

            // Add interactivity for the custom player
            const audioElem = audioWrapper.querySelector(".custom-audio-widget");
            const playBtn = audioWrapper.querySelector(".play-toggle");
            const progress = audioWrapper.querySelector(".progress-bar");
            const time = audioWrapper.querySelector(".time-display");
            const speed = audioWrapper.querySelector(".speed-control");

            playBtn.addEventListener("click", () => {
            if (audioElem.paused) {
                audioElem.play();
            } else {
                audioElem.pause();
            }
            });

            audioElem.addEventListener("play", () => {
            playBtn.textContent = "⏸";
            });

            audioElem.addEventListener("pause", () => {
            playBtn.textContent = "▶";
            });

            audioElem.addEventListener("loadedmetadata", () => {
            progress.max = audioElem.duration;
            updateTime();
            });

            audioElem.addEventListener("timeupdate", () => {
            progress.value = audioElem.currentTime;
            updateTime();
            });

            progress.addEventListener("input", () => {
            audioElem.currentTime = progress.value;
            updateTime();
            });

            speed.addEventListener("change", () => {
            audioElem.playbackRate = parseFloat(speed.value);
            });

            function updateTime() {
            const curr = format(audioElem.currentTime);
            const dur = format(audioElem.duration);
            time.textContent = `${curr} / ${dur}`;
            }

            function format(sec) {
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60).toString().padStart(2, "0");
            return `${m}:${s}`;
            }

            currentAudio = audioElem;
            audioElem.currentTime = audioStartTime;
            audioElem.play();
        }

    }

    function toggleColorMode() {
        let body = document.body;
        let startContainer = document.getElementById("start-container");
        let stopContainer = document.getElementById("stop-content");
        let mapinfoContainer = document.getElementById("mapinfo-content");
        let helpContainer = document.getElementById("help-content");
        let aboutContainer = document.getElementById("about-content");

        if (isDarkMode) {
            // Switch to Light Mode
            body.style.backgroundColor = "white"; // Reset background
            body.style.color = "black"; // Reset text color
            if (startContainer) startContainer.style.backgroundColor = "white"; // Ensure container stays white
            if (stopContainer) stopContainer.style.backgroundColor = "white"; // Ensure container stays white
            if (mapinfoContainer) mapinfoContainer.style.backgroundColor = "white"; // Ensure container stays white
            if (helpContainer) helpContainer.style.backgroundColor = "white"; // Ensure container stays white
            if (aboutContainer) aboutContainer.style.backgroundColor = "white"; // Ensure container stays white
        } else {
            // Switch to Dark Mode
            body.style.backgroundColor = "black"; // Dark background
            body.style.color = "white"; // White text
            if (startContainer) startContainer.style.backgroundColor = "black"; // Make container match dark mode
            if (stopContainer) stopContainer.style.backgroundColor = "black"; // Make container match dark mode
            if (mapinfoContainer) mapinfoContainer.style.backgroundColor = "black"; // Make container match dark mode
            if (helpContainer) helpContainer.style.backgroundColor = "black"; // Make container match dark mode
            if (aboutContainer) aboutContainer.style.backgroundColor = "black"; // Make container match dark mode
        }

        isDarkMode = !isDarkMode; // Toggle mode state
    }

    function toggleFontSize() {
        paragraphs = document.querySelectorAll("p");
        paragraphs.forEach(p => {
            if (isLargeFont) {
                p.style.fontSize = ""; // Reset to default
            } else {
                p.style.fontSize = "28px"; // Adjust as needed
            }
        });
        isLargeFont = !isLargeFont;
    }

    function cacheLoading(){
        if (navigator.serviceWorker) {
            const cacheStatus = document.getElementById("cache-status");
            if (cacheStatus) {
                cacheStatus.textContent = "Caching audio files...";
            }

            navigator.serviceWorker.register('service-worker.js').then(function(reg) {
                if (reg.installing) {
                    reg.installing.onstatechange = function() {
                        if (reg.waiting || reg.active) {
                            if (cacheStatus) {
                                cacheStatus.textContent = "All files cached";
                            }
                        }
                    };
                } else if (reg.active) {
                    if (cacheStatus) {
                        cacheStatus.textContent = "All files cached";
                    }
                }
            }).catch(function(error) {
                console.log('Registration failed with ' + error);
                if (cacheStatus) {
                    cacheStatus.textContent = "Audio caching failed";
                }
            });
        }
    }

    document.addEventListener("DOMContentLoaded", function () {

        cacheLoading();

        const startTourButtons = document.querySelectorAll("#start-tour-btn");
        const startContainer = document.getElementById("start-container");
        const mapContainer = document.getElementById("map-container");

        // startTourButtons.forEach(button => {
        //     button.addEventListener("click", function () {
        //         startContainer.style.display = "none";
        //         mapContainer.style.display = "block";
        //         createMap();
        //     });
        // });

        startTourButtons.forEach(button => {
            button.addEventListener("click", async function () {

                // Proceed with tour
                startContainer.style.display = "none";
                mapContainer.style.display = "block";
                //document.body.classList.add("no-scroll");
                createMap();
                window.scrollTo(0, 0);
            });
        });

    });

    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("refreshBrand").addEventListener("click", function (event) {
            event.preventDefault(); // Prevent default link behavior
            location.reload(); // Refresh the page
        });
    });

    document.addEventListener("DOMContentLoaded", function () {
        const carousel = document.querySelector("#carouselExampleIndicators");

        if (carousel) {
            let touchStartX = 0;
            let touchEndX = 0;

            carousel.addEventListener("touchstart", function (event) {
                touchStartX = event.touches[0].clientX;
            });

            carousel.addEventListener("touchmove", function (event) {
                touchEndX = event.touches[0].clientX;
            });

            // carousel.addEventListener("touchend", function () {
            //     if (touchStartX - touchEndX > 50) {
            //         // Swipe left (Next slide)
            //         bootstrap.Carousel.getInstance(carousel).next();
            //     } else if (touchEndX - touchStartX > 50) {
            //         // Swipe right (Previous slide)
            //         bootstrap.Carousel.getInstance(carousel).prev();
            //     }
            // });

            carousel.addEventListener("touchend", function () {
                let instance = bootstrap.Carousel.getInstance(carousel);
                if (!instance) {
                    instance = new bootstrap.Carousel(carousel, { interval: false, wrap: true });
                }

                if (touchStartX - touchEndX > 50) {
                    // Swipe left (Next slide)
                    instance.next();
                } else if (touchEndX - touchStartX > 50) {
                    // Swipe right (Previous slide)
                    instance.prev();
                }
            });
        }
    });

    document.addEventListener("DOMContentLoaded", function () {
        let toggleColorModeButton = document.getElementById("toggle-color-mode");
        let toggleFontSizeButton = document.getElementById("toggle-font-size");

        // Attach event listener for static button
        if (toggleFontSizeButton) {
            toggleFontSizeButton.addEventListener("click", toggleFontSize);
        }

        // Attach event listener for static button
        if (toggleColorModeButton) {
            toggleColorModeButton.addEventListener("click", toggleColorMode);
        }
    });

    


})();