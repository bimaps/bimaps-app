import {CLIOptions} from 'aurelia-cli';
import * as gulp from 'gulp';
import * as log from 'fancy-log';
import * as c from 'ansi-colors';

let pluginToWatch = ['aurelia-deco', 'aurelia-resources', 'aurelia-swissdata'];

if (CLIOptions.hasFlag('ad')) {
  pluginToWatch = ['aurelia-deco'];
}

if (CLIOptions.hasFlag('ar')) {
  pluginToWatch = ['aurelia-resources'];
}

if (CLIOptions.hasFlag('as')) {
  pluginToWatch = ['aurelia-swissdata'];
}

function watchPlugin(pluginName) {
  log('Creating a task called', `watch-${pluginName}`);
  let src = [`../${pluginName}/dist/**/*`, `../${pluginName}/src/**/*`, `../${pluginName}/package.json`];
  let dest = `node_modules/${pluginName}`;
  //let src = [`../${pluginName}/dist/native-modules/**/*`];
  //let dest = `node_modules/${pluginName}/native-modules`;

  //let timeout;
  return gulp.task(`watch-${pluginName}`, function () {
    gulp.watch(src, {delay: 1000}, function(done) {
    //  clearTimeout(timeout);
      //timeout = setTimeout(() => {
        log(`Plugin '${c.magenta(pluginName)}' changed`);
        gulp.src(src, {base:`.`}).pipe(gulp.dest(dest));
        done();
      //}, 1000);
    });
  });
}

function watchAll() {
  let tasks = [];
  for (let pluginName of pluginToWatch) {
    log('Init watching plugin', pluginName);
    watchPlugin(pluginName);
    
    tasks.push(`watch-${pluginName}`);
  }
  log('All watching tasks ready');
  return tasks;
}

const watch = gulp.parallel(
  watchAll()
);

export { watch as default };
