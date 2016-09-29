//martin nadal
var renderer, scene, camera, stats;
var pointCloud;
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

      var lng = points[i]['lat'] * Math.PI / 180.0
      var lat = points[i]['lng'] * Math.PI / 180.0

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

function generatePointcloud(radius,points) {
	var geometry = generateWorld(radius,points)
	var material = new THREE.PointsMaterial({size:0.5});
	var pointcloud = new THREE.Points( geometry, material );
	return pointcloud;
}

function init() {
	var container = document.getElementById( 'container' );
	scene = new THREE.Scene();
	clock = new THREE.Clock();
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.up = new THREE.Vector3(0,0,1);
  camera.position.set(0,200,0)
  camera.lookAt(new THREE.Vector3(0,0,0));

  console.log('loading');
  $.getJSON( "data/locations.json", function( data ) {
    console.log('loaded!');

    pointCloud = generatePointcloud(50,data);
  	pointCloud.position.set( 0,0,0 );
  	scene.add( pointCloud );
    animate();
  }).fail(function() {
    console.log( "error" );
  });

	//
	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );
	//
	raycaster = new THREE.Raycaster();
	raycaster.params.Points.threshold = threshold;
	//
	//stats = new Stats();
	//container.appendChild( stats.dom );
	//
	window.addEventListener( 'resize', onWindowResize, false );
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
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
	pointCloud.applyMatrix( rotateY );
	camera.updateMatrixWorld();
	raycaster.setFromCamera( mouse, camera );
	renderer.render( scene, camera );
}
