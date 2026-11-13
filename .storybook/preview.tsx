import { IonApp, setupIonicReact } from '@ionic/react';
import { Controls, Description, Primary, Stories, Title } from '@storybook/addon-docs/blocks';
import type { Preview, StoryContext } from '@storybook/react-vite';

import { applyTheme, getInitialTheme, saveTheme } from '../src/theme/theme-preference';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@fontsource-variable/inter';
import '../src/theme/variables.scss';
import './preview.css';

setupIonicReact();

const initialTheme = getInitialTheme();
let previousTheme = initialTheme;
applyTheme(initialTheme);

const preview: Preview = {
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'Component color theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: initialTheme },
  parameters: {
    docs: {
      page: () => (
        <>
          <Title />
          <Description />
          <Primary />
          <Controls />
          <Stories includePrimary={false} />
        </>
      ),
    },
  },
  decorators: [
    (Story: () => React.ReactNode, context: StoryContext): React.JSX.Element => {
      const theme = context.globals.theme === 'dark' ? 'dark' : 'light';
      applyTheme(theme);
      if (theme !== previousTheme) {
        saveTheme(theme);
        previousTheme = theme;
      }
      return (
        <IonApp
          style={
            context.viewMode === 'docs' ? { position: 'relative', height: 'auto', contain: 'layout style' } : undefined
          }
        >
          <Story />
        </IonApp>
      );
    },
  ],
};

export default preview;
