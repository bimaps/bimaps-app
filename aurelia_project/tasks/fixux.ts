import build from './build';
import * as gulp from 'gulp';
import * as replace from 'gulp-replace';
import * as tap from 'gulp-tap';

export function fixux (done) {
  gulp.src([
    'node_modules/@aurelia-ux/core/dist/native-modules/index.js'
    ])
    .pipe(tap(function (file, t) {
      console.log('file.path', file.path);
    }))
    .pipe(replace('if (typeof globalStyle.css === \'string\') ', ''))
    .pipe(replace('innerHtml += globalStyle.css', 'if (typeof globalStyle.css === \'string\') innerHtml += globalStyle.css'))
    .pipe(gulp.dest('node_modules/@aurelia-ux/core/dist/native-modules')).on('end', () => done());
}


let cordova;
cordova = gulp.series(
  fixux
);
export default cordova;


