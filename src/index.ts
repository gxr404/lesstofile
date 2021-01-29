import path from "path";
import fs, { Stats } from "fs";
import chokidar from "chokidar";
import less from "less";
import { logHelp } from "./util";

// const config = {
//   watchDir: path.join(process.cwd(), 'src')
// }

const main = function (options) {
    if (options.help) {
        logHelp()
        return
    }
    const watchPath = options.dist;
    const isWatch = Boolean(options.watch);
    const isInitCompile = Boolean(options.init);
    let isReady = true;
    if (!watchPath || typeof watchPath !== "string") {
        console.error("error: --dist 参数请输入合法的path");
        return;
    }
    const watcher = chokidar.watch(watchPath + "/**/*.less", {
        persistent: isWatch,
        ignoreInitial: false // isInitCompile
    });

    // watcher.on('all', (event, path) => {
    //   console.log(event, path);
    // });

    watcher.on("ready", (...args) => {
        console.log(args);
        isReady = false;
    });

    watcher.on("add", (filePath) => {
        console.log('add')
        compileLess(filePath, isInitCompile, isReady, watchPath);
    });
    watcher.on("change", (filePath) => {
        console.log('change')

        compileLess(filePath, isInitCompile, isReady, watchPath);
    });
};

const importMap = {
    fileName: {
        beImport: [],
        import: [],
    },
};

const compileLess = (filePath, isInitCompile = false, isReady = false, watchPath = '.') => {
    console.log(filePath)
    const isCompile = (isInitCompile && isReady) || !isReady;
    const lessContext = fs.readFileSync(filePath, "utf8");
    const curPathParse = path.parse(filePath);
    
    less.render(lessContext, {paths: [curPathParse.dir]})
        .then((output) => {
    //         // css: string;
    //         // map: string;
    //         // imports: string[];
            if (output.css && isCompile) {
                fs.writeFile(
                    `${curPathParse.dir}/${curPathParse.name}.wxss`,
                    output.css,
                    () => {
                        console.log(`${curPathParse} compile success √`);
                    }
                );
            }
            if (output.imports && Array.isArray(output.imports)) {
                output.imports.forEach((importPath) => {
                    const importAbsPath = path.resolve(
                        curPathParse.dir,
                        importPath
                    );
                    const importMapItem = getImportMapItem(importAbsPath);
                    importMapItem.beImport.push(filePath);
                });
            }
        })
        .catch((err) => {
            console.log(err);
        });
};

const getImportMapItem = (path) => {
    if (!importMap[path]) {
        importMap[path] = {
            beImport: [],
            import: [],
        };
    }
    return importMap[path];
};

// const getAbsolutePath = (curFile = '', relativeFile = '') => {
//   const curPathParse = path.parse(curFile)
//   return path.resolve(curPathParse.dir, relativeFile)
// }

export { main };
