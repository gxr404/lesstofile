const { main } = require('../dist/index')
const {getArgs} = require('../dist/util')

const args = getArgs(process.argv)
main(args)