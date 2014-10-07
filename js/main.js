var pageHeight = $(window).height();
$("#map").css("height", pageHeight * 0.80 );

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
var allPartners = true;
var allProvinces = true;
var shelters = [];
var markersBounds = [];
var markers = new L.MarkerClusterGroup().addTo(map);
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
    var thisProvince = e.target.feature.properties.province;
    var thisMunicipality = e.target.feature.properties.municipality;
    var thisBarangay = e.target.feature.properties.barangay;
    var locationText = "Barangay " + thisBarangay + ", " + thisMunicipality + ", " + thisProvince;
    var imageUrl = "https://raw.githubusercontent.com/PhilippineRedCross/yolanda_shelter-img/master/images/" + 
        thisHouseImg;
    var img_maxHeight = ($(window).height()*0.60).toString() + "px";
    $('.modal-locationText').html(locationText);
    $('.modal-body-image').attr('src', imageUrl);
    $('.modal-body-image').css('max-height', img_maxHeight);
    $('.modal-houseCodeText').html(thisHouseCode); 
    $('#imgModal').modal();     
}

// on window resize
$(window).resize(function(){    
    // map.fitBounds(markersBounds);    
    // windowHeight = $(window).height();
})

// reset map bounds using Zoom to Extent button
function zoomOut() {
    map.fitBounds(markersBounds);
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
                "admin2": item.admin2,
                "admin3": item.admin3,
                "admin4": item.admin4,
                "province": item.province,
                "municipality": item.municipality,
                "barangay": item.barangay,
                "houseCode": item.houseCode,
                "img": item.img_house, 
                "partner": item.partner                                       
            },
            "geometry": {
                "type": "Point",
                "coordinates": latlng
            }
        };
        shelters.push(thisGeoJsonObject);
    });
    parsePartners();
}


//build partners buttons
function parsePartners() {
  var partnerCounts = {};
  var partnerList = [];
  $(shelters).each(function(index, record){
    var partnerName = record.properties.partner;
    if (partnerName in partnerCounts){
      partnerCounts[partnerName] += 1;
    } else {
      partnerCounts[partnerName] = 1;
      partnerList.push(partnerName);      
    } 
  });
  var partnerFilterHtml = "";
  partnerList.sort();
  $.each(partnerList, function(index, partner){
    var itemHtml = '<button id="'+partner+'" class="btn btn-sm btn-donor" type="button" onclick="toggleFilter('+"'partners'"+', this);">'+
        partner + 
        ' <span class="glyphicon glyphicon-unchecked" style="margin-left:4px;"></span></button>';
    partnerFilterHtml += itemHtml;    
  });
  $('#partnerButtons').html(partnerFilterHtml);

  parseProvinces();
}


function parseProvinces() {
  var provinceInfo = {};
  $(shelters).each(function(index, record){
    var admin2 = record.properties.admin2;
    // var provinceName = record.properties.province
    if (admin2 in provinceInfo){
      provinceInfo[admin2].count += 1;
    } else {
      provinceInfo[admin2] = {};
      provinceInfo[admin2].count = 1;
      provinceInfo[admin2].name = record.properties.province;      
    } 
  });
  var provinceFilterHtml = "";
  $.each(provinceInfo, function(index, province){
    var itemHtml = '<button id="'+index+'" class="btn btn-sm btn-donor" type="button" onclick="toggleFilter('+"'provinces'"+', this);">'+
        province.name + 
        ' <span class="glyphicon glyphicon-unchecked" style="margin-left:4px;"></span></button>';
    provinceFilterHtml += itemHtml;    
  });
  $('#provinceButtons').html(provinceFilterHtml);

  markersToMap();
}

