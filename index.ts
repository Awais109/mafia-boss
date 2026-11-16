import { registerRootComponent } from 'expo';
import { createElement } from 'react';

import App from './App';
import { CrashBoundary } from './app/components/CrashBoundary';
import { installCrashHandler } from './app/crash';

// Crash capture (ADR 0071): the global handler first, then the boundary around the whole app, so an error
// anywhere below it is written to the play log and shown as "Something went wrong" rather than a white screen.
installCrashHandler();

const Root = () => createElement(CrashBoundary, null, createElement(App));

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
