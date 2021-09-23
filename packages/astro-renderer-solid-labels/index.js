export default {
  name: 'astro-renderer-solid-labels',
  client: './client',
  server: './server',
  knownEntrypoints: [
    'solid-js',
    'solid-js/web',
  ],
  external: [
    'solid-js/web/dist/server.js',
    'solid-js/dist/server.js',
    'babel-preset-solid',
    'babel-plugin-solid-labels'
  ],
  jsxImportSource: 'solid-js',
  jsxTransformOptions: async ({ isSSR }) => {
    const [
      { default: solid },
      { default: solidLabels },
    ] = await Promise.all([
      import('babel-preset-solid'),
      import('babel-plugin-solid-labels'),
    ]);
    const options = {
      presets: [[solid, { generate: isSSR ? 'ssr' : 'dom' }]],
      plugins: [solidLabels],
    };

    if (isSSR) {
      options.alias = {
        'solid-js/web': 'solid-js/web/dist/server.js',
        'solid-js': 'solid-js/dist/server.js',
      };
    }

    return options;
  },
};