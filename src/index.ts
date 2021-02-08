import path from 'path'
import fs from 'fs'
import chokidar from 'chokidar'
import less from 'less'
import { titleCase, getArgs } from './util'
import Loading from './Loading'

interface AnyObject {
    [key: string]: any
}

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
    /** 输出文件后缀名 */
    ext: string
    /** 是否监听 */
    watch: boolean | string
    /** 是否初始编译所有文件 */
    init: boolean | string
}

interface TCompileLessCallbackRes {
    pathParse: path.ParsedPath
    output: Less.RenderOutput
}

type TCompileLessCallback = (err: Less.RenderError | null, cb?: TCompileLessCallbackRes) => void

class LessToFile {
    options: Partial<IOptions>
    importMap: IImportMap = {}
    /** 是否加载完毕 */
    isReady = false
    /** 加载阶段中的error */
    readyErrList: Array<Less.RenderError> = []

    constructor(options: Partial<IOptions>) {
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
        const loading = new Loading()
        const isInitCompile = Boolean(this.options.init)
        if (!isInitCompile) loading.show('扫描中...')

        const watchPath = this.options.dist
        const isWatch = this.options.watch !== 'false'

        // 默认输出wxss文件
        if (typeof this.options.ext !== 'string') {
            this.options.ext = 'wxss'
        }

        const watcher = chokidar.watch(watchPath + '/**/*.less', {
            persistent: isWatch,
            ignoreInitial: false
        })

        watcher.on('ready', () => {
            if (!isInitCompile) {
                loading.hide('√ 扫描完毕 \(^o^)/~ \n')
            } else {
                console.log('√ 初始化编译完成')
            }
            this.isReady = true
            if (this.readyErrList.length) {
                this.readyErrList.forEach((err)=> this.errorHandler(err))
                this.readyErrList = []
            }
        })
        watcher.on('add', this.compileHandler.bind(this))
        watcher.on('change',this.compileHandler.bind(this))
    }

    /**
     * 打印help
     */
    logHelp() {
        const doc = {
            description: 'less to wxss',
            usage: 'lesstowxss [options] [entry]',
            options: {
                '-d --dist': '目标目录',
                '-i --init': '是否初始编译 default=false',
                '-e --ext': '生成的后缀名 default=wxss',
                '-w --watch': '是否监听目录 default=true',
                '-h --help': '查看帮助'
            }
        }
        const logItem = (key = '', data: AnyObject = {}, indent = 0) => {
            const indentText = Array(indent).fill(' ').join('')
            console.log(`${indentText}${titleCase(key)}: ${data[key]}`)
            console.log()
        }
        const log = (data: AnyObject, indent = 0) => {
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
    compileLess(filePath: string, cb: TCompileLessCallback) {
        const pathParse = path.parse(filePath)
        const lessContext = fs.readFileSync(filePath, 'utf8')
        const lessRenderOption: Less.Options = {
            filename: filePath,
            paths: [pathParse.dir],
            math: 'always',
            compress: false,
            ieCompat: true,
            strictUnits: true,
            javascriptEnabled: true
        }
        less.render(lessContext, lessRenderOption)
            .then((output) => {
                cb(null, {pathParse, output})
            })
            .catch((err) => cb(err))
    }

    getImportMapItem(filePath: string) {
        if (!this.importMap[filePath]) {
            this.importMap[filePath] = {
                beImport: [],
                import: [],
            }
        }
        return this.importMap[filePath]
    }

    /**
     * 编译处理
     */
    compileHandler(filePath: string) {
        const isInitCompile = Boolean(this.options.init)
        const isCompile = (isInitCompile && !this.isReady) || this.isReady
        this.compileLess(filePath, (err, compileRes) => {
            if (err) {
                this.errorHandler(err)
                return
            }
            const { pathParse, output } = compileRes
            const currentImportMapItem = this.getImportMapItem(filePath)
            if (output.css && isCompile) {
                fs.writeFile(
                    `${pathParse.dir}/${pathParse.name}.${this.options.ext}`,
                    output.css,
                    () => {
                        console.log(`√ compile success: ${filePath}`)
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
    dependentHandler(beImport: Array<string> = []) {
        beImport.forEach((beImportPath) => {
            this.compileLess(beImportPath, (err, compileRes) => {
                if (err) {
                    this.errorHandler(err)
                    return
                }
                const { pathParse, output } = compileRes
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

    /**
     * 错误处理
     * @param err
     */
    errorHandler(err: Less.RenderError) {
        // 扫描阶段 的错误 push到readyErrList
        if (!this.isReady) {
            this.readyErrList.push(err)
            return
        }
        console.error(`× Error: ${err.filename}:${err.line}:${err.column}`)
        console.error(` --${err.message}\n`)
    }

}

const main = (options: Array<string>) => {
    const args = getArgs(options)
    new LessToFile(args as Partial<IOptions>)
}

export { main }
