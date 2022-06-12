# bundle-less-theme-tools
> A tool for bundling less theme files.

## Install
```shell
$ npm install -D @lingxiteam/bundle-less-theme-tools

or

$ yarn add -D @lingxiteam/bundle-less-theme-tools
```

## Export
 - bundleLessTheme：read and resolve import path in less theme file, and output all
 - miniLessTheme
 - replaceLessTheme

## Usage
```js
let themeBundle = '';
let themeFileEntryPath = 'xxx/xxx/xxx.less';

themeBundle = bundleLessTheme(themeFileEntryPath);

themeBundle = replaceLessTheme(themeBundle, {
   'body {': '.unuse-body {'
});

themeBundle = miniLessTheme(themeBundle);
```
