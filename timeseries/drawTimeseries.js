function drawReaderTimes(url, selector, outerWidth, outerHeight)
{
  //Configurables
  var margin = {top:30,bottom:30,left:30,right:30};
  var lineWidth = 2;

  //Set up
  var innerWidth = outerWidth - margin.left - margin.right;
  var innerHeight = outerHeight - margin.top - margin.bottom;
  var svg = d3.select(selector).append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight);
  var plotArea = svg.append("g")
    .attr("transform","translate(" + margin.left + "," + margin.top + ")");
  var colorScale = d3.scale.category10();
  var xScale = d3.time.scale.utc()
    .range([0, innerWidth]);

  d3.json(url, function(data) {
    //Get data in right form
    time = (new Date()).getTime();
    tagsList = groupByTag(data.results);
    time = (new Date()).getTime() - time;
    console.log("Time for parsing data into groups: " + time);
    console.log(tagsList);

    colorScale.domain(d3.extent(tagsList, function(d, i) {return i}));
    var xMin = d3.min(tagsList, function(d) {return d3.min(d,function(e) {return e.tag_timestamp;});});
    var xMax = d3.max(tagsList, function(d) {return d3.max(d,function(e) {return e.tag_timestamp;});});
    xScale.domain([xMin,xMax]);

    var xAxis = d3.svg.axis()
        .orient("bottom")
        .scale(xScale)
        .ticks(10)
        .tickFormat(d3.time.format("%m-%d %H:%M"));
    svg.append("g")
        .attr("class", "axis")   // give it a class so it can be used to select only xaxis labels  below
        .attr("transform", "translate("+ margin.left + "," + (margin.top + innerHeight/2) + ")")
        .call(xAxis);

    // now rotate text on x axis
    // solution based on idea here: https://groups.google.com/forum/?fromgroups#!topic/d3-js/heOBPQF3sAY
    // first move the text left so no longer centered on the tick
    // then rotate up to get 90 degrees.
    svg.selectAll(".axis text")  // select all the text elements for the xaxis
      .attr("transform", function(d) {
          return "translate(" + this.getBBox().height*-1 + "," + this.getBBox().height*4 + ")rotate(-90)";
      });

    var rectHeight = innerHeight/2;

    plotArea.append("rect")
      .attr("class","background-rect")
      .attr("width",innerWidth)
      .attr("height", rectHeight)
      .attr("fill", "#EAEAD5");
    plotArea.append("text")
        .attr("transform","translate(" + (innerWidth) + "," + rectHeight/2 + ")rotate(90)")
        .attr("text-anchor","middle")
        .text(tagsList[0][0].reader);

    tagsList.forEach(function(tagReads) {
    //Enter phase - add lines from reads
    var readLines = plotArea.append("g").attr("id",tagReads[0].tag).selectAll("line").data(tagReads);
    readLines.enter().append("line")
      .attr("class","time-line")
      .attr("x1", function(d) {return xScale(d.tag_timestamp);})
      .attr("y1", 0)
      .attr("x2", function(d) {return xScale(d.tag_timestamp);})
      .attr("y2", rectHeight)
      .attr("stroke", function (d) {return colorScale(d.tag);})
      .attr("stroke-width", lineWidth)
      .on('click', function(d) {
        $("#combo option").each(function() {
          if($(this).text() == d.tag) {
            $(this).attr('selected', 'selected');
          }
        });
        $("#combo").change();
      })
      .on('mouseover', function() {
        d3.select(this.parentNode.parentNode).selectAll("line").attr("opacity","0.05");
        d3.select(this.parentNode).selectAll("line").attr("opacity","1");
      })
      .on('mouseout', function() {
        d3.select(this.parentNode.parentNode).selectAll("line").attr("opacity","1");
      });
    });
  });
}

function drawTagTimes(url, selector, outerWidth, outerHeight)
{
  //Configurables
  var margin = {top:30,bottom:30,left:30,right:30};
  var lineWidth = 2;
  gap = 5;

  //Set up
  var innerWidth = outerWidth - margin.left - margin.right;
  var innerHeight = outerHeight - margin.top - margin.bottom;
  var svg = d3.select(selector).append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight);
  var plotArea = svg.append("g")
    .attr("transform","translate(" + margin.left + "," + margin.top + ")");
  var colorScale = d3.scale.category10();
  var xScale = d3.time.scale.utc()
    .range([0, innerWidth]);

  d3.json(url, function(data) {
    //Get data in right form
    readersList = groupByReader(data.results);

    colorScale.domain(d3.extent(readersList, function(d, i) {return i}));
    var xMin = d3.min(readersList, function(d) {return d3.min(d,function(e) {return e.tag_timestamp;});});
    var xMax = d3.max(readersList, function(d) {return d3.max(d,function(e) {return e.tag_timestamp;});});
    xScale.domain([xMin,xMax]);

    var rectHeight = innerHeight/(readersList.length + 1) - gap;

    var xAxis = d3.svg.axis()
        .orient("bottom")
        .scale(xScale)
        .ticks(10)
        .tickFormat(d3.time.format("%m-%d %H:%M"));
    svg.append("g")
        .attr("class", "axis")   // give it a class so it can be used to select only xaxis labels  below
        .attr("transform", "translate("+ margin.left + "," + (margin.top + innerHeight-rectHeight) + ")")
        .call(xAxis);

    // now rotate text on x axis
    // solution based on idea here: https://groups.google.com/forum/?fromgroups#!topic/d3-js/heOBPQF3sAY
    // first move the text left so no longer centered on the tick
    // then rotate up to get 90 degrees.
    svg.selectAll(".axis text")  // select all the text elements for the xaxis
      .attr("transform", function(d) {
          return "translate(" + this.getBBox().height*-1 + "," + this.getBBox().height*4 + ")rotate(-90)";
      });

    readersList.forEach(function(readerData, i) {
      var readerGroup = plotArea.append("g")
        .attr("transform","translate(0," + i*(rectHeight+gap) + ")");

      readerGroup.append("rect")
        .attr("class","background-rect")
        .attr("width",innerWidth)
        .attr("height", rectHeight)
        .attr("fill", "#EAEAD5");
      readerGroup.append("text")
          .attr("transform","translate(" + (innerWidth) + "," + rectHeight/2 + ")rotate(90)")
          .attr("text-anchor","middle")
          .text(readerData[0].reader);

      var readLines = readerGroup.append("g").selectAll("line").data(readerData);
      //Enter phase - add lines from reads
      readLines.enter().append("line")
        .attr("class","time-line")
        .attr("x1", function(d) {return xScale(d.tag_timestamp);})
        .attr("y1", 0)
        .attr("x2", function(d) {return xScale(d.tag_timestamp);})
        .attr("y2", rectHeight)
        .attr("stroke", function (d) {return colorScale(d.tag);})
        .attr("stroke-width", lineWidth);
    });
  });
}

function groupByTag(data)
{
  var results = [];
  for (var i = 0; i<data.length; i++)
  {
    var element = data[i];
    element.tag_timestamp = new Date(element.tag_timestamp);
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

function groupByReader(data)
{
  var results = [];
  for (var i = 0; i<data.length; i++)
  {
    var element = data[i];
    element.tag_timestamp = new Date(element.tag_timestamp);
    var index = -1;
    results.forEach(function(tagList, i) {
      if (tagList[0].reader == element.reader){
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
