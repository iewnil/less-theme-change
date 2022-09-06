
const fs = require('fs');
const path = require('path');

/**
 * 递归解析 less样式文件，打平输出为一个文件
 * @param {String} filePath less 样式文件路径
 * @param {String} nodeModulesPath 第三方模块真实存放路径
 * @returns
 */
function bundleLessTheme (filePath, nodeModulesPath) {
  // 缓存路径，防止重复导入
  const cacheImportPath = {};
  // 缓存变量信息（第一次出现的值value 和 与第一次值不同的出现次数）映射，例如：{ '@xxx-xxx': { value: 'xxx', diffCount: xx }  }
  const varsMapping = {};
  // TODO: 预留，记录每个文件的变量信息映射，例如：  { 'xx/xx/xx.less': fileVars }
  const filesVarsMapping = {};

  function bundleTheme (filePath) {
    // 例如：{ '@xxx-xxx': { originName: '@xxx-xxx', value: 'xxx' }  }
    const fileVarsMapping = {};
    // 读取文件内容
    const fileContent = fs.readFileSync(filePath) || '';
    const fileContentStr = fileContent.toString();
    // 获取文件所在目录
    const fileDirectory = path.dirname(filePath);
    // 按行切分文件内容，放入数组
    const fileContentLineArr = fileContentStr.split('\n');
    // 解析数组，并拼接最终的文件内容
    const finalFileContentStr = fileContentLineArr
      .map((line) => {

        // 匹配 less 变量
        const lessVarsDefineMatch = /^@(.*):(.*);/;
        if (lessVarsDefineMatch.test(line)) {
          const [, key = '', value = ''] = line.match(lessVarsDefineMatch);
          const keyTrim = key?.trim();
          const valueTrim = value?.trim();

          if (keyTrim && valueTrim) {
            
            // 缓存第一次出现的 less 变量值
            if (!varsMapping[keyTrim]) {
              varsMapping[keyTrim] = {
                value: valueTrim,
                diffCount: 0,
              }
              return line;
            }

            // 非第二次出现，但值相同
            if (valueTrim === varsMapping[keyTrim]) {
              return line;
            }

            // 值不同，在文件变量映射中记录并生成新的变量名
            //（TODO: 改名字容易，但是万一出现，这个名字的定义，被其他引用这个文件的文件里引用了，还要分析出所有直接引用或者间接引用这个文件的文件）
            let newLine = line;
            varsMapping[keyTrim].diffCount += 1;
            const newVarName = `${keyTrim}-${varsMapping[keyTrim].diffCount}`;
            fileVarsMapping[newVarName] = {
              originName: keyTrim,
              value: valueTrim,
            }
            newLine = newLine.replace(keyTrim, newVarName)
            filesVarsMapping[filePath] = fileVarsMapping;

            return newLine;
          }
          return line;
        }

        // 导入路径
        if (line.trimStart().startsWith('@import')) {
          // 具体路径
          let importPath = line.match(/@import[^'"]*['"](.*)['"]/)[1];

          // 检查路径是否以 less 结尾
          if (!importPath.endsWith('.less')) {
            importPath += '.less';
          }

          // 检查路径是否携带 less 变量，有则使用 less 变量值替换
          const lessVarsUsedMatch = /@{([A-Za-z\d-]*)}/g;
          if(lessVarsUsedMatch.test(line)) {
            const usedVars = importPath.match(lessVarsUsedMatch);
            usedVars.forEach((usedVar) => {
              const key = usedVar.replace(/@|{|}/g,'');
              const value = varsMapping[key]?.value;
              if(key && value) {
                importPath = importPath.replace(usedVar, value)
              }
            }) 
          }

          // 判断路径是否为 less 的 @import (keyword) "filename";
          if(/@import[\s]*[\(](.*)[\)]/.test(line)) {
            // 判断是否为非 reference，则提示，没有处理
            if(line.match(/@import[\s]*[\(](.*)[\)]/)[1] !== 'reference') {
              console.warn("🚩TODO: this tool doesn't handle less @import (keysword)")
            }

            // 不处理，返回空
            return '';
          }

          let wholePath = '';

          // 是否第三方依赖包路径
          if (importPath.startsWith('~')) {
            // 匹配；~xxx(-xxx)*、~@xxx(-xxx)*/xxx(-xxx)*、~@xxx/xxx(-xxx)*
            const moduleNameMatch = /^~([a-zA-Z]+(-[a-zA-Z]+)*|(@[a-zA-Z]+(-[a-zA-Z]+)*\/[a-zA-Z]+(-[a-zA-Z]+)*)|(@[a-zA-Z]+\/[a-zA-Z]+(-[a-zA-Z]+)*))/g;
            const moduleName = importPath.match(moduleNameMatch)[0].replace('~','');

            if(nodeModulesPath) {
              wholePath = path.join(nodeModulesPath, moduleName, importPath.replace(moduleNameMatch, ''));
            } else {
              const moduleMainEntry = require.resolve(moduleName);
              const moduleNameStartIndex= moduleMainEntry.indexOf(moduleName.replace(/\/.*/, ''));
              // 从模块主入口文件路径中，截取真正的模块目录路径
              const modulePath = moduleMainEntry.slice(0, moduleNameStartIndex + moduleName.length);
              wholePath = path.join(modulePath, importPath.replace(moduleNameMatch, ''));
            }

          } else {
            wholePath = path.join(fileDirectory, importPath);
          }

          // 处理过的路径，直接返回空
          if(cacheImportPath[wholePath]) {
            return '';
          }

          cacheImportPath[wholePath] = true;
          return bundleTheme(wholePath) || '';
        }

        // 存储原名与更名的变量名的映射
        const varsOriginNameMapping = {};
        const fileVarsOriginNames = Object.keys(fileVarsMapping).map(v => {
          const varInfo = fileVarsMapping[v];
          const originName = varInfo.originName.replace('@', '');

          varsOriginNameMapping[originName] = v;
          return originName;
        });

        let newLine = line;

        // 将本文件重命名的变量名应用到样式中去（前缀、使用的样式变量）
        fileVarsOriginNames.forEach(varOriginName => {
          const matchClassRegExp = new RegExp(`@{${varOriginName}}`);
          const matchVarsRegExp = new RegExp(`@${varOriginName}`)
          // remark: 如果一个文件同时定义了两个相同less变量，取最后出现的
          newLine = newLine.replace(matchClassRegExp, `@{${varsOriginNameMapping[varOriginName]}}`);
          newLine = newLine.replace(matchVarsRegExp, `@${varsOriginNameMapping[varOriginName]}`);
        })

        return newLine;
      })
      .join('\n');
    
    return finalFileContentStr;
  }

  return bundleTheme(filePath)
}

/**
 * 压缩 主题样式 文件内容
 * @param {String} lessTheme 
 * @returns 
 */
function miniLessTheme (lessTheme) {
   // 移除 /* 注释 */，/** 注释 */，  // 注释， 换行与回车符
  return lessTheme.replace(/\/\*[\s\S]*?\*\/|\/\/.*|[\r\n]/g, '');
}

/**
 * 替换 主题样式 文件指定内容
 * @param {Stirng} lessTheme 
 * @param {Object} replaceContentsMapping 
 * @returns 
 */
function replaceLessTheme (lessTheme, replaceContentsMapping = {}) {
  const keys = Object.keys(replaceContentsMapping);
  const hasReplaceContents = keys.length;
  if(hasReplaceContents) {
    return keys.reduce((pre,next) => {
      const newContent = replaceContentsMapping[next]
      return pre.replace(new RegExp(next, 'g'), newContent);
    }, lessTheme)
  }
  return lessTheme;
}

module.exports = {
  bundleLessTheme,
  miniLessTheme,
  replaceLessTheme
}