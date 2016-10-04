//a class that is going to store a timeline
// {date:[locationIds ...]}
//is going to store all the info

EventsModel = function(){
  this.locations = null; //location with concert in certain date
  this.timeline  = null; //timeline
  this.concerts  = {};
}

EventsModel.prototype.load = function(filename,callback){
  var self = this;
  $.getJSON(filename,function(locations){
    self.locations = locations;
    self.timeline = [];
    for(var date in self.locations){
      self.timeline.push(date);
    }
    self.timeline.sort();
    if(callback != null){
      callback(this.data);
    }
  })
}

EventsModel.prototype.getConcerts = function(date,callback){

  var self = this;
  var url = 'http://localhost/gala/concerts/dates/'+date
  if(!(date in this.concerts)){

    $.getJSON(url,function(concerts){
      self.concerts[date] = concerts;
      if(callback != null){
        callback(self.concerts[date]);
      }
    })
  }else{
    if(callback != null){
      callback(self.concerts[date]);
    }
  }
}

EventsModel.prototype.getLocations = function(date){
  var locations = []
  if ( date in this.locations){
    locations =  this.locations[date];
  }
  return locations
}
