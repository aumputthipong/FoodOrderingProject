export const SEED_PASSWORD = 'Password123'

const NUMBER_WORDS = ['One', 'Two', 'Three', 'Four', 'Five'] as const

export const seedMerchants = NUMBER_WORDS.map((word, index) => ({
  username: `merchant${index + 1}`,
  firstName: 'Merchant',
  lastName: word,
  email: `merchant${index + 1}@example.com`,
  mobile: `080000000${index + 1}`,
  role: 'merchant' as const,
}))

export const seedCustomers = [
  {
    username: 'customer1',
    firstName: 'Customer',
    lastName: 'One',
    email: 'customer1@example.com',
    mobile: '0900000001',
    role: 'customer' as const,
  },
]

/** Shop N is owned by merchantN and uses the image `shop-N.*`. */
export const seedShops = [
  {
    name: 'ร้านก๋วยเตี๋ยวโรงอาหาร',
    description: 'ร้านก๋วยเตี๋ยวโรงอาหาร ราคาถูก อร่อย สูตรโบราณ',
    image: 'shop-1.jpg',
  },
  {
    name: 'ร้านอาหารตามสั่ง',
    description: 'ร้านอาหารตามสั่ง ป้าสั่งได้ ข้าวผัด กระเพรา ข้าวแกง',
    image: 'shop-2.jpg',
  },
  { name: 'Drink Shop', description: 'ร้านเครื่องดื่ม ขนม นม เนย', image: 'shop-3.jpg' },
  { name: 'ข้าวผัดซู่ซ่า', description: 'ร้านข้าวผัด ผัดข้าว ผัดซู่ซ่า', image: 'shop-4.jpg' },
  {
    name: 'ร้านลูกชิ้นลุง',
    description: 'ลูกชิ้นทอด ไก่ทอด ข้าวเหนียวหมูทอด ลุงขายหมด',
    image: 'shop-5.png',
  },
]

/** `shop` is the 1-based index into `seedShops`. */
export const seedProducts = [
  {
    shop: 1,
    name: 'ก๋วยเตี๋ยวต้มยำ',
    description: 'ก๋วยเตี๋ยวต้มยำน้ำข้น มีหมูเด้ง หมูสับ',
    price: 50,
    status: 'available' as const,
    image: 'product-1.jpg',
  },
  {
    shop: 1,
    name: 'ก๋วยเตี๋ยวต้มน้ำตก',
    description: 'ก๋วยเตี๋ยวน้ำตก เนื้อ หมู',
    price: 55,
    status: 'available' as const,
    image: 'product-2.jpg',
  },
  {
    shop: 1,
    name: 'ก๋วยเตี๋ยวแห้ง',
    description: 'ก๋วยเตี๋ยวแห้ง เส้นเล็ก เส้นหมี่ วุ้นเส้น',
    price: 50,
    status: 'not-available' as const,
    image: 'product-3.jpg',
  },
  {
    shop: 2,
    name: 'ผัดกระเพรา',
    description: 'ผัดกระเพราหมูสับ',
    price: 40,
    status: 'available' as const,
    image: 'product-4.webp',
  },
  {
    shop: 2,
    name: 'ข้าวผัด',
    description: 'ข้าวผัดโบราณ',
    price: 40,
    status: 'available' as const,
    image: 'product-5.avif',
  },
]
