
(function () {

    let map, route, stops, locationMarker, circle, currentStop = 1, tourLength = 0, active = false, center = false, played = [];
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
            zoom: 17,
            maxZoom: 18,
            minZoom: 12
        });

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

        let currentLayer = lightMode;

        // Add event listener for the button
        document.querySelector("#toggle-dark-mode").addEventListener("click", () => {
            if (currentLayer === lightMode) {
                map.removeLayer(lightMode);
                map.addLayer(darkMode);
                currentLayer = darkMode;
            } else {
                map.removeLayer(darkMode);
                map.addLayer(lightMode);
                currentLayer = lightMode;
            }
        });

        document.querySelector("#center").addEventListener("click", getLocation)

        buffers = L.layerGroup().addTo(map);

        addRoute();
        addStops();
        addWarnings();
    }

    //location findinging function
    function getLocation() {
        map.locate({ setView: true, watch: true, enableHighAccuracy: true });
        function onLocationFound(e) {
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
                //locationMarker = L.marker(e.latlng).addTo(map).bindPopup("You are within " + Math.round(radius) + " meters of this point");
            }
            //if accuracy is less than 60m then stop calling locate function
            if (e.accuracy < 40) {
                let count = 0;
                map.stopLocate();
                count++;
            }
        }

        map.on('locationfound', onLocationFound);

        //activate location at a regular interval
        window.setInterval(function () {
            map.locate({
                setView: false,
                enableHighAccuracy: true
            });
        }, 2500);
    }

    function addRoute() {
        fetch("data/Route_new.geojson")
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
    function openModal(props){

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
            playAudio(props.audio, true); // Pass `false` so audio does not autoplay
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
        closeButton.addEventListener("click", function() {
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
        
            html += `</div><div class="carousel-inner">`;
        
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
        
        document.getElementById("stop-modal").addEventListener("shown.bs.modal", function () {
            var myCarousel = new bootstrap.Carousel(document.querySelector("#carouselExampleIndicators"), {
                interval: false, // Prevents auto-sliding
                wrap: true // Allows cycling through images
            });
        });

        let para = document.createElement("p");
        para.textContent = "";
        document.querySelector("#stop-body").appendChild(para);

        // Create "Font Control" button
        let fontControl = document.createElement("button");
        fontControl.textContent = "Change Font Size";
        fontControl.className = "btn btn-secondary"; // Bootstrap styling
        fontControl.style.fontSize = "20px";
        fontControl.style.backgroundColor = "#808080"; // Button color (grey)

        // Close modal when clicked
        fontControl.addEventListener("click", function() {
            paragraphs = document.querySelectorAll("p");
            paragraphs.forEach(p => {
                if (isLargeFont) {
                    p.style.fontSize = ""; // Reset to default
                } else {
                    p.style.fontSize = "28px"; // Adjust as needed
                }
            });
            isLargeFont = !isLargeFont;
        });

        // let html = `<br><button id="toggle-font-size-modal" class="btn btn-primary">Change Font Size</button>`;
        // document.querySelector("#stop-body").insertAdjacentHTML("beforeend", html);
        document.querySelector("#stop-body").appendChild(fontControl);

        if (props.text){
            let p = "<p id='stop-text'>" + props.text + "</p>";
            document.querySelector("#stop-body").insertAdjacentHTML("beforeend",p)
        }
        //add listeners for closing modal if previous button or x is pressed
        document.querySelectorAll(".close").forEach(function(elem){
            elem.addEventListener("click", function(){
                if (elem.id == "prev"){
                    currentStop = props.id - 1 < 1 ? props.id : 1;
                }
                if (elem.id == "x"){
                    currentStop = props.id;
                }
                updateStopColor();
            })
        })
        
        stopModal.show();
    }

    function playAudio(audioFile = null, shouldAutoplay = false) {
        active = true;
    
        // Stop any currently playing audio (including homeAudioWidget)
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
        }
    
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
        
            // Create a new audio element for modal audio
            audio = document.createElement("audio");
            audio.controls = true;
            audio.src = 'audio/' + audioFile;
            audio.autoplay = shouldAutoplay;
        
            // Append the audio to the wrapper
            audioWrapper.appendChild(audio);
        
            // Insert the wrapper below the title in the stop modals
            document.querySelector("#title-container").appendChild(audioWrapper);
        
            currentAudio = audio;
        } else {
            // Toggle play/pause for the home audio widget
            audio = homeAudioWidget;
    
            // Stop any other audio before playing home audio
            if (currentAudio && currentAudio !== homeAudioWidget) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }
    
            if (audio.paused) {
                audio.play();
            } else {
                audio.pause();
            }
    
            currentAudio = audio;
        }
    
        // Stop audio when it finishes
        audio.onended = function () {
            stopAudio(audio);
            stopModal.hide();
        };
    
        // Stop audio when the modal is closed
        document.querySelectorAll(".close").forEach(function (elem) {
            elem.addEventListener("click", () => stopAudio(audio));
        });
    
        function stopAudio(audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
            active = false;
    
            // Clear current audio reference
            if (currentAudio === audioElement) {
                currentAudio = null;
            }
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        const startTourButtons = document.querySelectorAll("#start-tour-btn");
        const startContainer = document.getElementById("start-container");
        const mapContainer = document.getElementById("map-container");

        startTourButtons.forEach(button => {
            button.addEventListener("click", function () {
                startContainer.style.display = "none";
                mapContainer.style.display = "block";
                createMap();
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
    
            carousel.addEventListener("touchend", function () {
                if (touchStartX - touchEndX > 50) {
                    // Swipe left (Next slide)
                    bootstrap.Carousel.getInstance(carousel).next();
                } else if (touchEndX - touchStartX > 50) {
                    // Swipe right (Previous slide)
                    bootstrap.Carousel.getInstance(carousel).prev();
                }
            });
        }
    });     

    document.addEventListener("DOMContentLoaded", function () {
        const toggleFontSizeButton = document.getElementById("toggle-font-size");
        // const paragraphs = document.querySelectorAll("p");
    
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
    
        // Attach event listener for static button
        if (toggleFontSizeButton) {
            toggleFontSizeButton.addEventListener("click", toggleFontSize);
        }
    
    });

    document.addEventListener("DOMContentLoaded", function () {
        const toggleColorModeButton = document.getElementById("toggle-color-mode");
        
        function toggleColorMode() {
            let body = document.body;
            let startContainer = document.getElementById("start-container");
    
            if (isDarkMode) {
                // Switch to Light Mode
                body.style.backgroundColor = ""; // Reset background
                body.style.color = ""; // Reset text color
                if (startContainer) startContainer.style.backgroundColor = "white"; // Ensure container stays white
            } else {
                // Switch to Dark Mode
                body.style.backgroundColor = "black"; // Dark background
                body.style.color = "white"; // White text
                if (startContainer) startContainer.style.backgroundColor = "black"; // Make container match dark mode
            }
    
            isDarkMode = !isDarkMode; // Toggle mode state
        }
    
        // Attach event listener for static button
        if (toggleColorModeButton) {
            toggleColorModeButton.addEventListener("click", toggleColorMode);
        }
    });
    

})();
