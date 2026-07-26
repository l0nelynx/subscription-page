import { InputBase, PasswordInput, Select, TextInput } from '@mantine/core'

export default {
    InputBase: InputBase.extend({
        defaultProps: {
            radius: 'md'
        },
        styles: {
            input: { background: 'oklch(0.18 0 0)', borderColor: 'rgba(255, 255, 255, 0.16)' }
        }
    }),
    PasswordInput: PasswordInput.extend({
        defaultProps: {
            radius: 'md'
        }
    }),
    TextInput: TextInput.extend({
        defaultProps: {
            radius: 'md'
        },
        styles: {
            input: { background: 'oklch(0.18 0 0)', borderColor: 'rgba(255, 255, 255, 0.16)' }
        }
    }),
    Select: Select.extend({
        defaultProps: {
            radius: 'md'
        },
        styles: {
            input: { background: 'oklch(0.18 0 0)', borderColor: 'rgba(255, 255, 255, 0.16)' }
        }
    })
}
