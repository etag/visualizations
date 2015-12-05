var myMap = {
  "map": "",
  "colorScale": "",
  "mapBoxId": 'nbgraham.cigdrjent2rnuuwkrohxh07a7',
  "mapBoxAccessToken": 'pk.eyJ1IjoibmJncmFoYW0iLCJhIjoiY2lnZHJqZ2ZlMnJ0Z3VvbTg4dmxwaG4zciJ9.LWk1arFBGSCkIqmASMSPlw'
};

var map;

function createMap()
{
  //Setup
  myMap.colorScale = d3.scale.category10();
  //Setup map
  map = L.map('map');
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18,
      id: myMap.mapBoxId,
      accessToken: myMap.mapBoxAccessToken
  }).addTo(map);
}

function drawReaders(readersInfo)
{
  var locations = {
    "type": "FeatureCollection",
    "features": []
  };

  readersInfo.results.forEach(function(reader) {
    locations.features.push({
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [reader.longitude, reader.latitude]
      },
      "properties": {
        "name": reader.reader,
        "popupContent": "<b>" + reader.reader + "</b><br>" + new Date(reader.start_timestamp).toDateString() + " - " + (reader.end_timestamp == null ? "Present" : new Date(reader.end_timestamp).toDateString())
      }
    });
  });

  drawOnMap(locations);
}

function zoomIntoTags(reads, readersInfo)
{
  var locations = {
    "type": "FeatureCollection",
    "features": []
  };

  var element;
  var elementTime;
  var index;

    if (reads.results.length === 0) {
      alert("Tag " + reads.tag + " has no reads!");
      return;
    }
    for (var i = 0; i < reads.results.length; i++)
    {
        element = reads.results[i];
        index = -1;
        elementTime = new Date(element.tag_timestamp);

        for (var j = 0; j < locations.features.length; j++)
        {
          var currReaderProperties = locations.features[j].properties;

          if ( currReaderProperties.name === element.reader && new Date(currReaderProperties.start_timestamp) < elementTime
            && (currReaderProperties.end_timestamp == null || elementTime < new Date(currReaderProperties.end_timestamp)))
          {
            index = j;
            break;
          }
        }

        if (index < 0)
        {
          var readerCorrect = searchForReader(readersInfo.results, element);
          reader = {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [readerCorrect.longitude, readerCorrect.latitude]
            },
            "properties": {
              "name": element.reader,
              "start_timestamp": readerCorrect.start_timestamp,
              "end_timestamp": readerCorrect.end_timestamp,
              "popupContent": ""
            }
          };
          locations.features.push(reader);
        }
        else
        {
          reader = locations.features[index];
        }
    }

    //zoom into area
    var featureLayer = L.geoJson(locations);
    map.fitBounds(featureLayer.getBounds());
}

function searchForReader(readers,element)
{
  var elementTime = new Date(element.tag_timestamp);
  for (var i = 0; i < readers.length; i++)
  {
      if (readers[i].reader === element.reader && new Date(readers[i].start_timestamp) < elementTime &&
        (readers[i].end_timestamp == null || elementTime < new Date(readers[i].end_timestamp)))
        {
          return readers[i];
        }
  }
  return 0;
}

var arrayUnique = function(a) {
    return a.reduce(function(p, c) {
        if (p.indexOf(c) < 0) p.push(c);
        return p;
    }, []);
};

function geojsonMarkerOptions(feature) {
  return {
    radius: 8,
    fillColor: myMap.colorScale(feature.properties.name),
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
}};

function onEachFeature(feature, layer) {

  if (feature.properties && feature.properties.popupContent) {
      layer.bindPopup(feature.properties.popupContent);
  }

  layer.on('dblclick', showTimeseries);
}

function drawOnMap(locations)
{
  myMap.colorScale.domain(d3.extent(locations, function(d) {return d.properties.name;}));

  var featureLayer = L.geoJson(locations, {
      pointToLayer: function (feature, latlng) {
          return L.circleMarker(latlng, geojsonMarkerOptions(feature));
      },
      onEachFeature: onEachFeature,
      onClick: showTimeseries
  }).addTo(map);

  map.fitBounds(featureLayer.getBounds());
}

function showTimeseries(e) {
  $("#timeseries").empty();
  drawReaderTimes("http://head.ouetag.org/api/etag/tag_reads/.json?reader=" + this.feature.properties.name + "&page_size=" + myMap.page_size, "#timeseries", 500, 200);
}
