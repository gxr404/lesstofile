import path from 'path'
import fs from 'fs'
import chokidar from 'chokidar'
import less from 'less'
import { titleCase } from './util'

interface IImportMap {
    [key: string]: {
        /** 被是引用的文件 */
        beImport: Array<string>
        /** 引用的文件 */
        import: Array<string>
    }
}

interface IOptions {
    /** 帮助文档 */
    help: boolean | string
    /** 目标路径 */
    dist: string
    /** 是否监听 */
    watch: boolean | string
    /** 是否初始编译所有文件 */
    init: boolean | string
}

// type TCompileLessCallback = (pathParse: path.ParsedPath, output: Less.RenderOutput) => void
// type TCompileLess = (filePath: string, cb?: TCompileLessCallback) => void

class LessToFile {
    options: IOptions
    importMap: IImportMap = {}
    /** 是否加载完毕 */
    isReady = false
    constructor(options) {
        this.options = options
        if(this.checkArgs()) {
            this.run()
        }
    }

    /**
     * 检查参数是否合法
     */
    checkArgs(): boolean {
        if (this.options.help) {
            this.logHelp()
            return false
        }
        const watchPath = this.options.dist
        if (!watchPath || typeof watchPath !== 'string') {
            console.error('error: --dist 参数请输入合法的path')
            return false
        }
        return true
    }

    run() {
        const watchPath = this.options.dist
        const isWatch = Boolean(this.options.watch)
        if (!watchPath || typeof watchPath !== 'string') {
            console.error('error: --dist 参数请输入合法的path')
            return
        }
        const watcher = chokidar.watch(watchPath + '/**/*.less', {
            persistent: isWatch,
            ignoreInitial: false
        })
        watcher.on('ready', () => {
            this.isReady = true
        })
        watcher.on('add', this.handlerCompile.bind(this))
        watcher.on('change',this.handlerCompile.bind(this))
    }
    /**
     * 打印help
     */
    logHelp() {
        const doc = {
            description: 'less to wxss',
            usage: 'lesstowxss [options] [entry]',
            options: {
                '--dist': '目标目录',
                '--initCompile': '是否初始编译',
                '--ext': '生成的后缀名 default wxss',
                '--help': '查看帮助'
            }
        }
        const logItem = (key = '', data = {}, indent = 0) => {
            const indentText = Array(indent).fill(' ').join('')
            console.log(`${indentText}${titleCase(key)}: ${data[key]}`)
            console.log()
        }
        const log = (data, indent = 0) => {
            const docKey = Object.keys(data)
            docKey.forEach((key) => {
                if (typeof data[key] === 'object' && data[key] !== null) {
                    log(data[key], 4)
                } else {
                    logItem(key, data, indent)
                }
            })
        }
        log(doc)
    }

    /**
     * 编译less
     */
    compileLess(filePath, cb) {
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

    getImportMapItem(filePath) {
        if (!this.importMap[filePath]) {
            this.importMap[filePath] = {
                beImport: [],
                import: [],
            }
        }
        return this.importMap[filePath]
    }

    handlerCompile(filePath) {
        const isInitCompile = Boolean(this.options.init)
        const isCompile = (isInitCompile && this.isReady) || this.isReady
        this.compileLess(filePath, (pathParse, output) => {
            const currentImportMapItem = this.getImportMapItem(filePath)
            if (output.css && isCompile) {
                fs.writeFile(
                    `${pathParse.dir}/${pathParse.name}.wxss`,
                    output.css,
                    () => {
                        console.log(`√ ${filePath} compile success `)
                    }
                )
            }
            const isValidImports = Array.isArray(output.imports) && output.imports.length > 0
            if (!this.isReady &&isValidImports) {
                currentImportMapItem.import = currentImportMapItem.import.concat(currentImportMapItem.import, output.imports)
                output.imports.forEach((importPath) => {
                    const importMapItem = this.getImportMapItem(importPath)
                    importMapItem.beImport.push(filePath)
                })
            }

            // 有被引用的文件时需编译引用的文件
            if (this.isReady && currentImportMapItem.beImport.length > 0) {
                this.dependentHandler(currentImportMapItem.beImport)
            }
        })
    }
    /**
     * 依赖处理
     */
    dependentHandler(beImport=[]) {
        beImport.forEach((beImportPath) => {
            this.compileLess(beImportPath, (pathParse, output) => {
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
}

const main = (options) => {
    new LessToFile(options)
}

export { main }
