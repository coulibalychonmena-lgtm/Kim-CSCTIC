import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateBody } from '../middlewares/validate.middleware.js';
import { adminOnly, authenticate, optionalAuthenticate } from '../middlewares/auth.middleware.js';
import * as bodySchemas from '../validators/request-body-schemas.js';
import * as chatController from '../controllers/chat.controller.js';
import * as authController from '../controllers/auth.controller.js';
import * as roomsController from '../controllers/rooms.controller.js';
import * as activitiesController from '../controllers/activities.controller.js';
import * as partnershipsController from '../controllers/partnerships.controller.js';
import * as centerInformationController from '../controllers/center-information.controller.js';
import * as openingHoursController from '../controllers/opening-hours.controller.js';
import { receiveImageUpload } from '../middlewares/image-upload.middleware.js';
import * as imagesController from '../controllers/images.controller.js';
import { scheduleTranslationWarmUp } from '../services/translation-warmup.service.js';
import * as mediaDescriptionController from '../controllers/media-description.controller.js';
import * as presentationController from '../controllers/presentation.controller.js';
import * as entriesControllers from '../controllers/entries.controllers.js';
import * as siteBackgroundsController from '../controllers/site-backgrounds.controller.js';
import * as dashboardAndMonitoringController from '../controllers/dashboard-and-monitoring.controller.js';

const router = Router();

const limitRequests = (windowMilliseconds, maximumRequests) => rateLimit({
  windowMs: windowMilliseconds,
  limit: maximumRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Trop de requêtes, réessayez dans un instant.' } },
});

// Chaque modification de l'administration relance, en arrière-plan, la traduction automatique du contenu public.
router.use('/admin', (request, response, next) => {
  if (request.method !== 'GET') response.on('finish', () => { if (response.statusCode < 400) scheduleTranslationWarmUp(); });
  next();
});

