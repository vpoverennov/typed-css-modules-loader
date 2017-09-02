var path = require('path')
var DtsCreator = require('typed-css-modules')
var loaderUtils = require('loader-utils')
var isThere = require('is-there')
var fs = require('fs')

module.exports = function (source, map) {
  this.cacheable && this.cacheable()
  this.addDependency(this.resourcePath)
  var callback = this.async()

  // Pass on query parameters as an options object to the DtsCreator. This lets
  // you change the default options of the DtsCreator and e.g. use a different
  // output folder.
  var queryOptions = loaderUtils.getOptions(this)
  var options
  var emitFile = true
  if (queryOptions) {
    options = Object.assign({}, queryOptions)
    emitFile = !options.noEmit
    delete options.noEmit
  }

  var creator = new DtsCreator(options)

  // creator.create(..., source) tells the module to operate on the
  // source variable. Check API for more details.
  creator.create(this.resourcePath, source).then(content => {
    if (emitFile) {
      // Emit the created content as well
      this.emitFile(path.relative(this.options.context, content.outputFilePath), content.contents || [''], map)
    }
    dtsContentWriteFile(content, '\n').then(_ => {
      callback(null, source, map)
    })
  })
}

const dtsContentFormat = (dtsContent, eol) => {
  if (!dtsContent.resultList || !dtsContent.resultList.length) return 'export default {};'
  return dtsContent.resultList.join(eol)
}

const dtsContentWriteFile = (dtsContent, eol) => {
  var outPathDir = path.dirname(dtsContent.outputFilePath)
  var content = dtsContentFormat(dtsContent, eol) + eol
  if (!isThere(outPathDir)) {
    mkdirp.sync(outPathDir)
  }
  return new Promise((resolve, reject) => {
    fs.readFile(dtsContent.outputFilePath, 'utf-8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        if (data === content) {
          resolve()
        } else {
          reject()
        }
      }
    })
  }).catch(_ => {
    return new Promise((resolve, reject) => {
      fs.writeFile(dtsContent.outputFilePath, content, 'utf8', (err) => {
        if (err) {
          reject(err)
        } else {
          resolve(dtsContent)
        }
      })
    })
  })
}
