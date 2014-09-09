var pageHeight = $(window).height();
$("#loader").css("height", pageHeight * 0.75 );

// setup Leaflet map
var mapHeight = 375;
var mapBounds = [];
var registrationData = [];
var progressData = [];


var activeProvince = "";
var activeMunicipality = "";

var provincesObject = {};
var municipObject = {};
var barangayObject = {};


var totalSurveysCount = 0;


$("#map").height(mapHeight);
$("#infoWrapper").height(mapHeight);

var mapAttribution = 'Base map &copy; <a href="http://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/" target="_blank">CC-BY-SA</a> | &copy; <a href="http://www.redcross.org.ph/" title="Philippine Red Cross" target="_blank">Philippine Red Cross</a> 2014, CC-BY | <a title="Disclaimer" onClick="showDisclaimer();">Disclaimer</a>';
var mapboxStreetsUrl = 'http://{s}.tiles.mapbox.com/v3/americanredcross.hmki3gmj/{z}/{x}/{y}.png',
  mapboxTerrainUrl = 'http://{s}.tiles.mapbox.com/v3/americanredcross.hc5olfpa/{z}/{x}/{y}.png',
  greyscaleUrl = 'http://{s}.tiles.mapbox.com/v3/americanredcross.i4d2d077/{z}/{x}/{y}.png',
  hotUrl = 'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  mapboxSatelliteUrl = 'http://{s}.tiles.mapbox.com/v3/americanredcross.inlanejo/{z}/{x}/{y}.png';
var mapboxStreets = new L.TileLayer(mapboxStreetsUrl, {attribution: mapAttribution}),
  mapboxSatellite = new L.TileLayer(mapboxSatelliteUrl, {attribution: mapAttribution}),
  mapboxTerrain = new L.TileLayer(mapboxTerrainUrl, {attribution: mapAttribution}),
  greyscale = new L.TileLayer(greyscaleUrl, {attribution: mapAttribution}),
  hot = new L.TileLayer(hotUrl, {attribution: mapAttribution});
  

var Lmap = new L.Map("map", {
  center: [11.04197, 124.96296], 
  zoom: 8, 
  minZoom: 8,
  maxZoom: 17,
  scrollWheelZoom: false,
  layers: [greyscale]
});

var baseMaps = {
  "Grey": greyscale,
  "Satellite": mapboxSatellite,
  "Streets": mapboxStreets,
  "Terrain": mapboxTerrain,
  "HOT": hot
};

L.control.layers(baseMaps).addTo(Lmap);


/* Initialize the SVG layer */
Lmap._initPathRoot()    

/* We simply pick up the SVG from the map object */
var svg = d3.select("#map").select("svg");
var shelterMarkers = svg.append('g').attr("id", "shelterMarkers");



function joinData(){
  d3.csv("data/ShelterData_QR-Registration.csv", function(data) {
    registrationData = data;
    $("#totalHousesCount").html(registrationData.length.toString())
    d3.csv("data/ShelterData_ProgressUpdate.csv", function(data) {
      progressData = data;
      var idList = [];
      $(registrationData).each(function(aIndex, a){

        // check that a house code hasn't already shown up in the data
        if($.inArray(a.web_code, idList) === -1){
          idList.push(a.web_code);
          var thisDate = a["today"];
          // add in keys for each P-code level
          a["P3"] = a["web_code"].slice(2,13);
          a["P2"] = a["web_code"].slice(2,10) + "000";
          a["P1"] = a["web_code"].slice(2,8) + "00000";

          // add in checklist keys to each Registration entry with value "FALSE"
          // for those houses with a ProgressUpdate not yet completed
          for(var i = 0; i < checklist.length; i++){
            var checklistItem = checklist[i];
            a[checklistItem] = "FALSE";          
          }
          // Add a LatLng object to the item
          a.LatLng = new L.LatLng(a._location_latitude,a._location_longitude);
          $(progressData).each(function(bIndex,b){
            if(a.web_code === b.web_code){
              if(new Date(b["today"]) > new Date(thisDate)){
                thisDate = b["today"];
              }
              for(var i = 0; i < checklist.length; i++){
                var checklistItem = checklist[i];
                if(b[checklistItem] == "TRUE"){
                  a[checklistItem] = b[checklistItem];
                }
              }

            }
          });
          percentComplete(a);
          a["lastUpdate"] = thisDate;
        } else {
          console.log(a.house_code + " is repeated in the registration data.");
        }
      });
    d3Draw();
    });
  })
}


