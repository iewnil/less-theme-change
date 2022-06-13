const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const { bundleLessTheme, miniLessTheme, replaceLessTheme} = require('@lingxiteam/bundle-less-theme-tools');

class LessThemeChangePlugin {
  constructor(options) {
    // TODO: 校验配置 
    // htmlFilePath、 bundleThemeFilePath 必须是是相对路径，且只能是相对于打包目录下 且不带 ./ ../ 等，必须由字母或数字开头

    this.options = {
      htmlFilePath: 'index.html', // the same as ./index.html
      themeFileEntryPath: '',
      themeFileOutputDir: '', 
      bundleThemeFileOnly: false,
      bundleThemeFileName: 'theme.txt', // .txt file is smaller than .less, the same as ./theme.txt
      publicPath: '',
      lessJsFilePath: 'https://cdnjs.cloudflare.com/ajax/libs/less.js/2.7.2/less.min.js',
      replaceContentsMapping: {
        'the content of theme style file ready to be replaced': 'the new content',
      },
      ...options,
    };
    this.pluginName = 'LessThemeChangePlugin';
    this.version = webpack.version;
  }

  apply(compiler) {
    if (this.version.startsWith('5.')) {
      console.log('❌ error: webpack version must be 4.x');
      process.exit();
    } else {
      compiler.hooks.emit.tapAsync(this.pluginName, (compilation, callback) => {
        this.handleTheme(compilation, callback);
      });
    }
  }

  handleTheme(compilation, callback) {
    if(!this.options.bundleThemeFileOnly) {
      this.handleHtmlContent(compilation.assets);
    }
    this.handleThemeFile(compilation, callback);
  }

  // 修改 html 文件内容
  handleHtmlContent(assets) {
    const htmlFilePath = this.options.htmlFilePath;
    if (htmlFilePath && htmlFilePath in assets) {
      const indexHtml = assets[htmlFilePath];
      const htmlContent = indexHtml.source();

      let bundleThemeFileName = this.options.bundleThemeFileName;
      let bundleThemeFilePath = bundleThemeFileName;
      const publicPath = this.options.publicPath;

      if(publicPath) {
        bundleThemeFilePath = `${publicPath.replace(/[A-Za-z\d]\/+$/, '')}/${bundleThemeFileName}`;
      }

      if (!htmlContent.match(/\/theme\.less/g)) {
        const initLessThemeStyle = `
          <script>
            window.less = {
              async: false,
              env: 'production',
              javascriptEnabled: true
            };
          </script>
          <script type="text/javascript"  data-poll="1000" src="${this.options.lessJsFilePath}"></script>
          <link rel="stylesheet/less" type="text/css" href="${bundleThemeFilePath}" />
        `;
        const updatedContent = htmlContent.replace(initLessThemeStyle, '').replace(/<body>/gi, `<body>${initLessThemeStyle}`);
        indexHtml.source = () => updatedContent;
        indexHtml.size = () => updatedContent.length;
      }
    }
  }

  // 处理 less主题样式文件内容
  async handleThemeFile(compilation, callback) {
    // TODO: 查看文件是否存在，是否缓存，进行复用？？

    const themeFileEntryPath = this.options.themeFileEntryPath;
    const themeFileOutputDir = this.options.themeFileOutputDir;
    const bundleThemeFileName = this.options.bundleThemeFileName;

    let themeBundle = '';
    // 从主题样式文件入口开始，打包主题样式
    if(themeFileEntryPath) {
      themeBundle = bundleLessTheme(themeFileEntryPath);
    }

    // 内容替换
    themeBundle = replaceLessTheme(themeBundle, this.options.replaceContentsMapping);

    // 内容压缩
    themeBundle = miniLessTheme(themeBundle);

    // 内容输出
    compilation.assets[bundleThemeFileName] = {
      source: () => themeBundle,
      size: () => themeBundle.length,
    };

    if (themeFileOutputDir) {
      const themeFileOutputPath = path.join(themeFileOutputDir, bundleThemeFileName);
      fs.writeFileSync(themeFileOutputPath, themeBundle);
      console.log(
        `
          🌈Less them style init successfully. 
          📃The theme file output: ${themeFileOutputPath}
        `,
      );
    } else {
      console.log(
        `🌈Less them style init successfully. `,
      );
    }

    callback();
  }
}

module.exports = LessThemeChangePlugin;
