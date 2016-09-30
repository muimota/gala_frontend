//martin nadal
var renderer, scene, camera, stats;
var locations;
var pointCloud;
var layerCloud;
var raycaster;
var mouse = new THREE.Vector2();
var intersection = null;
var spheres = [];
var spheresIndex = 0;
var clock;
var threshold = 0.1;
var pointSize = 0.05;
var width = 150;
var length = 150;
var rotateY = new THREE.Matrix4().makeRotationZ( 0.005 );

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
    geometry.computeBoundingBox();
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
  camera.position.set(200,0,0)
  camera.lookAt(new THREE.Vector3(0,0,0));

  //load locations
  console.log('loading');
  $.getJSON( "http://localhost/gala/locations", function( data ) {
    console.log('loaded!');
    locations = data;
    pointCloud = generatePointcloud(50,locations,0.5,new THREE.Color(255,255,255,0.4))
  	pointCloud.position.set( 0,0,0 );
  	scene.add( pointCloud );
    //showArtistConcerts("Iron Maiden")
    animate();
  }).fail(function() {
    console.log( "error" );
  });

  //GUI
  $('.band').click(function(e){
    var artistName = $(e.target).text();
    showArtistConcerts(artistName)
  })
	//
	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );
	//
	raycaster = new THREE.Raycaster();
	raycaster.params.Points.threshold = threshold;

	window.addEventListener( 'resize', onWindowResize, false );
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
}

function showArtistConcerts(artistName){

  $.getJSON( "http://localhost/gala/concerts/band/"+artistName, function( concerts ) {

    if(layerCloud != undefined){
      pointCloud.remove(layerCloud);
    }

    var points = []
    for(var date in concerts){
      points.push(locations[concerts[date][1]])
    }
    layerCloud = generatePointcloud(50,points,2.5,new THREE.Color('#ff0000'));
    layerCloud.position.set( 0,0,0 );
    pointCloud.add( layerCloud );
  });
}

function onDocumentMouseMove( event ) {
	event.preventDefault();
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
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
	pointCloud.rotation.z += .0005;
	camera.updateMatrixWorld();
	raycaster.setFromCamera( mouse, camera );
	renderer.render( scene, camera );
}
