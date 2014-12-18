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
var activeProvince = "ALL";
var activeProvinceName = "";
var activeMunicipality = "ALL";
var activeMunicipalityName = "";
var activeBarangay = "ALL";
var activeBarangayName = "";

var partnerProvinces = [];
var partnerMunicip = [];
var partnerBrgy = [];

// var allPartners = true;
// var allProvinces = true;
// var allMunicip = true;
// var allBarangays = true;
var surveyData = [];
var filteredData = [];
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
        surveyData.push(thisGeoJsonObject);
    });
    parsePartners();
}


//build partners buttons
function parsePartners() {
  var partnerList = [];
  $.each(surveyData, function(index, record){
    var partnerName = record.properties.partner;
    if (partnerList.indexOf(partnerName) === -1){
        partnerList.push(partnerName);
    }; 
  });
  var partnerFilterHtml = '<button id="ALL-PARTNERS" class="btn btn-xs btn-donor filtering all" type="button" onclick="togglePartnerFilter('+"'ALL-DONORS'"+', this);"'+
      ' style="margin-right:10px;">All<span class="glyphicon glyphicon-check" style="margin-left:4px;"></span></button>';
  partnerList.sort();
  $.each(partnerList, function(index, partner){
    var itemHtml = '<button id="'+partner+'" class="btn btn-xs btn-donor" type="button" onclick="togglePartnerFilter('+"'"+partner+"'"+', this);">'+partner+
        '<span class="glyphicon glyphicon-unchecked" style="margin-left:4px;"></span></button>';
    partnerFilterHtml += itemHtml;    
  });
  $('#partnerButtons').html(partnerFilterHtml);
  partnerButtons = $("#partnerButtons").children();
  buildProvinceDropdown(); 
}

function resetFilters() {
  activeProvince = "ALL";
  activeMunicipality = "ALL";
  activeBarangay = "ALL";          
  $('#dropdown-menu-municipality').html('<li class="disabled"><a role="menuitem" href="#">First select a province</a></li>');
  $('#dropdown-menu-barangay').html('<li class="disabled"><a role="menuitem" href="#">First select a municipality</a></li>');
  $("#selected-admin-label").html("All validated houses");
  $.each(partnerButtons, function(i, button){
    $(button).removeClass("disabled");
    $(button).children().removeClass("glyphicon-check");
    $(button).children().addClass("glyphicon-unchecked");
    $(button).removeClass("filtering");
  });
  var partnerAllFilter = $('#partnerButtons').find('.all');
  $(partnerAllFilter).children().removeClass("glyphicon-unchecked"); 
  $(partnerAllFilter).children().addClass("glyphicon-check");
  $(partnerAllFilter).addClass("filtering");
  changePartnerFilter(); 
}

function buildProvinceDropdown() {
  var provinceList = [];
  var provinceAdminLookup = {};
  $.each(surveyData, function(index, record){
    var thisProvince = record.properties["province"];
    if($.inArray(thisProvince, provinceList) === -1){
      provinceList.push(thisProvince);
      provinceAdminLookup[record.properties.province] = record.properties.admin2;
    }
  });
  // sort so that the provinces appear in alphabetical order in dropdown
  provinceList = provinceList.sort(); 
  // create item elements in dropdown list   
  for(var i = 0; i < provinceList.length; i++) {
      var item = provinceList[i];
      var listItemHtml = '<li id="'+provinceAdminLookup[item]+'"><a href="#" onClick="provinceSelect('+
        "'"+ provinceAdminLookup[item] +"', this"+ '); return false;">' + item + "</li>";
      $('#dropdown-menu-province').append(listItemHtml);       
  }
  $("#loading").fadeOut(300);
  filterData();
}

function provinceSelect(admin2, element){
  activeProvince = admin2;
  activeProvinceName = $(element).html();
  activeMunicipality = "ALL";
  activeMunicipalityName = "";
  activeBarangay = "ALL";
  activeBarangayName = "";
  $("#selected-admin-label").html(activeProvinceName);
  buildMunicipalityDropdown();
  disablePartnerButtons();
  changePartnerFilter();
}

