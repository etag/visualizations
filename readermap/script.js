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

  d3.json("/sample_data.json", function(error, reads) {
    if (error) throw error;

    try
    {
      locations = type(reads.results);
      var b = path.bounds(locations);
      var s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
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
    catch(err)
    {
      console.log(err);
    }
  });
});

function type(data)
{
  var result = {
    "type": "FeatureCollection",
    "features": []
  };

  for (var i = 0; i<data.length; i++)
  {
    var element = data[i];
    var index = contains(result.features, element.reader);
    var reader;
    if (index < 0)
    {
      reader = {
        "type": "Feature",
        "geometry": swap(element.location),
        "properties": {
          "name": element.reader,
          "reads" : []
        }
      }
      result.features.push(reader);
    }
    else
    {
      reader = result.features[index];
      var elmCoord = swap(element.location).coordinates;
      var rdrCoord = reader.geometry.coordinates;
      if (elmCoord[0] !== rdrCoord[0] || elmCoord[1] != rdrCoord[1]) throw "Reader " + reader.properties.name + " has two different locations.";
    }

    var read = {
      "timestamp": element.timestamp,
      "tag_id": element.tag_id
    };

    reader.properties.reads.push(read);
  }

  return result;
}

function contains(list, value)
{
  for (var i = 0; i < list.length; i++)
  {
    if (list[i].properties.name === value)
      return i;
  }
  return -1;
}

function swap(location)
{
  var temp = location.coordinates[0];
  location.coordinates[0] = location.coordinates[1];
  location.coordinates[1] = temp;

  return location;
}
