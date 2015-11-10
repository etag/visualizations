var readsPerReader = 500;
var readsPerTag = 500;


createMap(readsPerReader);

var combo = d3.select("body").append("select").attr("id","combo");
//Load tags into combo box
d3.json("http://head.ouetag.org/api/etag/tags/.json", function(error, tags) {
  combo.append("option").attr("value","Show all readers").text("Show all readers").attr("selected", true);
  tags.results.forEach(function(tag) {
    combo.append("option").attr("value",tag.url).text(tag.tag_id);
  });
});

d3.json("http://head.ouetag.org/api/etag/reader_location/.json", function(error, readersInfo) {
  drawReaders(readersInfo);

  $("#combo").on('change', function() {
    if (this.options[this.selectedIndex].text === "Show all readers")
    {
      //Show all readers
      drawReaders(readersInfo);
    }
    else {
      //Read in selected tag reads
      var url = "http://head.ouetag.org/api/etag/tag_reads/.json?page_size=" + readsPerTag + "&tag="+this.options[this.selectedIndex].text;
      d3.json(url, function(error, reads) {
        if (error) throw error;
        zoomIntoTags(reads, readersInfo);
        $("#timeseries").empty();
        drawTagTimes(url, "#timeseries", 500, 300);
      });
    }
  });
});
