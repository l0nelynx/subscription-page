import { ActionIcon, Button } from '@mantine/core'

export default {
    ActionIcon: ActionIcon.extend({
        defaultProps: {
            radius: 'lg',
            variant: 'outline'
        }
    }),
    Button: Button.extend({
        defaultProps: {
            autoContrast: true,
            radius: 'md',
            variant: 'filled'
        },
        styles: {
            root: {
                fontWeight: 650,
                border: '1px solid rgba(255, 255, 255, 0.14)'
            }
        }
    })
}
