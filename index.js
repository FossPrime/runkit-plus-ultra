const SCRIPT_SPECS = [
{ // ES Module
    path: '1.mjs', 
    code: `
import { green, inverse, bgBrightCyan, underline, dim } from 'ansicolor'

// Usage:
async function main () {
    console.log ('foo' + green (inverse (bgLightCyan ('bar')) + 'baz') + 'qux')
    console.log (underline.bright.green ('foo' + dim.red.bgLightCyan ('bar'))) // method chaining
}
main()
`
},
{ // CommonerJS Module
    path: '2.cjs', 
    code: `
const { green, inverse, bgLightCyan, underline, dim } = require ('ansicolor')

console.log ('foo' + green (inverse (bgLightCyan ('bar')) + 'baz') + 'qux')
console.log (underline.bright.green ('foo' + dim.red.bgLightCyan ('bar'))) // method chaining
`
},
{ // TS Module
    path: '3.ts',
    code: `
import { green, inverse, bgLightCyan, underline, dim } from 'ansicolor'

interface User {
  name: string;
  id: number;
}

class UserAccount {
  name: string;
  id: number;

  constructor(name: string, id: number) {
    this.name = name;
    this.id = id;
    console.log ('foo' + green (inverse (bgLightCyan ('bar')) + 'baz') + 'qux')
    console.log (underline.bright.green ('foo' + dim.red.bgLightCyan ('bar'))) // method chaining
  }
}

const user: User = new UserAccount("Murphy", 1);

console.log(user)
console.log(process.argv[1] + '\\n')
`
}
] // END CODE_FILES

// <ESM-POLYFILL> Supports TS, MJS, CJS
const sh = require('shelljs')
const fs = require('fs')
const cm = {
  root: process.cwd(),
  RKNMRegX: /^(.*\d{8,99})(.*)/g,
  shPath: require.resolve('shelljs'),
  nodeModules: '',
  defaultEnv: {
    NODE_OPTIONS: '--no-warnings --loader ts-node/esm/transpile-only'
  }
}
void Object.assign(cm, {
  nodeModules: cm.shPath.replace(cm.RKNMRegX, '$1'),
  myMods: cm.root+'/internal' 
})
const utils = {}
class OmniLoader {
  constructor (argsRaw) {
    const args = argsRaw || { env: {} }
    Object.assign(this, {
      runKitVersion: '',
      vcsVersion: '',
      promise: new Promise((resolve, reject) => resolve()),
      scriptSpecs: [],
      env: cm.defaultEnv
    }, args)
    Object.assign(this.env, args.env)
    sh.exec('ln -s '+cm.nodeModules+' node_modules')
    sh.mkdir('-p', cm.myMods)
    this.prepareTSNode()
  }
  // get promise {}
  static getPkgJson(path) {
    return JSON.parse(fs.readFileSync(`${path}/package.json`).toString())
  }
  static getModVer(path) {
    return utils.getPkgJson(path).version
  }
  static getModRepo(path) { // https://docs.npmjs.com/cli/v7/configuring-npm/package-json#repository
    const repo = utils.getPkgJson(path).repository || {}
    if (typeof repo.url === 'undefined') throw new Error('CANT_READ_MOD_REPO_URL')
    return repo.url
  }
  prepareTSNode() {
    const tsConfig = {
      compilerOptions: {
        "target": "ESnext",
        "module": "ESNext",
        "allowJs": true,
        "moduleResolution": "node",
        "allowSyntheticDefaultImports": true
      }
    }
    fs.writeFileSync('tsconfig.json', JSON.stringify(tsConfig, null, 2))
  }
  loadLatest(modName) {
    const modNMPath = `${cm.nodeModules}/${modName}`
    const modIPath = `${cm.myMods}/${modName}`
    const modRepo = utils.getModRepo(modNMPath)
    sh.exec(`git clone "${modRepo}" "${cm.myMods}/${modName}"`)
    this.vcsVersion = utils.getModVer(modIPath)
    this.runKitVersion = utils.getModVer(modNMPath)
  }
  getScriptSpecs (scriptSpecsRaw) { return scriptSpecsRaw || this.scriptSpecs }
  saveCode(scriptSpecsRaw) {
    for (const spec of this.getScriptSpecs(scriptSpecsRaw)) {
      fs.writeFileSync(spec.path, spec.code)
    }
    console.log(sh.exec(`ls -laht`).stdout)
  }
  getEnvString() {
    const envVars = Object.keys(this.env)
    const resultTokens = []
    for (const envK of envVars) {
      resultTokens.push(`${envK}="${this.env[envK]}"`)
    }
    return resultTokens.join(' ')
  }
  runCode(scriptSpecsRaw) {
    for (const spec of this.getScriptSpecs(scriptSpecsRaw)) {
      fs.writeFileSync(spec.path, spec.code)
      const execRes = sh.exec(`env ${this.getEnvString()} node ${spec.path}`)
      console.log(execRes.stdout + '\n' + execRes.stderr)
    }
  }
}
Object.assign(utils, ((ClassRef) => { // returns static Fn's as Object entries
    const pNames = Object.getOwnPropertyNames(ClassRef)
    // const staticFnNames = pNames.filter(n => typeof ClassRef[n] === 'function')
    const map = pNames.map(n => [n, ClassRef[n]])
    return Object.fromEntries(map)
})(OmniLoader))

const omniLoader = new OmniLoader({ scriptSpecs: SCRIPT_SPECS })
omniLoader.loadLatest('ansicolor')
omniLoader.saveCode()
omniLoader.runCode()
console.log('vcsVersion ' + omniLoader.vcsVersion)
console.log('RunKitVersion ' + omniLoader.runKitVersion)

/*const rawStdout = execSync( // Run any TS, MJS or CJS files laying around
  'find \\( -name \'*.?js\' -o -name \'*.ts\' \\) -maxdepth 2 -print0 | sort -z | xargs -0 -L1 node --loader ts-node/esm/transpile-only', { encoding: 'utf-8' }
)
console.log(rawStdout)*/
// </ESM-POLYFILL>

