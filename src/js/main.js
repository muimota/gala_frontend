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
var palette,activegenres;
var config
var updateInterval;
var eventModel;
init();



function init() {


	var container = document.getElementById( 'container' );
	scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x1E2E37 );
	clock = new THREE.Clock();

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );

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
  config = {
    speed:5,
    year:2006,
    autorotate:true,
    autoplay:false,
    genre1:'---',
    genre2:'---',

  }
  var gui = new dat.gui.GUI();
  //gui.remember(config)
  // Choose from named values

  //gui.add(config, 'year',[2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016]);
  //gui.add(config, 'speed',[1,7,30]);
  gui.add(config, 'autorotate');
  var playController = gui.add(config, 'autoplay');

  genresFolder = gui.addFolder('genres')
  genresFolder.add(config,
    'genre1',
    ['---','electronic','pop','folk','rock','jazz','hip hop'])
    .onFinishChange(function(){
      activegenres = [config.genre1,config.genre2]
      offsetTime(0);
    });
    genresFolder.add(config,
      'genre2',
      ['---','electronic','pop','folk','rock','jazz','hip hop'])
      .onFinishChange(function(){
        activegenres = [config.genre1,config.genre2]
        offsetTime(0);
      });
  playController.onFinishChange(function(value) {
    if(config.autoplay){
      updateInterval =  setInterval(function(){offsetTime(7)},2000);
    }else{
      clearInterval(updateInterval);
    }
  });


  $('.band').click(function(e){
    var artistName = $(e.target).text();
    showArtistConcerts(artistName)
  })

  controls = new THREE.OrbitControls(camera,renderer.domElement);;
  controls.enableDamping = true;
	controls.dampingFactor = 0.25;
  controls.enableZoom    = true;

  this.enableKeys        = false;
  this.enablePan         = false;
  this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE};


  $('#prevDate').click(function(){
    offsetTime(-7);
  })

  $('#nextDate').click(function(){
    offsetTime(7);
  })

  function offsetTime(offset){
    var currentDateIndex = Math.min(eventModel.timeline.length,
      Math.max(0,eventModel.timeline.indexOf(currentDate)+offset));
    var date = eventModel.timeline[currentDateIndex]
    displayConcertsinDate(date);
  }

  //pallete
  pallete     = {'electronic' : new THREE.Color(0x437BC4),
                     'pop'        : new THREE.Color(0xA727C3),
                     'folk'       : new THREE.Color(0xF0E44B),
                     'rock'       : new THREE.Color(0xCF3D58),
                     'jazz'       : new THREE.Color(0xE68E3E),
                     'hip hop'    : new THREE.Color(0x6AC75C),
                     'flamenco'    : new THREE.Color(0x00C700),
                   }
  activegenres = ['---','---']


	//indicator
  var geometry = new THREE.SphereBufferGeometry( 0.5, 10, 10 );
  var material = new THREE.MeshBasicMaterial( {color: 0xffffff,opactiy:0.1,
    depthTest: false,transparent:true} );
  indicator = new THREE.Mesh( geometry, material )
  indicator.visible = false


//
	raycaster = new THREE.Raycaster();
	raycaster.params.Points.threshold = 2.0;

	window.addEventListener( 'resize', onWindowResize, false );
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
  $('#container>canvas').click(onWorldClick);
}

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

function showArtistConcerts(artistName){

  $.getJSON( "http://localhost/gala/concerts/band/"+artistName, function( concerts ) {


    var concertLocations = []
    for(var date in concerts){
      var locationId = concerts[date][1];
      concertLocations.push(locationId)
    }
    displayLocations(concertLocations,new THREE.Color('red'),10);
  });
}
//updates locations in map
function displayLocations(locationsIds,color,size){
  if(layerCloud != undefined){
    var prevLayerCloud = layerCloud;
    new TWEEN.Tween( prevLayerCloud.material.uniforms.opacity )
    .to( { value: 0 }, 600 )
    .onComplete(function(){
      pointCloud.remove(prevLayerCloud)
      prevLayerCloud.geometry.dispose()
      prevLayerCloud.material.dispose()
    })
    .start();
  }

  //array stored globally that is going to be used to select locations
  layerCloudLocations = locationsIds
  var points = []
  for(var i=0;i<locationsIds.length;i++){
    var locationId = locationsIds[i];
    points.push(locations[locationId])
  }
  layerCloud = generatePointcloud(50,points,size,color,0.0);
  layerCloud.position.set( 0,0,0 );
  pointCloud.add( layerCloud );

  new TWEEN.Tween( layerCloud.material.uniforms.opacity ).to( { value: 0.7 }, 600 ).start();

}
function displayConcertsinDate(date){
  eventModel.getConcerts(date,activegenres,function(concerts){

    var locationIds = []
    var colors      = []
    var sizes       = []

    for(var locationId in concerts){
        var concert = concerts[locationId];
        var size = 5 +  concert['total']*3
        var color = new THREE.Color('black');

        //normalization
        var tagged =  0;
        for(var i=0;i<activegenres.length;i++){
          var musicStyle = activegenres[i]
          if(musicStyle in concert){
              tagged += concert[musicStyle]
          }
        }
        if(tagged == 0 ){
            //color.set('white')
            continue;
        }else{
          for(var i=0;i<activegenres.length;i++){
            var musicStyle = activegenres[i]

            if(musicStyle in concert){
              var styleColor = pallete[musicStyle];
              var styleRatio = concert[musicStyle]/tagged;
              color.add(styleColor.clone().multiplyScalar(styleRatio));
            }
          }
        }
        colors.push(color)
        sizes.push(size)
        locationIds.push(locationId)

    }

    currentDate = date;
    $('#concertDate').text(date);

    displayLocations(locationIds,colors,sizes)
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
function onWorldClick( event ) {
	event.preventDefault();
  if(indicator.visible){
    var locationId = indicator.userData['locationId'];
    eventModel.getLocation(locationId,function(locationInfo){
      $('#addressLocality').text(locationInfo[0]);
      $('#addressCountry').text(locationInfo[1]);

    })
  }
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

  TWEEN.update();

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

      var locationId = layerCloudLocations[index];
      var pointArray    = layerCloud.geometry.getAttribute( 'position' ).array;
      indicator.position.set(pointArray[index*3],pointArray[index*3+1],pointArray[index*3+2])
      indicator.visible = true;
      indicator.userData['locationId'] = locationId
    }else{
      indicator.visible = false;
    }

  }
  controls.update();
  if(config.autorotate){
    pointCloud.rotation.z += .0005;
  }
  camera.updateMatrixWorld();
	raycaster.setFromCamera( mouse, camera );
	renderer.render( scene, camera );
}
