//locative audio
//fence around each stop
//get user's location
//check intersection between stop and location
//create layout for popup at each stop (less important)

(function(){
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
    let startPosition = [43.0877073,-87.88484659]

    let slideIndex = 1
    let slideIndexHome = 1

    let currentAudio = null; 
    const homeAudioWidget = document.getElementById("homeAudioWidget");

    //splash screen modal variables
    let splash = document.getElementById('splash-modal'),
        splashModal = new bootstrap.Modal(splash);
    splash.style.top = "60px";    
    splashModal.show();
    //modal variables for stops
    let stop = document.getElementById('stop-modal'),
        stopModal = new bootstrap.Modal(stop);

    

        function createMap() {
            map = L.map("map", {
                center: startPosition,
                zoom: 17,
                maxZoom: 18,
                minZoom: 12
            });
        
            let lightMode = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);
        
            let darkMode = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            });
        
            let currentLayer = lightMode;
        
            // Dynamically create the button
            let toggleButton = document.createElement("button");
            toggleButton.id = "toggle-dark-mode";
            toggleButton.innerHTML = '<img src="lib/leaflet/images/layers2.png" alt="Dark Mode" style="width:24px; height:24px;">';
            document.body.appendChild(toggleButton);
        
            // Add event listener for the button
            toggleButton.addEventListener("click", () => {
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

            document.querySelector("#center").addEventListener("click",getLocation)
        
            buffers = L.layerGroup().addTo(map);
        
            // Additional map setup (routes, stops, warnings, etc.)
            addRoute();
            addStops();
            addWarnings();
            //map.locate({ setView: false, watch: true, enableHighAccuracy: true });
        }
    //location findinging function
    function getLocation(){
        map.locate({setView:true, watch:true, enableHighAccuracy: true} );
        console.log("locate")
        function onLocationFound(e){
            console.log("sup")
            let radius = e.accuracy / 2;
            //removes marker and circle before adding a new one
            if (locationMarker){
                map.removeLayer(circle);
                map.removeLayer(locationMarker);
            }
            //adds location and accuracy information to the map
            if (e.accuracy < 90){
                circle = L.circle(e.latlng, {radius:radius, interactive:false}).addTo(map);
                locationMarker = L.marker(e.latlng,{interactive:false}).addTo(map);
                //locationMarker = L.marker(e.latlng).addTo(map).bindPopup("You are within " + Math.round(radius) + " meters of this point");
            }
            //if accuracy is less than 60m then stop calling locate function
            if (e.accuracy < 40){
                let count = 0;
                map.stopLocate();
                count++;
            }
        }
    
        map.on('locationfound', onLocationFound);

        //activate location at a regular interval
        window.setInterval( function(){
            map.locate({
                setView: false,
                enableHighAccuracy: true
                });
        }, 2500);
    }
    /*function onLocationFound(e){
        let radius = e.accuracy / 2;
    
        //removes marker and circle before adding a new one
        if (locationMarker){
            map.removeLayer(circle);
            map.removeLayer(locationMarker);
        }
        //adds location and accuracy information to the map
        if (e.accuracy < 90){
            circle = L.circle(e.latlng, {
                radius: radius,
                color: null,          // Removes the border
                fillColor: 'blue',    // Fill color of the circle
                fillOpacity: 0.1      // Adjust as needed
            }).addTo(map);

            locationMarker = L.circleMarker(e.latlng, {
                color: 'white',      // Border color
                fillColor: 'blue', // Center color
                fillOpacity: 1,     // Full opacity for the center
                radius: 7,         // Adjust the radius as needed
                weight: 2          // Border thickness
            }).addTo(map);
            
        }
        //if accuracy is less than 60m then stop calling locate function
        if (e.accuracy < 40){
            map.stopLocate();
        }
        //only recenter map if center variable is true
        if (center == true){
            map.setView(e.latlng, 17);
            center = false
        }

        //removeFoundMarker(circle, locationMarker);
        checkLocation(radius);
    }*/
    //add tour route to the map
    function addRoute(){
        fetch("data/Route_new.geojson")
            .then(res => res.json())
            .then(data => {
                route = L.geoJson(data,{
                    style:{
                        color:routeColor,
                        weight:3.5
                    }
                }).addTo(map)
            })

        fetch("data/Route_acc_alt4.geojson")
            .then(res => res.json())
            .then(data => {
                route = L.geoJson(data,{
                    style:{
                        color:routeColor,
                        dashArray:"5 10",
                        weight:3.5
                    }
                }).addTo(map)
            })
    }
    //add tour stops to map
    function addStops(){
        let radius = 50;

        fetch("data/temp.csv")
            .then(res => res.text())
            .then(data => {
                //parse csv
                data = Papa.parse(data,{
                    header:true
                }).data;
                //create geojson
                let geojson = {
                    type:"FeatureCollection",
                    name:"Sites",
                    features:[]
                }
                //populate geojson
                data.forEach(function(feature, i){
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
                stops = L.geoJson(geojson,{
                    pointToLayer:function(feature, latlng){
                        //open tooltip if first stop
                        if (feature.properties.id == 1){
                            var popup = L.popup()
                                        .setLatLng(latlng)
                                        .setContent('<p><b>You started here!</b></p>')
                                        .openOn(map);
                        }
                        //set point styling
                        let options = {
                            radius:feature.properties.radius,
                            color:stopOutlineColor(feature.properties),
                            opacity:setOpacity(feature.properties),
                            fillColor:stopColor(feature.properties),
                            fillOpacity:setOpacity(feature.properties),
                            pane:"markerPane"
                        }
                        //function to hide hidden stops
                        function setOpacity(props){
                            return props.hidden == "TRUE" ? 0 : 1;
                        }

                        if(feature.properties.stop != "0"){
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

                        if(feature.properties.id == 34){
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
                    onEachFeature:function(feature, layer){
                        //open modal if layer is not hidden
                        layer.on('click',function(){
                            if (feature.properties.hidden != "true"){
                                openModal(feature.properties)                            }
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
                data.forEach(function(feature) {
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
                    pointToLayer: function(feature, latlng) {
                        if(feature.properties.id == 1){
                            return L.marker(latlng, { icon: customIcon1});
                        }
                        else{
                            return L.marker(latlng, { icon: customIcon2});
                        }
                        
                    },
                    onEachFeature: function(feature, layer) {
                        // Bind the popup with a custom class for styling
                        if(feature.properties.id == 1){
                            layer.bindPopup(feature.properties.text, { className: 'danger-popup' });
                        }
                        else{
                            layer.bindPopup(feature.properties.text, { className: 'service-popup' });
                        }
                    }
                }).addTo(map);
            });
    }
    //set stop color
    function stopColor(props){
        
        if(props.id == 34){
            return props.id == currentStop ? activeMainStopFill : inactiveMainStopFill
        }
        else{
            if(props.stop == 0){
                return props.id == currentStop ? activeStopFill : inactiveStopFill;
            }
            else{
                return props.id == currentStop ? activeMainStopFill : inactiveMainStopFill;
            }
        }
    }
    function stopOutlineColor(props){
        if(props.id == 34){
            return props.id == currentStop ? activeMainStopOutline : inactiveMainStopOutline
        }
        else{
            if(props.stop == 0){
                return props.id == currentStop ? activeStopOutline : inactiveStopOutline;
            }
            else{
                return props.id == currentStop ? activeMainStopOutline : inactiveMainStopOutline;
            }
        }
    }
    //update stop stype
    function updateStopColor(){
        stops.eachLayer(function(layer){
            layer.setStyle({
                color:stopOutlineColor(layer.feature.properties),
                fillColor:stopColor(layer.feature.properties)
            })
        })
    }
    //compare user's location to every point on the map
    function checkLocation(radius){
        //get bounds of user's location circle 
        let circleBounds = circle.getBounds();
        if (stops){
            //iterate through each point on the tour
            stops.eachLayer(function(layer){
                //create a circle around each of the points
                let layerCircle = L.circle(layer._latlng, {
                    radius:radius
                }).addTo(map);
                //get bounds of the circle
                let layerBounds = layerCircle.getBounds()
                //compare the location of the point's circle to the user's location
                if(layerBounds.intersects(circleBounds)){
                    //play audio and open modal if it hasn't been played before
                    if (active == false && !played.includes(layer.feature.properties.id)){
                        //open modal
                        if (layer.feature.properties.hidden != "true")
                            openModal(layer.feature.properties)
                        //play audio
                        playAudio(layer.feature.properties.audio, true);
                        //add feature to "played" list
                        played.push(layer.feature.properties.id)
                    }
                    map.removeLayer(layerCircle)
                }
                else{
                    map.removeLayer(layerCircle)
                }
            })
        }
    }

    //open modal
    function openModal(props){

        //set current stop
        currentStop = (Number(props.id) + 1) > tourLength ? Number(props.id) : Number(props.id) + 1;
        updateStopColor();

        //clear body
        document.querySelector("#stop-body").innerHTML = "";
        document.querySelector("#title-container").innerHTML = "";

        //add title if it exists
        if (props.name) {
            let title = document.createElement("h1");
            title.className = "modal-title";
            title.id = "stop-title";
            title.textContent = props.name;
            document.querySelector("#title-container").appendChild(title);
        }

        // Ensure audio does not autoplay when modal is manually opened
        if (props.audio) {
            playAudio(props.audio, false); // Pass `false` so audio does not autoplay
        }

        // Add "Go back to Map" button
        let closeButton = document.createElement("button");
        closeButton.textContent = "Go back to Map";
        closeButton.className = "btn btn-secondary"; // Bootstrap styling
        closeButton.style.marginTop = "15px"; // Add spacing
        closeButton.style.display = "block"; // Ensure it's on a new line

        // Close modal when clicked
        closeButton.addEventListener("click", function() {
            stopModal.hide(); // Close the modal
        });

        // Insert button into the stop modal
        document.querySelector("#title-container").appendChild(closeButton);

        //add image if image exists
        if (props.image){

            let html = "<div class='w3-content w3-display-container'>";
            for (let i = 1; i <= props.image; i++) {
                html += `
                    <div class="image-container" style="position:relative; max-width:800px; margin:0 auto;">
                        <img class="mySlides" src="assets/id${props.id}/${i}.png" style="width:100%; height:auto;">
                        <div class="top-right-text" style="position:absolute; top:10px; right:10px; color:white; background:rgba(0, 0, 0, 0.3); padding:5px; border-radius:3px;">
                            ${i}
                        </div>
                    </div>`;
            }
            html += `
                <button class='w3-button w3-black w3-display-left' id='play-left' style='opacity: 0.3; font-size: 32px !important; padding: 5px 5px;'>&#10094;</button>
                <button class='w3-button w3-black w3-display-right' id='play-right' style='opacity: 0.3; font-size: 32px !important; padding: 5px 5px;'>&#10095;</button>
            </div>`;
            


            //let img = "<img src='assets/id1/" + props.image + "' id='stop-img'>"
            document.querySelector("#stop-body").insertAdjacentHTML("beforeend",html)
            addSwipeListeners();
            document.querySelector("#play-left").addEventListener("click",function(){
                //if (active == false){
                plusDivs(-1)
                    //document.querySelector("#play-audio").innerHTML = "Stop Audio";
                //}
            })
            document.querySelector("#play-right").addEventListener("click",function(){
                //if (active == false){
                plusDivs(1)
                    //document.querySelector("#play-right").innerHTML = "Stop Audio";
                //}
            })

            slideIndex = 1
            showDivs(slideIndex);
        }
        
        //add body text if body text exists
        if (props.id == 24) {
            let html = `
                <div id="graph-container" style="text-align: center; margin-top: 50px;">
                    <img src="assets/id24/graph1.png" alt="Image 1" id="graph-image"  height="300" width="300">
                </div>
                <div style="text-align: center;">
                    <input type="range" id="slider" min="1" max="7" value="1" style="margin-top: 20px; width: 300px;">
                </div>`;
            document.querySelector("#stop-body").insertAdjacentHTML("beforeend",html)

            const image = document.getElementById("graph-image");
            const slider = document.getElementById("slider");

            // Function to update the displayed image based on slider value
            slider.addEventListener("input", function() {
                const value = parseInt(this.value);
                image.src = `assets/id24/graph${value}.png`;
            });

        }
        
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

    function plusDivs(n) {
        showDivs(slideIndex += n);
    }

    function plusDivsHome(n) {
        showDivsHome(slideIndexHome += n);
    }

    // Swipe Detection Function
    function addSwipeListeners() {
        let touchStartX = 0;
        let touchEndX = 0;

        const imageContainers = document.querySelectorAll(".image-container");

        imageContainers.forEach(container => {
            container.addEventListener("touchstart", (e) => {
                touchStartX = e.changedTouches[0].screenX;  // Capture starting touch position
            });

            container.addEventListener("touchend", (e) => {
                touchEndX = e.changedTouches[0].screenX;    // Capture ending touch position
                handleSwipe();
            });

            function handleSwipe() {
                const swipeThreshold = 50;  // Minimum distance to qualify as a swipe

                if (touchEndX < touchStartX - swipeThreshold) {
                    plusDivs(1);  // Swipe left → Next slide
                }
                if (touchEndX > touchStartX + swipeThreshold) {
                    plusDivs(-1); // Swipe right → Previous slide
                }
            }
        });
    }


    function showDivs(n) {
        var i;
        var x = document.getElementsByClassName("image-container");
        if (n > x.length) {slideIndex = 1}
        if (n < 1) {slideIndex = x.length} ;
        for (i = 0; i < x.length; i++) {
        x[i].style.display = "none";
        }
        x[slideIndex-1].style.display = "block";
    }

    function showDivsHome(n) {
        var i;
        var x = document.getElementsByClassName("image-container-home");
        if (n > x.length) {slideIndexHome = 1}
        if (n < 1) {slideIndexHome = x.length} ;
        for (i = 0; i < x.length; i++) {
        x[i].style.display = "none";
        }
        x[slideIndexHome-1].style.display = "block";
    }

    function playAudio(audioFile = null, shouldAutoplay = false) {
        active = true;
    
        // Stop any currently playing audio (including homeAudioWidget)
        if (currentAudio && currentAudio !== homeAudioWidget) {
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
    
            // Create a new audio element for modal audio
            audio = document.createElement("audio");
            audio.controls = true;
            audio.src = 'audio/' + audioFile;
            audio.autoplay = shouldAutoplay;
    
            // Insert the audio widget below the title in the stop modals
            document.querySelector("#title-container").appendChild(audio);
    
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
    
    document.getElementById('play-left-home').addEventListener('click', () => plusDivsHome(-1));
    document.getElementById('play-right-home').addEventListener('click', () => plusDivsHome(1));
    showDivsHome(slideIndexHome);
    // Swipe Detection for Homepage Slider
    function addSwipeListenersHome() {
        let touchStartX = 0;
        let touchEndX = 0;

        const homeImageContainers = document.querySelectorAll(".image-container-home");

        homeImageContainers.forEach(container => {
            container.addEventListener("touchstart", (e) => {
                touchStartX = e.changedTouches[0].screenX;
            });

            container.addEventListener("touchend", (e) => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            });

            function handleSwipe() {
                const swipeThreshold = 50; // Minimum distance to detect swipe

                if (touchEndX < touchStartX - swipeThreshold) {
                    plusDivsHome(1); // Swipe left → Next slide
                }
                if (touchEndX > touchStartX + swipeThreshold) {
                    plusDivsHome(-1); // Swipe right → Previous slide
                }
            }
        });
    }

    // Activate swipe detection for the homepage
    addSwipeListenersHome();

    createMap();
    
})();
