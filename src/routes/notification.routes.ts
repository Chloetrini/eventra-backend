import { Router } from 'express'
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
  deleteAllNotifications

} from '../controllers/notification.controller.js'
import { verifySession } from '../middlewares/auth.middleware.js'

const router = Router()

router.use(verifySession)

router.get('/', listNotifications)
router.get('/unread-count', getUnreadNotificationCount)
router.patch('/read-all', markAllNotificationsAsRead)
router.patch('/read-all', markAllNotificationsAsRead)
router.patch('/:id/read', markNotificationAsRead)
router.delete('/:id', deleteNotification)
router.delete('/', deleteAllNotifications)


export default router