function d3Draw(){  
  var featureShelter = shelterMarkers.selectAll("circle")
    .data(registrationData)
    .enter().append("circle").attr("r", 5).attr('stroke','black')
    .attr('stroke-opacity', 1)
    .attr('fill','red')
    .attr('fill-opacity', 0.3)
    .on("click", function(d){
      d3.select("#shelterMarkers").selectAll("circle").attr("r", 5).attr('stroke','black');
      d3.select(this).attr("r", 9).attr('stroke','red');
      $("#houseBrgy").html(d["barangay"]);
      $("#houseMunicip").html(d["municipality"]);
      $("#houseProv").html(d["province"]);
      var designType = "";
      if(d["web_code"].slice(0,1) == "A"){
        designType = "Wooden Design (type A)";
      } else if (d["web_code"].slice(0,1) == "A"){
        designType = "Half Concrete (type B)";
      } else {
        designType = "data missing";
      }
      $("#houseDesign").html(designType);
      checkForImages(d);

    });
   
    function update() {
      featureShelter.attr("cx",function(d) { return Lmap.latLngToLayerPoint(d.LatLng).x})
      featureShelter.attr("cy",function(d) { return Lmap.latLngToLayerPoint(d.LatLng).y})
      // featureShelter.attr("r",function(d) { return 5})
    }
    Lmap.on("viewreset", update);
    update();
    createProvinceButtons();
}


function createProvinceButtons(){
  $.each(registrationData, function(prjIndex, prj){    
    provincesObject[prj["P1"]] = prj["province"];
  });  
  for(pcode in provincesObject){
    var btnHtml = '<button type="button" class="btn btn-default btn-sm" onClick="toggleProvince('+
      "'" + pcode + "'" +', this);">' + provincesObject[pcode] + "</button>";
    $("#buttons-province").append(btnHtml);
  }
  provinceNumbers();
}

function provinceNumbers(){
  d3.select("#buttons-province").selectAll(".btn").classed("active", false);
  $("#table-adminLevel").html("Province");
  $("#table-content").empty();
  $("#buttons-municipality").empty();
  $("#buttons-barangay").empty(); 
  for(pcode in provincesObject){
    var count0 = 0;
    var count1 = 0;
    var count2 = 0;
    var count3 = 0;
    var count4 = 0;
    var count5 = 0;
    var count6 = 0;
    var count7 = 0;
    $.each(registrationData, function(prjIndex, prj){
      if(prj["P1"] === pcode){
        count0 ++;
        if(prj["checklist/layoutexcavation"] == "TRUE"){
          count1 ++;
        }
        if(prj["checklist/foundationcolumns"] == "TRUE"){
          count2 ++;
        } 
        if(prj["checklist/roof"] == "TRUE"){
          count3 ++;
        }
        if(prj["checklist/walls"] == "TRUE"){
          count4 ++;
        }
        if(prj["checklist/floor"] == "TRUE"){
          count5 ++;
        }
        if(prj["checklist/toilet"] == "TRUE"){
          count6 ++;
        }
        if(prj["checklist/completed"] == "TRUE"){
          count7 ++;
        }
      }
    });
    var thisProvinceHtml = "<tr><td>" + provincesObject[pcode] + "</td><td>" + 
      count0.toString() + "</td><td>" + 
      count1.toString() + "</td><td>" + 
      count2.toString() + "</td><td>" +
      count3.toString() + "</td><td>" +
      count4.toString() + "</td><td>" +
      count5.toString() + "</td><td>" +
      count6.toString() + "</td><td>" +
      count7.toString() + "</td></tr>";
    $("#table-content").append(thisProvinceHtml);  
  }
  filterMarkers("ALL");
$("#loading").remove();
}

