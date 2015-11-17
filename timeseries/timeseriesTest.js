var lineWidth = 2;

var colorScale = d3.scale.category10();
var focusXScale = d3.time.scale();
var contextXScale = d3.time.scale();

var contextXAxis = d3.svg.axis().scale(contextXScale).orient("bottom"),
  focusXAxis = d3.svg.axis().scale(focusXScale).orient("bottom");

var focusHeight, contextHeight, gap;

function brush(width, height, selector, url)
{
  focusHeight = height*.5;
  gap = height*.2;
  contextHeight = height*.15;

  var svg = d3.select(selector).append("svg").attr("height", height).attr("width", width);
  var focusG = svg.append("g").attr("id", "focusG");
  focusG.append("rect")
    .attr("class","background-rect")
    .attr("width", width)
    .attr("height", focusHeight)
    .attr("fill", "#EAEAD5");
  focusXScale.range([0, width]);

  var contextG = svg.append("g").attr("id", "contextG").attr("transform", "translate(0, " + (focusHeight + gap) + ")");
  contextG.append("rect")
    .attr("class","background-rect")
    .attr("width",width)
    .attr("height", contextHeight)
    .attr("fill", "#EAEAD5");
  contextXScale.range([0, width]);

  drawReaderTimes(url, contextG, focusG, width, contextHeight);
}

function drawReaderTimes(url, contextG, focusG, width, height)
{
  d3.json(url, function(data) {
    //Get data in right form
    tagsList = groupByTag(data.results);

    colorScale.domain(d3.extent(tagsList, function(d, i) {return i}));
    var xMin = d3.min(tagsList, function(d) {return d3.min(d,function(e) {return e.tag_timestamp;});});
    var xMax = d3.max(tagsList, function(d) {return d3.max(d,function(e) {return e.tag_timestamp;});});

    var diff = xMax.getTime() - xMin.getTime();
    xMin.setTime(xMin.getTime() - diff*0.05);
    xMax.setTime(xMax.getTime() + diff*0.05);

    contextXScale.domain([xMin,xMax]);
    focusXScale.domain(contextXScale.domain());

    focusG.append("g").attr("class","focus axis").attr("transform","translate(0," + focusHeight + ")").call(focusXAxis);
    contextG.append("g").attr("class","context axis").attr("transform","translate(0," + contextHeight + ")").call(contextXAxis);

    var tags = contextG.selectAll("g .tag").data(tagsList);
    //Enter
    tags.enter().append("g")
      .attr("class", "tag")
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

    var slider = contextG.append("g")
      .attr("id","timesrs_slider");

    var brush = d3.svg.brush()
        .x(contextXScale)
        .on("brush", function() {
            drawReaderTimesRange(data, focusG, width, focusHeight, brush);
            d3.select(".focus.axis").call(focusXAxis);
        });

    brush(slider);

    slider.selectAll("rect")
      .attr("height", height);

    drawReaderTimesRange(data, focusG, width, focusHeight, brush);
  });
}

function drawReaderTimesRange(data, focusG, width, height, brush)
{
    if (brush.empty()) focusXScale.domain(contextXScale.domain());
    else focusXScale.domain(brush.extent());

    tagsList = groupByTagRange(data.results, focusXScale.domain());

    console.log(focusXScale.domain());

    var tags = focusG.selectAll("g .tag").data(tagsList);
    //Enter
    tags.enter().append("g")
      .attr("class", "tag")
      .attr("id",function(d) {return d[0].tag;});
    //Enter and Update
    var readLines = tags.selectAll("line")
      .data(function(d) {return d;});
    //Exit
    tags.exit().remove();

    //Enter
    readLines.enter().append("line")
      .attr("class","time-line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", function (d) {return colorScale(d.tag);})
      .attr("stroke-width", lineWidth)
      .append("svg:title")
      .text(function(d) { return d.tag; });
    //Enter+Update
    readLines
      .attr("x1", function(d) {return focusXScale(d.tag_timestamp);})
      .attr("x2", function(d) {return focusXScale(d.tag_timestamp);});
    //Exit
    readLines.exit().remove();
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
