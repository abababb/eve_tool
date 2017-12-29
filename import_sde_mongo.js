var yaml = require('js-yaml')
var fs = require('fs')
var assert = require('assert')
var JSONStream = require('JSONStream')
var es = require('event-stream')
var { MongoClient, Server, Db } = require('mongodb')
// var heapdump = require('heapdump')

var basePath = '/tmp/sde/'

var importYaml = (folder, dbName) => {
  let url = 'mongodb://localhost:27017/' + dbName

  // 读目录下的文件
  fs.readdir(folder, (err, files) => {
    assert.equal(err, null)

    // 转化并导入一个文件
    let importOneFile = (yamlFile) => (resolve, reject) => {
      let doc = yaml.safeLoad(fs.readFileSync(folder + yamlFile, 'utf8'))
      let jsonFile = yamlFile.replace(/\.[^/.]+$/, '.json')
      // 转化成.json文件
      fs.writeFile(folder + jsonFile, JSON.stringify(doc), 'utf8', () => {
        // 读json导入mongo
        MongoClient.connect(url, function (err, db) {
          assert.equal(null, err)
          console.log('开始导入文件：' + yamlFile)
          let collection = yamlFile.replace(/\.[^/.]+$/, '')
          let stream = fs.createReadStream(folder + jsonFile)
            .pipe(JSONStream.parse('*'))
            .pipe(es.map((doc, next) => {
              db.collection(collection).insertOne(doc, next)
            }))
          stream.on('end', () => {
            console.log('成功导入' + collection)
            db.close()
            resolve()
          })
        })
      })
    }

    // 挨个同步处理
    files
      .filter((file) => file.substr(-5) === '.yaml')
      .reduce((seq, file) =>
        seq.then(() => {
          // heapdump.writeSnapshot('/Users/xjz/Downloads/heapdump/' + file + '.heapsnapshot')
          return new Promise(importOneFile(file))
        }), Promise.resolve())
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
      importYaml(basePath + 'bsd/', 'import')
      break
    case 'fsd':
      importYaml(basePath + 'fsd/', 'import_fsd')
      break
    case 'universe':
      importUniverse()
      break
    default:
      console.log('可用命令: clearbsd, clearfsd, bsd, fsd, universe')
      break
  }
}
