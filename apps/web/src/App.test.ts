import { mount } from '@vue/test-utils'
import App from './App.vue'

test('renders the app shell', () => {
  const wrapper = mount(App, { global: { stubs: { RouterView: true } } })
  expect(wrapper.exists()).toBe(true)
})
