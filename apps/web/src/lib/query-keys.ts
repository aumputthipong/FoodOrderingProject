export const queryKeys = {
  shops: {
    all: ['shops'] as const,
    list: (search: string) => ['shops', 'list', { search }] as const,
    detail: (id: number) => ['shops', 'detail', id] as const,
  },
  cart: ['cart'] as const,
  orders: { mine: ['orders', 'mine'] as const, shop: ['orders', 'shop'] as const },
}
