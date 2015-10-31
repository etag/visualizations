//Configuration
var page_size = 500;

//Setup map
var colorScale = d3.scale.category10();
var map = L.map('map');
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'nbgraham.cigdrjent2rnuuwkrohxh07a7',
    accessToken: 'pk.eyJ1IjoibmJncmFoYW0iLCJhIjoiY2lnZHJqZ2ZlMnJ0Z3VvbTg4dmxwaG4zciJ9.LWk1arFBGSCkIqmASMSPlw'
}).addTo(map);

var popup = L.popup();
function onMapClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(map);
}
map.on('click', onMapClick);

var combo = d3.select("body").append("select").attr("id","combo");
//Load tags into combo box
d3.json("http://head.ouetag.org/api/etag/tags/.json", function(error, tags) {
  combo.append("option").attr("value","Show all readers").text("Show all readers").attr("selected", true);
  tags.results.forEach(function(tag) {
    combo.append("option").attr("value",tag.url).text(tag.tag_id);
  });
});

var readerInfoArea = d3.select("body").append("div");

d3.json("http://head.ouetag.org/api/etag/reader_location/.json", function(error, readersInfo) {

      drawReaders(readersInfo);

      combo.on("change", function() {
        if (this.options[this.selectedIndex].text === "Show all readers")
        {
          //Show all readers
          drawReaders(readersInfo);
        }
        else {
          //Read in selected tag reads
          d3.json("http://head.ouetag.org/api/etag/tag_reads/.json?page_size=" + page_size + "&tag="+this.options[this.selectedIndex].text, function(error, reads) {
            if (error) throw error;
            update(reads, readersInfo);
          });
        }
      });
    });

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
        "popupContent": "<b>" + reader.reader + "</b><br>" + new Date(reader.start_timestamp).toString('MMM d, yyyy') + " - " + (reader.end_timestamp == null ? "Present" : new Date(reader.end_timestamp).toString('MMM d, yyyy'))
      }
    });
  });

  drawOnMap(locations);
}

function update(reads, readersInfo)
{
  var locations = {
    "type": "FeatureCollection",
    "features": []
  };

  var element;
  var elementTime;
  var index;

    if (reads.results.length === 0) alert("Tag " + reads.tag + " has no reads!");
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
              "reads" : [],
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

        var read = {
          "timestamp": element.tag_timestamp,
          "tag_id": element.tag
        };

        reader.properties.reads.push(read);
        reader.properties.popupContent += "<br>" + read;
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
  var color = colorScale(feature.properties.name);
  return {
    radius: 8,
    fillColor: color,
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
}};

function drawOnMap(locations)
{
  colorScale.domain(d3.extent(locations, function(d) {return d.properties.name;}));

  function onEachFeature(feature, layer) {
    if (feature.properties && feature.properties.popupContent) {
        layer.bindPopup(feature.properties.popupContent);
    }
  }

  var featureLayer = L.geoJson(locations, {
      pointToLayer: function (feature, latlng) {
          return L.circleMarker(latlng, geojsonMarkerOptions(feature));
      },
      onEachFeature: onEachFeature,
      filter: function(feature, layer) {
        return feature.properties.end_timestamp == null;
      }
  }).addTo(map);

  map.fitBounds(featureLayer.getBounds());
}