function municipalitySelect(admin3, element){
  activeMunicipality = admin3;
  activeMunicipalityName = $(element).html();
  activeBarangay = "ALL";
  activeBarangayName = "";
  $("#selected-admin-label").html(activeProvinceName + ", " + activeMunicipalityName);
  $("#selected-barangay-text").empty();
  buildBarangayDropdown();
  disablePartnerButtons();
  changePartnerFilter();
}

function barangaySelect(admin4, element){
  activeBarangay = admin4;
  activeBarangayName = $(element).html();
  $("#selected-admin-label").html(activeProvinceName + ", " + activeMunicipalityName + ", "+ activeBarangayName);
  disablePartnerButtons();
  changePartnerFilter();
}

function togglePartnerFilter (filter, element) {
  if($(element).hasClass("filtering") !== true){
  // if clicked element is off turn every button off and turn clicked on   
    $.each(partnerButtons, function(i, button){
      $(button).children().removeClass("glyphicon-check");
      $(button).children().addClass("glyphicon-unchecked");
      $(button).removeClass("filtering");
    });
    $(element).children().removeClass("glyphicon-unchecked"); 
    $(element).children().addClass("glyphicon-check");
    $(element).addClass("filtering");         
  } else {
  // if clicked element is on turn it off and turn 'all' filter on
    $.each(partnerButtons, function(i, button){
      $(button).children().removeClass("glyphicon-check");
      $(button).children().addClass("glyphicon-unchecked");
      $(button).removeClass("filtering");
    });
    var partnerAllFilter = $('#partnerButtons').find('.all');
    $(partnerAllFilter).children().removeClass("glyphicon-unchecked"); 
    $(partnerAllFilter).children().addClass("glyphicon-check");
    $(partnerAllFilter).addClass("filtering");
  }
  changePartnerFilter();
}

function changePartnerFilter(){
  partnerProvinces = [];
  partnerMunicip = [];
  partnerBrgy = [];
  var selectedPartner = $("#partnerButtons").find(".filtering").attr("id");
  if(selectedPartner === "ALL-PARTNERS"){
    $("#selected-partner-label").html("- All cooperating partners");
  } else {
    $("#selected-partner-label").html(" - " + selectedPartner);
  }
  $.each(surveyData, function(index, record){
    if(selectedPartner === record.properties.partner  || selectedPartner === "ALL-PARTNERS" ){
      partnerProvinces.push(record.properties.admin2);
      partnerMunicip.push(record.properties.admin3);
      partnerBrgy.push(record.properties.admin4); 
    }    
  });
  disableAdminButtons();
  filterData();
}

function buildMunicipalityDropdown(){
  $('#dropdown-menu-municipality').empty();
  $('#dropdown-menu-barangay').html('<li class="disabled"><a role="menuitem" href="#">First select a municipality</a></li>');
  var municipalityList = [];
  var municipalityAdminLookup = {};
  $.each(surveyData, function(index, record){
    var thisMunicipality = record.properties["municipality"];
    if($.inArray(thisMunicipality, municipalityList) === -1 && record.properties.admin2 === activeProvince){
      municipalityList.push(thisMunicipality);
      municipalityAdminLookup[record.properties.municipality] = record.properties.admin3;
    }
  });
  // sort so that they appear in alphabetical order in dropdown
  municipalityList = municipalityList.sort(); 
  // create item elements in dropdown list   
  for(var i = 0; i < municipalityList.length; i++) {
      var item = municipalityList[i];
      var listItemHtml = '<li id="'+municipalityAdminLookup[item]+'"><a href="#" onClick="municipalitySelect(' +
        "'"+ municipalityAdminLookup[item] +"', this"+ '); return false;">' + item + "</li>"
      $('#dropdown-menu-municipality').append(listItemHtml);       
  }

}

