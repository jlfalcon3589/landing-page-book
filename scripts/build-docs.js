const fs = require('fs');
const path = require('path');
const reactDocs = require('react-docgen');

const { resolve } = path;
const absolute = resolve();

const componentFolder = `${absolute}/src/components/`;
const componentDataArray = [];

function pushComponent(component) {
  componentDataArray.push(component);
}

/**
 * Use React-Docgen to parse the loaded component
 * into JS object of props, comments
 *
 * @param {File} component
 * @param {String} filename
 */
function parseComponent(component, filename) {
  const componentInfo = reactDocs.parse(component);
  const splitIndex = filename.indexOf('/src/');
  const shortname = filename.substring(splitIndex + 4);

  componentInfo.filename = shortname;
  pushComponent(componentInfo);
}

/**
 * Loads a component file, then runs parsing callback
 * @param {String} file
 * @param {Promise} resolve
 */
function loadComponent(file, resolve) {
  fs.readFile(file, (err, data) => {
    if (err) {
      throw err;
    }

    // Parse the component into JS object
    resolve(parseComponent(data, file));
  });
}

/**
 * Explores recursively a directory and returns all the filepaths and folderpaths in the callback.
 *
 * @see http://stackoverflow.com/a/5827895/4241030
 * @param {String} dir
 * @param {Function} done
 */
function filewalker(dir, done) {
  const results = [];

  fs.readdir(dir, async (err, list) => {
    if (err) return done(err);

    let pending = list.length - 1;
    if (!pending) return done(null, results);
    list.forEach(file => {
      file = path.resolve(dir, file);

      fs.stat(file, async (err, stat) => {
        // If directory, execute a recursive call
        if (stat && stat.isDirectory()) {
          let component = file.split('/');
          component = `${file}/${component[component.length - 1]}.jsx`;
          if (fs.existsSync(component)) {
            await new Promise(resolve => {
              loadComponent(component, resolve);
            });
            await results.push(component);
            pending--;
          }
          if (!pending) done(null, results);
        }
      });
    });
  });
}

function generateTitle(name) {
  return name;
}

function generateDesciption(description) {
  return `${description}\n`;
}

function generatePropType(type) {
  return `\`${type.name}\``;
}

function generatePropDefaultValue(value) {
  return `\`${value.value.replace(/\n/g, '')}\``;
}

function generateProp(propName, prop) {
  return `| ${propName}${prop.required ? '<font color="red">*</font>' : ''} | ${
    prop.type ? `${generatePropType(prop.type)}` : ''
  } | ${prop.description ? prop.description : ''} | ${
    prop.defaultValue ? generatePropDefaultValue(prop.defaultValue) : ''
  } |`;
}

function generateProps(props) {
  return `| </br>Name | </br>Type | </br>Summary | </br>Default | \n| ---- | ---- | ---- | ---- |\n${Object.keys(
    props
  )
    .sort()
    .map(propName => generateProp(propName, props[propName]))
    .join('\n')}`;
}

function generateMarkdown(name, reactAPI) {
  const markdownString = `# ${generateTitle(name)}
  [![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
  ${generateDesciption(reactAPI.description)}
  ## Properties
  ${generateProps(reactAPI.props)}`;

  return markdownString;
}

function getComponentPath(component) {
  return `${absolute}/src${component.filename.split(`${component.displayName}.jsx`)[0]}`;
}

filewalker(componentFolder, (err, data) => {
  if (err) {
    throw err;
  }
  componentDataArray.map(component => {
    const componentPath = getComponentPath(component);
    const markDown = generateMarkdown(component.displayName, component);
    fs.writeFile(`${componentPath}README.md`, markDown, 'utf8', () => {});
    fs.writeFile(`${componentPath}map.json`, JSON.stringify(component), 'utf8', () => {});
    return component;
  });
});
