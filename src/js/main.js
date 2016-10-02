//martin nadal
var renderer, scene, camera, stats;
var locations;     //id:[lat,lng]
var events;        //events {date:[eventId,locationId]}
var pointCloud;    // all locations
var layerCloud;    // highlighted locations
var layerCloudLocations;// [locationIndex ..] tabla de la geometrya de layer
var currentDate;
var raycaster;
var mouse = new THREE.Vector2();
var clock;
var indicator;

var eventModel;
init();

function generateWorld(radius,points){

  	var geometry = new THREE.BufferGeometry();
    var numPoints = points.length;
    var positions = new Float32Array( numPoints*3 )
  	var colors = new Float32Array( numPoints*3 )
    for(var i=0;i<numPoints;i++){

      var lat = points[i][0] * Math.PI / 180.0
      var lng = points[i][1] * Math.PI / 180.0

      var x = Math.cos(lng)*radius*Math.cos(lat)
      var y = Math.sin(lng)*radius*Math.cos(lat)
      var z = radius*Math.sin(lat)

      positions[ 3 * i ]     = x
      positions[ 3 * i + 1 ] = y
      positions[ 3 * i + 2 ] = z

    }
    geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
  	return geometry;
}

function generatePointcloud(radius,points,size,color) {
	var geometry = generateWorld(radius,points)

	var material = new THREE.PointsMaterial({color:color,size:size});
  material.transparent = true;
  material.depthTest = false;

	var pointcloud = new THREE.Points( geometry, material );
	return pointcloud;
}

function init() {
	var container = document.getElementById( 'container' );
	scene = new THREE.Scene();
	clock = new THREE.Clock();
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.up = new THREE.Vector3(0,0,1);
  camera.position.set(200,0,100)
  camera.lookAt(new THREE.Vector3(0,0,0));

  //load locations
  console.log('loading');
  $.getJSON( "http://localhost/gala/locations", function( data ) {
    console.log('loaded!');
    locations = data;
    pointCloud = generatePointcloud(50,locations,0.5,new THREE.Color(255,255,255,0.4))
  	pointCloud.position.set( 0,0,0 );
  	scene.add( pointCloud );
    pointCloud.add(indicator);
    animate();

  }).fail(function() {
    console.log( "error" );
  });

  eventModel = new EventsModel();
  eventModel.load("http://localhost/gala/timeline",
    function(){
      displayConcertsLocationsinDate('20140202')
    }
  );
  //GUI
  $('.band').click(function(e){
    var artistName = $(e.target).text();
    showArtistConcerts(artistName)
  })

  $('#prevDate').click(function(){
    var currentDateIndex = Math.max(0,eventModel.timeline.indexOf(currentDate)-1);
    var date = eventModel.timeline[currentDateIndex]
    displayConcertsLocationsinDate(date);
  })

  $('#nextDate').click(function(){
    var currentDateIndex = Math.min(eventModel.timeline.length,
      eventModel.timeline.indexOf(currentDate)+1);
    var date = eventModel.timeline[currentDateIndex]
    displayConcertsLocationsinDate(date);
  })
	//indicator
  var geometry = new THREE.SphereBufferGeometry( 5, 20, 20 );
  var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
  indicator = new THREE.Mesh( geometry, material )
  indicator.visible = false


	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );
	//
	raycaster = new THREE.Raycaster();
	raycaster.params.Points.threshold = 5.0;

	window.addEventListener( 'resize', onWindowResize, false );
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
}

function showArtistConcerts(artistName){

  $.getJSON( "http://localhost/gala/concerts/band/"+artistName, function( concerts ) {


    var concertLocations = []
    for(var date in concerts){
      var locationId = concerts[date][1];
      concertLocations.push(locationId)
    }
    displayLocations(concertLocations);
  });
}
//updates points in map
function displayLocations(locationsIds){
  if(layerCloud != undefined){
    pointCloud.remove(layerCloud);
    layerCloud.geometry.dispose();
  }
  //array stored globally that is going to be used to select locations
  layerCloudLocations = locationsIds
  var points = []
  for(var i=0;i<locationsIds.length;i++){
    var locationId = locationsIds[i];
    points.push(locations[locationId])
  }
  layerCloud = generatePointcloud(50,points,2.5,new THREE.Color('#ff0000'));
  layerCloud.position.set( 0,0,0 );
  pointCloud.add( layerCloud );
}

function displayConcertsLocationsinDate(date){
  var concertLocationIds = eventModel.getConcerts(date);
  currentDate = date;
  $('#concertDate').text(date);

  displayLocations(concertLocationIds);
}

function onDocumentMouseMove( event ) {
	event.preventDefault();
	mouse.x =   ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}
function animate() {
	requestAnimationFrame( animate );
	render();
}
function render() {


  if(layerCloud != undefined){

    var intersection = raycaster.intersectObject( layerCloud );

    if(intersection.length>0){

      var index = intersection[0].index
      var locationIndex = layerCloudLocations[index];
      var pointArray    = layerCloud.geometry.getAttribute( 'position' ).array;
      indicator.position.set(pointArray[index*3],pointArray[index*3+1],pointArray[index*3+2])
      indicator.visible = true;

    }else{

      indicator.visible = false;

    }

  }

	pointCloud.rotation.z += .0005;
	camera.updateMatrixWorld();
	raycaster.setFromCamera( mouse, camera );
	renderer.render( scene, camera );
}
