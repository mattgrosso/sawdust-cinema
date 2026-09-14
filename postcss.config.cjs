// Vue CLI ran every stylesheet through autoprefixer against the browserslist
// block in package.json; Vite only does so when a PostCSS config is present,
// so this keeps the shipped CSS the same. Same file, same reason, as the
// eleven other apps that moved off Vue CLI on 2026-09-14.
module.exports = {
  plugins: {
    autoprefixer: {},
  },
};
