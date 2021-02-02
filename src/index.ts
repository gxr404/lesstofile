import path from 'path'
import fs, { Stats } from 'fs'
import chokidar from 'chokidar'
import less from 'less'
import { logHelp } from './util'
import { type } from 'os'

// const config = {
//   watchDir: path.join(process.cwd(), 'src')
// }
interface IImportMap {
    [key: string]: {
        /** 被是引用的文件 */
        beImport: Array<string>
        /** 引用的文件 */
        import: Array<string>
    }
}
const importMap: IImportMap = {}


interface IOptions {
    /** 帮助文档 */
    help: boolean
    /** 目标路径 */
    dist: string
    /** 是否监听 */
    watch: boolean
    /** 是否初始编译所有文件 */
    init: boolean
}

const main = function (options: IOptions) {
    if (options.help) {
        logHelp()
        return
    }
    const watchPath = options.dist
    const isWatch = Boolean(options.watch)
    const isInitCompile = Boolean(options.init)
    let isReady = false
    if (!watchPath || typeof watchPath !== 'string') {
        console.error('error: --dist 参数请输入合法的path')
        return
    }
    const watcher = chokidar.watch(watchPath + '/**/*.less', {
        persistent: isWatch,
        ignoreInitial: false // isInitCompile
    })

    // watcher.on('all', (event, path) => {
    //   console.log(event, path)
    // })

    watcher.on('ready', (...args) => {
        isReady = true
        console.log(JSON.stringify(importMap, null, 4))
    })

    watcher.on('add', (filePath) => {
        handler(filePath, isInitCompile, isReady)
    })
    watcher.on('change', (filePath) => {
        handler(filePath, isInitCompile, isReady)
    })
}

/**
 * 依赖处理
 */
const dependentHandler = (beImport=[]) => {
    beImport.forEach((beImportPath) => {
        console.log('map')
        compileLess(beImportPath, (pathParse, output) => {
            fs.writeFile(
                `${pathParse.dir}/${pathParse.name}.wxss`,
                output.css,
                () => {
                    console.log(`-- √ 被引用编译: ${beImportPath} compile success `)
                }
            )
        })
    })
}

const handler = (filePath, isInitCompile = false, isReady = true) => {
    const isCompile = (isInitCompile && isReady) || isReady
    compileLess(filePath, (pathParse, output) => {
        const currentImportMapItem = getImportMapItem(filePath)
        if (output.css && isCompile) {
            fs.writeFile(
                `${pathParse.dir}/${pathParse.name}.wxss`,
                output.css,
                () => {
                    console.log(`√ ${filePath} compile success `)
                }
            )
        }
        if (!isReady && Array.isArray(output.imports) && output.imports.length > 0) {
            currentImportMapItem.import = currentImportMapItem.import.concat(currentImportMapItem.import, output.imports)
            output.imports.forEach((importPath) => {
                const importMapItem = getImportMapItem(importPath)
                importMapItem.beImport.push(filePath)
            })
        }

        // 有被引用的文件时需编译引用的文件
        if (isReady && currentImportMapItem.beImport.length > 0) {
            dependentHandler(currentImportMapItem.beImport)
        }
    })
}




type TCompileLessCallback = (pathParse: path.ParsedPath, output: Less.RenderOutput) => void
type TCompileLess = (filePath: string, cb?: TCompileLessCallback) => void
const compileLess: TCompileLess = (filePath, cb) => {
    const pathParse = path.parse(filePath)
    const lessContext = fs.readFileSync(filePath, 'utf8')
    const lessRenderOption = { paths: [pathParse.dir] }
    less.render(lessContext, lessRenderOption)
        .then((output) => {
            if (typeof cb === 'function') {
                cb(pathParse, output)
            }
        })
        .catch((err) => {
            console.error(err)
        })
}

const getImportMapItem = (path) => {
    if (!importMap[path]) {
        importMap[path] = {
            beImport: [],
            import: [],
        }
    }
    return importMap[path]
}

// const getAbsolutePath = (curFile = '', relativeFile = '') => {
//   const curPathParse = path.parse(curFile)
//   return path.resolve(curPathParse.dir, relativeFile)
// }

export { main }
