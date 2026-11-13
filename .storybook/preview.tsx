import { IonApp, setupIonicReact } from '@ionic/react';
import { Controls, Description, Primary, Stories, Title } from '@storybook/addon-docs/blocks';
import type { Preview, StoryContext } from '@storybook/react-vite';

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
import '@ionic/react/css/palettes/dark.system.css';
import '@fontsource-variable/inter';
import '../src/theme/variables.scss';
import './preview.css';

setupIonicReact();

const preview: Preview = {
  tags: ['autodocs'],
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
    (Story: () => React.ReactNode, context: StoryContext): React.JSX.Element => (
      <IonApp
        style={
          context.viewMode === 'docs' ? { position: 'relative', height: 'auto', contain: 'layout style' } : undefined
        }
      >
        <Story />
      </IonApp>
    ),
  ],
};

export default preview;
