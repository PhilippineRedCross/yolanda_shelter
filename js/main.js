var pageHeight = $(window).height();
$("#map").css("height", pageHeight * 0.70 );

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
var allMunicip = true;
var allBarangays = true;
var shelters = [];
var displayedShelters = [];
var demographicData = [];
var markersBounds = [];
var markers = new L.MarkerClusterGroup().addTo(map);
var centroidOptions = {
    radius: 8,
    fillColor: "#a50f15",
    color: "#FFF",
    weight: 2.5,
    opacity: 1,
    fillOpacity: 1
};

// helper functions
// ================

// comma seperator for thousands
var formatCommas = d3.format(",");

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

// get CSV files
function getData(){
  d3.csv("data/demographic-data.csv", function(data){ 
    demographicData = data;
    getMapData(); 
  });
}

function getMapData() {
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
  var partnerList = [];
  $(shelters).each(function(index, record){
    if ($.inArray(record.properties.partner, partnerList) === -1){
      partnerList.push(record.properties.partner); 
    }           
  });
  var partnerFilterHtml = "";
  partnerList.sort();
  $.each(partnerList, function(index, partner){
    var itemHtml = '<button id="'+partner+'" class="btn btn-xs btn-donor" type="button" onclick="toggleFilter('+"'partners'"+', this);">'+
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
    if (admin2 in provinceInfo){
      return;
    } else {
      provinceInfo[admin2] = record.properties.province;      
    } 
  });
  var provinceFilterHtml = "";
  $.each(provinceInfo, function(index, province){
    var itemHtml = '<button id="'+index+'" class="btn btn-xs btn-province" type="button" onclick="toggleFilter('+"'provinces'"+', this);">'+
        province + 
        ' <span class="glyphicon glyphicon-unchecked" style="margin-left:4px;"></span></button>';
    provinceFilterHtml += itemHtml;    
  });
  $('#provinceButtons').html(provinceFilterHtml);
  markersToMap();
}

function parseMunicip(pcode) {
  $('#municipButtonsWrapper').empty();
  var municipInfo = {};
  var admin2 = pcode;
  $(shelters).each(function(index, record){
    var thisAdmin2 = record.properties.admin2;
    var admin3 = record.properties.admin3;
    if (admin2 === thisAdmin2){
      if (admin3 in municipInfo){
        return;
      } else {
        municipInfo[admin3] = record.properties.municipality;      
      } 
    }
  });
  var municipFilterHtml = '<h6><b>Municipalities:</b><span  id="municipButtons" style="padding-left:10px;">' ;
  $.each(municipInfo, function(index, municip){
    var itemHtml = '<button id="'+index+'" class="btn btn-xs btn-municip" type="button" onclick="toggleFilter('+"'municipalities'"+', this);">'+
        municip +
        '<span class="glyphicon glyphicon-unchecked" style="margin-left:4px;"></span></button>';
    municipFilterHtml += itemHtml;    
  });
  municipFilterHtml += '</span></h6>';
  $('#municipButtonsWrapper').html(municipFilterHtml);   
}
          
function parseBarangays(pcode) {
  $('#barangayButtonsWrapper').empty();
  var brgyInfo = {};
  var admin3 = pcode;
  $(shelters).each(function(index, record){
    var thisAdmin3 = record.properties.admin3;
    var admin4 = record.properties.admin4;
    if (admin3 === thisAdmin3){
      if (admin4 in brgyInfo){
        return;
      } else {
        brgyInfo[admin4] = record.properties.barangay;      
      } 
    }
  });
  var brgyFilterHtml = '<h6><b>Barangays:</b><span  id="barangayButtons" style="padding-left:10px;">' ;
  $.each(brgyInfo, function(index, brgy){
    var itemHtml = '<button id="'+index+'" class="btn btn-xs btn-brgy" type="button" onclick="toggleFilter('+"'barangays'"+', this);">'+
        brgy +
        '<span class="glyphicon glyphicon-unchecked" style="margin-left:4px;"></span></button>';
    brgyFilterHtml += itemHtml;    
  });
  brgyFilterHtml += '</span></h6>';
  $('#barangayButtonsWrapper').html(brgyFilterHtml);  
}


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
      parseMunicip($(element).attr("id"));
      break;
    case 'municipalities':
      filterButtons = $("#municipButtons").children();
      parseBarangays($(element).attr("id"));
      allMunicip = false;
      break;
    case 'barangays':
      filterButtons = $("#barangayButtons").children();
      allBarangays = false;
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
        allMunicip = true;
        allBarangays = true;
        $('#municipButtonsWrapper').empty();
        $('#barangayButtonsWrapper').empty();
        break;
      case 'municipalities':
        allMunicip = true;
        allBarangays = true;
        $('#barangayButtonsWrapper').empty();
        break;
      case 'barangays':
        allBarangays = true;
        break;
    }    
  }
  markersToMap();
}

