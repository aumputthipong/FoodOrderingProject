import { http, HttpResponse } from 'msw'
import { makeShop } from '../fixtures'

export const apiUrl = (path: string): string => '*' + path

export const defaultHandlers = [
  http.get(apiUrl('/api/shops'), () =>
    HttpResponse.json([
      makeShop({ id: 1, name: 'ร้านข้าวมันไก่' }),
      makeShop({ id: 2, name: 'ร้านก๋วยเตี๋ยว' }),
    ]),
  ),
  http.get(apiUrl('/api/cart'), () => HttpResponse.json([])),
]