function toggleProvince(pcode, target){
  municipObject = {};
  activeProvince = pcode;
  d3.select("#buttons-province").selectAll(".btn").classed("active", false);
  d3.select(target).classed("active", true);
  $.each(registrationData, function(prjIndex, prj){
    if(prj["P1"] === activeProvince){
      municipObject[prj["P2"]] = prj["municipality"];      
    }
  });
  
  $("#buttons-municipality").empty();
  $("#buttons-barangay").empty();
  $("#buttons-municipality").append('<span class="glyphicon glyphicon-arrow-right"></span> ');
  for(municipPcode in municipObject){
    var btnHtml = '<button type="button" class="btn btn-default btn-sm" onClick="toggleMunicip('+
      "'" + municipPcode + "'" +', this);">' + municipObject[municipPcode] + "</button>";
    $("#buttons-municipality").append(btnHtml);
  }
  municipalityNumbers();
  filterMarkers(pcode);
}



function municipalityNumbers(){
  $("#table-adminLevel").html("Muncipality");
  $("#table-content").empty();
  for(pcode in municipObject){
    var count0 = 0;
    var count1 = 0;
    var count2 = 0;
    var count3 = 0;
    var count4 = 0;
    var count5 = 0;
    var count6 = 0;
    var count7 = 0;
    $.each(registrationData, function(prjIndex, prj){
      if(prj["P2"] === pcode){
        count0 ++;
        if(prj["checklist/layoutexcavation"] == "TRUE"){
          count1 ++;
        }
        if(prj["checklist/foundationcolumns"] == "TRUE"){
          count2 ++;
        } 
        if(prj["checklist/roof"] == "TRUE"){
          count3 ++;
        }
        if(prj["checklist/walls"] == "TRUE"){
          count4 ++;
        }
        if(prj["checklist/floor"] == "TRUE"){
          count5 ++;
        }
        if(prj["checklist/toilet"] == "TRUE"){
          count6 ++;
        }
        if(prj["checklist/completed"] == "TRUE"){
          count7 ++;
        }
      }
    });
    var thisMunicipHtml = "<tr><td>" + municipObject[pcode] + "</td><td>" + 
      count0.toString() + "</td><td>" + 
      count1.toString() + "</td><td>" + 
      count2.toString() + "</td><td>" +
      count3.toString() + "</td><td>" +
      count4.toString() + "</td><td>" +
      count5.toString() + "</td><td>" +
      count6.toString() + "</td><td>" +
      count7.toString() + "</td></tr>";
    $("#table-content").append(thisMunicipHtml);  
  }
}

function toggleMunicip(pcode, target){
  barangayObject = {};
  activeMunicipality = pcode;
  d3.select("#buttons-municipality").selectAll(".btn").classed("active", false);
  d3.select(target).classed("active", true);
  $.each(registrationData, function(prjIndex, prj){
    if(prj["P2"] === activeMunicipality){
      barangayObject[prj["P3"]] = prj["barangay"];    
    }
  });
  brgyNumbers();
  filterMarkers(pcode);
}

function brgyNumbers(){
  $("#table-adminLevel").html("Barangay");
  $("#table-content").empty();
  for(pcode in barangayObject){
    var count0 = 0;
    var count1 = 0;
    var count2 = 0;
    var count3 = 0;
    var count4 = 0;
    var count5 = 0;
    var count6 = 0;
    var count7 = 0;
    $.each(registrationData, function(prjIndex, prj){
      if(prj["P3"] === pcode){
        count0 ++;
        if(prj["checklist/layoutexcavation"] == "TRUE"){
          count1 ++;
        }
        if(prj["checklist/foundationcolumns"] == "TRUE"){
          count2 ++;
        } 
        if(prj["checklist/roof"] == "TRUE"){
          count3 ++;
        }
        if(prj["checklist/walls"] == "TRUE"){
          count4 ++;
        }
        if(prj["checklist/floor"] == "TRUE"){
          count5 ++;
        }
        if(prj["checklist/toilet"] == "TRUE"){
          count6 ++;
        }
        if(prj["checklist/completed"] == "TRUE"){
          count7 ++;
        }
      }
    });
    var thisBrgyHtml = '<tr><td onClick="filterMarkers('+"'"+pcode+"'"+')">' + barangayObject[pcode] + "</td><td>" + 
      count0.toString() + "</td><td>" +
      count1.toString() + "</td><td>" + 
      count2.toString() + "</td><td>" +
      count3.toString() + "</td><td>" +
      count4.toString() + "</td><td>" +
      count5.toString() + "</td><td>" +
      count6.toString() + "</td><td>" +
      count7.toString() + "</td></tr>";
    $("#table-content").append(thisBrgyHtml);  
  }
}

