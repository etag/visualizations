//Configuration
var radius = 5;
var width = 600;

//Set up
var height = width * 500 / 960;
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

//Read in states, rivers, and lakes for map
d3.json("/readermap/GeoJSON/usa.json", function(error, usa) {
  if(error) throw error;

  //Read in tag reads
  d3.json("/tag_reads.json", function(error, reads) {
    if (error) throw error;

    try
    {
      var locations = {
        "type": "FeatureCollection",
        "features": []
      };
      var element;
      var elementTime;
      var index;
      d3.json("http://head.ouetag.org/api/etag/reader_location/.json", function(error, readersInfo) {
        for (var i = 0; i < reads.results.length; i++)
        {
            element = reads.results[i];
            index = -1;
            elementTime = new Date(element.tag_timestamp);

            for (var j = 0; j < locations.features.length; j++)
            {
              if (locations.features[j].properties.name === element.reader && new Date(locations.features[j].start_timestamp) < elementTime &&
                (locations.features[j].end_timestamp == null || elementTime < new Date(locations.features[j].end_timestamp)))
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
                  type: "Point",
                  coordinates: [readerCorrect.longitude, readerCorrect.latitude]
                },
                "properties": {
                  "name": element.reader,
                  "reads" : []
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
        }

      if (locations.features.length > 0)
      {
        //Setup
        states = topojson.feature(usa, usa.objects.sts).features;
        rivers = topojson.feature(usa, usa.objects.rivers).features;
        lakes = topojson.feature(usa, usa.objects.lakes).features;
        colorScale.domain([0,states.length]);

        //Zoom in to the correct area of the map
        var b = path.bounds(locations);

        //Change bounds if there is only one points so that s does not equal infinity
        if (locations.features.length === 1)
        {
          b[1][0] += 0.01;
          b[1][1] += 0.01;
        }
        var s = 0.95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
        var t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];
        projection
          .scale(s)
          .translate(t);

        console.log(rivers);
        //Draw the states
        svg.selectAll(".state")
            .data(states)
            .enter().append("path")
            .attr("class", "state")
            .attr("id", function(d) {return d.id;})
            .attr("d", path)
            .attr("fill", function(d,i) {return colorScale(((i*i)/3+7)%50);});

        //Draw the rivers
        svg.selectAll(".river")
            .data(rivers)
            .enter().append("path")
            .attr("class", "river")
            .attr("id", function(d) { return d.properties.name;})
            .attr("d", path);

        //Draw the lakes
        svg.selectAll(".lake")
            .data(lakes)
            .enter().append("path")
            .attr("class", "lake")
            .attr("id", function(d) { return d.properties.name;})
            .attr("d", path);

        //Draw the reader locations
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
            console.log("0 reader locations");
        }
      });
    }
    catch(err)
    {
      console.log(err);
    }
  });
});

function convertToGeoJSON(data) {

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
