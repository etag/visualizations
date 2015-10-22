var width = 600;
var height = width * 500 / 960;
var radius = 5;

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var colorScale = d3.scale.category20b();
var projection = d3.geo.albers()
  .scale(1)
  .translate([0, 0]);
var path = d3.geo.path()
  .projection(projection)
  .pointRadius(radius);

d3.json("/readermap/GeoJSON/usa.json", function(error, usa) {
  if(error) throw error;

  d3.json("/tag_reads.json", function(error, reads) {
    if (error) throw error;

    try
    {
      locations = convertToGeoJSON(reads.results);

      if (locations.features.length > 0)
      {
        var b = path.bounds(locations);
        var s = 0.95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
        var t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

        projection
          .scale(s)
          .translate(t);

        states = topojson.feature(usa, usa.objects.sts).features;
        rivers = topojson.feature(usa, usa.objects.rivers).features;
        lakes = topojson.feature(usa, usa.objects.lakes).features;

        console.log(states);

        colorScale.domain([0,states.length]);

        svg.selectAll(".state")
            .data(states)
            .enter().append("path")
            .attr("class", "state")
            .attr("id", function(d) { return d.properties.iso_3166_2;})
            .attr("d", path)
            .attr("fill", function(d,i) {return colorScale(((i*i)/3+7)%50);});

        svg.selectAll(".river")
            .data(rivers)
            .enter().append("path")
            .attr("class", "river")
            .attr("id", function(d) { return d.properties.name;})
            .attr("d", path);

        svg.selectAll(".lake")
            .data(lakes)
            .enter().append("path")
            .attr("class", "lake")
            .attr("id", function(d) { return d.properties.name;})
            .attr("d", path);

        svg.selectAll(".reader-location")
          .data(locations.features)
          .enter().append("circle")
          .attr("class", "reader-location")
          .attr("transform", function(d) { return "translate(" + projection(d.geometry.coordinates) + ")"; })
          .attr("r", radius)
          .append("svg:title")
          .text(function (d) {
            var result = "Reader: " + d.properties.name + "\n";
            for (var i = 0; i < d.properties.reads.length; i++)
            {
              result += "Tag ID: " + d.properties.reads[i].tag_id + " Time: " + new Date(d.properties.reads[i].timestamp) + "\n";
            }
            return result;
          });
        }
        else {
          {
            console.log("0 locations");
          }
        }
      }
      catch(err)
      {
        console.log(err);
      }
  });
});

function convertToGeoJSON(data) {
  var Result = function() {
    this.type = "FeatureCollection";
    this.features = [];
  };

  Result.prototype.addReaderAndRead = function(element) {
      var readers = this.features;
      d3.json("/reader=" + element.reader + ".json", function(error, readerInfo) {
        if (error) throw error;

        var index = -1;

        for (var i = 0; i < readers.length; i++)
        {
          if (readers[i].properties.name === element.reader)
            index = i;
            break;
        }

        if (index < 0)
        {
          var readerCorrect = searchTimestamps(readerInfo.results, element.tag_timestamp);
          reader = {
            "type": "Feature",
            "geometry": {
              type: "Point",
              coordinates: [readerCorrect.longitude, readerCorrect.latitude]
            },
            "properties": {
              "name": element.reader,
              "reads" : []
            }
          };
          readers.push(reader);
        }
        else
        {
          reader = readers[index];
        }

        var read = {
          "timestamp": element.tag_timestamp,
          "tag_id": element.tag
        };

        reader.properties.reads.push(read);
      });
  }

  var result = new Result();
  for (var i = 0; i < data.length; i++)
  {
    result.addReaderAndRead(data[i]);
  }
  return result;
}

function searchTimestamps(readers, timestamp) {
  timestamp = new Date(timestamp);
  for (var i = 0; i < readers.length; i++)
  {
    if (new Date(readers[i].start_timestamp) < timestamp &&
      (readers[i].end_timestamp == null || timestamp < new Date(readers[i].end_timestamp)))
    {
      return readers[i];
    }
  }
  return -1;
}


function swap(location) {
  var temp = location.coordinates[0];
  location.coordinates[0] = location.coordinates[1];
  location.coordinates[1] = temp;

  return location;
}
