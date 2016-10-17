//martin nadal
var renderer, scene, camera, stats;
var locations;          // id:[lat,lng]
var events;             // events {date:[eventId,locationId]}
var pointCloud;         // all locations
var layerCloud;         // highlighted locations
var layerCloudLocations;// [locationIndex ..] tabla de la geometrya de layer
var raycaster;
var mouse = new THREE.Vector2();
var clock;
var indicator;
var controls;
var palette;
var config
var timeoutHandler;
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

	eventModel = new EventsModel('http://gala.muimota.net/gala/')
	//eventModel = new EventsModel('/gala/')

  //load locations
  console.log('loading');

	eventModel.loadTimeline(
    function(){
			var url = eventModel.rootUrl + 'locations'
			$.getJSON( url , function( data ) {
		    console.log('loaded!');
		    locations = data;
		    pointCloud = generatePointcloud(50,locations,2.0,new THREE.Color(255,255,255),0.2)
		  	pointCloud.position.set( 0,0,0 );
		  	scene.add( pointCloud );
		    pointCloud.add(indicator);
				displayConcertsinDate(config.date,config.timeInterval,config.activegenres)
				animate()
		  })
    }
  )


  //GUI
  config = {
    date:'20060101',
    timeInterval:'M',
    autorotate:true,
    autoplay:false,
    genre1:'rock',
    genre2:'---',
		prev:function(){
	    offsetTime(-1,config.timeInterval);
	  },
		next:function(){
	    offsetTime( 1,config.timeInterval);
	  }
  }
  config.activegenres=[config.genre1,config.genre2]

  var gui = new dat.gui.GUI();
  gui.remember(config)
  // Choose from named values

  gui.add(config, 'date').onFinishChange(function(date){
    gotoDate(date);
  }).listen();
	//controle buttons
	gui.add(config, 'next')
	gui.add(config, 'prev')

  gui.add(config, 'timeInterval',{'day':'D','week':'W','month':'M','6month':'H','year':'Y'})
  .onFinishChange(function(){offsetTime(0);})
  gui.add(config, 'autorotate');
  var playController = gui.add(config, 'autoplay').listen();

  //compare genres
  genresFolder = gui.addFolder('genres')
  genresFolder.add(config,
    'genre1',
    ['---','electronic','pop','folk','rock','jazz','hip hop'])
    .onFinishChange(function(){
      config.activegenres = [config.genre1,config.genre2]
      offsetTime(0);
    });
    genresFolder.add(config,
      'genre2',
      ['---','electronic','pop','folk','rock','jazz','hip hop'])
      .onFinishChange(function(){
        config.activegenres = [config.genre1,config.genre2]
        offsetTime(0);
      });
	genresFolder.open()
	//autoplay
  playController.onFinishChange(function(value) {

		if(value == true){

			//@TODO:move to another function

			function nextStep(){
				offsetTime( 1,config.timeInterval,
					function(){
						timeoutHandler = setTimeout(nextStep,2000);
					}
				)
			}

			nextStep()
		}else{
			clearTimeout(timeoutHandler)
		}

	});


  controls = new THREE.OrbitControls(camera,renderer.domElement);;
  controls.enableDamping = true;
	controls.dampingFactor = 0.25;
  controls.enableZoom    = true;

  this.enableKeys        = false;
  this.enablePan         = false;
  this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE};

  function gotoDate(date,callback){

    var i;
    for(var i=0;i<eventModel.timeline.length;i++){
      if(date <= eventModel.timeline[i]){
        break;
      }
    }
    displayConcertsinDate(eventModel.timeline[i],config.timeInterval,config.activegenres,callback);
  }

  function offsetTime(timeDirection,tInterval,callback){


		if(tInterval == undefined){
			timeOffset = 0
		}else if(tInterval == 'Y'){
			timeOffset = 365
		}else if(tInterval == 'H'){
			timeOffset = 180
		}else if(tInterval == 'M'){
			timeOffset = 31
		}else if(tInterval == 'W'){
			timeOffset = 7
		}else {
			timeOffset = 1
		}


		timeOffset *= timeDirection

    var currentDateIndex = Math.min(eventModel.timeline.length,
      Math.max(0,eventModel.timeline.indexOf(config.date)+timeOffset));
    var date = EventsModel.calculateDate(eventModel.timeline[currentDateIndex+timeOffset],config.timeInterval)
    displayConcertsinDate(date,config.timeInterval,config.activegenres,callback);
  }

  //pallete
  pallete     = {'electronic' : new THREE.Color(0x437BC4),
                 'pop'        : new THREE.Color(0xA727C3),
                 'folk'       : new THREE.Color(0xF0E44B),
                 'rock'       : new THREE.Color(0xCF3D58),
                 'jazz'       : new THREE.Color(0xE68E3E),
                 'hip hop'    : new THREE.Color(0x6AC75C)
                }


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
   texture:   { value: THREE.ImageUtils.loadTexture( 'img/particleTexture.png' )}
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


//updates locations in map
function displayLocations(locationsIds,color,size){
	//fade out previus layerCloud
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
function displayConcertsinDate(date,timeInterval,activegenres,callback){

  eventModel.getConcerts(date,timeInterval,activegenres,function(concerts){

    var locationIds = []
    var colors      = []
    var sizes       = []

		//clear UI
		$('#artists').html('')
		$('#addressCountry').html('')
		$('#addressLocality').html('')
    for(var locationId in concerts){
        var concert = concerts[locationId];
        var size  = 5;
        var color = new THREE.Color('black');

        //normalization
        var tagged =  0;
        for(var i=0;i<activegenres.length;i++){
          var musicStyle = activegenres[i]
          if(musicStyle in concert){
              tagged += concert[musicStyle]
							size   += concert[musicStyle]
          }
        }
        if(tagged == 0 ){
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
				//clamp size
				size = Math.min(30,size)

        colors.push(color)
        sizes.push(size)
        locationIds.push(locationId)

    }

    config.date = date;
    $('#concertDate').text(date);
    displayLocations(locationIds,colors,sizes)

		if(callback != undefined){
			callback()
		}

  });
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
    //config.autorotate = false;
    eventModel.getLocationName(locationId,function(locationInfo){
      $('#addressLocality').text(locationInfo[0]);
      $('#addressCountry').text(locationInfo[1]);
    })
		eventModel.getArtists(config.date,config.timeInterval,locationId,function(artists){

			var artistsGenre1 = []
			var artistsGenre2 = []

			if(config.genre1 in artists){
				artistsGenre1 = artists[config.genre1]
			}
			if(config.genre2 in artists){
				artistsGenre2 = artists[config.genre2]
			}
			var artists = artistsGenre1.concat(artistsGenre2)
			//remove duplicates
			//http://stackoverflow.com/a/9229821/2205297
			uniqueArray = artists.filter(function(item, pos) {
    		return artists.indexOf(item) == pos;
			})
			console.log(artists)
			$('#artists').html(artists.join('<br>'))
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