// Sonde de réveil du frontend : lisible depuis n'importe quelle origine (aucune donnée sensible).
router.get('/health', (_request, response) => {
  response.set({ 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  response.json({ status: 'ok' });
});

// --- Assistant Kim (public) ---
router.post('/chat/message', limitRequests(60_000, 30), validateBody(bodySchemas.chatMessageSchema), chatController.postChatMessage);
router.get('/chat/session/:sessionId/human-messages', limitRequests(60_000, 60), chatController.getHumanMessages);

// --- Consultation publique : salles, formations, horaires ---
router.get('/rooms', roomsController.listRooms);
router.get('/activities', activitiesController.listActivities);
router.get('/opening-hours', openingHoursController.listOpeningHours);
router.get('/center-information', centerInformationController.listCenterInformation);
router.get('/site-backgrounds', siteBackgroundsController.listSiteBackgrounds);
router.get('/rooms/:id/availability', limitRequests(60_000, 120), roomsController.getRoomAvailability);
router.get('/events', entriesControllers.events.listPublished);
router.get('/news', entriesControllers.news.listPublished);
router.get('/videos', entriesControllers.videos.listPublished);
router.get('/chat-suggestions', entriesControllers.suggestions.listPublished);
router.get('/presentation', limitRequests(60_000, 30), presentationController.listPresentation);

// --- Demandes déposées par les visiteurs (public) ---
router.post('/rooms/request', limitRequests(60_000, 10), optionalAuthenticate, validateBody(bodySchemas.roomRequestSchema), roomsController.createRoomRequest);
router.post('/activities/register', limitRequests(60_000, 10), optionalAuthenticate, validateBody(bodySchemas.activityRegistrationSchema), activitiesController.registerToActivity);
router.post('/partnerships', limitRequests(60_000, 10), optionalAuthenticate, validateBody(bodySchemas.partnershipRequestSchema), partnershipsController.createPartnership);

// --- Authentification ---
router.post('/auth/login', limitRequests(15 * 60_000, 20), validateBody(bodySchemas.loginSchema), authController.login);
router.post('/auth/register', limitRequests(15 * 60_000, 15), validateBody(bodySchemas.registerSchema), authController.register);
router.get('/auth/me', authenticate, authController.getCurrentUser);
router.get('/me/requests', authenticate, authController.listMyRequests);

// --- Administration : traitement des demandes ---
router.get('/admin/rooms/requests', adminOnly, roomsController.listRoomRequests);
router.patch('/admin/rooms/requests/:id', adminOnly, validateBody(bodySchemas.roomRequestStatusSchema), roomsController.updateRoomRequestStatus);
router.get('/admin/activities/registrations', adminOnly, activitiesController.listRegistrations);
router.patch('/admin/activities/registrations/:id', adminOnly, validateBody(bodySchemas.activityRegistrationStatusSchema), activitiesController.updateRegistrationStatus);
router.get('/admin/partnerships', adminOnly, partnershipsController.listPartnerships);
router.patch('/admin/partnerships/:id', adminOnly, validateBody(bodySchemas.partnershipRequestStatusSchema), partnershipsController.updatePartnershipStatus);
router.get('/admin/chats/flagged', adminOnly, dashboardAndMonitoringController.listFlaggedChats);
router.get('/admin/chats/session/:sessionId', adminOnly, dashboardAndMonitoringController.getChatSession);
router.post('/admin/chats/session/:sessionId/takeover', adminOnly, dashboardAndMonitoringController.startTakeover);
router.delete('/admin/chats/session/:sessionId/takeover', adminOnly, dashboardAndMonitoringController.endTakeover);
router.post('/admin/chats/session/:sessionId/reply', adminOnly, validateBody(bodySchemas.humanReplySchema), dashboardAndMonitoringController.replyToVisitor);
router.get('/admin/stats', adminOnly, dashboardAndMonitoringController.getDashboardStatistics);

// --- Administration : gestion des données du Centre (aucune modification de code requise) ---
router.post('/admin/rooms', adminOnly, validateBody(bodySchemas.roomCreationSchema), roomsController.createRoom);
router.patch('/admin/rooms/:id', adminOnly, validateBody(bodySchemas.roomModificationSchema), roomsController.updateRoom);
router.delete('/admin/rooms/:id', adminOnly, roomsController.deleteRoom);

router.post('/admin/activities', adminOnly, validateBody(bodySchemas.activityCreationSchema), activitiesController.createActivity);
router.patch('/admin/activities/:id', adminOnly, validateBody(bodySchemas.activityModificationSchema), activitiesController.updateActivity);
router.delete('/admin/activities/:id', adminOnly, activitiesController.deleteActivity);

router.get('/admin/center-information', adminOnly, centerInformationController.listCenterInformation);
router.post('/admin/center-information', adminOnly, validateBody(bodySchemas.centerInformationCreationSchema), centerInformationController.createCenterInformation);
router.patch('/admin/center-information/:id', adminOnly, validateBody(bodySchemas.centerInformationModificationSchema), centerInformationController.updateCenterInformation);
router.delete('/admin/center-information/:id', adminOnly, centerInformationController.deleteCenterInformation);

router.post('/admin/images', adminOnly, receiveImageUpload, imagesController.uploadImage);

router.get('/admin/events', adminOnly, entriesControllers.events.listAll);
router.post('/admin/events', adminOnly, validateBody(bodySchemas.eventCreationSchema), entriesControllers.events.create);
router.patch('/admin/events/:id', adminOnly, validateBody(bodySchemas.eventModificationSchema), entriesControllers.events.update);
router.delete('/admin/events/:id', adminOnly, entriesControllers.events.remove);

router.get('/admin/news', adminOnly, entriesControllers.news.listAll);
router.post('/admin/news', adminOnly, validateBody(bodySchemas.newsCreationSchema), entriesControllers.news.create);
router.patch('/admin/news/:id', adminOnly, validateBody(bodySchemas.newsModificationSchema), entriesControllers.news.update);
router.delete('/admin/news/:id', adminOnly, entriesControllers.news.remove);

router.post('/admin/describe-media', adminOnly, limitRequests(60_000, 20), validateBody(bodySchemas.mediaDescriptionSchema), mediaDescriptionController.describeMedia);

router.get('/admin/videos', adminOnly, entriesControllers.videos.listAll);
router.post('/admin/videos', adminOnly, validateBody(bodySchemas.videoCreationSchema), entriesControllers.videos.create);
router.patch('/admin/videos/:id', adminOnly, validateBody(bodySchemas.videoModificationSchema), entriesControllers.videos.update);
router.delete('/admin/videos/:id', adminOnly, entriesControllers.videos.remove);

router.get('/admin/chat-suggestions', adminOnly, entriesControllers.suggestions.listAll);
router.post('/admin/chat-suggestions', adminOnly, validateBody(bodySchemas.suggestionCreationSchema), entriesControllers.suggestions.create);
router.patch('/admin/chat-suggestions/:id', adminOnly, validateBody(bodySchemas.suggestionModificationSchema), entriesControllers.suggestions.update);
router.delete('/admin/chat-suggestions/:id', adminOnly, entriesControllers.suggestions.remove);

router.get('/admin/presentations', adminOnly, presentationController.listSlidesForAdmin);
router.post('/admin/presentations', adminOnly, validateBody(bodySchemas.slideCreationSchema), presentationController.createSlide);
router.patch('/admin/presentations/:id', adminOnly, validateBody(bodySchemas.slideModificationSchema), presentationController.updateSlide);
router.post('/admin/presentations/:id/regenerate', adminOnly, presentationController.regenerateSlide);
router.delete('/admin/presentations/:id', adminOnly, presentationController.deleteSlide);

router.put('/admin/site-backgrounds/:slot', adminOnly, validateBody(bodySchemas.siteBackgroundSchema), siteBackgroundsController.setSiteBackground);

router.put('/admin/opening-hours', adminOnly, openingHoursController.replaceOpeningHours);

export default router;
