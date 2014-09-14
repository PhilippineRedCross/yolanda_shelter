var mapUrl = 'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
var mapAttribution = 'Map data &copy; <a href="http://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/" target="_blank">CC-BY-SA</a> | Map style by <a href="http://hot.openstreetmap.org" target="_blank">H.O.T.</a> | &copy; <a href="https://ifrc.org/" title="IFRC" target="_blank">IFRC</a> 2014 | <a title="Disclaimer" onClick="showDisclaimer();">Disclaimer</a>';
var mapTiles = L.tileLayer(mapUrl, {attribution: mapAttribution});

var map = L.map('map', {   
    zoom: 7,
    center: [10.984, 122.415],
    // maxZoom: ,
    zoomControl: false,
    scrollWheelZoom: false,
    layers: [mapTiles]
});

// Add our Leaflet zoom control manually where we want it
var zoomControl = L.control.zoom({
    position: 'topright'
});
map.addControl(zoomControl);

// Add our loading control in the same position and pass the 
// zoom control to attach to it
var loadingControl = L.Control.loading({
    position: 'topright',
    zoomControl: zoomControl
});
map.addControl(loadingControl);

// global variables
// ================
var shelters = [];
var markersBounds = [];
var markers = new L.MarkerClusterGroup();
var centroidOptions = {
    radius: 8,
    fillColor: "#ED1B2E",
    color: "#FFF",
    weight: 2.5,
    opacity: 1,
    fillOpacity: 1
};

// helper functions
// ================

// on marker click open modal
function markerClick (e) {
    var thisHouseCode = e.target.feature.properties.houseCode;    
    var thisHouseImg = e.target.feature.properties.img;
    // e.target.feature.properties.province
    // e.target.feature.properties.municipality
    // e.target.feature.properties.barangay

    // var modalDescription = $(item).find('.modalDescription').html();	
    // var mapJpg = $(item).find('img').attr("data-original").slice(0,-10) + '.jpg';
    // var img_maxHeight = (windowHeight*0.60).toString() + "px";
    // $(".modal-detailedDescription").empty();	
    // $(".modal-detailedDescription").html(modalDescription); 
    // $(".modal-img").css('max-height', img_maxHeight);
    // $(".modal-img").attr('src', mapJpg);
    // $('#myModal').modal();     
}

// on window resize
$(window).resize(function(){    
    // map.fitBounds(markersBounds);    
    // windowHeight = $(window).height();
})

// reset map bounds using Zoom to Extent button
function zoomOut() {
    // map.fitBounds(markersBounds);
}

// show disclaimer text on click of dislcaimer link
function showDisclaimer() {
  window.alert("The maps used do not imply the expression of any opinion on the part of the International Federation of Red Cross and Red Crescent Societies or National Societies concerning the legal status of a territory or of its authorities.");
}

// function chain for map
// ======================

// get CSV file
function getData() { 
	d3.csv("data/shelter-data.csv", function(data){ 
		formatData(data); 
	});
}

// format CSV data as geoJson
function formatData(data){
    $.each(data, function(index, item) {
        var latlng = [item._location_longitude, item._location_latitude];
        var thisGeoJsonObject = {
            "type": "Feature",
            "properties": {
                "houseCode": item.houseCode,
                "img": item.img_house,                                        
            },
            "geometry": {
                "type": "Point",
                "coordinates": latlng
            }
        };
        shelters.push(thisGeoJsonObject);
    });
    markersToMap();
}

function markersToMap(){
    map.removeLayer(markers);
    markers = new L.MarkerClusterGroup({
        showCoverageOnHover:false, 
        maxClusterRadius: 20,   
        spiderfyDistanceMultiplier:2
    });    
    // idList = [];
    // displayedPoints=[];
    // $.each(thumbnails, function (i, thumbnail){
    //    if($(thumbnail).hasClass("mapped")){
    //        idList.push($(thumbnail).attr("id"));
    //    }
    // })
    // $.each(centroids, function (i, centroid){
    //    var centroid_id = centroid.properties.thumbnail_id;
    //    if ($.inArray(centroid_id, idList) !== -1){
    //        displayedPoints.push(centroid);
    //    }        
    // })    
    // marker = L.geoJson(displayedPoints, {
    marker = L.geoJson(shelters, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, centroidOptions);
        },
        onEachFeature: function(feature, layer) {
            layer.on({
                click: markerClick
            });   
        }            
    });
    markers.addLayer(marker);
    markers.addTo(map);
    markersBounds = markers.getBounds();
    markersBounds._northEast.lat += 0.05;
    markersBounds._northEast.lng += 0.05;
    markersBounds._southWest.lat -= 0.05;
    markersBounds._southWest.lat -= 0.05;
    map.fitBounds(markersBounds);    
} 

//start function chain for map
getData();