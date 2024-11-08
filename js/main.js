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

    //splash screen modal variables
    let splash = document.getElementById('splash-modal'),
        splashModal = new bootstrap.Modal(splash);
    splashModal.show();
    //modal variables for stops
    let stop = document.getElementById('stop-modal'),
        stopModal = new bootstrap.Modal(stop);

    function createMap(){
        map = L.map("map",{
            center: startPosition,
            zoom:17,
            maxZoom:18,
            minZoom:12
        });
        //set basemap tileset
        let basemap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        buffers = L.layerGroup().addTo(map);

        //location listener
        map.on('locationfound', onLocationFound);
        //don't automatically center the map if the map has been panned
        map.on("mousedown",function(ev){
            //turn off map centering if map is panned
            if (ev.originalEvent.originalTarget.id == "map")
                center = false;

            document.querySelector("#center").style.display = "block";
        })
        //set click listener for the center map button
        document.querySelector("#center").addEventListener("click", function(event){
            map.locate({setView:false, watch:true, enableHighAccuracy: true});
            center = true;
        })
        document.querySelector("#about").addEventListener("click", function(event){
            alert("New button clicked!");
        })
        //center map on location at interval
        window.setInterval( function(){
            map.locate({
                enableHighAccuracy: true
            });
        }, 5000);
        //add stop data
        addRoute();
        addStops();
        addWarnings();
        //get initial location and center map
        map.locate({setView:false, watch:true, enableHighAccuracy: true});
    }
    //location findinging function
    function onLocationFound(e){
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
    }
    //add tour route to the map
    function addRoute(){
        fetch("data/Route_new.geojson")
            .then(res => res.json())
            .then(data => {
                route = L.geoJson(data,{
                    style:{
                        color:routeColor,
                        weight:3
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
                        weight:2
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
                                        .setContent('<p>Starting Point</p>')
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
        
        //if(props.id == 12){
        //    return props.id == currentStop ? "#cca605" : "#f9d950"
        //}
        //else{
        
        if(props.stop == 0){
            return props.id == currentStop ? activeStopFill : inactiveStopFill;
        }
        else{
            return props.id == currentStop ? activeMainStopFill : inactiveMainStopFill;
        }
        //}
    }
    function stopOutlineColor(props){
        //if(props.id == 12){
        //    return props.id == currentStop ? "#f9d950" : "#cca605"
        //}
        //else{
        if(props.stop == 0){
            return props.id == currentStop ? activeStopOutline : inactiveStopOutline;
        }
        else{
            return props.id == currentStop ? activeMainStopOutline : inactiveMainStopOutline;
        }
        //}
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
                        playAudio(layer.feature.properties.audio)
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
        //add title if title exists
        if (props.name){
            let title = "<h1 class='modal-title' id='stop-title'>" + props.name + "</h1>";
            document.querySelector("#title-container").insertAdjacentHTML("beforeend",title)
        }
        //add audio button if audio exists
        if (props.audio){
            let button = "<button id='play-audio'>Play Audio</button>";
            document.querySelector("#title-container").insertAdjacentHTML("beforeend",button)
            document.querySelector("#play-audio").addEventListener("click",function(){
                if (active == false){
                    document.querySelector("#play-audio").innerHTML = "Stop Audio";
                    playAudio(props.audio)
                    // document.querySelector("#play-audio").innerHTML = "Stop Audio";
                }
            })
        }
        //add image if image exists
        if (props.image){

            let html = "<div class='w3-content w3-display-container'>";
            for (let i = 1; i <= props.image; i++) {
                html += `
                    <div class="image-container" style="position:relative; width:100%;">
                        <img class="mySlides" src="assets/id${props.id}/${i}.png" style="width:100%">
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

    //play audio
    function playAudio(audioFile){
        active = true;
        //create audio element
        let audio = document.createElement("audio");

        let source = "<source src='audio/" + audioFile + "'>",
            play = "<p class='play'>&#9654;</p>";
        //add source 
        audio.insertAdjacentHTML("beforeend",source)
        //insert audio element into document
        document.querySelector("body").append(audio);
        document.querySelector("body").insertAdjacentHTML("beforeend",play);
        //change button on modal
        document.querySelector("#play-audio").innerHTML = "Stop Audio";
        //play audio
        audio.play().catch((e)=>{
            console.log("error")
         });
        //remove audio when finished
        audio.onended = function(){
            stopAudio();
            //hide modal
            stopModal.hide();
        }
        //add listener to stop audio if modal is closed
        document.querySelectorAll(".close").forEach(function(elem){
            elem.addEventListener("click",stopAudio)
        })
        //add listener to stop audio if the stop button is pressed
        document.querySelector("#play-audio").addEventListener("click",stopAudio)
        //function to deactivate audio element and reset button
        function stopAudio(){
            //remove audio element
            audio.pause();
            audio.remove();
            //reset audio buttons
            document.querySelector("#play-audio").innerHTML = "Play Audio";               
            document.querySelector("#play-audio").removeEventListener("click",stopAudio);

            if (document.querySelector(".play"))
                document.querySelector(".play").remove();
            //set page state to inactive
            active = false; 
        }

    }

    createMap();
})();
