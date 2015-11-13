function brush(width, height)
{
  var svg = d3.select("body").append("svg").attr("width", width).attr("height",height);

  var xscale = d3.scale.linear()
      .domain([0, 1])
      .range([0, width]);

  var brush = d3.svg.brush()
      .x(xscale);

  var slider = svg.append("g");

  slider.append("g").attr("id","timesrs");

  brush.extent([0.4, 0.6]);
  brush(slider);

  slider.selectAll("rect")
    .attr("height", height);

  drawReaderTimes("http://head.ouetag.org/api/etag/tag_reads/.json?reader=12007","#timesrs",width, height);
}

function drawReaderTimes(url, selector, width, height)
{
  //Configurables
  var lineWidth = 2;

  //Set up
  var svg = d3.select(selector).append("svg")
      .attr("width", width)
      .attr("height", height);

  var colorScale = d3.scale.category10();
  var xScale = d3.time.scale.utc()
    .range([0, width]);

  d3.json(url, function(data) {
    //Get data in right form
    tagsList = groupByTag(data.results);

    colorScale.domain(d3.extent(tagsList, function(d, i) {return i}));
    var xMin = d3.min(tagsList, function(d) {return d3.min(d,function(e) {return e.tag_timestamp;});});
    var xMax = d3.max(tagsList, function(d) {return d3.max(d,function(e) {return e.tag_timestamp;});});
    xScale.domain([xMin,xMax]);

    svg.append("rect")
      .attr("class","background-rect")
      .attr("width",width)
      .attr("height", height)
      .attr("fill", "#EAEAD5");
    svg.append("text")
        .attr("transform","translate(" + (width) + "," + height/2 + ")rotate(90)")
        .attr("text-anchor","middle")
        .text(tagsList[0][0].reader);

    tagsList.forEach(function(tagReads) {
    //Enter phase - add lines from reads
    var readLines = svg.append("g").attr("id",tagReads[0].tag).selectAll("line").data(tagReads);
    readLines.enter().append("line")
      .attr("class","time-line")
      .attr("x1", function(d) {return xScale(d.tag_timestamp);})
      .attr("y1", 0)
      .attr("x2", function(d) {return xScale(d.tag_timestamp);})
      .attr("y2", height)
      .attr("stroke", function (d) {return colorScale(d.tag);})
      .attr("stroke-width", lineWidth)
    });
  });
}
