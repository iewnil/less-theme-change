# less-theme-change-webpack-plugin
> Refer to the antd-theme-webpack-plugin for dynamically changing less theme and based on its own business scenarios in browser (mainly used to modify less variables).

This plugin will change the `index.html` file content by inserting:

 - A script that contains init the window.less
 - A script that import the less.js
 - A link that import the less theme style file output by this plugin

 
## Install
```shell
$ npm install -D @lingxiteam/less-theme-change-webpack-plugin

or

$ yarn add -D @lingxiteam/less-theme-change-webpack-plugin
```

## Usage

### Plugin init
```js
const LessThemeChangePlugin = require('@lingxiteam/less-theme-change-webpack-plugin');

const options = {
  htmlFilePath: 'index.html',
  themeFileEntryPath: '',
  themeFileOutputPath: 'theme.txt', // .txt file is smaller than .less
  lessJsFilePath: 'https://cdnjs.cloudflare.com/ajax/libs/less.js/2.7.2/less.min.js',
  replaceContentsMapping: {
    'the content of theme style file ready to be replaced': 'the new content',
  }
};

const LessThemeChangePluginIns = new LessThemeChangePlugin(options);
```

### Coding
```js
// for Example: modify the antd less vars
window.less.modifyVars({
  '@primay-color': '#4477ee',
  '@success-color': '#33ee33',
  // ...
});
``` 

### Options
| Property | Type | Default | Descript |
| --- | --- | --- | --- |
| htmlFilePath | string | index.html | The project html file path |
| themeFileEntryPath | string | '' | The Entry of less theme style file to be bundled |
| themeFileOutputDir | string | '' | Specify the bundled less theme style file directory for additional output |
| bundleThemeFileOnly | string | false | Only output the bundled less theme style file
| bundleThemeFileName | string | theme.txt | The bundled less theme style file output to dist directory by plugin |
| publicPath | string | '' | The publicPath must be set as the publicPath of the project, and will be reflected in the path of introducing the bundled less theme style file in HTML| 
| lessJsFilePath | string | https://cdnjs.cloudflare.com/ajax/libs/less.js/2.7.2/less.min.js |  less.js cdn or file path |
| replaceContentsMapping | object | {} | The themeStyleFile content replace mapping { [key]: value } ( key is the replaced content, value is the new content, both are string )|

