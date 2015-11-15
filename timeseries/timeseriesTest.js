var lineWidth = 2;
var colorScale = d3.scale.category10();
var focusXScale = d3.time.scale.utc();
var contextXScale = d3.time.scale.utc();

function brush(width, height)
{
  var contextSvg = d3.select("#context").append("svg")
    .attr("width", width)
    .attr("height", height*.75);
  contextSvg.append("rect")
    .attr("class","background-rect")
    .attr("width",width)
    .attr("height", height*.25)
    .attr("fill", "#EAEAD5");
  contextXScale.range([0, width]);

  var focusSvg = d3.select("#focus").append("svg")
    .attr("width", width)
    .attr("height", height);
  contextSvg.append("rect")
    .attr("class","background-rect")
    .attr("width",width)
    .attr("height", height)
    .attr("fill", "#EAEAD5");
  focusXScale.range([0, width]);


  var url = "http://head.ouetag.org/api/etag/tag_reads/.json?reader=12007";
  drawReaderTimes(url, focusSvg, contextSvg, width, height*.25);
}

function drawReaderTimes(url, svg, contextSvg, width, height)
{
  d3.json(url, function(data) {
    //Get data in right form
    tagsList = groupByTag(data.results);

    colorScale.domain(d3.extent(tagsList, function(d, i) {return i}));
    var xMin = d3.min(tagsList, function(d) {return d3.min(d,function(e) {return e.tag_timestamp;});});
    var xMax = d3.max(tagsList, function(d) {return d3.max(d,function(e) {return e.tag_timestamp;});});
    focusXScale.domain([xMin,xMax]);

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
        .attr("x1", function(d) {return focusXScale(d.tag_timestamp);})
        .attr("y1", 0)
        .attr("x2", function(d) {return focusXScale(d.tag_timestamp);})
        .attr("y2", height)
        .attr("stroke", function (d) {return colorScale(d.tag);})
        .attr("stroke-width", lineWidth)
    });

    var slider = svg.append("g")
      .attr("id","timesrs");

    var brush = d3.svg.brush()
        .x(focusXScale)
        .on("brush", function() {
            drawReaderTimesRange(url, contextSvg, width, height*3, brush);
        });

    brush(slider);

    slider.selectAll("rect")
      .attr("height", height);

    drawReaderTimesRange(url, contextSvg, width, height*3, brush);
  });
}

function drawReaderTimesRange(url, svg, width, height, brush)
{
  d3.json(url, function(data) {
    if (brush.empty()) contextXScale.domain(focusXScale.domain());
    else contextXScale.domain(brush.extent());

    tagsList = groupByTagRange(data.results, contextXScale.domain());

    var tags = svg.selectAll("g").data(tagsList);
    //Enter
    tags.enter().append("g")
      .attr("id",function(d) {return d[0].tag;});
    //Enter and Update
    var readLines = tags.selectAll("line")
      .data(function(d) {return d;});
    //Exit
    tags.exit().remove();

    //Enter
    readLines.enter().append("line")
      .attr("class","time-line")
      .attr("x1", function(d) {return contextXScale(d.tag_timestamp);})
      .attr("y1", 0)
      .attr("x2", function(d) {return contextXScale(d.tag_timestamp);})
      .attr("y2", height)
      .attr("stroke", function (d) {return colorScale(d.tag);})
      .attr("stroke-width", lineWidth)
    //Exit
    readLines.exit().remove();
  });
}

function groupByTagRange(data, range)
{
  var results = [];
  for (var i = 0; i<data.length; i++)
  {
    var element = data[i];
    element.tag_timestamp = new Date(element.tag_timestamp);

    //Account for range
    if (element.tag_timestamp < range[0]) continue;
    else if (element.tag_timestamp > range[1]) break;

    var index = -1;
    results.forEach(function(tagList, i) {
      if (tagList[0].tag == element.tag){
        index = i;
      }
    });
    var tag = [];
    if (index < 0)
    {
      results.push(tag);
    }
    else
    {
      tag = results[index];
    }
    tag.push(element);
  }
  return results;
}
