# lessToFile

- 支持监听目录 less文件 输出 wxss文件或自定义文件后缀名
- 支持@import引入的文件 改动 当前文件父文件也编译

```sh
Description: less to file

Usage: lesstofile [options] [entry]

    -d --dist: 目标目录

    -i --init: 是否初始编译 default=false

    -e --ext: 生成的后缀名 default=wxss

    -w --watch: 是否监听目录 default=true

    -h --help: 查看帮助
```