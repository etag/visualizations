var lineWidth;
var colorScale, focusXScale, contextXScale;
var contextXAxis, focusXAxis;
var focusHeight, contextHeight, gap;
var width;
var tagsList;

function timeseries(width, height, selector, data, tag, reader)
{
  if (tag !== "all") key = "reader";
  else key = "tag";

  lineWidth = 2;
  focusHeight = height*.5;
  gap = height*.2;
  contextHeight = height*.15;

  setupPage(selector, key, height, width, tag, reader);

  //Get data in right form
  tagsList = groupByKey(data.results, d3.select("#buttonKey").text());
  var brush = updateTimeseries(d3.select("#contextG"), d3.select("#focusG"), width, contextHeight);

  function toggle()
  {
    if (d3.select("#buttonKey").text() === "tag") d3.select("#buttonKey").text("reader");
    else if (d3.select("#buttonKey").text() === "reader") d3.select("#buttonKey").text("tag");

    tagsList = groupByKey(data.results, d3.select("#buttonKey").text());
    updateContext(brush);
  }

  d3.select("#buttonKey").on("click", toggle);
}

function timeseriesURL(width, height, selector, url, key)
{
  lineWidth = 2;
  focusHeight = height*.5;
  gap = height*.2;
  contextHeight = height*.15;

  var tagRegEx = /tag=[A-z,0-9]{10}/;
  var tag = url.search(tagRegEx);
  if (tag >= 0) tag = url.substr(tag+4,10);
  else tag = "";

  var readerRegEx = /reader=[0-9]{5}/;
  var reader = url.search(readerRegEx);
  if (reader >= 0) reader = url.substr(reader+7,5);
  else reader = "";

  setupPage(selector, key, height, width, tag, reader);

  d3.json(url, function(data) {
    //Get data in right form
    tagsList = groupByKey(data.results, d3.select("#buttonKey").text());
    var brush = updateTimeseries(d3.select("#contextG"), d3.select("#focusG"), width, contextHeight);

    //needs access to data
    function toggle()
    {
      if (d3.select("#buttonKey").text() === "tag") d3.select("#buttonKey").text("reader");
      else if (d3.select("#buttonKey").text() === "reader") d3.select("#buttonKey").text("tag");

      tagsList = groupByKey(data.results, d3.select("#buttonKey").text());
      updateContext(brush);
    }
    d3.select("#buttonKey").on("click", toggle);
  });
}

function setupPage(selector, key, height, width, tag, reader)
{
  $(selector).empty();

  var selectedElement = d3.select(selector);

  var buttonG = selectedElement.append("g")
    .attr("id","buttonG")
    .text("Group by: ");
  var button = buttonG.append("button")
    .attr("id","buttonKey")
    .text(key);
  buttonG.append("br");

  var svg = selectedElement.append("svg")
    .attr("id","timeseries_svg")
    .attr("height", height)
    .attr("width", width);

  var focusG = svg.append("g")
    .attr("id", "focusG");
  focusG.append("rect")
    .attr("class","background-rect")
    .attr("width", width)
    .attr("height", focusHeight)
    .attr("fill", "#EAEAD5");
  var focusText = focusG.append("text").attr("id","focusText")
    .attr("transform", "translate(" + (width/3) + "," + (height/5) + ")");
  focusText.append("tspan").attr("id","reader_text")
    .text(reader);
  focusText.append("tspan").attr("id","tag_text")
    .attr("y", 30)
    .attr("x", 0)
    .text(tag);
  focusXScale = d3.time.scale().range([0, width]);
  focusG.append("g").attr("class","focus axis").attr("transform","translate(0," + focusHeight + ")");
  focusXAxis = d3.svg.axis().scale(focusXScale).orient("bottom");

  var contextG = svg.append("g")
    .attr("id", "contextG")
    .attr("transform", "translate(0, " + (focusHeight + gap) + ")");
  contextG.append("rect")
    .attr("class","background-rect")
    .attr("width",width)
    .attr("height", contextHeight)
    .attr("fill", "#EAEAD5");
  contextXScale = d3.time.scale().range([0, width]);
  contextG.append("g").attr("class","context axis").attr("transform","translate(0," + contextHeight + ")");
  contextG.append("g").attr("id","timeseries_slider");
  contextXAxis = d3.svg.axis().scale(contextXScale).orient("bottom");

  colorScale = d3.scale.category10();
}

