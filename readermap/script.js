var readsPerReader = 500;
var readsPerTag = 500;

createMap(readsPerReader);
var gettingReaderLocation = $.getJSON("http://head.ouetag.org/api/etag/reader_location/.json", function(readersInfo) {
  drawReaders(readersInfo);
});
drawOptionSelectors("http://head.ouetag.org/api/etag", "#options", update);

function drawOptionSelectors(apiUrl, selector, update)
{
  var options = d3.select(selector).append("g").attr("id","optionG");

  var comboSize = 5;

  //Combo box for tags
  var tagCombo = options.append("select")
    .attr("size", comboSize)
    .attr("id","tagCombo");
  //Load tags into tagCombo box
  d3.json(apiUrl + "/tags/.json", function(error, tags) {
    tagCombo.append("option")
      .attr("value","all")
      .text("Show all tags")
      .attr("selected", true);
    tags.results.forEach(function(tag) {
      tagCombo.append("option").attr("value",tag.tag_id).text(tag.tag_id);
    });
  });


  //Combo box for readers
  var readerCombo = options.append("select")
    .attr("size", comboSize)
    .attr("id","readerCombo");
  //Load readers into readerCombo box
  d3.json(apiUrl + "/readers/.json", function(error, readers) {
    readerCombo.append("option")
      .attr("value","all")
      .text("Show all readers")
      .attr("selected", true);
    readers.results.forEach(function(reader) {
      readerCombo.append("option").attr("value",reader.reader_id).text(reader.reader_id);
    });
  });


  //Time slider
  var selectedTime = options.append("div").attr("id", "selectedTime");

  var sliderHeight = 20;
  var sliderWidth = 200;

  var timeSlider = options.append("svg").attr("id","time_slider").attr("width",sliderWidth).attr("height",sliderHeight);
  var brush = d3.svg.brush()
    .on("brush", brushed);

  var timeScale = d3.time.scale().range([0,sliderWidth]);
  var min, max;
  var gettingMinTime = $.getJSON(apiUrl + "/tag_reads/?ordering=tag_timestamp&page_size=1", function(data) {
    min = new Date(data.results[0].tag_timestamp);
  });
  var gettingMaxTime = $.getJSON(apiUrl + "/tag_reads/?ordering=-tag_timestamp&page_size=1",  function(data) {
    max = new Date(data.results[0].tag_timestamp);
  });

  $.when(gettingMinTime, gettingMaxTime).done( function() {
    timeScale.domain([min,max]);
    brush.x(timeScale);
    var buffer = 0.2*(max - min);
    brush.extent([new Date(min.getTime() + buffer), new Date(max.getTime() - buffer)]);

    brush(timeSlider);
    timeSlider.selectAll("rect")
      .attr("height", sliderHeight);
    timeSlider.selectAll(".resize rect")
      .attr("width",sliderWidth/60);
    brushed();
  });

  function brushed()
  {
    var format = d3.time.format("%b %e, %Y");
    selectedTime.text(format(brush.extent()[0]) + " - " + format(brush.extent()[1]));
  }


  //Update button
  options.append("button")
    .text("Update")
    .on("click", function() {
      update(tagCombo.property("value"), readerCombo.property("value"), brush.extent());
    });
}

function update(selectedTag, selectedReader, selectedTime)
{
  var url = "http://head.ouetag.org/api/etag/tag_reads/.json?";
  if (selectedTag !== "all")
  {
    url += "tag=" + selectedTag + "&";
  }
  if (selectedReader !== "all")
  {
    url += "reader=" + selectedReader + "&";
  }
  var format = d3.time.format("%Y-%m-%d%%20%X");
  url += "min_timestamp=" + format(selectedTime[0]) + "&";
  url += "max_timestamp=" + format(selectedTime[1]);

  d3.json(url, function (data) {
    timeseries(500, 200, "#timeseries", data, selectedTag, selectedReader);
    $.when(gettingReaderLocation).done(function(readersInfo) {zoomIntoTags(data, readersInfo);});
  });
}
