interface AnyObject {
    [key: string]: any
}

/**
 * 获取参数
 */
type TGetArgs = (argv: Array<any>) => { [key: string]: boolean | string }
const getArgs: TGetArgs = (argv = []) => {
    const rawList = argv.slice(2)
    const optionsKeyReg = /^(--|-)(.*)/
    const isOptionsKey = (val: string) => optionsKeyReg.test(val)
    const args: AnyObject = {}
    let index = 0
    const aliasMap = {
        d: 'dist',
        h: 'help',
        e: 'ext',
        w: 'watch',
        i: 'init'
    }
    while (index < rawList.length) {
        if (isOptionsKey(rawList[index])) {
            const key: string = (rawList[index] as string).replace(optionsKeyReg, (match, p1, p2, offset, string) => {
                if (p1 === '-') {
                    return aliasMap[p2 as keyof typeof aliasMap] || p2
                }
                return p2 || ''
            })
            index += 1
            let value: boolean | string = true
            if (rawList[index] && !isOptionsKey(rawList[index])) {
                value = rawList[index]
                index += 1
            }
            args[key] = value
        } else {
            index += 1
        }
    }
    return args
}

/**
 * 首字母大写
 */
type TTitleCase = (str: string) => string
const titleCase: TTitleCase = (str) => str.replace(
    /^([a-z])(.*)/g,
    (match, p1, p2, offset, string) => {
        if(match) return `${p1.toLocaleUpperCase()}${p2}`
        return string
    }
)

export {
    getArgs,
    titleCase
}