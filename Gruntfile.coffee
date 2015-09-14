path = require 'path'

module.exports = ->
  # Project configuration
  pkg = @file.readJSON 'package.json'

  @initConfig
    pkg: @file.readJSON 'package.json'

    # Schemas
    yaml:
      schemas:
        files: [
          expand: true
          cwd: 'schemata/'
          src: '*.yaml'
          dest: 'schema/'
        ]

    # Building for browser
    browserify:
      options:
        transform: [
          ['coffeeify', {global: true}]
        ]
        browserifyOptions:
          extensions: ['.coffee', '.js']
          ignoreMissing: true
          standalone: 'fbpspec'
      lib:
        files:
          'browser/flowtrace.js': ['src/index.coffee']

    'bower-install-simple':
      deps:
        options:
          interactive: false
          forceLatest: false
          directory: 'bower_components'

    # Browser build of the client lib
    noflo_browser:
      build:
        files:
          'browser/flowtrace.js': ['component.json']

    watch:
      src:
        files: [
          "ui/**/*"
          "src/**/*"
          "examples/**/*"
          "spec/**/*"
        ]
        tasks: "test"
        options:
          livereload: true

    # Web server for the browser tests
    connect:
      server:
        options:
          port: 8000
          livereload: true

    # Coding standards
    yamllint:
      schemas: ['schemata/*.yaml']
      examples: ['examples/*.yml']

    coffeelint:
      components: ['Gruntfile.coffee', 'spec/*.coffee']
      options:
        'max_line_length':
          'level': 'ignore'

    # Tests
    mochaTest:
      nodejs:
        src: ['spec/*.coffee']
        options:
          reporter: 'spec'
          require: 'coffee-script/register'
          grep: process.env.TESTS

    # CoffeeScript compilation of tests
    coffee:
      spec:
        options:
          bare: true
        expand: true
        cwd: 'spec'
        src: '*.coffee'
        dest: 'browser/spec'
        ext: '.js'

    # BDD tests on browser
    mocha_phantomjs:
      all:
        options:
          output: 'test/result.xml'
          reporter: 'spec'
          urls: ['http://localhost:8000/spec/runner.html']

  # Grunt plugins used for building
  #@loadNpmTasks 'grunt-yaml'
  #@loadNpmTasks 'grunt-browserify'
  @loadNpmTasks 'grunt-bower-install-simple'
  @loadNpmTasks 'grunt-noflo-browser'
  @loadNpmTasks 'grunt-contrib-watch'

  # Grunt plugins used for testing
  #@loadNpmTasks 'grunt-yamllint'
  #@loadNpmTasks 'grunt-mocha-phantomjs'
  @loadNpmTasks 'grunt-contrib-coffee'
  @loadNpmTasks 'grunt-mocha-test'
  @loadNpmTasks 'grunt-coffeelint'
  @loadNpmTasks 'grunt-contrib-connect'


  # Grunt plugins used for deploying
  #


  # Our local tasks
  @registerTask 'build', 'Build', (target = 'all') =>
    #@task.run 'yaml'
    @task.run 'noflo_browser'
    @task.run 'bower-install-simple'

  @registerTask 'test', 'Build and run tests', (target = 'all') =>
    @task.run 'coffeelint'
    #@task.run 'yamllint'
    @task.run 'build'
    @task.run 'mochaTest'
    if target != 'nodejs'
      #@task.run 'coffee:spec'
      @task.run 'connect'
      #@task.run 'mocha_phantomjs'

  @registerTask 'default', ['test']

  @registerTask 'dev', 'Developing', (target = 'all') =>
    @task.run 'test'
    @task.run 'watch'
