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
var controls;

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


function generatePointcloud(radius,points,size,color,opacity) {

  var geometry = generateWorld(radius,points)

  var colors = new Float32Array( points.length*3 )
  var sizes  = new Float32Array( points.length   )

  //size
  if (!(size instanceof Array) ){
    size = [size]
  }
  for(var i=0;i<sizes.length;i++){
    sizes[i] = size[i%size.length]
  }

  //color
  if (!(color instanceof Array) ){
    color = [color]
  }
  for(var i=0;i<colors.length/3;i++){
    colors[i*3  ] = color[i%color.length].r
    colors[i*3+1] = color[i%color.length].g
    colors[i*3+2] = color[i%color.length].b
  }

  uniforms = {
   color:     { value: new THREE.Color( 0xffffff ) },
   opacity:   { value: opacity},
   texture:   { value: THREE.ImageUtils.loadTexture( '../img/particleTexture.png' )}
	};

	var shaderMaterial = new THREE.ShaderMaterial( {
  	uniforms:       uniforms,
  	vertexShader:   document.getElementById( 'vertexshader' ).textContent,
  	fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
  	depthTest:      false,
  	transparent:    true
  });


	geometry.addAttribute( 'customColor', new THREE.BufferAttribute( colors, 3 ) );
	geometry.addAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );

	var pointcloud = new THREE.Points( geometry, shaderMaterial );
	return pointcloud;
}

function init() {
	var container = document.getElementById( 'container' );
	scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x1E2E37 );
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
    pointCloud = generatePointcloud(50,locations,2.0,new THREE.Color(255,255,255),0.2)
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
      displayConcertsinDate('20140202')
    }
  );
  //GUI
  $('.band').click(function(e){
    var artistName = $(e.target).text();
    showArtistConcerts(artistName)
  })

  controls = new THREE.OrbitControls( camera );
  controls.enableDamping = true;
	controls.dampingFactor = 0.25;
  controls.enableZoom    = true;

  this.enableKeys        = false;
  this.enablePan         = false;
  this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE};


  $('#prevDate').click(function(){
    var currentDateIndex = Math.max(0,eventModel.timeline.indexOf(currentDate)-1);
    var date = eventModel.timeline[currentDateIndex]
    displayConcertsinDate(date);
  })

  $('#nextDate').click(function(){
    var currentDateIndex = Math.min(eventModel.timeline.length,
      eventModel.timeline.indexOf(currentDate)+1);
    var date = eventModel.timeline[currentDateIndex]
    displayConcertsinDate(date);
  })
	//indicator
  var geometry = new THREE.SphereBufferGeometry( 1.5, 10, 10 );
  var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
  indicator = new THREE.Mesh( geometry, material )
  indicator.visible = false


	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );
	//
	raycaster = new THREE.Raycaster();
	raycaster.params.Points.threshold = 2.0;

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
//updates locations in map
function displayLocations(locationsIds,color,size){
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
  layerCloud = generatePointcloud(50,points,size,color,1.0);
  layerCloud.position.set( 0,0,0 );
  pointCloud.add( layerCloud );
}
function displayConcertsinDate(date){
  eventModel.getConcerts(date,function(concerts){

    var locationIds = []
    var colors       = []
    var sizes        = []

    for(var locationId in concerts){
        locationIds.push(locationId)
        var size = concerts[locationId]['total']
        sizes.push(size)
    }

    currentDate = date;
    $('#concertDate').text(date);

    displayLocations(locationIds,new THREE.Color(0xFF00FF),sizes)
  });
}

function displayConcertsLocationsinDate(date){
  var concertLocationIds = eventModel.getLocations(date);
  currentDate = date;
  $('#concertDate').text(date);

  displayLocations(concertLocationIds,new THREE.Color('#F00F22'),10.0)
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

      var index = 0;
      var minDistance = 9999999;

      for(i=0;i < intersection.length; i ++){
        var distanceToRay = intersection[i].distanceToRay;
        if(distanceToRay<minDistance){
            index = intersection[i].index;
            minDistance = distanceToRay;
        }
      }


      var locationIndex = layerCloudLocations[index];
      var pointArray    = layerCloud.geometry.getAttribute( 'position' ).array;
      indicator.position.set(pointArray[index*3],pointArray[index*3+1],pointArray[index*3+2])
      indicator.visible = true;

    }else{

      indicator.visible = false;

    }

  }
  controls.update();
	//pointCloud.rotation.z += .0005;
	camera.updateMatrixWorld();
	raycaster.setFromCamera( mouse, camera );
	renderer.render( scene, camera );
}
