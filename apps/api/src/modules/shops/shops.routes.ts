import { Router } from 'express'
import { requireAuth } from '../../common/middlewares/requireAuth'
import { requireRole } from '../../common/middlewares/requireRole'
import { uploadImage } from '../../common/middlewares/upload'
import * as controller from './shops.controller'

/** Self-contained so another router (e.g. `/shops/mine/orders`) can be mounted ahead of `/:id`. */
export const shopsRouter = Router()
shopsRouter.get('/', controller.list)
shopsRouter.get('/:id', controller.detail)
shopsRouter.post('/', requireAuth, requireRole('merchant', 'admin'), uploadImage, controller.create)
shopsRouter.put('/:id', requireAuth, uploadImage, controller.update)
