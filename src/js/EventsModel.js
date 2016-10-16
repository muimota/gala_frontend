//a class that is going to store a timeline
// {date:[locationIds ...]}
//is going to store all the info




EventsModel = function(rootUrl){

  this.locations     = null; //location with concert in certain date
  this.locationNames = {};
  this.timeline      = null; //timeline
  this.concerts      = {

    'D':{},
    'W':{},
    'M':{},
    'H':{},
    'Y':{}

  }

  this.rootUrl       = rootUrl
}

EventsModel.dailyInterval    = 'D'
EventsModel.weekInterval     = 'W'
EventsModel.monthInterval    = 'M'
EventsModel.halfYearInterval = 'H'
EventsModel.yearInterval     = 'Y'


//calcula la fecha correcta para usar en el cache
EventsModel.calculateDate = function(strDate,daysInterval){

  var year    = parseInt(strDate.substring(0,4))
  var month   = parseInt(strDate.substring(4,6)) - 1
  var day     = parseInt(strDate.substring(6,8))
  var date    = new Date(year,month,day)

  if(daysInterval == EventsModel.weekInterval){

    var weekDay = date.getDay()

    //http://stackoverflow.com/a/4156516/2205297
    diff = date.getDate() - weekDay + (weekDay == 0 ? -6:1);
    date.setDate(diff)

  }else if(daysInterval == EventsModel.monthInterval){
    date.setDate(1)
  }else if(daysInterval == EventsModel.halfYearInterval){
    date.setDate(1)
    if(month>6){
      date.setMonth(7)
    }else{
      date.setMonth(1)
    }
  }else if (daysInterval == EventsModel.yearInterval){
    date.setMonth(1)
    date.setDate(1)
  }
  return ''+date.getFullYear()+('0'+date.getMonth()).slice(-2)+
  ('0'+date.getDate()).slice(-2)
}

EventsModel.prototype.loadTimeline = function(callback){
  var self = this;
  $.getJSON(this.rootUrl + 'timeline/',function(timeline){
    self.timeline = timeline
    self.timeline.sort()
    if(callback != null){
      callback(this.timeline)
    }
  })
}

//get artist thet performed in a location in datesinterval
EventsModel.prototype.getArtists = function(date,daysInterval,locationId,callback){

  var self = this;
  var url  = this.rootUrl + 'concerts/dates/'+date+'/'+daysInterval+'/location/'+locationId
  console.log(url)
  $.getJSON(url,function(artists){

    if(callback != null){
      callback(artists);
    }
  })

}
EventsModel.prototype.getConcerts = function(date,daysInterval,genres,callback){

  var self       = this;
  var url = this.rootUrl + 'concerts/dates/'+date+'/'+daysInterval
  console.log(url);
  if(!(date in self.concerts[daysInterval])){

    $.getJSON(url,function(concerts){
      self.concerts[daysInterval][date] = concerts;
      if(callback != null){
        callback(self.concerts[daysInterval][date]);
      }
    })
  }else{
    if(callback != null){
      callback(self.concerts[daysInterval][date]);
    }
  }
}

EventsModel.prototype.getLocationName = function(locationId,callback){

  var self       = this;

  var url = this.rootUrl + 'locations/'+locationId
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
