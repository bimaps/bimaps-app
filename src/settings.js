var settings = {
  title: 'BIMaps.io',
  description: 'Project description',
  keywords: "Project keywords",
  author: "Project Author",
  stateVersion: '2.0',
  stateLog: {
    dispatchedActions: 'debug',
    performanceLog: 'debug',
    devToolsStatus: 'debug'
  },
  language: 'fr',
  languages: ['fr', 'en'],
  country: 'CH',
  countries: ['CH'],
  stateStorageKey: 'bimaps-state',
  defaultRoutes: {
    unauthenticated: 'login',
    authenticated: 'home'
  },
  three: {
    canvasBackground: 'linear-gradient(#8A8A8A,#FFFFFF,#FFFFFF,#8A8A8A)',
    displayLogo: false
  },
  fast: {
    designTokens: {
      fillColor: '#303030', // background
      accentPalette: '#00c8cb', // primary
      controlCornerRadius: 8, // Corner Radius
      baseLayerLuminance: 0, // Dark mode = 0
    },
  },
  ux: {
    design: {
      primary: '#00c8cb',
      primaryForeground: '#fff',
      accent:  '#4CB8D4',
      accentForeground: '#fff',

      primaryLight: '#7BE0DD',
      primaryLightForeground: '#000',
      primaryDark: '#00989B',
      primaryDarkForeground: '#fff',

      accentLight: '#8bd5e3',
      accentLightForeground: '#000',
      accentDark: '#258CB1',
      accentDarkForeground: '#fff',

      appBackground: '#fff',
      appForeground: '#000',

      surfaceBackground: '#FFFFFF',
      surfaceForeground: '212121',

      disabledBackground: '#EFEFEF',
      disabledForeground: '#BBBBBB',
      error: '#F44336',
      errorForeground: '#FFFFFF'

    }
  }
};

// auto detection of locale
if (typeof window !== `undefined`) {
  var userLang = navigator.language || navigator.userLanguage; 
  var userLang = navigator.language || navigator.userLanguage; 
  for (var index in settings.languages) {
    var language = settings.languages[index];
    if (userLang.substr(0, 2) === language) {
      settings.language = language;
      break;
    }  
  }
}

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.settings = settings;
exports.default = settings;

