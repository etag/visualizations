//Configuration
var radius = 5;
var width = 600;
var page_size = 500;

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

var combo = d3.select("body").append("select").attr("id","combo");
var readerInfoArea = d3.select("body").append("div");

d3.json("http://head.ouetag.org/api/etag/tags/.json", function(error, tags) {
  tags.results.forEach(function(tag) {
    combo.append("option").attr("value",tag.url).text(tag.tag_id);
  });
});

//Read in states, rivers, and lakes for map
d3.json("/readermap/GeoJSON/usa.json", function(error, usa) {
  if(error) throw error;

  d3.json("http://head.ouetag.org/api/etag/reader_location/.json", function(error, readersInfo) {

      //Setup
      states = topojson.feature(usa, usa.objects.sts).features;
      rivers = topojson.feature(usa, usa.objects.rivers).features;
      lakes = topojson.feature(usa, usa.objects.lakes).features;
      colorScale.domain([0,states.length]);

      drawReaders(readersInfo);

      combo.on("change", function() {
        //Read in tag reads
        d3.json("http://head.ouetag.org/api/etag/tag_reads/.json?page_size=" + page_size + "&tag="+this.options[this.selectedIndex].text, function(error, reads) {
          if (error) throw error;
          update(reads, readersInfo);
        });
      });
    });
  });

function drawReaders(readersInfo)
{
  var locations = {
    "type": "FeatureCollection",
    "features": []
  };

  var readerPoint;

  readersInfo.results.forEach(function(reader) {
    readerPoint = {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [reader.longitude, reader.latitude]
      },
      "properties": reader
    }
      locations.features.push(readerPoint);
  });

  if (locations.features.length > 0)
  {
    //Zoom in to the correct area of the map
    projection
      .scale(1)
      .translate([0, 0]);
    var b = path.bounds(locations);

    //Change bounds if there is only one points so that s does not equal infinity
    if (b[0][0] === b[1][0] && b[0][1] === b[1][1])
    {
      b[0][0] *= 0.9;
      b[0][1] *= 0.9;

      b[1][0] *= 1.1;
      b[1][1] *= 1.1;
    }

    var s = 0.95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
    var t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];
    projection
      .scale(s)
      .translate(t);

    console.log(b,s,t);

    //Bind data
    var statesSvg = svg.selectAll(".state").data(states);
    var riversSvg = svg.selectAll(".river").data(rivers);
    var lakesSvg = svg.selectAll(".lake").data(lakes);
    var readersSvg = svg.selectAll(".reader-location").data(locations.features);

    //Update
    statesSvg.classed("updated", true);
    riversSvg.classed("updated", true);
    lakesSvg.classed("updated", true);
    readersSvg.classed("updated", true);

    //Enter
    statesSvg.enter()
      .append("path")
      .attr("class", "state")
      .attr("id", function(d) {return d.id;})
      .attr("fill", function(d,i) {return colorScale(((i*i)/3+7)%50);});

    riversSvg.enter()
      .append("path")
      .attr("class", "river")
      .attr("id", function(d) { return d.properties.name;});

    lakesSvg.enter()
      .append("path")
      .attr("class", "lake")
      .attr("id", function(d) { return d.properties.name;});

    readersSvg.enter()
      .append("circle")
      .on("click", function(d) {
        var tags = [];
        var data = [];
        d3.json("http://head.ouetag.org/api/etag/tag_reads/.json?page_size=" + page_size + "&reader=" + d.properties.reader, function(readerInfo){

          readerInfo.results.forEach(function(tag) {
            tags.push(tag.tag);
          });
          data = arrayUnique(tags);

          var tagList = readerInfoArea.selectAll("p").data(data);
          tagList.enter()
            .append("p").text(function(d) {return d;});

          tagList.exit().remove();
        });
      })
      .attr("r", radius)
      .attr("class", "reader-location")
      .append("svg:title");


    //Enter + Update
    statesSvg.attr("d", path);
    riversSvg.attr("d", path);
    lakesSvg.attr("d", path);
    readersSvg.attr("transform", function(d) { return "translate(" + projection(d.geometry.coordinates) + ")"; })
      .select("title")
      .text(function (d) {return "Reader: " + d.properties.reader + "\n";});

    //Exit
    statesSvg.exit().remove();
    riversSvg.exit().remove();
    lakesSvg.exit().remove();
    readersSvg.exit().remove();
  }
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
              "end_timestamp": readerCorrect.end_timestamp
            }
          };
          coordinates.text(reader.geometry.coordinates);
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
    //Zoom in to the correct area of the map
    projection
      .scale(1)
      .translate([0, 0]);
    var b = path.bounds(locations);

    //Change bounds if there is only one points so that s does not equal infinity
    if (b[0][0] === b[1][0] && b[0][1] === b[1][1])
    {
      b[0][0] *= 0.9;
      b[0][1] *= 0.9;

      b[1][0] *= 1.1;
      b[1][1] *= 1.1;
    }

    var s = 0.95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
    var t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];
    projection
      .scale(s)
      .translate(t);

    console.log(b,s,t);

    //Bind data
    var statesSvg = svg.selectAll(".state").data(states);
    var riversSvg = svg.selectAll(".river").data(rivers);
    var lakesSvg = svg.selectAll(".lake").data(lakes);
    var readersSvg = svg.selectAll(".reader-location").data(locations.features);

    //Update
    statesSvg.classed("updated", true);
    riversSvg.classed("updated", true);
    lakesSvg.classed("updated", true);
    readersSvg.classed("updated", true);

    //Enter
    statesSvg.enter()
      .append("path")
      .attr("class", "state")
      .attr("id", function(d) {return d.id;})
      .attr("fill", function(d,i) {return colorScale(((i*i)/3+7)%50);});

    riversSvg.enter()
      .append("path")
      .attr("class", "river")
      .attr("id", function(d) { return d.properties.name;});

    lakesSvg.enter()
      .append("path")
      .attr("class", "lake")
      .attr("id", function(d) { return d.properties.name;});

    readersSvg.enter()
      .append("circle")
      .attr("r", radius)
      .attr("class", "reader-location")
      .append("svg:title");


    //Enter + Update
    statesSvg.attr("d", path);
    riversSvg.attr("d", path);
    lakesSvg.attr("d", path);
    readersSvg.attr("transform", function(d) { return "translate(" + projection(d.geometry.coordinates) + ")"; })
      .select("title")
      .text(function (d) {
      var result = "Reader: " + d.properties.name + "\n";
      for (var i = 0; i < d.properties.reads.length; i++)
      {
        result += "Tag ID: " + d.properties.reads[i].tag_id + " Time: " + new Date(d.properties.reads[i].timestamp) + "\n";
      }
      return result;
    });

    //Exit
    statesSvg.exit().remove();
    riversSvg.exit().remove();
    lakesSvg.exit().remove();
    readersSvg.exit().remove();
    }
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
