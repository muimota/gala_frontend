//a class that is going to store a timeline
// {date:[locationIds ...]}
//is going to store all the info

EventsModel = function(){
  this.locations = null; //location with concert in certain date
  this.locationNames = {};
  this.timeline  = null; //timeline
  this.concerts  = {};
}

EventsModel.prototype.load = function(filename,callback){
  var self = this;
  $.getJSON(filename,function(timeline){
    self.timeline = timeline
    self.timeline.sort()
    if(callback != null){
      callback(this.timeline)
    }
  })
}

EventsModel.prototype.getConcerts = function(date,daysInterval,genres,callback){

  var self       = this;
  var url = 'http://localhost/gala/concerts/dates/'+date+'/'+daysInterval+'/genres/'+genres.join('|')
  console.log(url);
  if(true){

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

EventsModel.prototype.getLocation = function(locationId,callback){

  var self       = this;

  var url = 'http://localhost/gala/locations/id/'+locationId
  if(!(locationId in this.locationNames)){

    $.getJSON(url,function(location){
      self.locationNames[locationId] = location;
      if(callback != null){
        callback(self.locationNames[locationId]);
      }
    })
  }else{
    if(callback != null){
      callback(self.locationNames[locationId]);
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
