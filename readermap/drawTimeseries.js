function drawReaderTimes(url, selector, outerWidth, outerHeight)
{
  var margin = {top:30,bottom:30,left:30,right:30};
  var axisSpace = 100;
  var gap = 5;
  var lineWidth = 2;
  var innerWidth = outerWidth - margin.left - margin.right;
  var innerHeight = outerHeight - margin.top - margin.bottom;

  d3.json(url, function(data) {
  var svg = d3.select(selector).append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight + 100);

  var plotArea = svg.append("g")
      .attr("transform","translate(" + margin.right + "," + margin.top + ")");

  //Get data in right form
  var results = data.results, url;
  results.forEach(function(read) {read.tag_timestamp = new Date(read.tag_timestamp);});

  //Set up
  var colorScale = d3.scale.category10();
  var xScale = d3.time.scale.utc()
    .range([0, innerWidth]);

  colorScale.domain(d3.extent(results, function(d) {return d.tag;}));
  xScale.domain(d3.extent(results, function(d) {return d.tag_timestamp;}));

  var tags = plotArea.selectAll("g").data(results);
  var rectHeight = innerHeight;

  var xAxis = d3.svg.axis()
      .orient("bottom")
      .scale(xScale)
      .ticks(7)
      .tickFormat(d3.time.format("%Y-%m-%d %H:%M"));
  svg.append("g")
      .attr("class", "axis")   // give it a class so it can be used to select only xaxis labels  below
      .attr("transform", "translate("+ margin.left + "," + outerHeight + ")")
      .call(xAxis);

  // now rotate text on x axis
  // solution based on idea here: https://groups.google.com/forum/?fromgroups#!topic/d3-js/heOBPQF3sAY
  // first move the text left so no longer centered on the tick
  // then rotate up to get 90 degrees.
 svg.selectAll(".axis text")  // select all the text elements for the xaxis
    .attr("transform", function(d) {
        return "translate(" + this.getBBox().height*-1 + "," + this.getBBox().height*5 + ")rotate(-90)";
  });

  var readerGroup = plotArea.append("g").attr("class","tag_group");
  readerGroup.append("rect")
    .attr("class","background-rect")
    .attr("width",innerWidth)
    .attr("height", rectHeight)
    .attr("fill", "gray");
  readerGroup.append("text")
      .attr("transform","translate(" + (innerWidth+10) + "," + rectHeight/2 + ")rotate(-90)")
      .text(results[0].reader);

  //Enter phase - add lines from reads
  var readLine = readerGroup.selectAll("line").data(results);
  readLine.enter().append("line")
    .attr("class","time-line")
    .attr("x1", function(d) {return xScale(d.tag_timestamp);})
    .attr("y1", 0)
    .attr("x2", function(d) {return xScale(d.tag_timestamp);})
    .attr("y2", rectHeight)
    .attr("stroke", function (d) {return colorScale(d.tag);})
    .attr("stroke-width",lineWidth);
});
}

function drawTagTimes(url, selector, outerWidth, outerHeight)
{
  var margin = {top:30,bottom:30,left:30,right:30};
  var axisSpace = 100;
  var gap = 5;
  var lineWidth = 2;
  var innerWidth = outerWidth - margin.left - margin.right;
  var innerHeight = outerHeight - margin.top - margin.bottom;

  d3.json(url, function(data) {
  var svg = d3.select(selector).append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight + 100);

  var plotArea = svg.append("g")
      .attr("transform","translate(" + margin.right + "," + margin.top + ")");

  //Get data in right form
  var results = groupByTag(data.results);

  //Set up
  var colorScale = d3.scale.category10();
  var xScale = d3.time.scale.utc()
    .range([0, innerWidth]);

  colorScale.domain(d3.extent(results, function(d) {return d.tag;}));
  xScale.domain(d3.extent(results, function(d) {return d.tag_timestamp;}));

  var tags = plotArea.selectAll("g").data(results);
  var rectHeight = innerHeight;

  var xAxis = d3.svg.axis()
      .orient("bottom")
      .scale(xScale)
      .ticks(7)
      .tickFormat(d3.time.format("%Y-%m-%d %H:%M"));
  svg.append("g")
      .attr("class", "axis")   // give it a class so it can be used to select only xaxis labels  below
      .attr("transform", "translate("+ margin.left + "," + outerHeight + ")")
      .call(xAxis);

  // now rotate text on x axis
  // solution based on idea here: https://groups.google.com/forum/?fromgroups#!topic/d3-js/heOBPQF3sAY
  // first move the text left so no longer centered on the tick
  // then rotate up to get 90 degrees.
 svg.selectAll(".axis text")  // select all the text elements for the xaxis
    .attr("transform", function(d) {
        return "translate(" + this.getBBox().height*-1 + "," + this.getBBox().height*5 + ")rotate(-90)";
  });

  var readerGroup = plotArea.selectAll("g background-rect").data(results).enter().append("g").attr("class","tag_group");
  readerGroup.append("rect")
    .attr("class","background-rect")
    .attr("width", innerWidth)
    .attr("height", rectHeight)
    .attr("fill", "gray");
  readerGroup.append("text")
      .attr("transform","translate(" + (innerWidth+10) + "," + rectHeight/2 + ")rotate(-90)")
      .text(results[0].reader);

  //Enter phase - add lines from reads
  var readLine = readerGroup.selectAll("line").data(results);
  readLine.enter().append("line")
    .attr("class","time-line")
    .attr("x1", function(d) {return xScale(d.tag_timestamp);})
    .attr("y1", 0)
    .attr("x2", function(d) {return xScale(d.tag_timestamp);})
    .attr("y2", rectHeight)
    .attr("stroke", function (d) {return colorScale(d.tag);})
    .attr("stroke-width",lineWidth);
});
}

function groupByTag(data, url)
{
  var uniqueTags = [];
  var results = [];
  var element, index, tag;

  for (var i = 0; i<data.length; i++)
  {
    element = data[i];
    element.timestamp = new Date(element.timestamp);
    index = contains(uniqueTags, element.tag);

    if (index < 0)
    {
      uniqueTags.push(element.tag);
      d3.json(url + "&tag=" + element.tag, function (data)
    {
      results.push(data.results);
    });
    }

  }
  return results;
}

function contains(list, value)
{
  for (var i = 0; i < list.length; i++)
  {
    if (list[i] === value)
      return i;
  }
return -1;
}
