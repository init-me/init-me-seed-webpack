const inquirer = require('inquirer')
const extOs = require('yyl-os')
const fs = require('fs')
const path = require('path')
const rp = require('yyl-replacer')
const print = require('yyl-print')

const SEED_PATH = path.join(__dirname, './seeds')

const lang = {
  QUEATION_SELECT_TYPE: '请选择构建方式',
  QUESTION_NAME: '项目名称',

  TYPE_ERROR: 'env.type 不存在',

  FORMAT_FILE_START: '正在格式化文件',
  FORMAT_FILE_FINISHED: '格式化文件 完成',

  NPM_INSTALL_START: '正在安装依赖',
  NPM_INSTALL_FINISHED: '安装依赖 完成'
}

let initData = {
  name: '',
  type: ''
}

const config = {
  path: './seeds/base',
  hooks: {
    /**
     * seed 包执行前 hooks
     * 可以通过 inquirer 配置成多个 seed 包
     * @param  targetPath: string 复制目标路径 cwd
     * @param  env       : {[argv: string]: string} cmd 参数
     * @return Promise<any>
     * beforeStart({env, targetPath})
     */
    async beforeStart({ env, targetPath }) {
      const questions = []

      // + name
      if (env && env.name) {
        initData.name = env.name
      } else {
        questions.push({
          type: 'input',
          name: 'name',
          default: targetPath.split(/[\\/]/).pop(),
          message: `${lang.QUESTION_NAME}:`
        })
      }
      // - name

      // + type
      const types = fs.readdirSync(SEED_PATH).filter((iPath) => {
        return !(/^\./.test(iPath))
      })
      if (types.length === 1) {
        initData.type = types[0]
      } else {
        if (env && env.type) {
          if (types.indexOf(env.type) !== -1) {
            initData.type = env.type
          } else {
            throw new Error(`${lang.TYPE_ERROR}: ${env.type}`)
          }
        } else {
          questions.push({
            type: 'list',
            name: 'type',
            message: `${lang.QUEATION_SELECT_TYPE}:`,
            default: types[0],
            choices: types
          })
        }
      }
      // - type

      if (questions.length) {
        const r = await inquirer.prompt(questions)
        if (r.name) {
          initData = Object.assign(initData, r)
        }
      }

      config.path = path.join(SEED_PATH, initData.type)
    },
    /**
     * 复制操作前 hooks
     * 可以在此执行重命名，调整模板路径操作
     * @param  fileMap   : {[oriPath: string]: string[]} 复制操作映射表
     * @param  targetPath: string 复制目标路径 cwd
     * @param  env       : {[argv: string]: string} cmd 参数
     * @return Promise<fileMap>
     * beforeCopy({fileMap, targetPath})
     */
    beforeCopy({fileMap, targetPath}) {
      fileMap[path.join(config.path, 'gitignore')] = [
        path.join(targetPath, '.gitignore')
      ]

      fileMap[path.join(config.path, 'npmignore')] = [
        path.join(targetPath, '.npmignore')
      ]

      return Promise.resolve(fileMap)
    },
    /**
     * 复制操作后 hooks
     * 可以在在此执行 项目初始化如 npm install 操作
     * @param  fileMap   : {[oriPath: string]: string[]} 复制操作映射表
     * @param  targetPath: string 复制目标路径 cwd
     * @param  env       : {[argv: string]: string} cmd 参数
     * @return Promise<any>
     * afterCopy({fileMap, targetPath, env })
     */
    async afterCopy({targetPath, env}) {
      if (env.silent) {
        print.log.setLogLevel(0)
      }

      // + format
      print.log.info(lang.FORMAT_FILE_START)
      const rPaths = [
        path.join(targetPath, 'README.md'),
        path.join(targetPath, 'package.json')
      ]
      rPaths.forEach((iPath) => {
        let cnt = fs.readFileSync(iPath).toString()
        fs.writeFileSync(iPath, rp.dataRender(cnt, initData))
        print.log.update(iPath)
      })
      print.log.success(lang.FORMAT_FILE_FINISHED)
      // - format

      // + install
      if (!env || !env.noinstall) {
        print.log.info(lang.NPM_INSTALL_START)
        await extOs.runCMD('npm install', targetPath)
        print.log.success(lang.NPM_INSTALL_FINISHED)
      }
      // - install
    }
  }
}

module.exports = config