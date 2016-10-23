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
var indicator
var persistentIndicator
var controls;
var clock;               // a clock
var lastControlTime      //
var angularSpeed,maxAngularSpeed
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
  camera.position.set(100,0,100)
  camera.lookAt(new THREE.Vector3(0,0,0));

	particleTexture = new THREE.TextureLoader().load('img/particleTexture.png');
	//eventModel = new EventsModel('http://gala.muimota.net/gala/')
	eventModel = new EventsModel('/gala/')

  //load locations
  console.log('loading');


			var url = eventModel.rootUrl + 'locations'
			$.getJSON( url , function( data ) {
		    locations = data;
		    pointCloud = generatePointcloud(50,locations,2.0,new THREE.Color(255,255,255),0.2)
		  	pointCloud.position.set( 0,0,0 );
		  	scene.add( pointCloud );
		    pointCloud.add(indicator)
				pointCloud.add(persistentIndicator)
				//@TODO:mal hace que depende
				$('.cover').fadeOut()
				displayConcertsinDate(config.date,config.timeInterval,config.activegenres)
				animate()
		  })

  //GUI
  config = {
    date:'20160601',
    timeInterval:'M',
    autorotate:false,
    autoplay:false,
    activegenres:['rock'],
		prev:function(){
	    offsetTime(-1,config.timeInterval);
	  },
		next:function(){
	    offsetTime( 1,config.timeInterval);
	  }
  }

	clock = new THREE.Clock();
	lastControlTime = -1000
	angularSpeed = 0
	maxAngularSpeed = 0.0008
  controls = new THREE.OrbitControls(camera,renderer.domElement)
  controls.enableDamping = true;
	controls.dampingFactor = 0.25;

	controls.minDistance 	= 60;
	controls.maxDistance 	= 300;
	controls.zoomSpeed 				= 0.1;
  controls.enableZoom    = true;

	controls.rotateSpeed = .1
  controls.enableKeys        = false;
  controls.enablePan         = false;
  controls.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE};



}

//offset time certain magnitude of a timemagnited
//E.g timeMagnitude = 5 , timeInterva = EventsModel.weekInterval = 5Weeks in future
  function offsetTime(timeMagnitude,timeInterval,callback){


		var date = EventsModel.parseDate(config.date)

		if(timeInterval == EventsModel.weekInterval){
			date.setDate(date.getDate()+7*timeMagnitude)
		}else if(timeInterval == EventsModel.monthInterval){
			date.setMonth(date.getMonth()+1*timeMagnitude)
		}else if(timeInterval == EventsModel.halfYearInterval){
			date.setMonth(date.getMonth()+6*timeMagnitude)
		}else{
			date.setDate(date.getDate()+timeMagnitude)
		}

		var dateStr = ''+date.getFullYear()+('0'+(date.getMonth()+1)).slice(-2)+
	  ('0'+date.getDate()).slice(-2)

		config.date = EventsModel.calculateDate(dateStr,timeInterval)

		displayConcertsinDate(config.date,config.timeInterval,config.activegenres,callback);
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
  var material = new THREE.MeshBasicMaterial( {color: 0xffffff,
    depthTest: false,transparent:true} );
  indicator = new THREE.Mesh( geometry, material )
  indicator.visible = false

	persistentIndicator = new THREE.Mesh( geometry, material )
	persistentIndicator.visible = false



//
	raycaster = new THREE.Raycaster();
	raycaster.params.Points.threshold = 2.0;

	window.addEventListener( 'resize', onWindowResize, false );
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
  $('#container>canvas').bind('touchstart click',onWorldClick);


//project latitude longitude into a sphere

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
   texture:   { value: particleTexture}
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
//performs the transition between the two datapoints
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
		if(persistentIndicator.visible){
			var locationId = persistentIndicator.userData['locationId']
			showArtists(date,timeInterval,locationId)
		}
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
				size = Math.min(30,size*1.2)

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
	raycasterUpdate();
	lastControlTime = clock.getElapsedTime()

  if(indicator.visible){

		config.autoplay = false
    var locationId = indicator.userData['locationId'];

		//if persistentIndicator was enabled we want to hide
		//it if the user click again over it

		if(persistentIndicator.visible == true &&
			persistentIndicator.userData['locationId'] ==
			indicator.userData['locationId']){
			persistentIndicator.visible = false
			$('#addressLocality').fadeOut()
			$('#addressCountry').fadeOut()
			$('#artists').fadeOut()
			return
		}

		persistentIndicator.position.copy(indicator.position)
		persistentIndicator.userData['locationId'] = indicator.userData['locationId'];
		persistentIndicator.visible = true
    //config.autorotate = false;
    eventModel.getLocationName(locationId,function(locationInfo){

      $('#addressLocality').fadeOut(
				function(){
					$(this).text(locationInfo[0]).fadeIn()
				})
      $('#addressCountry').fadeOut(
				function(){
					$(this).text(locationInfo[1]).fadeIn()
				})

    })
		showArtists(config.date,config.timeInterval,locationId)

  }
}



function showArtists(date,timeInterval,locationId){

	eventModel.getArtists(date,timeInterval,locationId,function(artists){

		var auxArtists    = []
		for(var i = 0;i<config.activegenres.length;i++){
			var genre = config.activegenres[i]
			var genreArtists = []
			if(genre in artists){
				genreArtists = artists[genre]
			}
			for(var j= 0;j<genreArtists.length;j++){
				var genreArtist = genreArtists[j]
				if(auxArtists.indexOf(genreArtist) == -1){
					auxArtists.push(genreArtist)
				}
			}
		}

		artists = auxArtists
		console.log(artists)
		if(artists.length > 10){
			//number of artists that don't fit
			var uncreditedArtists = '(+' + (artists.length-5) + ')'
			artists = artists.slice(0,10)
			artists.push(uncreditedArtists)
		}
		$('#artists').fadeOut(
			function(){
				$(this).text(artists.join(', ')).fadeIn()
			})

	})
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

function raycasterUpdate(){

	if(layerCloud != undefined){

		var intersection = raycaster.intersectObject( layerCloud );

		//show indicator over the closest city to the mouse
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

}

function render() {

  TWEEN.update();

  raycasterUpdate()
  controls.update()

	if(config.autorotate){
		if(angularSpeed < maxAngularSpeed)
			angularSpeed = Math.min(angularSpeed + 0.000005,maxAngularSpeed)
	}else{
		angularSpeed = Math.max(angularSpeed - 0.000005,0)
	}

	pointCloud.rotation.z += angularSpeed


	camera.updateMatrixWorld();
	raycaster.setFromCamera( mouse, camera );
	renderer.render( scene, camera );
}
