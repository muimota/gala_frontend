module.exports = function(grunt) {

    // 1. All configuration goes here
    grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),

      connect: {
        server: {
          options: {
            base: 'dist/'
          },

        }
      },

      watch:{
        options: {
          livereload: true,
        },
        html:{
          files:['src/*.html','src/includes/*.html'],
          tasks:['copy']
        },
        rest:{
          files:['src/js/**/*.js','src/css/*','src/img/*'],
          tasks:['copy']
        }
      },

      copy: {
        main: {
          files: [
            {src: 'js/**/*.js', dest: 'dist/', expand: true, cwd: 'src/'},
            {src: '*', dest: 'dist/data/', expand: true, cwd: 'src/data'},
            {src: '*', dest: 'dist/img/', expand: true, cwd: 'src/img'},
            {src: '**/*', dest: 'dist/css/', expand: true, cwd: 'src/css'},
            {src: '*.html', dest: 'dist/', expand: true, cwd: 'src/'},
            {src:
              ['jquery/dist/jquery.min.js',
              'three.js/build/three.min.js',
              'three.js/examples/js/controls/OrbitControls.js',
              'tween.js/src/Tween.js',
              'dat.gui/build/*',
              'bootstrap/dist/**',
              'flat-ui/**'
            ]
              , dest: 'dist/libs/', expand: true, cwd: 'bower_components'},
          ],
        },
      },
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask('default',['copy']);
    grunt.registerTask('server',['copy','connect','watch']);

}
