/**
 * 获取参数
 */
type TGetArgs = (argv: Array<any>) => { [key: string]: boolean | string }
const getArgs: TGetArgs = (argv = []) => {
    const rawList = argv.slice(2)
    const optionsKeyReg = /^--(.*)/
    const isOptionsKey = (val) => optionsKeyReg.test(val)
    const args = {}
    let index = 0
    while (index < rawList.length) {
        if (isOptionsKey(rawList[index])) {
            const key = rawList[index].replace(optionsKeyReg, '$1')
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