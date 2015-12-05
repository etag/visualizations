
createMap();
var gettingReaderLocations = $.getJSON("http://head.ouetag.org/api/etag/reader_location/.json", function(readersInfo) {
  drawReaders(readersInfo);
});
options("http://head.ouetag.org/api/etag", "#options", update);

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

  getAllReads(url, updateData);

  function updateData(data) {
    timeseries(500, 200, "#timeseries", data, selectedTag, selectedReader);
    if (data.count !== 0)
    {
      $.when(gettingReaderLocations).done(function(readersInfo) {zoomIntoTags(data, readersInfo);});
    }
    $("#loading").hide();
  }
}

function getAllReads(url, functionOnData)
{
  var getCount = $.getJSON(url);
  $.when(getCount).done(function(results) {
    $("#info text").text("Results: " + results.count);
    $("#loading").show();
    url = url + "&page_size=" + results.count;
    $.getJSON(url, function (data) {functionOnData(data);});
  });
}
