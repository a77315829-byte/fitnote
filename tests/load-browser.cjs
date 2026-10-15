const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const vm=require('node:vm');
module.exports=function(file,globalName){const sandbox={module:{exports:{}},console};vm.runInNewContext(readFileSync(resolve(__dirname,'../public',file),'utf8'),sandbox,{filename:file});return sandbox.module.exports;};
