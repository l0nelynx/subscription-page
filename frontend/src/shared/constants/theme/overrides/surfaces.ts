import { Alert, Modal, Tabs } from '@mantine/core'

export default {
    Alert: Alert.extend({
        defaultProps: { radius: 'md' }
    }),
    Modal: Modal.extend({
        defaultProps: {
            centered: true,
            overlayProps: { backgroundOpacity: 0.72, blur: 2 },
            radius: 'md'
        }
    }),
    Tabs: Tabs.extend({
        defaultProps: { radius: 'md' }
    })
}
