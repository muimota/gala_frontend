//a class that is going to store a timeline
// {date:[locationIds ...]}
//is going to store all the info

EventsModel = function(){
  this.concerts = null; //location with concert in certain date
  this.timeline = null; //timeline
}

EventsModel.prototype.load = function(filename,callback){
  var self = this;
  $.getJSON(filename,function(concerts){
    self.concerts = concerts;
    self.timeline = [];
    for(var date in self.concerts){
      self.timeline.push(date);
    }
    self.timeline.sort();
    if(callback != null){
      callback(this.data);
    }
  })
}

EventsModel.prototype.getConcerts = function(date){
  var concerts = []
  if ( date in this.concerts){
    concerts =  this.concerts[date];
  }
  return concerts
}
