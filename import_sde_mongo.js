var yaml = require('js-yaml')
var fs = require('fs')
var MongoClient = require('mongodb').MongoClient
var assert = require('assert')

var basePath = '/tmp/sde/'

var bsdFolder = basePath + 'bsd/'
var fsdFolder = basePath + 'fsd/'

var importBsd = function () {
  // Connection URL
  var url = 'mongodb://localhost:27017/import'

  fs.readdir(bsdFolder, (err, files) => {
    assert.equal(err, null)
    files.forEach(file => {
      // Use connect method to connect to the server
      MongoClient.connect(url, function (err, db) {
        assert.equal(null, err)

        console.log('开始导入文件：' + file)

        // Get document, or throw exception on error
        var doc = yaml.safeLoad(fs.readFileSync(bsdFolder + file, 'utf8'))

        var collectionName = file.replace(/\.[^/.]+$/, '')
        db.collection(collectionName).insertMany(doc
          , function (err, result) {
            assert.equal(err, null)
            db.close()
          })
      })
    })
  })
}

var importFsd = function () {
  // Connection URL
  var url = 'mongodb://localhost:27017/import_fsd'

  var yamlFiles = []
  var files = fs.readdirSync(fsdFolder)
  files.forEach(function (file) {
    if (file === 'landmarks') {
      var landmarkFiles = fs.readdirSync(fsdFolder + file)
      landmarkFiles.forEach(file => {
        yamlFiles.push('landmarks/' + file)
      })
    } else if (file === 'universe') {
    } else {
      yamlFiles.push(file)
    }
  })

  yamlFiles.forEach(function (file) {
    // Get document, or throw exception on error
    var doc = yaml.safeLoad(fs.readFileSync(fsdFolder + file, 'utf8'))

    var collectionName = file.replace(/\.[^/.]+$/, '')

    // Use connect method to connect to the server
    MongoClient.connect(url, function (err, db) {
      assert.equal(null, err)

      console.log('开始导入文件：' + file)

      var insertArr = doc
      if (!Array.isArray(doc)) {
        insertArr = []
        for (const prop in doc) {
          if (doc.hasOwnProperty(prop)) {
            doc[prop].id = prop
            insertArr.push(doc[prop])
          }
        }
      }

      db.collection(collectionName).insertMany(insertArr
        , function (err, result) {
          assert.equal(err, null)
          db.close()
        })
    })
  })
}

var importUniverse = function () {
  // Connection URL
  var url = 'mongodb://localhost:27017/import_fsd'

  var universePath = fsdFolder + 'universe/'
  var universeTypes = fs.readdirSync(universePath)
  var doc = []
  doc.push({
    name: 'universe',
    parent: null,
    type: 'universe',
    data: null
  })
  universeTypes.forEach(function (universeType) {
    let universeTypePath = universePath + universeType + '/'
    doc.push({
      name: universeType,
      parent: 'universe',
      data: null,
      type: 'universe_type'
    })
    var regions = fs.readdirSync(universeTypePath)
    regions.forEach(function (region) {
      let regionPath = universeTypePath + region + '/'
      var constellations = fs.readdirSync(regionPath)
      var regionDataFile = 'region.staticdata'
      var regionData = yaml.safeLoad(fs.readFileSync(regionPath + regionDataFile, 'utf8'))
      doc.push({
        name: region,
        parent: universeType,
        data: regionData,
        type: 'region'
      })
      constellations.splice(constellations.indexOf(regionDataFile), 1)
      constellations.forEach(function (constellation) {
        let constellationPath = regionPath + constellation + '/'
        var solarsystems = fs.readdirSync(constellationPath)
        var constellationDataFile = 'constellation.staticdata'
        var constellationData = yaml.safeLoad(fs.readFileSync(constellationPath + constellationDataFile, 'utf8'))
        doc.push({
          name: constellation,
          parent: region,
          data: constellationData,
          type: 'constellation'
        })
        solarsystems.splice(solarsystems.indexOf(constellationDataFile), 1)
        solarsystems.forEach(function (solarsystem) {
          let solarsystemPath = constellationPath + solarsystem + '/'
          var solarsystemDataFile = 'solarsystem.staticdata'
          var solarsystemData = yaml.safeLoad(fs.readFileSync(solarsystemPath + solarsystemDataFile, 'utf8'))
          doc.push({
            name: solarsystem,
            parent: constellation,
            data: solarsystemData,
            type: 'solarsystem'
          })
        })
      })
    })
  })

  // Use connect method to connect to the server
  MongoClient.connect(url, function (err, db) {
    assert.equal(null, err)

    console.log('开始导入文件：universe')

    db.collection('universe').insertMany(doc
      , function (err, result) {
        assert.equal(err, null)
        db.close()
      })
  })
}

// importBsd()
// importFsd()
importUniverse()