function updateTimeseries(contextG, focusG, width, height)
{
    if (tagsList.length === 0) return;
    
    colorScale.domain(d3.extent(tagsList, function(d, i) {return i}));
    var xMin = d3.min(tagsList, function(d) {return d3.min(d,function(e) {return e.tag_timestamp;});});
    var xMax = d3.max(tagsList, function(d) {return d3.max(d,function(e) {return e.tag_timestamp;});});
    var buffer = 0.01*(xMax.getTime() - xMin.getTime());

    contextXScale.domain([new Date(xMin.getTime() - buffer), new Date(xMax.getTime() + buffer)]);
    focusXScale.domain(contextXScale.domain());

    d3.select(".focus.axis").call(focusXAxis);
    d3.select(".context.axis").call(contextXAxis);

    var formatDate = d3.time.format("%b %e, %Y");
    var contextTimestampG = d3.select("#contextG").append("g").attr("class","contextTimestamp");
    contextTimestampG.append("text").attr("id","startingTime").text(formatDate(xMin));
    contextTimestampG.append("text").attr("id","endingTime").attr("text-anchor","end").attr("transform","translate(" + width + ",0)").text(formatDate(xMax));

    var brush = d3.svg.brush()
      .x(contextXScale)
      .on("brush", brushed);
    var slider = d3.select("#timeseries_slider");
    brush(slider);
    slider.selectAll("rect")
      .attr("height", height);

    updateContext(brush);

    function brushed()
    {
        updateFocus(focusG, width, focusHeight, brush);
    }

    return brush;
}

function updateContext(brush)
{
  drawLines(d3.select("#contextG"), tagsList, contextXScale, contextHeight);
  updateFocus(d3.select("#focusG"), width, focusHeight, brush);
}

function updateFocus(focusG, width, height, brush)
{
    if (brush.empty()) focusXScale.domain(contextXScale.domain());
    else focusXScale.domain(brush.extent());

    d3.select(".focus.axis").call(focusXAxis);
    drawLines(focusG, tagsList, focusXScale, height, true);
}

function drawLines(group, data, scale, height, tooltip)
{
  var key = d3.select("#buttonKey").text();

  if (key === "tag") group.selectAll("g .reader").remove();
  else if (key === "reader") group.selectAll("g .tag").remove();

  var tags = group.selectAll("g ." + key).data(data);
  //Enter
  tags.enter().append("g")
    .attr("class", key)
    .attr("id", function(d) {return d[0][key];})
    .attr("stroke", function (d, i) {return colorScale(i);})
  //Enter and Update
  var readLines = tags.selectAll("line")
    .data(function(d) {return d;});
  //Exit
  tags.exit().remove();

  //Enter
  readLines.enter().append("line")
    .attr("class", group[0][0].id + " time-line")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke-width", lineWidth)
  if (tooltip)
  {
      readLines.append("svg:title").text(function(d) { return d.reader + ": " +  d.tag; });
  }
  //Enter and Update
  readLines
    .attr("x1", function(d) {return scale(d.tag_timestamp);})
    .attr("x2", function(d) {return scale(d.tag_timestamp);});
  //Exit
  readLines.exit().remove();
}

function groupByKey(data, key)
{
  var results = [];
  for (var i = 0; i<data.length; i++)
  {
    var element = data[i];
    element.tag_timestamp = new Date(element.tag_timestamp);
    var index = -1;
    results.forEach(function(tagList, i) {
      if (tagList[0][key] == element[key]){
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