function buildBarangayDropdown() {
  $('#dropdown-menu-barangay').empty();
  var barangayList = [];
  var barangayAdminLookup = {};
  $.each(surveyData, function(index, record){
    var thisBarangay = record.properties["barangay"];
    if($.inArray(thisBarangay, barangayList) === -1 && record.properties.admin2 === activeProvince && record.properties.admin3 === activeMunicipality){
      barangayList.push(thisBarangay);
      barangayAdminLookup[record.properties.barangay] = record.properties.admin4;
    }
  });
  // sort so that they appear in alphabetical order in dropdown
  barangayList = barangayList.sort(); 
  // create item elements in dropdown list   
  for(var i = 0; i < barangayList.length; i++) {
      var item = barangayList[i];
      var listItemHtml = '<li id="'+barangayAdminLookup[item]+'"><a href="#" onClick="barangaySelect(' +
        "'"+ barangayAdminLookup[item] +"', this"+ '); return false;">' + item + "</li>"
      $('#dropdown-menu-barangay').append(listItemHtml);       
  }
}



function disableAdminButtons(){
  var selectedPartner = $("#partnerButtons").find(".filtering").attr("id");
  var provinceButtons = $('#dropdown-menu-province').children();
  $(provinceButtons).removeClass("disabled");
  $.each(provinceButtons, function(index, button){
    var buttonAdmin = $(button).attr("id");
    if($.inArray(buttonAdmin, partnerProvinces) === -1){
      $(button).addClass("disabled");
    }
  });
  var municipalityButtons = $('#dropdown-menu-municipality').children();
  $(municipalityButtons).removeClass("disabled");
  $.each(municipalityButtons, function(index, button){
    var buttonAdmin = $(button).attr("id");
    if($.inArray(buttonAdmin, partnerMunicip) === -1){
      $(button).addClass("disabled");
    }
  });
  var barangayButtons = $('#dropdown-menu-barangay').children();
  $(barangayButtons).removeClass("disabled");
  $.each(barangayButtons, function(index, button){
    var buttonAdmin = $(button).attr("id");
    if($.inArray(buttonAdmin, partnerBrgy) === -1){
      $(button).addClass("disabled");
    }
  });
}

function disablePartnerButtons(){
  areaPartners = ["ALL-PARTNERS"]; 
  $.each(surveyData, function(index, record){  
      // operation overview
      if("ALL" === activeProvince){
        areaPartners.push(record.properties.partner);      
      }
      // province active
      if(record.properties.admin2 === activeProvince && "ALL" === activeMunicipality && "ALL" === activeBarangay){
        areaPartners.push(record.properties.partner);
      }
      // muncip active
      if(record.properties.admin3 === activeMunicipality && "ALL" === activeBarangay){
        areaPartners.push(record.properties.partner);
      }
      // brgy active
      if(record.properties.admin4 === activeBarangay){
        areaPartners.push(record.properties.partner);
      } 
  });
  $(partnerButtons).removeClass("disabled");
  $.each(partnerButtons, function(index, button){
    var buttonPartner = $(button).attr("id");
    if($.inArray(buttonPartner, areaPartners) === -1){
      $(button).addClass("disabled");
    }
  });
}

function filterData(){
  var selectedPartner = $("#partnerButtons").find(".filtering").attr("id");
  filteredData = [];
  $.each(surveyData, function(index, record){
    if(record.properties.partner === selectedPartner || "ALL-PARTNERS" === selectedPartner){
      if(record.properties.admin2 === activeProvince || "ALL" === activeProvince){
        if(record.properties.admin3 === activeMunicipality || "ALL" === activeMunicipality){
          if(record.properties.admin4 === activeBarangay || "ALL" === activeBarangay){
            filteredData.push(record);
          }
        }
      }
    }
  });
  $("#mappedCount").html(formatCommas(filteredData.length.toString()));
  markersToMap();
}

function markersToMap(){
    map.removeLayer(markers);
    markers = new L.MarkerClusterGroup({
        showCoverageOnHover:false, 
        maxClusterRadius: 20,   
        spiderfyDistanceMultiplier:2
    });    
    marker = L.geoJson(filteredData, {
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


function generateGraphs(){
  var admin4List = [];
  $.each(filteredData, function(index, shelter){
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




//start function chain for map
getData();