var checklist = [
"checklist/layoutexcavation", 
"checklist/foundationcolumns", 
"checklist/roof",
"checklist/walls",
"checklist/floor",
"checklist/toilet",
"checklist/completed"];



function percentComplete(beneficiary){
  var thisPercentComplete = 0;
  if(beneficiary["checklist/layoutexcavation"] === "TRUE"){
    thisPercentComplete += 13;
  }
  if(beneficiary["checklist/foundationcolumns"] === "TRUE"){
    thisPercentComplete += 15;
  }
  if(beneficiary["checklist/roof"] === "TRUE"){
    thisPercentComplete += 15;
  }
  if(beneficiary["checklist/walls"] === "TRUE"){
    thisPercentComplete += 15;
  }
  if(beneficiary["checklist/floor"] === "TRUE"){
    thisPercentComplete += 15;
  }
  if(beneficiary["checklist/toilet"] === "TRUE"){
    thisPercentComplete += 13;
  }
  if(beneficiary["checklist/completed"] === "TRUE"){
    thisPercentComplete += 13;
  }   
  beneficiary["percentComplete"] = thisPercentComplete;
}




function filterMarkers(filter){
  var northernLat = null;
  var southernLat = null;
  var easternLng = null;
  var westernLng = null;
  var filteredMarkers = shelterMarkers.selectAll("circle").attr("visibility","hidden")
    .filter(function(d) {return d.P3 === filter || d.P2 === filter || d.P1 === filter || filter === "ALL" })
    .attr("visibility", function(d) {
      var thisLat = parseFloat(d._location_latitude),
        thisLng = parseFloat(d._location_longitude);
      if (northernLat === null) northernLat = thisLat;
      if (southernLat === null) southernLat = thisLat;
      if (easternLng === null) easternLng = thisLng;
      if (westernLng === null) westernLng = thisLng;
      if (thisLat > northernLat) northernLat = thisLat;
      if (thisLat < southernLat) southernLat = thisLat;
      if (thisLng < easternLng) easternLng = thisLng;
      if (thisLng > westernLng) westernLng = thisLng;    
      return "visible";
    });

  mapBounds = L.latLngBounds([[southernLat-0.0008,westernLng],[northernLat+0.0008,easternLng]]);
  Lmap.fitBounds(mapBounds);
}







function checkForImages(markerObj){
  $("#houseImg").empty();
  $("#beamImg").empty();
  var marker = markerObj;
  $(progressData).each(function(aIndex, a){
    if(marker["web_code"] === a["web_code"]){
      if(a["img_progress"] !== "n/a"){
        $("#houseImg").html("<img class='img-responsive' src='https://raw.githubusercontent.com/PhilippineRedCross/yolanda_shelter-img/master/core/" + 
          a["img_progress"] + "'>");
      }
      if(a["img_beamsTrusses"] !== "n/a"){
        $("#beamImg").html("<img class='img-responsive' src='https://raw.githubusercontent.com/PhilippineRedCross/yolanda_shelter-img/master/core/" + 
          a["img_beamsTrusses"] + "'>");
      }
    }
  });
}  





// VARIOUS HELPER FUNCTIONS
function zoomOut(){
  Lmap.fitBounds(mapBounds);
} 




// show disclaimer text on click of dislcaimer link
function showDisclaimer() {
    window.alert("The maps on this page do not imply the expression of any opinion on the part of the Philippine Red Cross concerning the legal status of a territory or of its authorities.");
}

// get count of markers visible in current map extent
Lmap.on('moveend', function(){
  var visibleMarkers = 0;
  var newBounds = Lmap.getBounds();
  var northernLat = newBounds._northEast.lat;
  var easternLng = newBounds._northEast.lng;
  var southernLat = newBounds._southWest.lat;
  var westernLng = newBounds._southWest.lng;
  $.each(registrationData, function(aIndex, a){
    if(a._location_latitude < northernLat && 
      a._location_latitude > southernLat &&
      a._location_longitude < easternLng &&
      a._location_longitude > westernLng){
        visibleMarkers += 1;
    }
  });
  $("#visibleHousesCount").html(visibleMarkers.toString());
})

joinData();