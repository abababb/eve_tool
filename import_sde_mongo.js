var yaml = require('js-yaml')
var fs = require('fs')
var assert = require('assert')
var MongoClient = require('mongodb').MongoClient
var Db = require('mongodb').Db
var Server = require('mongodb').Server
var heapdump = require('heapdump')
var streamToMongoDB = require('stream-to-mongo-db').streamToMongoDB
var JSONStream = require('JSONStream')

var basePath = '/tmp/sde/'

var importBsd = function () {
  let url = 'mongodb://localhost:27017/import'
  let bsdFolder = basePath + 'bsd/'
  heapdump.writeSnapshot((err, filename) => {
    assert.equal(null, err)
    console.log('dump written to', filename)
  })

  // 读目录下的文件
  fs.readdir(bsdFolder, (err, files) => {
    assert.equal(err, null)
    let importOneFile = (file) => (resolve, reject) => {
      MongoClient.connect(url, function (err, db) {
        assert.equal(null, err)
        console.log('开始导入文件：' + file)

        let doc = yaml.safeLoad(fs.readFileSync(bsdFolder + file, 'utf8'))
        db.collection(file.replace(/\.[^/.]+$/, '')).insertMany(doc,
          (err, result) => {
            assert.equal(err, null)
            db.close()
            console.log('文件' + file + '导入完成')
            resolve()
          })
      })
    }

    // 挨个同步导入文件
    files.reduce((seq, file) =>
      seq.then(() => {
        return new Promise(importOneFile(file))
      }), Promise.resolve())
  })
}

var yamlToJson = () => {
  let file = 'invNames.yaml'
  let bsdFolder = basePath + 'bsd/'
  let doc = yaml.safeLoad(fs.readFileSync(bsdFolder + file, 'utf8'))
  let jsonFileName = bsdFolder + file.replace(/\.[^/.]+$/, '.json')
  fs.writeFile(jsonFileName, JSON.stringify(doc), 'utf8', () => console.log('done'))
}

var importStream = () => {
  let url = 'mongodb://localhost:27017/import'
  let file = 'invNames.json'
  let collectionName = file.replace(/\.[^/.]+$/, '')
  let outputDBConfig = {dbURL: url, collection: collectionName}
  let bsdFolder = basePath + 'bsd/'

  let writableStream = streamToMongoDB(outputDBConfig)

  let stream = fs.createReadStream(bsdFolder + file)
    .pipe(JSONStream.parse('*'))
    .pipe(writableStream)

  stream.on('finish', () => console.log('done'))
}

var importFsd = function () {
  let fsdFolder = basePath + 'fsd/'
  let url = 'mongodb://localhost:27017/import_fsd'
  fs.readdir(fsdFolder, (err, files) => {
    assert.equal(err, null)
    let yamlFiles = []
    files.forEach(function (file) {
      if (file === 'landmarks') {
        let landmarkFiles = fs.readdirSync(fsdFolder + file)
        landmarkFiles.forEach(file => {
          yamlFiles.push('landmarks/' + file)
        })
      } else if (file === 'universe') {
      } else {
        yamlFiles.push(file)
      }
    })

    yamlFiles.reduce((seq, file) => {
      return seq.then(() =>
        new Promise((resolve, reject) => {
          let doc = yaml.safeLoad(fs.readFileSync(fsdFolder + file, 'utf8'))
          let collectionName = file.replace(/\.[^/.]+$/, '')

          MongoClient.connect(url, function (err, db) {
            assert.equal(null, err)
            console.log('开始导入文件：' + file)

            let insertArr = doc
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
                console.log('文件' + file + '导入完成')
                resolve()
              })
          })
        })
      )
    }, Promise.resolve())
  })
}

var importUniverse = function () {
  let fsdFolder = basePath + 'fsd/'
  let url = 'mongodb://localhost:27017/import_fsd'

  let universePath = fsdFolder + 'universe/'
  let universeTypes = fs.readdirSync(universePath)
  let doc = []
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
    let regions = fs.readdirSync(universeTypePath)
    regions.forEach(function (region) {
      let regionPath = universeTypePath + region + '/'
      let constellations = fs.readdirSync(regionPath)
      let regionDataFile = 'region.staticdata'
      let regionData = yaml.safeLoad(fs.readFileSync(regionPath + regionDataFile, 'utf8'))
      doc.push({
        name: region,
        parent: universeType,
        data: regionData,
        type: 'region'
      })
      constellations.splice(constellations.indexOf(regionDataFile), 1)
      constellations.forEach(function (constellation) {
        let constellationPath = regionPath + constellation + '/'
        let solarsystems = fs.readdirSync(constellationPath)
        let constellationDataFile = 'constellation.staticdata'
        let constellationData = yaml.safeLoad(fs.readFileSync(constellationPath + constellationDataFile, 'utf8'))
        doc.push({
          name: constellation,
          parent: region,
          data: constellationData,
          type: 'constellation'
        })
        solarsystems.splice(solarsystems.indexOf(constellationDataFile), 1)
        solarsystems.forEach(function (solarsystem) {
          let solarsystemPath = constellationPath + solarsystem + '/'
          let solarsystemDataFile = 'solarsystem.staticdata'
          let solarsystemData = yaml.safeLoad(fs.readFileSync(solarsystemPath + solarsystemDataFile, 'utf8'))
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

var clearDb = function (dbName) {
  let server = new Server('localhost', 27017)
  let db = new Db(dbName, server)
  db.open((err, db) => {
    assert.equal(err, null)
    db.dropDatabase((err, result) => {
      assert.equal(err, null)
      if (result) {
        console.log('成功清空' + dbName)
      }
      db.close()
    })
  })
}

var arg = process.argv[2]

if (arg) {
  switch (arg) {
    case 'clearbsd':
      clearDb('import')
      break
    case 'clearfsd':
      clearDb('import_fsd')
      break
    case 'bsd':
      importStream()
      // importBsd()
      break
    case 'fsd':
      importFsd()
      break
    case 'universe':
      importUniverse()
      break
    default:
      break
  }
}
