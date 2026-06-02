import {Config} from '@remotion/cli/config';
import path from 'path';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

Config.overrideWebpackConfig((currentConfiguration) => {
  return {
    ...currentConfiguration,
    resolve: {
      ...currentConfiguration.resolve,
      modules: [
        path.resolve(__dirname, 'node_modules'),
        'node_modules',
      ],
    },
  };
});