function resetFilters(){
  allPartners = true;
  allProvinces = true;
  $.each($("#provinceButtons").children(), function(i, button){
    $(button).children().removeClass("glyphicon-check");
    $(button).children().addClass("glyphicon-unchecked");
    $(button).removeClass("filtering");
  });
  $.each($("#partnerButtons").children(), function(i, button){
    $(button).children().removeClass("glyphicon-check");
    $(button).children().addClass("glyphicon-unchecked");
    $(button).removeClass("filtering");
  });
  $('#municipButtonsWrapper').empty();
  $('#barangayButtonsWrapper').empty();
  markersToMap();
}

function generateGraphs(){
  var admin4List = [];
  $.each(displayedShelters, function(index, shelter){
    if($.inArray(shelter.properties.admin4, admin4List) === -1){
      admin4List.push(shelter.properties.admin4);
    }
  });
  var maleYoung = 0;
  var maleChild = 0;
  var maleAdult = 0;
  var maleSenior = 0;
  var femaleYoung = 0;
  var femaleChild = 0;
  var femaleAdult = 0;
  var femaleSenior = 0;
  var pregnant = 0;
  var mSingleHead = 0;
  var fSingleHead = 0;
  var mDisabled = 0;
  var fDisabled = 0;
  $.each(demographicData, function(index, household){
    if($.inArray(household.admin4, admin4List) !== -1){
      maleYoung += parseInt(household.male_young, 10);
      maleChild += parseInt(household.male_child, 10);
      maleAdult += parseInt(household.male_adult, 10);
      maleSenior += parseInt(household.male_senior, 10);
      femaleYoung += parseInt(household.female_young, 10);
      femaleChild += parseInt(household.female_child, 10);
      femaleAdult += parseInt(household.female_adult, 10);
      femaleSenior += parseInt(household.female_senior, 10); 
      pregnant += parseInt(household["vulnerabilities/pregnant_lactating"], 10);     
      mDisabled += parseInt(household["vulnerabilities/disabled_ill_male"], 10);
      fDisabled += parseInt(household["vulnerabilities/disabled_ill_female"], 10);
      if(household["vulnerabilities/single_headed"] === "yes"){
        switch(household["vulnerabilities/single_headed_sex"]){
          case 'male':
            mSingleHead += 1;
            break;
          case 'female':
            fSingleHead += 1;
            break;
        }
      }
    }
  });
  var femaleTotal = femaleYoung + femaleChild + femaleAdult + femaleSenior;
  var maleTotal = maleYoung + maleChild + maleAdult + maleSenior;
  var grandTotal = femaleTotal + maleTotal;
  $("#maleYoung").html(formatCommas(maleYoung));
  $("#maleChild").html(formatCommas(maleChild));
  $("#maleAdult").html(formatCommas(maleAdult));
  $("#maleSenior").html(formatCommas(maleSenior));
  $("#femaleYoung").html(formatCommas(femaleYoung));
  $("#femaleChild").html(formatCommas(femaleChild));
  $("#femaleAdult").html(formatCommas(femaleAdult));
  $("#femaleSenior").html(formatCommas(femaleSenior));
  $("#pregnant").html(formatCommas(pregnant));
  $("#mSingleHead").html(formatCommas(mSingleHead));
  $("#fSingleHead").html(formatCommas(fSingleHead));
  $("#mDisabled").html(formatCommas(mDisabled));
  $("#fDisabled").html(formatCommas(fDisabled));
  $("#mSingleHead").html(formatCommas(mSingleHead));
  $("#fSingleHead").html(formatCommas(fSingleHead));
  $("#maleTotal").html(formatCommas(maleTotal));
  $("#femaleTotal").html(formatCommas(femaleTotal));
  $("#grandTotal").html(formatCommas(grandTotal));
}

function markersToMap(){
    map.removeLayer(markers);
    markers = new L.MarkerClusterGroup({
        showCoverageOnHover:false, 
        maxClusterRadius: 20,   
        spiderfyDistanceMultiplier:2
    });    
    displayedShelters = [];
    var partnerFilter = $("#partnerButtons").find(".filtering").attr("id");
    var provinceFilter = $("#provinceButtons").find(".filtering").attr("id");
    var municipFilter = $("#municipButtons").find(".filtering").attr("id");
    var barangayFilter = $("#barangayButtons").find(".filtering").attr("id");
    $.each(shelters, function (index, shelter){
      if(shelter.properties.partner === partnerFilter || allPartners === true){
        if(shelter.properties.admin2 === provinceFilter || allProvinces === true){
          if(shelter.properties.admin3 === municipFilter || allMunicip === true){
            if(shelter.properties.admin4 === barangayFilter || allBarangays === true){
              displayedShelters.push(shelter);
            }
          }  
        }
      }
    });
    // update count
    var displayedCount = displayedShelters.length.toString();
    $("#mappedCount").html(displayedCount);
    //disable buttons
    var possibleFilters = [];
    var filterProperties = ["partner", "admin2", "admin3", "admin4"];
    $.each(displayedShelters, function(index, shelter){
      $.each(filterProperties, function(index2, property){
        if($.inArray(shelter.properties[property], possibleFilters) === -1){
          possibleFilters.push(shelter.properties[property]);
        } 
      }); 
    });    
    var filterGroups = ["#partnerButtons", "#provinceButtons", "#municipButtons", "#barangayButtons"];
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
    map.fitBounds(markersBounds); 
    generateGraphs();   
} 

//start function chain for map
getData();