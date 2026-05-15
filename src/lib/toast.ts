import { notifications } from '@mantine/notifications'

// Thin shim that mirrors the bits of the react-hot-toast API we use, backed by
// Mantine's notifications system.
export const toast = {
  success(message: string) {
    notifications.show({
      message,
      color: 'accent',
      autoClose: 3000,
    })
  },
  error(message: string) {
    notifications.show({
      message,
      color: 'red',
      autoClose: 5000,
    })
  },
}

export default toast