// function parseMunicip(pcode) {
//   $('#municipButtonsWrapper').empty();
//   var municipInfo = {};
//   var admin2 = pcode;
//   $(shelters).each(function(index, record){
//     var thisAdmin2 = record.properties.admin2;
//     var admin3 = record.properties.admin3;
//     if (admin2 === thisAdmin2){
//       if (admin3 in municipInfo){
//         municipInfo[admin3].count += 1;
//       } else {
//         municipInfo[admin3] = {};
//         municipInfo[admin3].count = 1;
//         municipInfo[admin3].name = record.properties.municipality;      
//       } 
//     }
//   var municipFilterHtml = '<h6><b>Municipalities:</b><span  id="municipButtons" style="padding-left:10px;">' ;
//   $.each(municipInfo, function(index, municip){
//     var itemHtml = '<button id="'+index+'" class="btn btn-sm btn-municip" type="button" onclick="toggleFilter('+"'municipalities'"+', this);">'+
//         municip.name +' (' + municip.count + ')'+ 
//         '<span class="glyphicon glyphicon-unchecked" style="margin-left:4px;"></span></button>';
//     municipFilterHtml += itemHtml;    
//   });
//   municipFilterHtml += '</span></h6>';
//   $('#municipButtonsWrapper').html(municipFilterHtml);
    
//   });
// }
          

function toggleFilter(filter, element) {
  
  var filterbuttons;
  var filterAllFilter;

  switch(filter){
    case 'partners':
      filterButtons = $("#partnerButtons").children(); 
      allPartners = false;
      break; 
    case 'provinces':
      filterButtons = $("#provinceButtons").children();
      allProvinces = false;
      break;
  } 
  if($(element).hasClass("filtering") !== true){
  // if clicked element is off turn every button off and turn clicked on   
    $.each(filterButtons, function(i, button){
      $(button).children().removeClass("glyphicon-check");
      $(button).children().addClass("glyphicon-unchecked");
      $(button).removeClass("filtering");
    });
    $(element).children().removeClass("glyphicon-unchecked"); 
    $(element).children().addClass("glyphicon-check");
    $(element).addClass("filtering");         
  } else {
  // if clicked element is on turn it off and turn 'all' filter for that category to true
    $.each(filterButtons, function(i, button){
      $(button).children().removeClass("glyphicon-check");
      $(button).children().addClass("glyphicon-unchecked");
      $(button).removeClass("filtering");
    });
    switch(filter){
      case 'partners':
        allPartners = true;
        break; 
      case 'provinces':
        allProvinces = true;
        break;
    }    
  }
  markersToMap();
}


function markersToMap(){
    map.removeLayer(markers);
    markers = new L.MarkerClusterGroup({
        showCoverageOnHover:false, 
        maxClusterRadius: 20,   
        spiderfyDistanceMultiplier:2
    });    
    var displayedShelters = [];
    var partnerFilter = $("#partnerButtons").find(".filtering").attr("id");
    var provinceFilter = $("#provinceButtons").find(".filtering").attr("id");
    $.each(shelters, function (index, shelter){
      if(shelter.properties.partner === partnerFilter || allPartners === true){
        if(shelter.properties.admin2 === provinceFilter || allProvinces === true){
          displayedShelters.push(shelter);
        }
      }
    });
    // update count
    var displayedCount = displayedShelters.length.toString();
    $("#mappedCount").html(displayedCount);

    //disable buttons
    var possibleFilters = ["ALL-PARTNERS", "ALL-PROVINCES"];
    var filterProperties = ["partner", "admin2", "admin3", "admin4"];
    $.each(displayedShelters, function(index, shelter){
      $.each(filterProperties, function(index2, property){
        if($.inArray(shelter.properties[property], possibleFilters) === -1){
          possibleFilters.push(shelter.properties[property]);
        } 
      }); 
    });    
    var filterGroups = ["#partnerButtons", "#provinceButtons"];
    $.each(filterGroups, function(index, grouping){
      var thisButtons = $(grouping).children();
      thisButtons.removeClass("disabled");
      $.each(thisButtons, function(index2, button){
        var buttonId = $(button).attr("id");
        if($.inArray(buttonId, possibleFilters) === -1){
          $(button).addClass("disabled");
        }
      });
    });
    marker = L.geoJson(displayedShelters, {
    // marker = L.geoJson(shelters, {
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
    markersBounds._northEast.lat += 0.08;
    markersBounds._northEast.lng += 0.08;
    markersBounds._southWest.lat -= 0.08;
    markersBounds._southWest.lat -= 0.08;
    map.fitBounds(markersBounds);    
} 

//start function chain for map
getData();