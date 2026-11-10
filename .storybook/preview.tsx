import { IonApp, setupIonicReact } from '@ionic/react';
import type { Preview } from '@storybook/react-vite';

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
import '../src/theme/variables.scss';

setupIonicReact();

const preview: Preview = {
  decorators: [
    (Story: () => React.ReactNode): React.JSX.Element => (
      <IonApp>
        <Story />
      </IonApp>
    ),
  ],
};

export default preview;
