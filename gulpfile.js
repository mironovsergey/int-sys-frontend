const fs = require('fs');
const del = require('del');
const path = require('path');
const gulp = require('gulp');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const cssnano = require('cssnano');
const autoprefixer = require('autoprefixer');
const sortCSSmq = require('sort-css-media-queries');
const mqpacker = require('css-mqpacker');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const gulpif = require('gulp-if');
const changed = require('gulp-changed');
const nunjucksRender = require('gulp-nunjucks-render');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const webpackStream = require('webpack-stream');
const webpack = webpackStream.webpack;
const named = require('vinyl-named');
const logger = require('gulplog');
const browserSync = require('browser-sync').create();
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';

sass.compiler = require('node-sass');

const srcPath = './src/';
const buildPath = './build/';

const paths = {
  src: {
    html: srcPath,
    template: srcPath + 'template/',
    scss: srcPath + 'scss/',
    fonts: srcPath + 'fonts/',
    data: srcPath + 'data/',
    img: srcPath + 'img/',
    js: srcPath + 'js/',
  },
  build: {
    html: buildPath,
    css: buildPath + 'css/',
    fonts: buildPath + 'fonts/',
    data: buildPath + 'data/',
    img: buildPath + 'img/',
    js: buildPath + 'js/',
  },
};

gulp.task('html', () => {
  return gulp
    .src(paths.src.html + '*.html')
    .pipe(
      changed(paths.build.html, {
        extension: '.html',
      })
    )
    .pipe(
      nunjucksRender({
        path: [paths.src.template],
      })
    )
    .pipe(gulp.dest(paths.build.html));
});

gulp.task('template', () => {
  return gulp
    .src(paths.src.html + '*.html')
    .pipe(
      nunjucksRender({
        path: [paths.src.template],
      })
    )
    .pipe(gulp.dest(paths.build.html));
});

gulp.task('scss', () => {
  let plugins = [
    autoprefixer(),
    mqpacker({
      sort: sortCSSmq,
    }),
    !isDevelopment
      ? cssnano({
          preset: [
            'default',
            {
              discardComments: {
                removeAll: true,
              },
            },
          ],
        })
      : false,
  ].filter(Boolean);

  return gulp
    .src(paths.src.scss + '**/*.scss')
    .pipe(
      plumber({
        errorHandler: notify.onError((err) => ({
          title: err.plugin,
          message: err.message,
        })),
      })
    )
    .pipe(gulpif(isDevelopment, sourcemaps.init()))
    .pipe(
      sass({
        includePaths: ['node_modules'],
        outputStyle: 'expanded',
        precision: 8,
      })
    )
    .pipe(postcss(plugins))
    .pipe(gulpif(isDevelopment, sourcemaps.write('.')))
    .pipe(gulp.dest(paths.build.css));
});

gulp.task('webpack', (callback) => {
  let firstBuildReady = false;

  function done(err, stats) {
    firstBuildReady = true;

    if (err) {
      return;
    }

    logger[stats.hasErrors() ? 'error' : 'info'](
      stats.toString({
        colors: true,
      })
    );
  }

  let options = {
    watch: isDevelopment,
    mode: isDevelopment ? 'development' : 'production',
    devtool: isDevelopment ? 'inline-source-map' : false,
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
        },
        {
          test: /\.svg$/,
          loader: 'svg-inline-loader',
        },
      ],
    },
    optimization: {
      noEmitOnErrors: true,
      splitChunks: {
        cacheGroups: {
          commons: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    },
  };

  return gulp
    .src(paths.src.js + 'main.js')
    .pipe(
      plumber({
        errorHandler: notify.onError((err) => ({
          title: err.plugin,
          message: err.message,
        })),
      })
    )
    .pipe(named())
    .pipe(webpackStream(options, null, done))
    .pipe(gulp.dest(paths.build.js))
    .on('data', () => {
      if (firstBuildReady) {
        callback();
      }
    });
});

gulp.task('fonts', () => {
  return gulp
    .src(paths.src.fonts + '**/*.{ttf,eot,svg,woff,woff2,otf}')
    .pipe(changed(paths.build.fonts))
    .pipe(gulp.dest(paths.build.fonts));
});

gulp.task('data', () => {
  return gulp
    .src(paths.src.data + '**/*.*')
    .pipe(changed(paths.build.data))
    .pipe(gulp.dest(paths.build.data));
});

gulp.task('img', () => {
  return gulp
    .src(paths.src.img + '**/*.{jpg,png,gif,svg}')
    .pipe(changed(paths.build.img))
    .pipe(
      imagemin({
        interlaced: true,
        progressive: true,
        svgoPlugins: [
          {
            removeViewBox: false,
          },
        ],
        use: [pngquant()],
      })
    )
    .pipe(gulp.dest(paths.build.img));
});

gulp.task('clean', () => {
  return del([buildPath], {
    force: true,
  });
});

gulp.task('serve', () => {
  browserSync.init({
    server: buildPath,
    middleware: [
      (req, res, next) => {
        if (req.method === 'POST') {
          const filePath = `${buildPath}${req.url.replace(/^\/(.*)/, '$1')}`;

          fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
              console.error(err);
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('File Not Found');
            } else {
              fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                  console.error(err);
                  res.writeHead(500, { 'Content-Type': 'text/plain' });
                  res.end('Internal Server Error');
                } else {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(data);
                }
              });
            }
          });
        } else {
          next();
        }
      },
    ],
  });

  browserSync.watch(buildPath + '**/*.*').on('change', browserSync.reload);
});

gulp.task('watch', () => {
  gulp.watch(paths.src.html + '*.html', gulp.series('html'));
  gulp.watch(paths.src.template + '**/*.html', gulp.series('template'));
  gulp.watch(paths.src.scss + '**/*.scss', gulp.series('scss'));
  gulp.watch(paths.src.fonts + '**/*.{ttf,eot,svg,woff,woff2,otf}', gulp.series('fonts')).on('unlink', (filepath) => {
    del.sync(path.resolve(paths.build.fonts, path.relative(path.resolve(paths.src.fonts), filepath)));
  });
  gulp.watch(paths.src.data + '**/*.*', gulp.series('data')).on('unlink', (filepath) => {
    del.sync(path.resolve(paths.build.data, path.relative(path.resolve(paths.src.data), filepath)));
  });
  gulp.watch(paths.src.img + '**/*.{jpg,png,gif,svg}', gulp.series('img')).on('unlink', (filepath) => {
    del.sync(path.resolve(paths.build.img, path.relative(path.resolve(paths.src.img), filepath)));
  });
});

gulp.task('build', gulp.series('clean', gulp.parallel('html', 'scss', 'webpack', 'fonts', 'data', 'img')));
gulp.task('default', gulp.series('build', gulp.parallel('watch', 'serve')));
