let development = process.env.NODE_ENV !== 'production';

export default {
  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'NFT Projects',
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { hid: 'description', name: 'description', content: '' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' },
      { name: "format-detection", content: "telephone=no" },
      { name: "format-detection", content: "address=no" },
      { property: "og:site_name", content: "NFT projects" },
      { property: "og:title", content: "NFT projects" },
      { property: "og:description", content: "All NFT Presales" },
      { property: "og:url", content: "#" },
      { property:"og:locale", content:"ru_RU" },
      { property:"og:image", content:"img/avatar.png" },
      { property: "og:image:width", content: "250" },
      {property: "og:image:height", content: "250" },
    ],
    link: [
      { rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.svg' }
    ],

    script: [
      {
        src: "https://code.jquery.com/jquery-3.3.1.slim.min.js",
        type: "text/javascript"
      },
      {
        src: "/js/libs.js",
        type: "text/javascript",
        body: true
      },
      {
        src: "/js/index.js",
        type: "text/javascript",
        body: true
      },

    ]
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
    '@/assets/css/index.css',
    '@/assets/css/libs.css'
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    '@/plugins/vue-slick-carousel.js'
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    // https://go.nuxtjs.dev/tailwindcss
    '@nuxtjs/tailwindcss',
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    '@nuxtjs/axios',
    '@nuxtjs/auth-next'
  ],

  axios: {
    baseURL: development ? 'http://nftapi.local' : 'https://nftapi.io',
  },

  auth: {
    token: {
      prefix: '_token.'
    },
    localStorage: {
      prefix: '_auth.'
    },
    redirect: {
      logout: '/login',
      home: '/',
    },
    strategies: {
      'laravelSanctum': {
        provider: 'laravel/sanctum',
        url: 'http://nftapi.local'
      },

      local: {
        endpoints: {
          login: {
            url: 'login',
            method: 'post',
            propertyName: 'meta.token'
          },
          logout: {
            url: 'logout',
            method: 'post'
          },
          user: {
            url: 'me',
            method: 'get',
            propertyName: 'data'
          }
        }
      }
    }
  },

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
  }
}
